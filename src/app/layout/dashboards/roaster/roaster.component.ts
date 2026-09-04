import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
  selector: 'app-roaster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roaster.component.html',
  styleUrl: './roaster.component.css'
})
export class RoasterComponent {
  readonly roles: RosterRole[] = ['Trainee', 'Captain', 'Instructor', 'Flight Attendant'];
  readonly dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  readonly timeSlots: RosterSlot[] = [
    { key: 'morning', label: 'Morning' },
    { key: 'midday', label: 'Midday' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' }
  ];

  rosterDays: RosterDay[] = this.getNextDays(5);
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
  assignments: Record<string, RosterAssignment> = this.buildAssignmentMap(this.rosterAssignments);

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

  private buildAssignmentMap(items: RosterAssignment[]): Record<string, RosterAssignment> {
    return items.reduce<Record<string, RosterAssignment>>((map, assignment) => {
      map[assignment.id] = assignment;
      return map;
    }, {});
  }

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
