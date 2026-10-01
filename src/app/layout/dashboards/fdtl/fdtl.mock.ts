export type FdtlStatus = 'Compliant' | 'Near Limit' | 'Violation' | 'Rest Required' | 'No Data';
export type FdtlResult = 'Valid' | 'Near Limit' | 'Requires Review' | 'Blocked';

export interface Usage {
  used: number;
  limit: number;
}

export interface DutyRecord {
  dutyId: string;
  crewId: string;
  reportTime: string;
  releaseTime: string;
  sectors: number;
  requiredRestHours: number;
  result: FdtlResult;
  dutyHoursUsed: number;
  dutyHoursLimit: number;
}

export interface CrewMember {
  id: string;
  name: string;
  employeeId: string;
  role: 'Captain' | 'First Officer' | 'Cabin Crew';
  base: 'DEL' | 'BOM' | 'VNS';
  status: FdtlStatus;
  nextDuty: string | null;
  dutyUsage: Usage | null;
  flightUsage: Usage | null;
  restRemainingHours: number | null;
  currentDuty: DutyRecord | null;
  previousDuty: DutyRecord | null;
  restReceivedHours: number | null;
  utilization: {
    dailyFlightTime: Usage | null;
    sevenDayFlightTime: Usage | null;
    twentyEightDayFlightTime: Usage | null;
    dutyTime: Usage | null;
  };
}

export interface FdtlAlert {
  id: string;
  severity: 'Warning' | 'Violation' | 'Information';
  message: string;
  timestamp: string;
}

export interface FdtlSummary {
  totalCrew: number;
  compliant: number;
  attentionRequired: number;
  violations: number;
  upcomingDuties: number;
}

const duty = (
  dutyId: string,
  crewId: string,
  reportTime: string,
  releaseTime: string,
  sectors: number,
  requiredRestHours: number,
  result: FdtlResult,
  dutyHoursUsed: number,
  dutyHoursLimit: number,
): DutyRecord => ({
  dutyId, crewId, reportTime, releaseTime, sectors, requiredRestHours,
  result, dutyHoursUsed, dutyHoursLimit,
});

export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'crew-001', name: 'Aarav Mehta', employeeId: 'FLT-1042', role: 'Captain', base: 'DEL', status: 'Compliant',
    nextDuty: '2026-10-01T13:40:00', dutyUsage: { used: 48, limit: 90 }, flightUsage: { used: 27, limit: 60 },
    restRemainingHours: 14, currentDuty: duty('D-4821', 'crew-001', '2026-10-01T13:40:00', '2026-10-01T21:10:00', 3, 12, 'Valid', 7.5, 12),
    previousDuty: duty('D-4794', 'crew-001', '2026-09-30T05:50:00', '2026-09-30T12:30:00', 2, 12, 'Valid', 6.7, 12),
    restReceivedHours: 25.2, utilization: { dailyFlightTime: { used: 5.2, limit: 8 }, sevenDayFlightTime: { used: 27, limit: 60 }, twentyEightDayFlightTime: { used: 81, limit: 100 }, dutyTime: { used: 48, limit: 90 } },
  },
  {
    id: 'crew-002', name: 'Priya Nair', employeeId: 'FLT-1088', role: 'First Officer', base: 'BOM', status: 'Near Limit',
    nextDuty: '2026-10-01T15:10:00', dutyUsage: { used: 79, limit: 90 }, flightUsage: { used: 51, limit: 60 },
    restRemainingHours: 10, currentDuty: duty('D-4824', 'crew-002', '2026-10-01T15:10:00', '2026-10-01T22:00:00', 2, 12, 'Near Limit', 6.8, 12),
    previousDuty: duty('D-4788', 'crew-002', '2026-09-29T08:00:00', '2026-09-29T14:30:00', 2, 12, 'Valid', 6.5, 12),
    restReceivedHours: 23, utilization: { dailyFlightTime: { used: 7.1, limit: 8 }, sevenDayFlightTime: { used: 51, limit: 60 }, twentyEightDayFlightTime: { used: 91, limit: 100 }, dutyTime: { used: 79, limit: 90 } },
  },
  {
    id: 'crew-003', name: 'Rohan Iyer', employeeId: 'FLT-1123', role: 'Captain', base: 'VNS', status: 'Violation',
    nextDuty: '2026-10-02T06:00:00', dutyUsage: { used: 93, limit: 90 }, flightUsage: { used: 61, limit: 60 },
    restRemainingHours: 7, currentDuty: duty('D-4830', 'crew-003', '2026-10-02T06:00:00', '2026-10-02T14:00:00', 3, 12, 'Blocked', 8, 12),
    previousDuty: duty('D-4798', 'crew-003', '2026-09-30T14:15:00', '2026-09-30T21:25:00', 3, 12, 'Requires Review', 7.2, 12),
    restReceivedHours: 8.6, utilization: { dailyFlightTime: { used: 8.3, limit: 8 }, sevenDayFlightTime: { used: 61, limit: 60 }, twentyEightDayFlightTime: { used: 102, limit: 100 }, dutyTime: { used: 93, limit: 90 } },
  },
  {
    id: 'crew-004', name: 'Ananya Rao', employeeId: 'CAB-2031', role: 'Cabin Crew', base: 'DEL', status: 'Rest Required',
    nextDuty: '2026-10-01T18:30:00', dutyUsage: { used: 62, limit: 90 }, flightUsage: { used: 32, limit: 60 },
    restRemainingHours: 3, currentDuty: duty('D-4828', 'crew-004', '2026-10-01T18:30:00', '2026-10-02T00:30:00', 2, 12, 'Requires Review', 6, 12),
    previousDuty: duty('D-4803', 'crew-004', '2026-10-01T02:00:00', '2026-10-01T08:00:00', 2, 12, 'Valid', 6, 12),
    restReceivedHours: 8, utilization: { dailyFlightTime: { used: 4.6, limit: 8 }, sevenDayFlightTime: { used: 32, limit: 60 }, twentyEightDayFlightTime: { used: 73, limit: 100 }, dutyTime: { used: 62, limit: 90 } },
  },
  {
    id: 'crew-005', name: 'Kabir Singh', employeeId: 'FLT-1150', role: 'First Officer', base: 'BOM', status: 'Compliant',
    nextDuty: '2026-10-02T09:15:00', dutyUsage: { used: 56, limit: 90 }, flightUsage: { used: 35, limit: 60 },
    restRemainingHours: 18, currentDuty: duty('D-4841', 'crew-005', '2026-10-02T09:15:00', '2026-10-02T16:00:00', 2, 12, 'Valid', 6.8, 12),
    previousDuty: duty('D-4773', 'crew-005', '2026-09-28T10:00:00', '2026-09-28T17:30:00', 3, 12, 'Valid', 7.5, 12),
    restReceivedHours: 31, utilization: { dailyFlightTime: { used: 3.8, limit: 8 }, sevenDayFlightTime: { used: 35, limit: 60 }, twentyEightDayFlightTime: { used: 79, limit: 100 }, dutyTime: { used: 56, limit: 90 } },
  },
  {
    id: 'crew-006', name: 'Mira Joseph', employeeId: 'CAB-2074', role: 'Cabin Crew', base: 'VNS', status: 'No Data',
    nextDuty: null, dutyUsage: null, flightUsage: null, restRemainingHours: null, currentDuty: null, previousDuty: null,
    restReceivedHours: null, utilization: { dailyFlightTime: null, sevenDayFlightTime: null, twentyEightDayFlightTime: null, dutyTime: null },
  },
  {
    id: 'crew-007', name: 'Dev Malhotra', employeeId: 'FLT-1196', role: 'Captain', base: 'DEL', status: 'Compliant',
    nextDuty: '2026-10-03T05:45:00', dutyUsage: { used: 41, limit: 90 }, flightUsage: { used: 24, limit: 60 },
    restRemainingHours: 21, currentDuty: duty('D-4850', 'crew-007', '2026-10-03T05:45:00', '2026-10-03T12:20:00', 2, 12, 'Valid', 6.6, 12),
    previousDuty: duty('D-4810', 'crew-007', '2026-09-30T09:30:00', '2026-09-30T16:00:00', 2, 12, 'Valid', 6.5, 12),
    restReceivedHours: 41.5, utilization: { dailyFlightTime: { used: 2.8, limit: 8 }, sevenDayFlightTime: { used: 24, limit: 60 }, twentyEightDayFlightTime: { used: 68, limit: 100 }, dutyTime: { used: 41, limit: 90 } },
  },
  {
    id: 'crew-008', name: 'Sana Kapoor', employeeId: 'CAB-2102', role: 'Cabin Crew', base: 'BOM', status: 'Near Limit',
    nextDuty: '2026-10-01T20:20:00', dutyUsage: { used: 76, limit: 90 }, flightUsage: { used: 48, limit: 60 },
    restRemainingHours: 9, currentDuty: duty('D-4835', 'crew-008', '2026-10-01T20:20:00', '2026-10-02T03:15:00', 3, 12, 'Near Limit', 6.9, 12),
    previousDuty: duty('D-4806', 'crew-008', '2026-09-30T02:00:00', '2026-09-30T08:50:00', 3, 12, 'Valid', 6.8, 12),
    restReceivedHours: 17.5, utilization: { dailyFlightTime: { used: 6.9, limit: 8 }, sevenDayFlightTime: { used: 48, limit: 60 }, twentyEightDayFlightTime: { used: 88, limit: 100 }, dutyTime: { used: 76, limit: 90 } },
  },
];

export const UPCOMING_DUTIES: DutyRecord[] = [
  duty('D-4821', 'crew-001', '2026-10-01T13:40:00', '2026-10-01T21:10:00', 3, 12, 'Valid', 7.5, 12),
  duty('D-4824', 'crew-002', '2026-10-01T15:10:00', '2026-10-01T22:00:00', 2, 12, 'Near Limit', 6.8, 12),
  duty('D-4828', 'crew-004', '2026-10-01T18:30:00', '2026-10-02T00:30:00', 2, 12, 'Requires Review', 6, 12),
  duty('D-4830', 'crew-003', '2026-10-02T06:00:00', '2026-10-02T14:00:00', 3, 12, 'Blocked', 8, 12),
  duty('D-4841', 'crew-005', '2026-10-02T09:15:00', '2026-10-02T16:00:00', 2, 12, 'Valid', 6.8, 12),
];

export const FDTL_ALERTS: FdtlAlert[] = [
  { id: 'alert-01', severity: 'Violation', message: 'Rohan Iyer has exceeded the demo 7-day flight-time threshold.', timestamp: '2026-10-01T08:15:00' },
  { id: 'alert-02', severity: 'Warning', message: 'Priya Nair is approaching the configured duty-time limit.', timestamp: '2026-10-01T07:52:00' },
  { id: 'alert-03', severity: 'Information', message: 'Crew roster demo data was refreshed for the current period.', timestamp: '2026-10-01T07:30:00' },
];