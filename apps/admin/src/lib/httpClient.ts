import { clearTokens, getAccessToken, getRefreshToken, setTokens, type TokenResponse } from "./tokenStorage";

const BASE_URL = import.meta.env.API_URL;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registers the single global handler fired when a request is still 401 after
 *  a token refresh attempt — used to drop the app back to the login screen. */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
    unauthorizedHandler = handler;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
    /** Plain object — JSON-encoded automatically. */
    body?: unknown;
}

let refreshInFlight: Promise<boolean> | null = null;

/** Runs the callback under a browser-wide lock so two tabs never refresh at once.
 *  The server treats a reused refresh token as theft and revokes the session. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request("admin-auth-refresh", fn);
    }
    return fn();
}

async function doRefresh(): Promise<boolean> {
    // Read inside the lock: another tab may have just rotated the token.
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${BASE_URL}api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (res.ok) {
            const data = (await res.json()) as TokenResponse;
            setTokens(data.accessToken, data.refreshToken);
            return true;
        }

        // Rejected by the server: the refresh token is expired or revoked, so it's useless.
        if (res.status === 401) clearTokens();
        return false;
    } catch {
        // Network error: keep the refresh token so a later attempt can still succeed.
        return false;
    }
}

/** Swaps the stored refresh token for a new token pair. Resolves true on success.
 *  Concurrent callers share one request, which also covers React StrictMode
 *  running the load effect twice in dev (a second call would look like a replay). */
export function refreshTokens(): Promise<boolean> {
    refreshInFlight ??= withRefreshLock(doRefresh).finally(() => {
        refreshInFlight = null;
    });
    return refreshInFlight;
}

function send(path: string, options: ApiFetchOptions, token: string | null): Promise<Response> {
    const { body, headers, ...rest } = options;

    return fetch(`${BASE_URL}api${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

/**
 * Shared fetch wrapper for all backend API calls.
 *  - Attaches the in-memory access token as a Bearer header (no cookies involved).
 *  - Always prefixes the configured API base URL.
 *  - JSON-encodes `body` and sets Content-Type automatically.
 *  - On a 401 it refreshes the tokens once and retries the request. If it's
 *    still 401, fires the registered unauthorized handler so the app can fall
 *    back to the login screen. The caller still receives the raw Response.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
    const tokenUsed = getAccessToken();
    let res = await send(path, options, tokenUsed);

    if (res.status === 401 && !path.startsWith("/auth/")) {
        // If another request already refreshed while this one was in flight, just retry with the new token.
        const canRetry = getAccessToken() !== tokenUsed || (await refreshTokens());
        if (canRetry) res = await send(path, options, getAccessToken());
    }

    if (res.status === 401) {
        unauthorizedHandler?.();
    }

    return res;
}