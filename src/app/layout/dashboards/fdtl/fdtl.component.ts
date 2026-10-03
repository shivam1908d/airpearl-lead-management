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
  // Connected to the “Crew Compliance” filter bar in the HTML (`.filter-toolbar`, `.select-filter`, `[(ngModel)]`).
  // These option lists define the values shown in the dropdowns so the page stays aligned with the mock FDTL dataset and the filters act on the same status/role/base values.
  readonly statusOptions: FdtlStatus[] = [
    'Compliant', 'Near Limit', 'Violation', 'Rest Required', 'No Data',
  ];
  readonly roleOptions = ['Captain', 'First Officer', 'Cabin Crew'];
  readonly baseOptions = ['DEL', 'BOM', 'VNS'];
  readonly crewMembers = CREW_MEMBERS;
  readonly upcomingDuties = UPCOMING_DUTIES;
  readonly alerts = FDTL_ALERTS;

  // Connected to the search field, date-range selector, table, and pagination controls in the “Crew Compliance” section (`input[type=search]`, `select`, `.pagination-bar`).
  // These properties store the current user selections and page state so the table only shows the records and sort order the user has chosen.
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

  // Connected to the loading skeletons and loader state used in `.summary-grid`, `.table-scroll`, and `@if (isLoading)` in the template.
  // This lifecycle hook starts the short demo loading delay when the component first appears, so the skeleton UI is visible before the mock data is displayed.
  ngOnInit(): void {
    this.loadTimer = setTimeout(() => this.isLoading = false, 350);
  }

  // Connected to the same loading and toast lifecycle used by the refresh, check, and notification actions across the page.
  // This clears any pending timers when the component is destroyed so delayed UI updates do not keep running after the screen is closed.
  ngOnDestroy(): void {
    clearTimeout(this.loadTimer);
    clearTimeout(this.checkTimer);
    clearTimeout(this.toastTimer);
  }

  // Connected to the top summary cards in `.summary-grid` and the `summaryCards` loop in the HTML.
  // This getter calculates the counts shown in each card from the mock crew list and upcoming-duty list so the summary values stay current with the visible data.
  get summary() {
    const totalCrew = this.crewMembers.length;
    const compliant = this.crewMembers.filter(crew => crew.status === 'Compliant').length;
    const violations = this.crewMembers.filter(crew => crew.status === 'Violation').length;
    const attentionRequired = this.crewMembers.filter(crew =>
      crew.status === 'Near Limit' || crew.status === 'Rest Required',
    ).length;
    return { totalCrew, compliant, violations, attentionRequired, upcomingDuties: this.upcomingDuties.length };
  }

  // Connected to the `@for (card of summaryCards)` block inside `.summary-grid` and the card label/value/icon bindings in the template.
  // This getter builds the data objects for each summary panel so the HTML can render the right label, tone, icon, and count without duplicating calculation logic.
  get summaryCards() {
    return [
      { label: 'Total Crew', value: this.summary.totalCrew, description: 'Crew monitored', icon: 'pi pi-users', tone: 'neutral' },
      { label: 'Compliant', value: this.summary.compliant, description: 'Currently within limits', icon: 'pi pi-check-circle', tone: 'good' },
      { label: 'Attention Required', value: this.summary.attentionRequired, description: 'Approaching a limit', icon: 'pi pi-exclamation-triangle', tone: 'warning' },
      { label: 'Violations', value: this.summary.violations, description: 'Needs immediate review', icon: 'pi pi-times-circle', tone: 'danger' },
      { label: 'Upcoming Duties', value: this.summary.upcomingDuties, description: 'Scheduled duties', icon: 'pi pi-calendar', tone: 'info' },
    ];
  }

  // Connected to the filtered crew count, the crew table rows, and the pagination controls in the “Crew Compliance” panel.
  // This getter applies the search, status, role, base, date-range, and sort rules before the page renders the rows that match the current filter state.
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

  // Connected to the visible rows in the main table and to the page numbers shown in `.pagination-bar`.
  // This keeps the current page to a fixed slice of the filtered list so the view is smaller and easier to browse.
  get visibleCrewMembers(): CrewMember[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCrewMembers.slice(start, start + this.pageSize);
  }

  // Connected to the text “Page x of y” and the Previous/Next buttons in `.pagination-bar`.
  // This calculates the available page count so the UI knows how many pages exist and prevents invalid page numbers.
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCrewMembers.length / this.pageSize));
  }

  // Connected to the page summary in `.pagination-bar` (`Showing {{ pageStart }}–{{ pageEnd }}`).
  // This returns the first and last row numbers for the current page so the user can see what range of records is on screen.
  get pageStart(): number {
    return this.filteredCrewMembers.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCrewMembers.length);
  }

  // Connected to the “Last checked” label in the `.system-status` section.
  // This formats the timestamp from the last compliance run into a readable date/time string for the page header.
  get lastCheckedLabel(): string {
    return this.lastChecked.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  // Connected to all filter controls in the HTML (`[(ngModel)]`, `.filter-toolbar`, `.select-filter`).
  // This resets the page number and closes any open action menu whenever a filter changes, keeping the table state consistent with the new selection.
  onFiltersChanged(): void {
    this.currentPage = 1;
    this.activeMenuId = null;
  }

  // Connected to the “Reset Filters” button in the empty and filter states.
  // This clears all selection states back to their defaults before re-running the same filter logic used by the table.
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'All';
    this.selectedRole = 'All';
    this.selectedBase = 'All';
    this.onFiltersChanged();
  }

  // Connected to the pagination buttons in `.pagination-controls` and their disabled states.
  // This keeps the current page inside a valid range so the table never tries to render a page that does not exist.
  changePage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  // Connected to the table header sort buttons and `[attr.aria-sort]` values in the crew table.
  // This toggles the current sort field and direction so the rows can be ordered by name, duty, utilization, rest, or status.
  sortBy(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
  }

  // Connected to the sort buttons in the header cells and the screen-reader labels in the HTML.
  // This returns the correct accessibility value for the current sorting direction so assistive tech can announce the column state clearly.
  sortAriaValue(key: SortKey): string {
    return this.sortKey !== key ? 'none' : this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  // Connected to the Refresh button in `.header-actions` and to the loading state in the summary/table sections.
  // This starts the loading spinner, clears any old timeout, and then shows the toast message after the mock data is refreshed.
  refreshData(): void {
    this.isLoading = true;
    this.hasError = false;
    clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => {
      this.isLoading = false;
      this.showToast('FDTL data refreshed using demo records.');
    }, 500);
  }

  // Connected to the retry button in the error box (`.state-message.error-state`).
  // This reuses the same refresh flow so the page can retry the demo load without duplicating logic.
  retryLoad(): void {
    this.refreshData();
  }

  // Connected to the “Run Compliance Check” button in `.system-actions` and the spinner shown while the check is running.
  // This prevents duplicate checks and updates the last checked time after a short delay so the user sees the demo check complete normally.
  runComplianceCheck(): void {
    if (this.isCheckingCompliance) return;
    this.isCheckingCompliance = true;
    this.checkTimer = setTimeout(() => {
      this.lastChecked = new Date();
      this.isCheckingCompliance = false;
      this.showToast('Demo compliance check completed successfully.');
    }, 900);
  }

  // Connected to the Export Report button in `.header-actions` and the report download actions in the crew detail menu.
  // This converts the filtered crew records into CSV content and triggers a browser download so the user can export the current demo dataset.
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

  // Connected to the action buttons in the crew row menu and the drawer opened by `selectedCrew`.
  // These methods keep the selected crew record, menu state, and download actions in step with what the user has clicked in the table and drawer.
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

  // Connected to the system action buttons and the review buttons in the upcoming duties and alert panels.
  // These methods show short demo toast messages only; they help the UI behave like a real application without changing the mock data behind it.
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

  // Connected to the `.status-badge`, `.status-icon`, and `[ngClass]="statusClass(...)"` bindings in the crew table, alerts list, and crew drawer.
  // These helper methods map each status label to the correct CSS class and icon so the same status text is shown with a consistent green, amber, red, or neutral style.
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

  // Connected to the usage and rest values shown in the crew table and detail drawer (`{{ formatHours(...) }}`, `{{ formatUsage(...) }}`, `.usage-value`, `.mini-progress`).
  // These formatting helpers turn raw mock numbers into readable values and percentage widths so the page displays consistent time and utilization information.
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

  // Connected to the toast notification shown after actions such as refresh, export, review, and compliance checks.
  // This method stores the active message and clears the previous timeout so the notification stays visible for a short time, then disappears cleanly.
  showToast(message: string): void {
    this.toastMessage = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = '', 3500);
  }

  // Connected to the sort buttons and the row ordering logic used by the “Crew Compliance” table.
  // This helper compares two crew records using the current sort column and direction so the table can return the correct order for display.
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

  // Connected to the date filter in the page header (`selectedDateRange`, `customDate`, `select` and `input[type=date]`).
  // This check decides whether a crew member's next duty falls inside the chosen reporting period so the visible table matches the selected date window.
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

  // Connected to the report export actions in the page header and crew detail menu.
  // These helpers turn the visible data into CSV rows and then create a download so the export matches the current filtered FDTL view.
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
