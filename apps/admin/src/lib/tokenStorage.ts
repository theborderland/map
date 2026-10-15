const REFRESH_KEY = "adminRefreshToken";

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
}

// Access token lives in memory only, so an XSS payload can't read it from storage after a reload.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

/** Refresh token is persisted so the session survives reloads and is shared between tabs. */
export function getRefreshToken(): string | null {
    try {
        return localStorage.getItem(REFRESH_KEY);
    } catch {
        return null;
    }
}

export function setTokens(access: string, refresh: string): void {
    accessToken = access;
    try {
        localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
        // Storage unavailable (e.g. blocked by the browser): the session just won't survive a reload.
    }
}

export function clearTokens(): void {
    accessToken = null;
    try {
        localStorage.removeItem(REFRESH_KEY);
    } catch {
        // Nothing to clear if storage is unavailable.
    }
}