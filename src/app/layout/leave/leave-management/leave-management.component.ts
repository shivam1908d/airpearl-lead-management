import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CrewMember, LEAVE_ALLOWANCE, LeaveRequest, LeaveService, LeaveStatus, LeaveType, countDays, dateKey
} from './leave.service';

type SortKey = 'person' | 'from';
type CardKey = LeaveStatus | 'today';

interface StatCard {
  key: CardKey;
  label: string;
  icon: string;
  tone: string;
}

interface BalanceRow {
  type: LeaveType;
  allowance: number;
  used: number;
  left: number;
  percent: number;   // how much of the allowance is gone
}

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './leave-management.component.html',
  styleUrl: './leave-management.component.css'
})
export class LeaveManagementComponent {
  private fb = inject(FormBuilder);
  private leaveService = inject(LeaveService);

  readonly types: LeaveType[] = ['Casual', 'Sick', 'Earned', 'Medical', 'Unpaid'];
  readonly balanceTypes: LeaveType[] = ['Casual', 'Sick', 'Earned', 'Medical'];

  readonly statCards: StatCard[] = [
    { key: 'Pending', label: 'Pending', icon: 'pi-clock', tone: 'bg-amber-50 text-amber-600' },
    { key: 'Approved', label: 'Approved', icon: 'pi-check-circle', tone: 'bg-green-50 text-green-600' },
    { key: 'Rejected', label: 'Rejected', icon: 'pi-times-circle', tone: 'bg-red-50 text-red-600' },
    { key: 'today', label: 'On leave today', icon: 'pi-user-minus', tone: 'bg-sky-50 text-sky-600' },
  ];

  // badge colours per status
  readonly statusClass: Record<LeaveStatus, string> = {
    Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Approved: 'bg-green-50 text-green-700 ring-green-600/20',
    Rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  };

  // colour of the leave type badge
  readonly typeTone: Record<LeaveType, string> = {
    Casual: 'bg-sky-50 text-sky-700',
    Sick: 'bg-rose-50 text-rose-700',
    Earned: 'bg-emerald-50 text-emerald-700',
    Medical: 'bg-violet-50 text-violet-700',
    Unpaid: 'bg-gray-100 text-gray-600',
  };

  readonly fieldClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  // the requests live in LeaveService, so they stay when you move to another page
  get requests(): LeaveRequest[] {
    return this.leaveService.requests;
  }

  get crew(): CrewMember[] {
    return this.leaveService.crew;
  }

  // filters and sorting
  search = '';
  typeFilter: LeaveType | '' = '';
  statusFilter: LeaveStatus | '' = '';
  todayOnly = false;
  sortKey: SortKey = 'from';
  sortDir: 1 | -1 = -1;   // latest leave first

  // open row, reviewer notes and the balance panel
  expandedId: number | null = null;
  reviewNotes: Record<number, string> = {};
  balancePerson = this.leaveService.crew[0].name;

  // apply dialog
  modalOpen = false;

  form = this.fb.nonNullable.group({
    person: [this.leaveService.crew[0].name, Validators.required],
    type: ['Casual' as LeaveType, Validators.required],
    from: [dateKey(), Validators.required],
    to: [dateKey(), Validators.required],
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  get visibleRequests(): LeaveRequest[] {
    const q = this.search.trim().toLowerCase();
    const today = dateKey();
    return this.requests
      .filter((r) => !q || r.person.toLowerCase().includes(q))
      .filter((r) => !this.typeFilter || r.type === this.typeFilter)
      .filter((r) => !this.statusFilter || r.status === this.statusFilter)
      .filter((r) => !this.todayOnly || (r.status === 'Approved' && r.from <= today && r.to >= today))
      .sort((a, b) => this.compare(a, b) * this.sortDir);
  }

  // ---- stat cards ----

  cardCount(key: CardKey): number {
    if (key === 'today') { return this.leaveService.onLeaveOn(dateKey()).length; }
    return this.requests.filter((r) => r.status === key).length;
  }

  cardActive(key: CardKey): boolean {
    return key === 'today' ? this.todayOnly : this.statusFilter === key;
  }

  // clicking a selected card again clears it
  selectCard(key: CardKey): void {
    if (key === 'today') {
      this.todayOnly = !this.todayOnly;
      this.statusFilter = '';
    } else {
      this.todayOnly = false;
      this.statusFilter = this.statusFilter === key ? '' : key;
    }
  }

  clearFilters(): void {
    this.search = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.todayOnly = false;
  }

  get pendingCount(): number {
    return this.cardCount('Pending');
  }

  // ---- leave balance ----

  get balanceRows(): BalanceRow[] {
    const year = new Date().getFullYear();
    return this.balanceTypes.map((type) => {
      const allowance = LEAVE_ALLOWANCE[type] as number;
      const used = this.leaveService.daysUsed(this.balancePerson, type, year);
      return {
        type,
        allowance,
        used,
        left: Math.max(0, allowance - used),
        percent: Math.min(100, Math.round((used / allowance) * 100)),
      };
    });
  }

  get unpaidDays(): number {
    return this.leaveService.daysUsed(this.balancePerson, 'Unpaid', new Date().getFullYear());
  }

  // red when nothing is left, amber when almost gone
  meterBar(row: BalanceRow): string {
    if (row.left === 0) { return 'bg-red-500'; }
    return row.percent >= 80 ? 'bg-amber-400' : 'bg-sky-500';
  }

  // ---- table helpers ----

  typeLabel(type: LeaveType): string {
    return `${type} leave`;
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
    } else {
      this.sortKey = key;
      this.sortDir = key === 'from' ? -1 : 1;
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) { return 'pi-sort-alt opacity-40'; }
    return this.sortDir === 1 ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down-alt';
  }

  toggleRow(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  trackById(_: number, r: LeaveRequest): number {
    return r.id;
  }

  // approve or reject, the note typed in the opened row goes along with it
  review(r: LeaveRequest, status: 'Approved' | 'Rejected'): void {
    this.leaveService.review(r.id, status, (this.reviewNotes[r.id] ?? '').trim());
    delete this.reviewNotes[r.id];
  }

  // ---- apply dialog ----

  openApply(): void {
    this.form.reset({
      person: this.balancePerson,
      type: 'Casual',
      from: dateKey(),
      to: dateKey(),
      reason: '',
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen) { this.closeModal(); }
  }

  // number of days in the dialog, 0 while the dates are not valid
  get formDays(): number {
    const { from, to } = this.form.getRawValue();
    if (!from || !to || to < from) { return 0; }
    return countDays(from, to);
  }

  // days of this leave type still free for the person, null when the type has no limit
  get formLeft(): number | null {
    const { person, type, from } = this.form.getRawValue();
    const year = Number((from || dateKey()).slice(0, 4));
    return this.leaveService.daysLeft(person, type, year);
  }

  // what stops the request from being sent, empty text means all good
  get dialogIssue(): string {
    const { person, type, from, to } = this.form.getRawValue();
    if (!from || !to) { return ''; }
    if (to < from) { return 'The to date can\'t be before the from date.'; }
    if (this.leaveService.overlaps(person, from, to)) {
      return `${person} already has a leave on some of these dates.`;
    }

    const left = this.formLeft;
    if (left !== null && this.formDays > left) {
      return `Only ${left} ${left === 1 ? 'day' : 'days'} of ${this.typeLabel(type).toLowerCase()} left this year.`;
    }
    return '';
  }

  get dialogSummary(): string {
    const days = this.formDays;
    if (!days) { return ''; }

    const dayText = `${days} ${days === 1 ? 'day' : 'days'}`;
    const left = this.formLeft;
    const type = this.form.controls.type.value;
    return left === null
      ? `${dayText} of unpaid leave`
      : `${dayText} · ${left - days} of ${LEAVE_ALLOWANCE[type]} ${type.toLowerCase()} days left after this`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.dialogIssue) { return; }

    const v = this.form.getRawValue();
    this.leaveService.add({
      person: v.person,
      role: this.leaveService.roleOf(v.person) ?? 'Trainee',
      type: v.type,
      from: v.from,
      to: v.to,
      reason: v.reason.trim(),
    });
    this.closeModal();
  }

  private compare(a: LeaveRequest, b: LeaveRequest): number {
    return this.sortKey === 'person' ? a.person.localeCompare(b.person) : a.from.localeCompare(b.from);
  }
}