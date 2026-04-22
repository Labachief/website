import { APP_INITIALIZER, Provider } from '@angular/core';

import { getAuthToken } from './auth-token';

let installed = false;

function installFetchAuthInterceptor(): () => void {
  return () => {
    if (installed) {
      return;
    }
    installed = true;

    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const headers = new Headers(
        init?.headers ??
          (typeof Request !== 'undefined' && input instanceof Request
            ? input.headers
            : undefined),
      );

      const token = getAuthToken();
      const isApiRequest = requestUrl.includes('/api/');
      const isLoginRequest = requestUrl.includes('/api/auth/login');

      if (
        token &&
        isApiRequest &&
        !isLoginRequest &&
        !headers.has('Authorization')
      ) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return nativeFetch(input, { ...init, headers });
    };
  };
}

export const fetchAuthInitProvider: Provider = {
  provide: APP_INITIALIZER,
  useFactory: installFetchAuthInterceptor,
  multi: true,
};
