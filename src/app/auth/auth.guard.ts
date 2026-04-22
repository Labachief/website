import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { hasAuthToken } from './auth-token';

export const authGuard: CanActivateFn = (_route, state) => {
  if (hasAuthToken()) {
    return true;
  }

  const router = inject(Router);
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url || '/' },
  });
};
