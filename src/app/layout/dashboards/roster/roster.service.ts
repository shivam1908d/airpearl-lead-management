import { Injectable, OnDestroy, inject } from '@angular/core';
import { AircraftService } from '../../training-program/aircraft/aircraft.service';
import { roundHours } from '../../training-program/aircraft/aircraft.service';

export type RosterRole = 'Trainee' | 'Captain' | 'Instructor' | 'Flight Attendant';

export interface RosterAssignment {
  id: string;
  date: string;
  dayLabel: string;
  personName: string;
  role: RosterRole;
  aircraft: string;
  startTime: string;
  endTime: string;
}

// anything that has a date and a start/end time can be turned into a flight window
export type TimeWindowSource = Pick<RosterAssignment, 'date' | 'startTime' | 'endTime'>;

/**
 * Keeps the roster alive while the app is open.
 * The roster page is destroyed every time you leave it, so the data can't live there.
 */
@Injectable({ providedIn: 'root' })
export class RosterService implements OnDestroy {
  private aircraftService = inject(AircraftService);

  // initial in-memory roster data, replaced by the API later
  rosterAssignments: RosterAssignment[] = [
    {
      id: '1',
      date: this.todayKey(),
      dayLabel: 'Monday',
      personName: 'Ava Martin',
      role: 'Captain',
      aircraft: 'VT-FSA',
      startTime: '08:00',
      endTime: '12:00'
    },
    {
      id: '2',
      date: this.todayKey(),
      dayLabel: 'Monday',
      personName: 'Leo Park',
      role: 'Flight Attendant',
      aircraft: 'VT-FSD',
      startTime: '14:00',
      endTime: '18:00'
    }
  ];

  // lookup table: date + slot name => single assignment
  assignments: Record<string, RosterAssignment> = this.buildAssignmentMap(this.rosterAssignments);

  // ticks every few seconds so flights start and finish without a page refresh
  currentTime = new Date();

  private timer = setInterval(() => {
    this.currentTime = new Date();
    this.settleFinishedFlights();
  }, 5000);

  constructor() {
    this.settleFinishedFlights();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  get(slotKey: string): RosterAssignment | undefined {
    return this.assignments[slotKey];
  }

  // saves an assignment, and frees its old slot if the time moved to another block
  save(assignment: RosterAssignment, previousKey: string): void {
    if (previousKey !== assignment.id) {
      delete this.assignments[previousKey];
    }
    this.assignments[assignment.id] = assignment;
    this.refreshList();
  }

  remove(slotKey: string): void {
    delete this.assignments[slotKey];
    this.refreshList();
  }

  // Once a flight's end time has passed, its hours come off the aircraft.
  // The aircraft service remembers every flight it has counted, so calling this again is safe.
  settleFinishedFlights(): void {
    for (const assignment of this.rosterAssignments) {
      const { start, end } = this.windowOf(assignment);
      if (end > this.currentTime) { continue; }

      this.aircraftService.logFlight(this.flightKey(assignment), assignment.aircraft, this.hoursBetween(start, end));
    }
  }

  windowOf(assignment: TimeWindowSource): { start: Date; end: Date } {
    // Combine the assignment date with its times; an earlier end time means next-day release.
    const [startHour, startMinute] = assignment.startTime.split(':').map(Number);
    const [endHour, endMinute] = assignment.endTime.split(':').map(Number);
    const start = new Date(`${assignment.date}T00:00:00`);
    start.setHours(startHour, startMinute, 0, 0);
    const end = new Date(start);
    end.setHours(endHour, endMinute, 0, 0);

    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  }

  hoursBetween(start: Date, end: Date): number {
    const hours = roundHours((end.getTime() - start.getTime()) / 3600000);
    return hours > 0 ? hours : 0.1;   // even a very short flight uses at least a tenth
  }

  private flightKey(a: RosterAssignment): string {
    return `${a.aircraft}|${a.date}|${a.startTime}|${a.endTime}`;
  }

  private refreshList(): void {
    this.rosterAssignments = Object.values(this.assignments);
  }

  private buildAssignmentMap(items: RosterAssignment[]): Record<string, RosterAssignment> {
    return items.reduce<Record<string, RosterAssignment>>((map, assignment) => {
      map[assignment.id] = assignment;
      return map;
    }, {});
  }

  private todayKey(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
}