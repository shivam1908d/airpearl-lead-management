import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(credentials: { email: string; password: string }): Observable<void> {
    if (credentials.email === 'admin@aircraftly.com' && credentials.password === 'Admin@123') {
      localStorage.setItem('auth_token', 'demo-token');
      return of(undefined).pipe(delay(600));
    }
    return throwError(() => new Error('Invalid email or password.')).pipe(delay(600));
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }
}