/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Authorization & Access Control Configuration
 */

// Default authorized users for SATURN
const DEFAULT_AUTHORIZED_EMAILS: string[] = [
  'mkirithik@gmail.com'
];

// Allow runtime environment override via VITE_AUTHORIZED_EMAILS (comma-separated)
const envAuthorized = typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTHORIZED_EMAILS
  ? String(import.meta.env.VITE_AUTHORIZED_EMAILS).split(',')
  : [];

export const AUTHORIZED_EMAILS: string[] = Array.from(
  new Set([
    ...DEFAULT_AUTHORIZED_EMAILS,
    ...envAuthorized
  ])
)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Checks whether the given email address is in the SATURN authorized allowlist.
 * Performs safe, trimmed, case-insensitive comparison.
 */
export function isEmailAuthorized(email?: string | null): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const authorized = AUTHORIZED_EMAILS.includes(normalized);

  console.log('[SATURN Authorization]', {
    email: normalized,
    isAuthorized: authorized,
    allowlistCount: AUTHORIZED_EMAILS.length
  });

  return authorized;
}
