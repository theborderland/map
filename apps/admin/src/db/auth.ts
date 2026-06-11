/**
 * Dev authentication
 *
 * Uses sessionStorage so the login survives hot-reloads but clears on tab close,
 * matching real cookie-based session behaviour closely enough for development.
 *
 * The hardcoded password is intentionally visible in source — this is a dev-only
 * module and will be replaced by real API calls before any deployment.
 */

const DEV_PASSWORD  = 'dev'
const SESSION_KEY   = '__map_admin_auth__'

/**
 * Attempt login with the given password.
 * @returns `true` on success, `false` on wrong password.
 */
export function login(password: string): boolean {
  if (password !== DEV_PASSWORD) return false
  sessionStorage.setItem(SESSION_KEY, '1')
  return true
}

/**
 * Clear the dev session.
 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Check whether a valid dev session exists.
 * Call this on app boot to decide whether to show the login screen.
 */
export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}
