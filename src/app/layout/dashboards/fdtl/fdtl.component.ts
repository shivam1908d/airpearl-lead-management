import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FDTL_API } from './fdtl.api';
import type {
  CrewMember,
  DateRange,
  DutyRecord,
  FdtlAlert,
  FdtlResult,
  FdtlSnapshot,
  FdtlStatus,
  Usage,
} from './fdtl.models';

type SortKey = 'name' | 'status' | 'duty' | 'flight';
type SortDirection = 'asc' | 'desc';
type GroupKey = 'all' | 'compliant' | 'attention' | 'violation' | 'nodata';

// worst first, this is what the default sort uses
const SEVERITY: Record<FdtlStatus, number> = {
  Violation: 0,
  'Rest Required': 1,
  'Near Limit': 2,
  'No Data': 3,
  Compliant: 4,
};

// the tabs above the table, every crew member belongs to exactly one of them
const GROUPS: Record<GroupKey, { label: string; statuses: FdtlStatus[] | null; dot: string }> = {
  all: { label: 'All crew', statuses: null, dot: 'bg-gray-400' },
  compliant: { label: 'Compliant', statuses: ['Compliant'], dot: 'bg-green-500' },
  attention: { label: 'Needs attention', statuses: ['Near Limit', 'Rest Required'], dot: 'bg-amber-400' },
  violation: { label: 'Violations', statuses: ['Violation'], dot: 'bg-red-500' },
  nodata: { label: 'No data', statuses: ['No Data'], dot: 'bg-gray-300' },
};

@Component({
  selector: 'app-fdtl',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fdtl.component.html',
  styleUrl: './fdtl.component.css',
})
export class FdtlComponent implements OnInit, OnDestroy {
  // all data comes through this, the mock now and the real API later
  private api = inject(FDTL_API);

  readonly dateRanges: DateRange[] = ['Today', 'This Week', 'Custom Date'];
  readonly groups = Object.keys(GROUPS) as GroupKey[];
  readonly pageSize = 8;

  // loaded data
  crewMembers: CrewMember[] = [];
  upcomingDuties: DutyRecord[] = [];
  alerts: FdtlAlert[] = [];
  policyName = '';
  isSample = false;
  lastUpdated: Date | null = null;

  // screen state
  isLoading = true;
  hasError = false;

  // what is asked from the backend
  selectedDateRange: DateRange = 'Today';
  customDate = this.todayKey();

  // filters on the loaded crew
  searchTerm = '';
  selectedGroup: GroupKey = 'all';
  selectedRole = '';
  selectedBase = '';
  sortKey: SortKey = 'status';
  sortDirection: SortDirection = 'asc';
  currentPage = 1;

  // alerts, drawer and toast
  readonly reviewedAlertIds = new Set<string>();
  showAllAlerts = false;
  selectedCrew: CrewMember | null = null;
  toastMessage = '';
  toastIsError = false;

  private loadSub?: Subscription;
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    clearTimeout(this.toastTimer);
  }

  // ---- loading ----

  load(): void {
    // a newer request replaces one that is still running
    this.loadSub?.unsubscribe();
    this.isLoading = true;
    this.hasError = false;

    this.loadSub = this.api
      .getSnapshot({ range: this.selectedDateRange, date: this.customDate })
      .subscribe({
        next: (snapshot) => this.applySnapshot(snapshot),
        error: () => {
          this.isLoading = false;
          this.hasError = true;
        },
      });
  }

  onDateChanged(): void {
    this.currentPage = 1;
    this.load();
  }

  private applySnapshot(snapshot: FdtlSnapshot): void {
    this.crewMembers = snapshot.crew;
    this.upcomingDuties = snapshot.duties;
    this.alerts = snapshot.alerts;
    this.policyName = snapshot.policyName;
    this.isSample = snapshot.sample;
    this.lastUpdated = new Date(snapshot.generatedAt);
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.isLoading = false;
  }

  // ---- summary tabs ----

  groupLabel(key: GroupKey): string {
    return GROUPS[key].label;
  }

  groupDot(key: GroupKey): string {
    return GROUPS[key].dot;
  }

  groupCount(key: GroupKey): number {
    const statuses = GROUPS[key].statuses;
    return statuses ? this.crewMembers.filter((crew) => statuses.includes(crew.status)).length : this.crewMembers.length;
  }

  selectGroup(key: GroupKey): void {
    this.selectedGroup = key;
    this.currentPage = 1;
  }

  // ---- crew table ----

  // the role and base lists come from the loaded crew, so a new base shows up on its own
  get roleOptions(): string[] {
    return [...new Set(this.crewMembers.map((crew) => crew.role))].sort();
  }

  get baseOptions(): string[] {
    return [...new Set(this.crewMembers.map((crew) => crew.base))].sort();
  }

  get filteredCrewMembers(): CrewMember[] {
    const query = this.searchTerm.trim().toLowerCase();
    const statuses = GROUPS[this.selectedGroup].statuses;

    return this.crewMembers
      .filter((crew) => !query || crew.name.toLowerCase().includes(query) || crew.employeeId.toLowerCase().includes(query))
      .filter((crew) => !statuses || statuses.includes(crew.status))
      .filter((crew) => !this.selectedRole || crew.role === this.selectedRole)
      .filter((crew) => !this.selectedBase || crew.base === this.selectedBase)
      .sort((a, b) => this.compareCrew(a, b));
  }

  get visibleCrewMembers(): CrewMember[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCrewMembers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCrewMembers.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredCrewMembers.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCrewMembers.length);
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedGroup = 'all';
    this.selectedRole = '';
    this.selectedBase = '';
    this.currentPage = 1;
  }

  changePage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  sortBy(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      // hours columns start with the most used crew
      this.sortDirection = key === 'duty' || key === 'flight' ? 'desc' : 'asc';
    }
  }

  sortAriaValue(key: SortKey): string {
    return this.sortKey !== key ? 'none' : this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) { return 'pi-sort-alt opacity-40'; }
    return this.sortDirection === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down-alt';
  }

  // ---- alerts ----

  get openAlertCount(): number {
    return this.alerts.filter((alert) => !this.reviewedAlertIds.has(alert.id)).length;
  }

  // alerts nobody has looked at yet come first
  get sortedAlerts(): FdtlAlert[] {
    return [...this.alerts].sort((a, b) =>
      Number(this.reviewedAlertIds.has(a.id)) - Number(this.reviewedAlertIds.has(b.id)) ||
      b.timestamp.localeCompare(a.timestamp)
    );
  }

  get shownAlerts(): FdtlAlert[] {
    return this.showAllAlerts ? this.sortedAlerts : this.sortedAlerts.slice(0, 3);
  }

  markAlertReviewed(alert: FdtlAlert): void {
    this.api.reviewAlert(alert.id).subscribe({
      next: () => {
        this.reviewedAlertIds.add(alert.id);
        this.showToast('Alert marked as reviewed.');
      },
      error: () => this.showToast('Could not update the alert. Try again.', true),
    });
  }

  severityTone(severity: FdtlAlert['severity']): string {
    return severity === 'Violation' ? 'bg-red-50 text-red-600' : severity === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600';
  }

  severityIcon(severity: FdtlAlert['severity']): string {
    return severity === 'Violation' ? 'pi-times-circle' : severity === 'Warning' ? 'pi-exclamation-triangle' : 'pi-info-circle';
  }

  // ---- crew drawer ----

  crewName(crewId: string): string {
    return this.crewMembers.find((crew) => crew.id === crewId)?.name ?? 'Crew member';
  }

  openCrewDetails(crew: CrewMember): void {
    this.selectedCrew = crew;
  }

  closeCrewDetails(): void {
    this.selectedCrew = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCrewDetails();
  }

  // ---- export ----

  exportReport(): void {
    const rows = [
      ['Crew member', 'Employee ID', 'Role', 'Base', 'Status', 'Duty hours', 'Flight hours', 'Rest remaining'],
      ...this.filteredCrewMembers.map((crew) => [
        crew.name, crew.employeeId, crew.role, crew.base, crew.status,
        this.usageText(crew.dutyUsage), this.usageText(crew.flightUsage), this.formatHours(crew.restRemainingHours),
      ]),
    ];
    this.downloadCsv(`fdtl-crew-report-${this.todayKey()}.csv`, rows);
    this.showToast('Report downloaded.');
  }

  downloadCrewReport(crew: CrewMember): void {
    this.downloadCsv(`fdtl-${crew.employeeId.toLowerCase()}-${this.todayKey()}.csv`, [
      ['Crew member', 'Employee ID', 'Role', 'Base', 'Status', 'Duty hours', 'Flight hours', 'Rest remaining'],
      [
        crew.name, crew.employeeId, crew.role, crew.base, crew.status,
        this.usageText(crew.dutyUsage), this.usageText(crew.flightUsage), this.formatHours(crew.restRemainingHours),
      ],
    ]);
    this.showToast(`Report downloaded for ${crew.name}.`);
  }

  // ---- display helpers ----

  statusClass(status: FdtlStatus | FdtlResult): string {
    switch (status) {
      case 'Compliant':
      case 'Valid':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Near Limit':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      case 'Violation':
      case 'Blocked':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'Rest Required':
      case 'Requires Review':
        return 'bg-violet-50 text-violet-700 ring-violet-600/20';
      case 'No Data':
        return 'bg-gray-100 text-gray-600 ring-gray-500/20';
    }
  }

  statusIcon(status: FdtlStatus | FdtlResult): string {
    switch (status) {
      case 'Compliant':
      case 'Valid': return 'pi-check-circle';
      case 'Near Limit': return 'pi-exclamation-triangle';
      case 'Violation':
      case 'Blocked': return 'pi-times-circle';
      case 'Rest Required':
      case 'Requires Review': return 'pi-clock';
      case 'No Data': return 'pi-minus-circle';
    }
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  // 9.5 stays 9.5, 13 becomes 13
  hoursText(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  formatHours(value: number | null): string {
    return value === null ? '-' : `${this.hoursText(value)} h`;
  }

  usageText(usage: Usage | null): string {
    return usage ? `${this.hoursText(usage.used)} / ${this.hoursText(usage.limit)} h` : 'No data';
  }

  usagePercent(usage: Usage | null): number {
    if (!usage || usage.limit <= 0) { return 0; }
    return Math.min((usage.used / usage.limit) * 100, 100);
  }

  // red at the limit, amber when close to it
  usageBar(usage: Usage | null): string {
    if (!usage || usage.limit <= 0) { return 'bg-gray-300'; }
    const ratio = usage.used / usage.limit;
    return ratio >= 1 ? 'bg-red-500' : ratio >= 0.85 ? 'bg-amber-400' : 'bg-sky-500';
  }

  usageTextClass(usage: Usage | null): string {
    if (!usage || usage.limit <= 0) { return 'text-gray-500'; }
    const ratio = usage.used / usage.limit;
    return ratio >= 1 ? 'font-medium text-red-600' : ratio >= 0.85 ? 'text-amber-600' : 'text-gray-700';
  }

  // "Today, 1:40 pm", "Tomorrow, 9:00 am" or "4 Oct, 6:15 am"
  formatWhen(value: string | null): string {
    if (!value) { return 'Not scheduled'; }

    const date = new Date(value);
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const diff = this.dayDiff(date);

    if (diff === 0) { return `Today, ${time}`; }
    if (diff === 1) { return `Tomorrow, ${time}`; }
    if (diff === -1) { return `Yesterday, ${time}`; }
    return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
  }

  // report and release in one line, the day is repeated only when the duty crosses midnight
  formatDuty(report: string, release: string): string {
    const end = new Date(release);
    const sameDay = this.dayDiff(new Date(report)) === this.dayDiff(end);
    const endText = sameDay ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : this.formatWhen(release);
    return `${this.formatWhen(report)} - ${endText}`;
  }

  showToast(message: string, isError = false): void {
    this.toastMessage = message;
    this.toastIsError = isError;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMessage = ''), 3500);
  }

  // ---- private helpers ----

  private compareCrew(a: CrewMember, b: CrewMember): number {
    let result = 0;
    switch (this.sortKey) {
      case 'name': result = a.name.localeCompare(b.name); break;
      case 'status': result = SEVERITY[a.status] - SEVERITY[b.status]; break;
      case 'duty': result = this.utilization(a.dutyUsage) - this.utilization(b.dutyUsage); break;
      case 'flight': result = this.utilization(a.flightUsage) - this.utilization(b.flightUsage); break;
    }
    // equal rows stay in name order, so the list doesn't jump around
    return (this.sortDirection === 'asc' ? result : -result) || a.name.localeCompare(b.name);
  }

  private utilization(usage: Usage | null): number {
    return usage && usage.limit ? usage.used / usage.limit : -1;
  }

  // whole days between a date and today, negative means in the past
  private dayDiff(date: Date): number {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((day.getTime() - today.getTime()) / 86400000);
  }

  private todayKey(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const content = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}