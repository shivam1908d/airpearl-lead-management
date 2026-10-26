import { Injectable } from '@angular/core';

export type LeaveType = 'Casual' | 'Sick' | 'Earned' | 'Medical' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type CrewRole = 'Trainee' | 'Captain' | 'Instructor' | 'Flight Attendant';

export interface CrewMember {
  name: string;
  role: CrewRole;
}

export interface LeaveRequest {
  id: number;
  person: string;
  role: CrewRole;
  type: LeaveType;
  from: string;         // YYYY-MM-DD
  to: string;           // YYYY-MM-DD, same as from for a one day leave
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewNote: string;
}

// days allowed per year, null means no limit
export const LEAVE_ALLOWANCE: Record<LeaveType, number | null> = {
  Casual: 12,
  Sick: 10,
  Earned: 15,
  Medical: 5,
  Unpaid: null,
};

// today as YYYY-MM-DD in local time, the offset moves it by that many days
export function dateKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// both end days count, so 28 Oct to 28 Oct is one day (weekends included)
export function countDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// builds a sample request with dates counted from today, so the demo always looks current
function sample(
  id: number, person: string, role: CrewRole, type: LeaveType,
  fromOffset: number, toOffset: number, reason: string,
  status: LeaveStatus, appliedOffset: number, reviewNote = ''
): LeaveRequest {
  const from = dateKey(fromOffset);
  const to = dateKey(toOffset);
  return { id, person, role, type, from, to, days: countDays(from, to), reason, status, appliedOn: dateKey(appliedOffset), reviewNote };
}

@Injectable({ providedIn: 'root' })
export class LeaveService {

  // people who can apply for leave, replace with your real crew list
  readonly crew: CrewMember[] = [
    { name: 'Ava Martin', role: 'Captain' },
    { name: 'Arjun Nair', role: 'Captain' },
    { name: 'Emma Clarke', role: 'Instructor' },
    { name: 'Sneha Rao', role: 'Instructor' },
    { name: 'Rohan Mehta', role: 'Trainee' },
    { name: 'Leo Park', role: 'Flight Attendant' },
  ];

  // sample requests until the leave API is ready
  requests: LeaveRequest[] = [
    sample(1, 'Emma Clarke', 'Instructor', 'Sick', 0, 1, 'Fever, doctor advised two days of rest.', 'Approved', -1, 'Get well soon.'),
    sample(2, 'Rohan Mehta', 'Trainee', 'Casual', 5, 7, 'Cousin\'s wedding in Lucknow.', 'Pending', -2),
    sample(3, 'Leo Park', 'Flight Attendant', 'Earned', 10, 16, 'Family trip to Kerala.', 'Pending', -3),
    sample(4, 'Ava Martin', 'Captain', 'Medical', 20, 20, 'Annual pilot medical renewal.', 'Approved', -6, 'Approved. Bring the certificate on return.'),
    sample(5, 'Sneha Rao', 'Instructor', 'Casual', -12, -10, 'Moving to a new flat.', 'Rejected', -18, 'Peak training week, please pick other dates.'),
    sample(6, 'Arjun Nair', 'Captain', 'Earned', -30, -26, 'Visiting family in Guwahati.', 'Approved', -40),
    sample(7, 'Rohan Mehta', 'Trainee', 'Sick', -8, -8, 'Stomach infection.', 'Approved', -8),
  ];

  roleOf(name: string): CrewRole | undefined {
    return this.crew.find((c) => c.name === name)?.role;
  }

  // days taken or waiting for approval in a year (a leave counts in the year it starts)
  daysUsed(person: string, type: LeaveType, year: number): number {
    return this.requests
      .filter((r) => r.person === person && r.type === type && r.status !== 'Rejected' && r.from.startsWith(String(year)))
      .reduce((sum, r) => sum + r.days, 0);
  }

  // null means this type has no limit
  daysLeft(person: string, type: LeaveType, year: number): number | null {
    const allowance = LEAVE_ALLOWANCE[type];
    return allowance === null ? null : Math.max(0, allowance - this.daysUsed(person, type, year));
  }

  // true if the person already has a leave (pending or approved) touching these dates
  overlaps(person: string, from: string, to: string): boolean {
    return this.requests.some((r) => r.person === person && r.status !== 'Rejected' && from <= r.to && to >= r.from);
  }

  // approved leaves that cover a date, the roster can use this to block assignments
  onLeaveOn(date: string): LeaveRequest[] {
    return this.requests.filter((r) => r.status === 'Approved' && r.from <= date && r.to >= date);
  }

  add(data: Pick<LeaveRequest, 'person' | 'role' | 'type' | 'from' | 'to' | 'reason'>): void {
    const id = Math.max(0, ...this.requests.map((r) => r.id)) + 1;
    this.requests = [
      ...this.requests,
      { ...data, id, days: countDays(data.from, data.to), status: 'Pending', appliedOn: dateKey(), reviewNote: '' },
    ];
  }

  // only pending requests can be decided
  review(id: number, status: 'Approved' | 'Rejected', note: string): void {
    this.requests = this.requests.map((r) =>
      r.id === id && r.status === 'Pending' ? { ...r, status, reviewNote: note } : r
    );
  }
}