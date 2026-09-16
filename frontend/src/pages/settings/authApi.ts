import { withBase } from '../../state/site.ts';

/**
 * Check whether the current session cookie is valid.
 * Returns true when authenticated or when auth is not configured server-side.
 */
export async function checkAuth(): Promise<boolean> {
  const response = await fetch(withBase('/auth/me'));
  return response.ok;
}

/**
 * Submit username + password to obtain a signed session cookie.
 * Throws on invalid credentials or server error.
 * @param username - Admin username.
 * @param password - Admin password.
 */
export async function login(username: string, password: string): Promise<void> {
  const response = await fetch(withBase('/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error('Invalid credentials');
  }
}

/** Clear the session cookie server-side. */
export async function logout(): Promise<void> {
  await fetch(withBase('/auth/logout'), { method: 'POST' });
}

/**
 * Change the admin password. Requires a valid session cookie.
 * Throws if current password is wrong or the request fails.
 * @param currentPassword - The current password to verify.
 * @param newPassword - The new password to set.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const response = await fetch(withBase('/auth/change-password'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? 'Failed to change password');
  }
}
