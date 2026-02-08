export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    document.cookie = `auth_token=${token}; path=/; SameSite=Lax; Secure`;
  }
}
