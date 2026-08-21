const BASE_URL = import.meta.env.VITE_API_BASE_URL;

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registers the single global handler fired whenever any apiFetch call
 *  receives a 401 — used to drop the app back to the login screen. */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
    unauthorizedHandler = handler;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
    /** Plain object — JSON-encoded automatically. */
    body?: unknown;
}

/**
 * Shared fetch wrapper for all backend API calls.
 *  - Always sends credentials: 'include' so the session cookie is attached.
 *  - Always prefixes the configured API base URL.
 *  - JSON-encodes `body` and sets Content-Type automatically.
 *  - On any 401, fires the registered unauthorized handler so the app can
 *    fall back to the login screen. The caller still receives the raw
 *    Response to handle its own status codes (e.g. 400 on login).
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
    const { body, headers, ...rest } = options;

    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
        ...rest,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
        unauthorizedHandler?.();
    }

    return res;
}