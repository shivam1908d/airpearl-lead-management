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

  /** Drives the plane animation: idle -> loading -> (takeoff | crash) */
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
        // let the plane fly away before opening the app
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

  /** Plays the crash animation, then a fresh plane flies back in. */
  private triggerCrash(text: string): void {
    this.clearTimers();
    this.crashText = text;
    this.flight = 'idle'; // reset so the animation can replay on repeated errors
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