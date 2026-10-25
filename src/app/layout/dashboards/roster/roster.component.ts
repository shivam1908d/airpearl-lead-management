import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Aircraft, AircraftService, roundHours } from '../../training-program/aircraft/aircraft.service';
import { RosterAssignment, RosterRole, RosterService } from './roster.service';

interface RosterDay {
  key: string;
  date: string;
  label: string;
}

interface RosterSlot {
  key: string;
  label: string;
}

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roster.component.html',
  styleUrl: './roster.component.css'
})
export class RosterComponent {
  private aircraftService = inject(AircraftService);
  private roster = inject(RosterService);

  readonly roles: RosterRole[] = ['Trainee', 'Captain', 'Instructor', 'Flight Attendant'];
  readonly dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  readonly timeSlots: RosterSlot[] = [
    { key: 'morning', label: 'Morning' },
    { key: 'midday', label: 'Midday' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' }
  ];

  // The UI shows a 5-day schedule, and each day is split into time buckets such as morning, midday, etc.
  rosterDays: RosterDay[] = this.getNextDays(5);

  isModalOpen = false;
  selectedSlotKey: string | null = null;

  form = {
    date: this.getTodayDate(),
    dayLabel: 'Monday',
    personName: '',
    role: 'Captain' as RosterRole,
    aircraft: '',
    startTime: '08:00',
    endTime: '12:00'
  };

  // the roster data lives in RosterService, so it survives leaving this page
  get rosterAssignments(): RosterAssignment[] {
    return this.roster.rosterAssignments;
  }

  get currentTime(): Date {
    return this.roster.currentTime;
  }

  get isFormValid(): boolean {
    return !!this.form.date && !!this.form.personName.trim() && !!this.form.aircraft.trim() && !!this.form.startTime && !!this.form.endTime;
  }

  // ---- aircraft picker: availability, hours and clashes ----

  get selectedAircraft(): Aircraft | undefined {
    return this.aircraftService.find(this.form.aircraft);
  }

  // available aircraft first, the ones that can't be picked go below them
  get aircraftOptions(): Aircraft[] {
    return [...this.aircraftService.fleet].sort(
      (a, b) => Number(!!this.unavailableReason(a)) - Number(!!this.unavailableReason(b))
    );
  }

  // hours this aircraft can still fly, after the flights already booked for it
  freeHours(a: Aircraft): number {
    return roundHours(this.aircraftService.hoursLeft(a) - this.reservedHours(a.registration));
  }

  // why an aircraft can't be picked right now, empty text means it can
  unavailableReason(a: Aircraft): string {
    if (a.status !== 'Available') { return a.status; }
    if (this.freeHours(a) <= 0) { return 'no hours left'; }

    const clash = this.clashingAssignment(a.registration);
    return clash ? `booked ${clash.startTime} - ${clash.endTime}` : '';
  }

  aircraftLabel(a: Aircraft): string {
    const name = `${a.registration} · ${a.model}`;
    const reason = this.unavailableReason(a);
    return reason ? `${name} (${reason})` : `${name} · ${this.freeHours(a)} h left`;
  }

  // length of the flight in the form, in hours (tenths)
  get flightHours(): number {
    if (!this.hasFormTimes() || this.form.startTime === this.form.endTime) { return 0; }
    const { start, end } = this.roster.windowOf(this.form);
    return this.roster.hoursBetween(start, end);
  }

  get flightDurationText(): string {
    if (!this.hasFormTimes() || this.form.startTime === this.form.endTime) { return '-'; }
    const { start, end } = this.roster.windowOf(this.form);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
  }

  get selectedFreeHours(): number {
    const aircraft = this.selectedAircraft;
    return aircraft ? this.freeHours(aircraft) : 0;
  }

  get hoursAfterFlight(): number {
    return roundHours(this.selectedFreeHours - this.flightHours);
  }

  // the message shown in the dialog when the chosen aircraft can't take this flight
  get aircraftIssue(): string {
    if (!this.form.aircraft) { return ''; }

    const aircraft = this.selectedAircraft;
    if (!aircraft) { return 'Choose an aircraft from the fleet list.'; }
    if (this.hasFormTimes() && this.form.startTime === this.form.endTime) {
      return 'Start and end time can\'t be the same.';
    }

    const reason = this.unavailableReason(aircraft);
    if (reason) { return `${aircraft.registration} can't be assigned: ${reason}.`; }

    if (this.flightHours > this.selectedFreeHours) {
      return `This flight needs ${this.flightHours} h but ${aircraft.registration} has only ${this.selectedFreeHours} h left before its inspection.`;
    }
    return '';
  }

  openSlot(day: RosterDay, slot: RosterSlot): void {
    const slotKey = this.getSlotKey(day.date, slot.key);

    if (this.roster.get(slotKey)) {
      this.loadFormForSlot(slotKey);
      return;
    }

    this.selectedSlotKey = slotKey;
    this.form = {
      date: day.date,
      dayLabel: day.label,
      personName: '',
      role: 'Captain',
      aircraft: '',
      startTime: '08:00',
      endTime: '12:00'
    };
    this.isModalOpen = true;
  }

  loadFormForSlot(slotKey: string): void {
    const assignment = this.roster.get(slotKey);
    if (!assignment) {
      return;
    }

    this.selectedSlotKey = slotKey;
    this.form = {
      date: assignment.date,
      dayLabel: assignment.dayLabel,
      personName: assignment.personName,
      role: assignment.role,
      aircraft: assignment.aircraft,
      startTime: assignment.startTime,
      endTime: assignment.endTime
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedSlotKey = null;
  }

  assignRoster(): void {
    if (!this.selectedSlotKey || !this.isFormValid || this.aircraftIssue) {
      return;
    }

    // A slot is identified by the date and the time block that the person starts in.
    // Example: 2026-10-03__morning. Reusing this key ensures one assignment occupies each slot.
    const nextSlotKey = this.getSlotKeyFromTime(this.form.date, this.form.startTime);

    const assignment: RosterAssignment = {
      id: nextSlotKey,
      date: this.form.date,
      dayLabel: this.form.dayLabel,
      personName: this.form.personName.trim(),
      role: this.form.role,
      aircraft: this.form.aircraft.trim(),
      startTime: this.form.startTime,
      endTime: this.form.endTime
    };

    this.roster.save(assignment, this.selectedSlotKey);
    this.roster.settleFinishedFlights();
    this.closeModal();
  }

  removeAssignment(slotKey: string): void {
    this.roster.remove(slotKey);
  }

  editAssignment(slotKey: string): void {
    this.loadFormForSlot(slotKey);
  }

  editRosterAssignment(assignment: RosterAssignment): void {
    this.loadFormForSlot(assignment.id);
  }

  deleteRosterAssignment(assignment: RosterAssignment): void {
    this.removeAssignment(assignment.id);
  }

  getAssignment(day: RosterDay, slot: RosterSlot): RosterAssignment | null {
    return this.roster.get(this.getSlotKey(day.date, slot.key)) || null;
  }

  isAssignmentActive(assignment: RosterAssignment): boolean {
    // Show the flight indicator only between this assignment's start and end.
    const { start, end } = this.roster.windowOf(assignment);
    return this.currentTime >= start && this.currentTime < end;
  }

  assignmentProgress(assignment: RosterAssignment): number {
    // Convert elapsed schedule time to a percentage for the progress track and airplane.
    const { start, end } = this.roster.windowOf(assignment);
    const duration = end.getTime() - start.getTime();

    if (duration <= 0) {
      return 0;
    }

    const progress = ((this.currentTime.getTime() - start.getTime()) / duration) * 100;
    return Math.max(0, Math.min(progress, 100));
  }

  // ---- aircraft hours bookkeeping ----

  // Hours already promised to flights that haven't finished yet.
  // The assignment being edited is skipped, so it doesn't count against itself.
  private reservedHours(registration: string): number {
    return this.rosterAssignments
      .filter((a) => a.aircraft === registration && a.id !== this.selectedSlotKey)
      .reduce((sum, a) => {
        const { start, end } = this.roster.windowOf(a);
        // finished flights are already inside the aircraft's total hours
        return end > this.currentTime ? sum + this.roster.hoursBetween(start, end) : sum;
      }, 0);
  }

  // another flight of the same aircraft that overlaps the times in the form
  private clashingAssignment(registration: string): RosterAssignment | undefined {
    if (!this.hasFormTimes()) { return undefined; }
    const mine = this.roster.windowOf(this.form);

    return this.rosterAssignments.find((a) => {
      if (a.aircraft !== registration || a.id === this.selectedSlotKey) { return false; }
      const other = this.roster.windowOf(a);
      return mine.start < other.end && mine.end > other.start;
    });
  }

  private hasFormTimes(): boolean {
    return !!this.form.date && !!this.form.startTime && !!this.form.endTime;
  }

  // The roster schedules people in coarse blocks of the day, not by exact minute.
  // This keeps the UI grid simple while still assigning a flight to the correct time period.
  private getSlotKeyFromTime(date: string, startTime: string): string {
    const startHour = Number(startTime.split(':')[0]);
    const slots = [
      { key: 'morning', start: 0, end: 12 },
      { key: 'midday', start: 12, end: 15 },
      { key: 'afternoon', start: 15, end: 18 },
      { key: 'evening', start: 18, end: 24 }
    ];

    const matched = slots.find((slot) => startHour >= slot.start && startHour < slot.end) ?? slots[0];
    return `${date}__${matched.key}`;
  }

  private getSlotKey(date: string, slotKey: string): string {
    return `${date}__${slotKey}`;
  }

  private getNextDays(count: number): RosterDay[] {
    const dates: RosterDay[] = [];
    const today = new Date();

    for (let i = 0; i < count; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        key: this.formatDateKey(date),
        date: this.formatDateKey(date),
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    return dates;
  }

  private getTodayDate(): string {
    return this.formatDateKey(new Date());
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}