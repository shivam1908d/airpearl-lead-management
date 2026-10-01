import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CREW_MEMBERS,
  FDTL_ALERTS,
  UPCOMING_DUTIES,
  type CrewMember,
  type DutyRecord,
  type FdtlAlert,
  type FdtlResult,
  type FdtlStatus,
  type Usage,
} from './fdtl.mock';

type SortKey = 'name' | 'nextDuty' | 'dutyUtilization' | 'flightUtilization' | 'rest' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-fdtl',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fdtl.component.html',
  styleUrl: './fdtl.component.css',
})
export class FdtlComponent implements OnInit, OnDestroy {
  readonly statusOptions: FdtlStatus[] = [
    'Compliant', 'Near Limit', 'Violation', 'Rest Required', 'No Data',
  ];
  readonly roleOptions = ['Captain', 'First Officer', 'Cabin Crew'];
  readonly baseOptions = ['DEL', 'BOM', 'VNS'];
  readonly crewMembers = CREW_MEMBERS;
  readonly upcomingDuties = UPCOMING_DUTIES;
  readonly alerts = FDTL_ALERTS;

  searchTerm = '';
  selectedStatus = 'All';
  selectedRole = 'All';
  selectedBase = 'All';
  selectedDateRange = 'Today';
  customDate = '2026-10-01';
  sortKey: SortKey = 'name';
  sortDirection: SortDirection = 'asc';
  currentPage = 1;
  readonly pageSize = 5;
  isLoading = true;
  hasError = false;
  isCheckingCompliance = false;
  lastChecked = new Date('2026-10-01T08:30:00');
  selectedCrew: CrewMember | null = null;
  activeMenuId: string | null = null;
  toastMessage = '';
  readonly reviewedAlertIds = new Set<string>();

  private loadTimer?: ReturnType<typeof setTimeout>;
  private checkTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadTimer = setTimeout(() => this.isLoading = false, 350);
  }

  ngOnDestroy(): void {
    clearTimeout(this.loadTimer);
    clearTimeout(this.checkTimer);
    clearTimeout(this.toastTimer);
  }

  get summary() {
    const totalCrew = this.crewMembers.length;
    const compliant = this.crewMembers.filter(crew => crew.status === 'Compliant').length;
    const violations = this.crewMembers.filter(crew => crew.status === 'Violation').length;
    const attentionRequired = this.crewMembers.filter(crew =>
      crew.status === 'Near Limit' || crew.status === 'Rest Required',
    ).length;
    return { totalCrew, compliant, violations, attentionRequired, upcomingDuties: this.upcomingDuties.length };
  }

  get summaryCards() {
    return [
      { label: 'Total Crew', value: this.summary.totalCrew, description: 'Crew monitored', icon: 'pi pi-users', tone: 'neutral' },
      { label: 'Compliant', value: this.summary.compliant, description: 'Currently within limits', icon: 'pi pi-check-circle', tone: 'good' },
      { label: 'Attention Required', value: this.summary.attentionRequired, description: 'Approaching a limit', icon: 'pi pi-exclamation-triangle', tone: 'warning' },
      { label: 'Violations', value: this.summary.violations, description: 'Needs immediate review', icon: 'pi pi-times-circle', tone: 'danger' },
      { label: 'Upcoming Duties', value: this.summary.upcomingDuties, description: 'Scheduled duties', icon: 'pi pi-calendar', tone: 'info' },
    ];
  }

  get filteredCrewMembers(): CrewMember[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.crewMembers
      .filter(crew => !query || crew.name.toLowerCase().includes(query) || crew.employeeId.toLowerCase().includes(query))
      .filter(crew => this.selectedStatus === 'All' || crew.status === this.selectedStatus)
      .filter(crew => this.selectedRole === 'All' || crew.role === this.selectedRole)
      .filter(crew => this.selectedBase === 'All' || crew.base === this.selectedBase)
      .filter(crew => this.matchesDateRange(crew.nextDuty))
      .sort((left, right) => this.compareCrew(left, right));
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

  get lastCheckedLabel(): string {
    return this.lastChecked.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.activeMenuId = null;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'All';
    this.selectedRole = 'All';
    this.selectedBase = 'All';
    this.onFiltersChanged();
  }

  changePage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  sortBy(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
  }

  sortAriaValue(key: SortKey): string {
    return this.sortKey !== key ? 'none' : this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  refreshData(): void {
    this.isLoading = true;
    this.hasError = false;
    clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => {
      this.isLoading = false;
      this.showToast('FDTL data refreshed using demo records.');
    }, 500);
  }

  retryLoad(): void {
    this.refreshData();
  }

  runComplianceCheck(): void {
    if (this.isCheckingCompliance) return;
    this.isCheckingCompliance = true;
    this.checkTimer = setTimeout(() => {
      this.lastChecked = new Date();
      this.isCheckingCompliance = false;
      this.showToast('Demo compliance check completed successfully.');
    }, 900);
  }

  exportReport(): void {
    const rows = [
      ['Crew Member', 'Employee ID', 'Role', 'Base', 'Status', 'Duty Hours', 'Flight Hours', 'Rest Remaining'],
      ...this.filteredCrewMembers.map(crew => [
        crew.name, crew.employeeId, crew.role, crew.base, crew.status,
        this.usageCsv(crew.dutyUsage), this.usageCsv(crew.flightUsage), this.hoursCsv(crew.restRemainingHours),
      ]),
    ];
    this.downloadCsv('fdtl-crew-report.csv', rows);
    this.showToast('FDTL report exported.');
  }

  downloadCrewReport(crew: CrewMember): void {
    this.downloadCsv(`fdtl-${crew.employeeId.toLowerCase()}-report.csv`, [
      ['Crew Member', 'Employee ID', 'Role', 'Base', 'Status'],
      [crew.name, crew.employeeId, crew.role, crew.base, crew.status],
    ]);
    this.showToast(`Report downloaded for ${crew.name}.`);
  }

  openCrewDetails(crew: CrewMember): void {
    this.selectedCrew = crew;
    this.activeMenuId = null;
  }

  closeCrewDetails(): void {
    this.selectedCrew = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCrewDetails();
    this.activeMenuId = null;
  }

  viewPolicy(): void {
    this.showToast('Active demo policy: Standard Crew Duty Policy.');
  }

  openSettings(): void {
    this.showToast('FDTL settings are read-only in demo mode.');
  }

  viewFullHistory(crew: CrewMember): void {
    this.showToast(`Full history is not available in demo mode for ${crew.name}.`);
  }

  crewName(crewId: string): string {
    return this.crewMembers.find(crew => crew.id === crewId)?.name ?? 'Crew member';
  }

  toggleMenu(crewId: string): void {
    this.activeMenuId = this.activeMenuId === crewId ? null : crewId;
  }

  markAlertReviewed(alert: FdtlAlert): void {
    this.reviewedAlertIds.add(alert.id);
    this.showToast('Alert marked as reviewed.');
  }

  reviewDuty(duty: DutyRecord): void {
    this.showToast(`Duty ${duty.dutyId} added to review.`);
  }

  statusClass(status: FdtlStatus | FdtlResult): string {
    switch (status) {
      case 'Compliant':
      case 'Valid':
        return 'status-good';
      case 'Near Limit':
        return 'status-warning';
      case 'Violation':
      case 'Blocked':
        return 'status-danger';
      case 'Rest Required':
      case 'Requires Review':
        return 'status-review';
      case 'No Data':
        return 'status-neutral';
    }
  }

  statusIcon(status: FdtlStatus | FdtlResult): string {
    switch (status) {
      case 'Compliant':
      case 'Valid': return 'pi pi-check-circle';
      case 'Near Limit': return 'pi pi-exclamation-triangle';
      case 'Violation':
      case 'Blocked': return 'pi pi-times-circle';
      case 'Rest Required':
      case 'Requires Review': return 'pi pi-clock';
      case 'No Data': return 'pi pi-minus-circle';
    }
  }

  severityClass(severity: FdtlAlert['severity']): string {
    return severity === 'Violation' ? 'status-danger' : severity === 'Warning' ? 'status-warning' : 'status-info';
  }

  formatHours(value: number | null): string {
    return value === null ? '—' : `${value}h`;
  }

  formatUsage(usage: Usage | null): string {
    return usage ? `${usage.used}h / ${usage.limit}h` : 'No data';
  }

  usagePercent(usage: Usage | null): number {
    if (!usage || usage.limit <= 0) return 0;
    return Math.min((usage.used / usage.limit) * 100, 100);
  }

  usageClass(usage: Usage | null): string {
    if (!usage) return 'progress-neutral';
    const ratio = usage.used / usage.limit;
    return ratio >= 1 ? 'progress-danger' : ratio >= 0.85 ? 'progress-warning' : 'progress-good';
  }

  formatDateTime(value: string | null): string {
    if (!value) return 'Not scheduled';
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  showToast(message: string): void {
    this.toastMessage = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = '', 3500);
  }

  private compareCrew(left: CrewMember, right: CrewMember): number {
    let result = 0;
    switch (this.sortKey) {
      case 'name': result = left.name.localeCompare(right.name); break;
      case 'nextDuty': result = (left.nextDuty ?? '').localeCompare(right.nextDuty ?? ''); break;
      case 'dutyUtilization': result = this.utilization(left.dutyUsage) - this.utilization(right.dutyUsage); break;
      case 'flightUtilization': result = this.utilization(left.flightUsage) - this.utilization(right.flightUsage); break;
      case 'rest': result = (left.restRemainingHours ?? -1) - (right.restRemainingHours ?? -1); break;
      case 'status': result = this.statusRank(left.status) - this.statusRank(right.status); break;
    }
    return this.sortDirection === 'asc' ? result : -result;
  }

  private utilization(usage: Usage | null): number {
    return usage && usage.limit ? usage.used / usage.limit : -1;
  }

  private statusRank(status: FdtlStatus): number {
    return this.statusOptions.indexOf(status);
  }

  private matchesDateRange(nextDuty: string | null): boolean {
    if (!nextDuty) return true;
    const dutyDate = new Date(nextDuty);
    const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (this.selectedDateRange === 'Custom Date') return dateKey(dutyDate) === this.customDate;
    const today = new Date();
    if (this.selectedDateRange === 'Today') return dateKey(dutyDate) === dateKey(today);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return dutyDate >= startOfWeek && dutyDate < endOfWeek;
  }

  private usageCsv(usage: Usage | null): string {
    return usage ? `${usage.used}h / ${usage.limit}h` : 'No data';
  }

  private hoursCsv(hours: number | null): string {
    return hours === null ? 'No data' : `${hours}h`;
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const content = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

}
