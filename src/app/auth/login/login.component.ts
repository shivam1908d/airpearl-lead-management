import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

type FlightState = 'idle' | 'loading' | 'crash' | 'takeoff';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;
  showPassword = false;
  errorMessage = '';

  /** The animated plane moves through the auth flow states so the UI can show loading, success, and failure clearly. */
  flight: FlightState = 'idle';
  private crashText = 'Mayday! Access denied';
  private timers: ReturnType<typeof setTimeout>[] = [];

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  get statusText(): string {
    switch (this.flight) {
      case 'loading': return 'Verifying clearance…';
      case 'crash':   return this.crashText;
      case 'takeoff': return 'Clear for takeoff. Welcome aboard!';
      default:        return 'Cleared for takeoff';
    }
  }

  submit(): void {
    if (this.loading) { return; }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.triggerCrash('Mayday! Check your details');
      return;
    }

    this.clearTimers();
    this.loading = true;
    this.errorMessage = '';
    this.flight = 'loading';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.flight = 'takeoff';
        // Let the animation finish before navigating away so the success state reads naturally.
        this.later(() => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboards/roster';
          this.router.navigateByUrl(returnUrl);
        }, 1100);
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err.message || 'Something went wrong. Try again.';
        this.triggerCrash('Mayday! Access denied');
      },
    });
  }

  /** Replays the failure state after a short reset so the plane animation can run again on repeated attempts. */
  private triggerCrash(text: string): void {
    this.clearTimers();
    this.crashText = text;
    this.flight = 'idle'; // Reset the state so the same failure animation can replay cleanly.
    this.later(() => {
      this.flight = 'crash';
      this.later(() => { if (this.flight === 'crash') { this.flight = 'idle'; } }, 2800);
    }, 30);
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }
}