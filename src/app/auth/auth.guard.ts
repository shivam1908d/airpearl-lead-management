import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // logged in -> allow. Not logged in -> go to the login page
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};