import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Any authenticated user can reach the app shell; everyone else is sent back to sign in.
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};