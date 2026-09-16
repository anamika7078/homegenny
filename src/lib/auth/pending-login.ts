'use client';

/**
 * Credentials held between the login form and the 2FA step.
 *
 * The backend's 2FA flow answers the first /auth/login with
 * `{ requires_2fa: true }` and expects the SAME phone and password to come
 * back alongside the authenticator code, so the password has to survive one
 * client-side navigation. It used to survive it in `sessionStorage`, which
 * writes the plain-text password to the user's disk profile, leaves it there
 * for the life of the tab, and hands it to any script running on the origin.
 *
 * A module-level variable does the same job: it survives the navigation from
 * /auth/login to /auth/2fa, and it is gone on a reload, a new tab, or once the
 * sign-in finishes. A reload of the 2FA page therefore sends the user back to
 * the login form, which is the correct outcome — re-typing a password is a
 * smaller cost than storing it.
 *
 * The proper fix is a short-lived 2FA challenge token issued by the server so
 * the password is never re-sent at all; that needs a backend change and is
 * tracked in docs/AUTH_REMEDIATION_PLAN.md §5.
 */
let pending: { phone: string; password: string } | null = null;

export function setPendingLogin(phone: string, password: string): void {
  pending = { phone, password };
}

export function getPendingLogin(): { phone: string; password: string } | null {
  return pending;
}

export function clearPendingLogin(): void {
  pending = null;
}
