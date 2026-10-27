// The shapes of everything the FDTL page shows.
// Components and services import from this file only, never from the mock file.
// The row types are re-exported from the mock for now. When the backend contract is fixed,
// move their definitions into this file and let the mock import them from here.
export type {
  CrewMember,
  DutyRecord,
  FdtlAlert,
  FdtlResult,
  FdtlStatus,
  Usage,
} from './fdtl.mock';

import type { CrewMember, DutyRecord, FdtlAlert } from './fdtl.mock';

export type DateRange = 'Today' | 'This Week' | 'Custom Date';

// what the page asks the backend for
export interface FdtlQuery {
  range: DateRange;
  date: string;          // YYYY-MM-DD, only used when range is 'Custom Date'
}

// what the backend sends back in one go
export interface FdtlSnapshot {
  policyName: string;
  generatedAt: string;   // ISO date-time of when the numbers were calculated
  sample: boolean;       // true while the numbers are sample data
  crew: CrewMember[];
  duties: DutyRecord[];
  alerts: FdtlAlert[];
}