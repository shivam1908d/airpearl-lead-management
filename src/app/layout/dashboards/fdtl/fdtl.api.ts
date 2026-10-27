import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CREW_MEMBERS, FDTL_ALERTS, UPCOMING_DUTIES } from './fdtl.mock';
import type { FdtlQuery, FdtlSnapshot } from './fdtl.models';

/** Everything the FDTL page needs from a backend. */
export interface FdtlApi {
  getSnapshot(query: FdtlQuery): Observable<FdtlSnapshot>;
  reviewAlert(alertId: string): Observable<void>;
}

// base address of the backend, change it when the API exists
const API_BASE = '/api';

// the sample data was written around this day, it is moved to today so the demo always looks current
const MOCK_ANCHOR_DATE = '2026-10-01';

/* ------------------------------------------------------------------ */
/* Real backend. Not used until the switch at the bottom is changed.  */
/* ------------------------------------------------------------------ */

@Injectable({ providedIn: 'root' })
export class HttpFdtlApi implements FdtlApi {
  private http = inject(HttpClient);

  getSnapshot(query: FdtlQuery): Observable<FdtlSnapshot> {
    let params = new HttpParams().set('range', query.range);
    if (query.range === 'Custom Date') {
      params = params.set('date', query.date);
    }
    return this.http.get<FdtlSnapshot>(`${API_BASE}/fdtl/snapshot`, { params });
  }

  reviewAlert(alertId: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/fdtl/alerts/${alertId}/review`, {});
  }
}

/* ------------------------------------------------------------------ */
/* Sample data. Delete this whole section when the API is live.       */
/* ------------------------------------------------------------------ */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// the same date filter the backend will apply, crew with no duty are always kept
function matchesRange(nextDuty: string | null, query: FdtlQuery): boolean {
  if (!nextDuty) { return true; }

  const duty = new Date(nextDuty);
  if (query.range === 'Custom Date') { return dayKey(duty) === query.date; }

  const today = new Date();
  if (query.range === 'Today') { return dayKey(duty) === dayKey(today); }

  // this week, Monday to Sunday
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return duty >= start && duty < end;
}

const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z)?$/;

// moves one ISO date-time text by a number of days, anything else is returned as it is
function shiftDateTime(text: string, days: number): string {
  const m = ISO_DATE_TIME.exec(text);
  if (!m) { return text; }

  const [, year, month, day, hour, minute, second, utc] = m;
  if (utc) {
    const d = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +(second ?? 0)));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().replace('.000Z', 'Z');
  }

  const d = new Date(+year, +month - 1, +day, +hour, +minute, +(second ?? 0));
  d.setDate(d.getDate() + days);
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// walks through any data and shifts every date-time text inside it
function walk(value: unknown, days: number): unknown {
  if (typeof value === 'string') { return shiftDateTime(value, days); }
  if (Array.isArray(value)) { return value.map((item) => walk(item, days)); }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item, days)]));
  }
  return value;
}

function moveToToday<T>(data: T, days: number): T {
  return walk(data, days) as T;
}

function daysSinceAnchor(): number {
  const anchor = new Date(`${MOCK_ANCHOR_DATE}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - anchor.getTime()) / 86400000);
}

@Injectable({ providedIn: 'root' })
export class MockFdtlApi implements FdtlApi {
  getSnapshot(query: FdtlQuery): Observable<FdtlSnapshot> {
    const days = daysSinceAnchor();

    const snapshot: FdtlSnapshot = {
      policyName: 'Standard crew duty policy',
      generatedAt: new Date().toISOString(),
      sample: true,
      crew: moveToToday(CREW_MEMBERS, days).filter((crew) => matchesRange(crew.nextDuty, query)),
      duties: [...moveToToday(UPCOMING_DUTIES, days)],
      alerts: [...moveToToday(FDTL_ALERTS, days)],
    };

    // a short delay so the loading state is visible, like a real request
    return of(snapshot).pipe(delay(350));
  }

  reviewAlert(): Observable<void> {
    return of(undefined).pipe(delay(200));
  }
}

/* ------------------------------------------------------------------ */
/* The switch. The page only ever asks for FDTL_API.                  */
/* ------------------------------------------------------------------ */

export const FDTL_API = new InjectionToken<FdtlApi>('FDTL_API', {
  providedIn: 'root',
  // when the backend is ready, change MockFdtlApi to HttpFdtlApi
  factory: () => inject(MockFdtlApi),
});