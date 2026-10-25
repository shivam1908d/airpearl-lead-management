import { Injectable } from '@angular/core';

export type BaseName = 'Varanasi' | 'Hyderabad' | 'Bengaluru' | 'Guwahati';
export type AircraftType = 'Single-engine' | 'Multi-engine';
export type AircraftStatus = 'Available' | 'In maintenance' | 'Grounded';

export interface Aircraft {
  id: number;
  registration: string;          // code on the tail, e.g. VT-FSA
  model: string;
  type: AircraftType;
  base: BaseName;
  status: AircraftStatus;
  totalHours: number;            // airframe hours flown so far
  lastInspectionHours: number;   // airframe hours when the last inspection was done
  inspectionInterval: number;    // an inspection is due every this many hours
  inspectionsDone: number;
  engine: string;
  seats: number;
  cruiseSpeed: number;           // knots
  fuelCapacity: number;          // litres
  note: string;
}

// flight hours are kept in tenths of an hour, like a normal logbook
export function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

// an aircraft goes to maintenance when its hours left drop to this value or below,
// raise it (say to 1) if you want aircraft pulled out a little earlier
const MAINTENANCE_AT_HOURS_LEFT = 0;

@Injectable({ providedIn: 'root' })
export class AircraftService {

  // sample fleet until the aircraft API is ready, replace with your real aircraft
  fleet: Aircraft[] = [
    { id: 1, registration: 'VT-FSA', model: 'Cessna 172S Skyhawk', type: 'Single-engine', base: 'Varanasi',
      status: 'Available', totalHours: 4820, lastInspectionHours: 4800, inspectionInterval: 100, inspectionsDone: 48,
      engine: 'Lycoming IO-360-L2A, 180 hp', seats: 4, cruiseSpeed: 122, fuelCapacity: 200, note: '' },
    { id: 2, registration: 'VT-FSB', model: 'Diamond DA40 NG', type: 'Single-engine', base: 'Hyderabad',
      status: 'Available', totalHours: 2310, lastInspectionHours: 2250, inspectionInterval: 100, inspectionsDone: 23,
      engine: 'Austro AE300, 168 hp', seats: 4, cruiseSpeed: 130, fuelCapacity: 148, note: '' },
    { id: 3, registration: 'VT-FSC', model: 'Piper PA-28 Archer III', type: 'Single-engine', base: 'Bengaluru',
      status: 'In maintenance', totalHours: 6102, lastInspectionHours: 6010, inspectionInterval: 100, inspectionsDone: 61,
      engine: 'Lycoming O-360-A4M, 180 hp', seats: 4, cruiseSpeed: 125, fuelCapacity: 189,
      note: '100-hour inspection in progress, back in service by Friday.' },
    { id: 4, registration: 'VT-FSD', model: 'Diamond DA42 Twin Star', type: 'Multi-engine', base: 'Guwahati',
      status: 'Available', totalHours: 3540, lastInspectionHours: 3470, inspectionInterval: 100, inspectionsDone: 35,
      engine: '2 x Austro AE300, 168 hp each', seats: 4, cruiseSpeed: 150, fuelCapacity: 200, note: '' },
    { id: 5, registration: 'VT-FSE', model: 'Piper PA-44 Seminole', type: 'Multi-engine', base: 'Hyderabad',
      status: 'Grounded', totalHours: 7210, lastInspectionHours: 7130, inspectionInterval: 100, inspectionsDone: 72,
      engine: '2 x Lycoming O-360-A1H6, 180 hp each', seats: 4, cruiseSpeed: 135, fuelCapacity: 416,
      note: 'Left engine oil leak, waiting for a replacement part.' },
  ];

  // flights whose hours are already taken off an aircraft, so nothing is counted twice
  private loggedFlights = new Set<string>();

  // hours the aircraft can still fly before its next inspection
  hoursLeft(a: Aircraft): number {
    return roundHours(a.lastInspectionHours + a.inspectionInterval - a.totalHours);
  }

  find(registration: string): Aircraft | undefined {
    return this.fleet.find((a) => a.registration === registration);
  }

  // called when a roster flight has finished, takes its hours off the aircraft
  logFlight(flightKey: string, registration: string, hours: number): void {
    if (this.loggedFlights.has(flightKey)) { return; }
    this.loggedFlights.add(flightKey);

    this.fleet = this.fleet.map((a): Aircraft => {
      if (a.registration !== registration) { return a; }

      const updated: Aircraft = { ...a, totalHours: roundHours(a.totalHours + hours) };
      if (this.hoursLeft(updated) <= MAINTENANCE_AT_HOURS_LEFT && updated.status === 'Available') {
        updated.status = 'In maintenance';
        updated.note = 'Inspection hours reached, moved to maintenance automatically.';
      }
      return updated;
    });
  }

  // inspection finished: the hours counter starts again and the aircraft can fly
  completeInspection(id: number): void {
    this.fleet = this.fleet.map((a): Aircraft =>
      a.id === id
        ? { ...a, lastInspectionHours: a.totalHours, inspectionsDone: a.inspectionsDone + 1, status: 'Available', note: '' }
        : a
    );
  }
}