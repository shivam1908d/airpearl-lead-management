import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Aircraft, AircraftService, AircraftStatus, AircraftType, BaseName } from './aircraft.service';

type SortKey = 'registration' | 'totalHours' | 'hoursLeft';

interface BaseInfo {
  name: BaseName;
  state: string;
}

@Component({
  selector: 'app-aircraft',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './aircraft.component.html',
  styleUrl: './aircraft.component.css'
})
export class AircraftComponent {
  private fb = inject(FormBuilder);
  private aircraftService = inject(AircraftService);

  readonly bases: BaseInfo[] = [
    { name: 'Varanasi', state: 'Uttar Pradesh' },
    { name: 'Hyderabad', state: 'Telangana' },
    { name: 'Bengaluru', state: 'Karnataka' },
    { name: 'Guwahati', state: 'Assam' },
  ];

  readonly types: AircraftType[] = ['Single-engine', 'Multi-engine'];
  readonly statuses: AircraftStatus[] = ['Available', 'In maintenance', 'Grounded'];

  // badge colours per status
  readonly statusClass: Record<AircraftStatus, string> = {
    Available: 'bg-green-50 text-green-700 ring-green-600/20',
    'In maintenance': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Grounded: 'bg-red-50 text-red-700 ring-red-600/20',
  };

  // label and colour for the plane icon and the type badge
  readonly typeStyle: Record<AircraftType, { label: string; tone: string }> = {
    'Single-engine': { label: 'Single engine', tone: 'bg-sky-50 text-sky-600' },
    'Multi-engine': { label: 'Multi engine', tone: 'bg-violet-50 text-violet-600' },
  };

  readonly fieldClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  // the fleet lives in AircraftService so the roster reads the same list
  get fleet(): Aircraft[] {
    return this.aircraftService.fleet;
  }

  set fleet(value: Aircraft[]) {
    this.aircraftService.fleet = value;
  }

  // filters and sorting
  search = '';
  typeFilter: AircraftType | '' = '';
  statusFilter: AircraftStatus | '' = '';
  baseFilter: BaseName | '' = '';
  sortKey: SortKey = 'registration';
  sortDir: 1 | -1 = 1;

  // open row and add/edit dialog state
  expandedId: number | null = null;
  modalOpen = false;
  editingId: number | null = null;
  registrationTaken = false;

  form = this.fb.nonNullable.group({
    registration: ['', Validators.required],
    model: ['', Validators.required],
    type: ['Single-engine' as AircraftType, Validators.required],
    base: ['Varanasi' as BaseName, Validators.required],
    status: ['Available' as AircraftStatus, Validators.required],
    totalHours: [0, [Validators.required, Validators.min(0)]],
    lastInspectionHours: [0, [Validators.required, Validators.min(0)]],
    inspectionInterval: [100, [Validators.required, Validators.min(1)]],
    engine: [''],
    seats: [2, [Validators.required, Validators.min(1)]],
    cruiseSpeed: [100, [Validators.required, Validators.min(1)]],
    fuelCapacity: [100, [Validators.required, Validators.min(1)]],
    note: [''],
  });

  get visibleAircraft(): Aircraft[] {
    const q = this.search.trim().toLowerCase();
    return this.fleet
      .filter((a) => !q || a.registration.toLowerCase().includes(q) || a.model.toLowerCase().includes(q))
      .filter((a) => !this.typeFilter || a.type === this.typeFilter)
      .filter((a) => !this.statusFilter || a.status === this.statusFilter)
      .filter((a) => !this.baseFilter || a.base === this.baseFilter)
      .sort((a, b) => this.compare(a, b) * this.sortDir);
  }

  get fleetHours(): number {
    return this.fleet.reduce((sum, a) => sum + a.totalHours, 0);
  }

  aircraftAt(base: BaseName): number {
    return this.fleet.filter((a) => a.base === base).length;
  }

  availableAt(base: BaseName): number {
    return this.fleet.filter((a) => a.base === base && a.status === 'Available').length;
  }

  // clicking the selected base again shows every base
  filterByBase(base: BaseName): void {
    this.baseFilter = this.baseFilter === base ? '' : base;
  }

  clearFilters(): void {
    this.search = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.baseFilter = '';
  }

  // ---- inspection maths ----

  hoursLeft(a: Aircraft): number {
    return this.aircraftService.hoursLeft(a);
  }

  usedPercent(a: Aircraft): number {
    const used = ((a.inspectionInterval - this.hoursLeft(a)) / a.inspectionInterval) * 100;
    return Math.max(0, Math.min(100, Math.round(used)));
  }

  inspectionLabel(a: Aircraft): string {
    const left = this.hoursLeft(a);
    return left <= 0 ? `Overdue by ${Math.abs(left)} h` : `${left} h left`;
  }

  // red when overdue, amber when due soon, otherwise normal
  inspectionBar(a: Aircraft): string {
    const left = this.hoursLeft(a);
    if (left <= 0) { return 'bg-red-500'; }
    return left <= 15 ? 'bg-amber-400' : 'bg-sky-500';
  }

  inspectionText(a: Aircraft): string {
    const left = this.hoursLeft(a);
    if (left <= 0) { return 'font-medium text-red-600'; }
    return left <= 15 ? 'text-amber-600' : 'text-gray-600';
  }

  // what shows in the opened row
  details(a: Aircraft): { label: string; value: string }[] {
    const hrs = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' h';
    return [
      { label: 'Base', value: a.base },
      { label: 'Type', value: this.typeStyle[a.type].label },
      { label: 'Total hours', value: hrs(a.totalHours) },
      { label: 'Status', value: a.status },
      { label: 'Seats', value: String(a.seats) },
      { label: 'Engine', value: a.engine },
      { label: 'Cruise speed', value: a.cruiseSpeed + ' kt' },
      { label: 'Fuel capacity', value: a.fuelCapacity + ' L' },
      { label: 'Inspections done', value: String(a.inspectionsDone) },
      { label: 'Inspection every', value: hrs(a.inspectionInterval) },
      { label: 'Last inspection at', value: hrs(a.lastInspectionHours) },
      { label: 'Next inspection at', value: hrs(a.lastInspectionHours + a.inspectionInterval) },
    ];
  }

  // maintenance is over, the aircraft goes back into service
  completeInspection(a: Aircraft): void {
    this.aircraftService.completeInspection(a.id);
  }

  // ---- table helpers ----

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
    } else {
      this.sortKey = key;
      this.sortDir = 1;
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) { return 'pi-sort-alt opacity-40'; }
    return this.sortDir === 1 ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down-alt';
  }

  toggleRow(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  trackById(_: number, a: Aircraft): number {
    return a.id;
  }

  // ---- add / edit dialog ----

  openAdd(): void {
    this.editingId = null;
    this.registrationTaken = false;
    this.form.reset();
    this.modalOpen = true;
  }

  openEdit(a: Aircraft): void {
    this.editingId = a.id;
    this.registrationTaken = false;
    this.form.patchValue({
      registration: a.registration,
      model: a.model,
      type: a.type,
      base: a.base,
      status: a.status,
      totalHours: a.totalHours,
      lastInspectionHours: a.lastInspectionHours,
      inspectionInterval: a.inspectionInterval,
      engine: a.engine,
      seats: a.seats,
      cruiseSpeed: a.cruiseSpeed,
      fuelCapacity: a.fuelCapacity,
      note: a.note,
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingId = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen) { this.closeModal(); }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const registration = value.registration.trim().toUpperCase();

    // two aircraft can't share a registration
    const taken = this.fleet.some((a) => a.registration === registration && a.id !== this.editingId);
    if (taken) {
      this.registrationTaken = true;
      return;
    }

    if (this.editingId === null) {
      const nextId = Math.max(0, ...this.fleet.map((a) => a.id)) + 1;
      this.fleet = [
        ...this.fleet,
        { id: nextId, inspectionsDone: 0, ...value, registration, engine: value.engine || 'Not added' },
      ];
    } else {
      this.fleet = this.fleet.map((a) => (a.id === this.editingId ? { ...a, ...value, registration } : a));
    }
    this.closeModal();
  }

  private sortValue(a: Aircraft): string | number {
    switch (this.sortKey) {
      case 'registration': return a.registration;
      case 'totalHours': return a.totalHours;
      default: return this.hoursLeft(a);
    }
  }

  private compare(a: Aircraft, b: Aircraft): number {
    const x = this.sortValue(a);
    const y = this.sortValue(b);
    return typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
  }
}