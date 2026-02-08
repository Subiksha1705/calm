export function setAuthToken(token: string | null): void {
  if (typeof window !== 'undefined') {
    if (token === null) {
      document.cookie = 'auth_token=; path=/; Max-Age=0; SameSite=Lax; Secure';
      return;
    }
    document.cookie = `auth_token=${token}; path=/; SameSite=Lax; Secure`;
  }
}
