import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

export interface AuthUser {
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(credentials: { email: string; password: string }): Observable<void> {
    if (credentials.email === 'admin@aircraftly.com' && credentials.password === 'Admin@123') {
      // demo user. With a real API, this comes from the server response
      const user: AuthUser = { name: 'Shivam D', email: credentials.email };
      localStorage.setItem('auth_token', 'demo-token');
      localStorage.setItem('auth_user', JSON.stringify(user));
      return of(undefined).pipe(delay(600));
    }
    return throwError(() => new Error('Invalid email or password.')).pipe(delay(600));
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  get user(): AuthUser | null {
    const raw = localStorage.getItem('auth_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}