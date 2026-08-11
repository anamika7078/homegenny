/**
 * Industry-standard strong password validation criteria:
 * - At least 8 characters, max 72 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 numeric digit (0-9)
 * - At least 1 special character (@$!%*?&#-_)
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#\-_])[A-Za-z\d@$!%*?&#\-_]{8,72}$/;

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 72) {
    return { isValid: false, error: 'Password must not exceed 72 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z)' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z)' };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number (0-9)' };
  }
  if (!/[@$!%*?&#\-_]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (@, $, !, %, *, ?, &, #, -, _)' };
  }
  return { isValid: true };
}
