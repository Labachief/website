const TOKEN_KEY = 'auth_token';

export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY)?.trim() ?? '';
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasAuthToken(): boolean {
  return getAuthToken().length > 0;
}
