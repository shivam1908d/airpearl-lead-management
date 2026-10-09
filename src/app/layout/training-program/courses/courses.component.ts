import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

type CourseCategory = 'Licence' | 'Rating' | 'Ground school';
type CourseStatus = 'Active' | 'Upcoming' | 'Archived';
type SortKey = 'name' | 'enrolled' | 'flightHours';

interface Course {
  id: number;
  code: string;
  name: string;
  category: CourseCategory;
  status: CourseStatus;
  durationWeeks: number;
  flightHours: number;   // 0 for ground school courses
  enrolled: number;
  capacity: number;
  nextIntake: string;
  description: string;
}

interface StatCard {
  label: string;
  status: '' | CourseStatus;   // '' means "all courses"
  icon: string;
  tone: string;
}

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.css'
})
export class CoursesComponent {
  private fb = inject(FormBuilder);

  readonly categories: CourseCategory[] = ['Licence', 'Rating', 'Ground school'];
  readonly statuses: CourseStatus[] = ['Active', 'Upcoming', 'Archived'];

  readonly statCards: StatCard[] = [
    { label: 'All courses', status: '',         icon: 'pi-book',  tone: 'bg-sky-50 text-sky-600' },
    { label: 'Active',      status: 'Active',   icon: 'pi-play',  tone: 'bg-green-50 text-green-600' },
    { label: 'Upcoming',    status: 'Upcoming', icon: 'pi-clock', tone: 'bg-amber-50 text-amber-600' },
    { label: 'Archived',    status: 'Archived', icon: 'pi-inbox', tone: 'bg-gray-100 text-gray-500' },
  ];

  // badge colours per status
  readonly statusClass: Record<CourseStatus, string> = {
    Active: 'bg-green-50 text-green-700 ring-green-600/20',
    Upcoming: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Archived: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  };

  // icon + tint for the little square next to each course name
  readonly categoryStyle: Record<CourseCategory, { icon: string; tone: string }> = {
    Licence: { icon: 'pi-id-card', tone: 'bg-sky-50 text-sky-600' },
    Rating: { icon: 'pi-star', tone: 'bg-violet-50 text-violet-600' },
    'Ground school': { icon: 'pi-book', tone: 'bg-amber-50 text-amber-600' },
  };

  readonly fieldClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  // sample data until the courses API is ready
  courses: Course[] = [
    { id: 1, code: 'PPL(A)', name: 'Private pilot licence', category: 'Licence', status: 'Active',
      durationWeeks: 24, flightHours: 45, enrolled: 14, capacity: 20, nextIntake: '03 Nov 2026',
      description: 'First step for new pilots. Covers circuits, navigation and solo flights in single-engine aircraft.' },
    { id: 2, code: 'CPL(A)', name: 'Commercial pilot licence', category: 'Licence', status: 'Active',
      durationWeeks: 52, flightHours: 150, enrolled: 18, capacity: 24, nextIntake: '10 Jan 2027',
      description: 'Builds on the PPL with advanced handling, cross-country time and the commercial flight test.' },
    { id: 3, code: 'ATPL', name: 'ATPL theory', category: 'Ground school', status: 'Active',
      durationWeeks: 40, flightHours: 0, enrolled: 36, capacity: 40, nextIntake: '05 Dec 2026',
      description: 'Fourteen theory subjects taught in the classroom, with mock exams every month.' },
    { id: 4, code: 'IR(A)', name: 'Instrument rating', category: 'Rating', status: 'Active',
      durationWeeks: 16, flightHours: 50, enrolled: 9, capacity: 12, nextIntake: '17 Nov 2026',
      description: 'Fly in cloud and low visibility using instruments only, in the simulator and the aircraft.' },
    { id: 5, code: 'ME', name: 'Multi-engine class rating', category: 'Rating', status: 'Upcoming',
      durationWeeks: 4, flightHours: 6, enrolled: 0, capacity: 8, nextIntake: '01 Feb 2027',
      description: 'Short add-on rating covering engine-out handling and twin-engine procedures.' },
    { id: 6, code: 'FI', name: 'Flight instructor rating', category: 'Rating', status: 'Upcoming',
      durationWeeks: 8, flightHours: 30, enrolled: 2, capacity: 6, nextIntake: '15 Feb 2027',
      description: 'For licensed pilots who want to teach. Focus on briefing, demonstration and student assessment.' },
    { id: 7, code: 'PPL-25', name: 'PPL(A) evening batch 2025', category: 'Licence', status: 'Archived',
      durationWeeks: 24, flightHours: 45, enrolled: 12, capacity: 12, nextIntake: 'Completed',
      description: 'Evening batch that finished in June 2026. Kept for records.' },
  ];

  // filters and sorting
  search = '';
  categoryFilter: CourseCategory | '' = '';
  statusFilter: CourseStatus | '' = '';
  sortKey: SortKey = 'name';
  sortDir: 1 | -1 = 1;

  // which row is open, and the add/edit dialog state
  expandedId: number | null = null;
  modalOpen = false;
  editingId: number | null = null;

  form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    category: ['Licence' as CourseCategory, Validators.required],
    status: ['Upcoming' as CourseStatus, Validators.required],
    durationWeeks: [12, [Validators.required, Validators.min(1)]],
    flightHours: [0, [Validators.required, Validators.min(0)]],
    capacity: [10, [Validators.required, Validators.min(1)]],
    description: [''],
  });

  get visibleCourses(): Course[] {
    const q = this.search.trim().toLowerCase();
    return this.courses
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .filter((c) => !this.categoryFilter || c.category === this.categoryFilter)
      .filter((c) => !this.statusFilter || c.status === this.statusFilter)
      .sort((a, b) => this.compare(a, b) * this.sortDir);
  }

  get totalEnrolled(): number {
    return this.courses.reduce((sum, c) => sum + c.enrolled, 0);
  }

  countFor(status: '' | CourseStatus): number {
    return status ? this.courses.filter((c) => c.status === status).length : this.courses.length;
  }

  // clicking the active card again clears the filter
  filterByStatus(status: '' | CourseStatus): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
  }

  clearFilters(): void {
    this.search = '';
    this.categoryFilter = '';
    this.statusFilter = '';
  }

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

  seatsLeft(c: Course): number {
    return c.capacity - c.enrolled;
  }

  fillPercent(c: Course): number {
    return Math.min(100, Math.round((c.enrolled / c.capacity) * 100));
  }

  // nearly full courses turn amber so they stand out
  barClass(c: Course): string {
    return this.fillPercent(c) >= 90 ? 'bg-amber-400' : 'bg-sky-500';
  }

  trackById(_: number, c: Course): number {
    return c.id;
  }

  openAdd(): void {
    this.editingId = null;
    this.form.reset();
    this.modalOpen = true;
  }

  openEdit(c: Course): void {
    this.editingId = c.id;
    this.form.patchValue({
      code: c.code,
      name: c.name,
      category: c.category,
      status: c.status,
      durationWeeks: c.durationWeeks,
      flightHours: c.flightHours,
      capacity: c.capacity,
      description: c.description,
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

    if (this.editingId === null) {
      const nextId = Math.max(0, ...this.courses.map((c) => c.id)) + 1;
      this.courses = [
        ...this.courses,
        {
          id: nextId,
          enrolled: 0,
          nextIntake: 'To be announced',
          ...value,
          description: value.description || 'No description added yet.',
        },
      ];
    } else {
      this.courses = this.courses.map((c) => (c.id === this.editingId ? { ...c, ...value } : c));
    }
    this.closeModal();
  }

  private compare(a: Course, b: Course): number {
    const x = a[this.sortKey];
    const y = b[this.sortKey];
    return typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
  }
}