import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type RosterRole = 'Trainee' | 'Captain' | 'Instructor' | 'Flight Attendant';

interface RosterDay {
  key: string;
  date: string;
  label: string;
}

interface RosterSlot {
  key: string;
  label: string;
}

interface RosterAssignment {
  id: string;
  date: string;
  dayLabel: string;
  personName: string;
  role: RosterRole;
  aircraft: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roster.component.html',
  styleUrl: './roster.component.css'
})
export class RosterComponent implements OnInit, OnDestroy {
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

  // This is the initial in-memory roster data. Each assignment is keyed later by a unique slot identifier.
  rosterAssignments: RosterAssignment[] = [
    {
      id: '1',
      date: this.getTodayDate(),
      dayLabel: 'Monday',
      personName: 'Ava Martin',
      role: 'Captain',
      aircraft: 'A320',
      startTime: '08:00',
      endTime: '12:00'
    },
    {
      id: '2',
      date: this.getTodayDate(),
      dayLabel: 'Monday',
      personName: 'Leo Park',
      role: 'Flight Attendant',
      aircraft: 'B737',
      startTime: '14:00',
      endTime: '18:00'
    }
  ];
  // `assignments` acts like a lookup table: date + slot name => single assignment.
  // This makes it easy to find, edit, or replace a schedule item without scanning the whole array.
  assignments: Record<string, RosterAssignment> = this.buildAssignmentMap(this.rosterAssignments);

  isModalOpen = false;
  selectedSlotKey: string | null = null;
  // Updated every few seconds so assignments activate and finish without a page refresh.
  currentTime = new Date();

  private timer?: ReturnType<typeof setInterval>;

  form = {
    date: this.getTodayDate(),
    dayLabel: 'Monday',
    personName: '',
    role: 'Captain' as RosterRole,
    aircraft: '',
    startTime: '08:00',
    endTime: '12:00'
  };

  ngOnInit(): void {
    // Keep schedule checks in sync with the current local time.
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 5000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  get isFormValid(): boolean {
    return !!this.form.date && !!this.form.personName.trim() && !!this.form.aircraft.trim() && !!this.form.startTime && !!this.form.endTime;
  }

  openSlot(day: RosterDay, slot: RosterSlot): void {
    const slotKey = this.getSlotKey(day.date, slot.key);
    const existing = this.assignments[slotKey];

    if (existing) {
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
    const assignment = this.assignments[slotKey];
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
    if (!this.selectedSlotKey || !this.isFormValid) {
      return;
    }

    // A slot is identified by the date and the time block that the person starts in.
    // Example: 2026-10-03__morning. Reusing this key ensures one assignment occupies each slot.
    const nextSlotKey = this.getSlotKeyFromTime(this.form.date, this.form.startTime);
    const existingKey = this.selectedSlotKey;

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

    if (existingKey !== nextSlotKey) {
      delete this.assignments[existingKey];
    }

    this.assignments[nextSlotKey] = assignment;
    this.rosterAssignments = Object.values(this.assignments);
    this.closeModal();
  }

  removeAssignment(slotKey: string): void {
    delete this.assignments[slotKey];
    this.rosterAssignments = Object.values(this.assignments);
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
    return this.assignments[this.getSlotKey(day.date, slot.key)] || null;
  }

  isAssignmentActive(assignment: RosterAssignment): boolean {
    // Show the flight indicator only between this assignment's start and end.
    const { start, end } = this.getAssignmentWindow(assignment);
    return this.currentTime >= start && this.currentTime < end;
  }

  assignmentProgress(assignment: RosterAssignment): number {
    // Convert elapsed schedule time to a percentage for the progress track and airplane.
    const { start, end } = this.getAssignmentWindow(assignment);
    const duration = end.getTime() - start.getTime();

    if (duration <= 0) {
      return 0;
    }

    const progress = ((this.currentTime.getTime() - start.getTime()) / duration) * 100;
    return Math.max(0, Math.min(progress, 100));
  }

  private getAssignmentWindow(assignment: RosterAssignment): { start: Date; end: Date } {
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

  // Build a quick lookup map so the component can fetch assignments by date and slot without looping through all rows.
  private buildAssignmentMap(items: RosterAssignment[]): Record<string, RosterAssignment> {
    return items.reduce<Record<string, RosterAssignment>>((map, assignment) => {
      map[assignment.id] = assignment;
      return map;
    }, {});
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
