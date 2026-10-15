import { create } from "zustand";
import { apiFetch, refreshTokens, registerUnauthorizedHandler } from "../lib/httpClient";
import { clearTokens, getRefreshToken, setTokens, type TokenResponse } from "../lib/tokenStorage";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type LoginResult = { ok: true } | { ok: false; error: string };

interface AuthStore {
    status: AuthStatus;
    /** One-off message for the login screen, e.g. why the user was signed out. */
    notice: string | null;
    /** Runs once on app load: uses the stored refresh token to get a fresh access
     *  token, since the access token only lives in memory and is lost on reload. */
    checkSession: () => Promise<void>;
    login: (password: string) => Promise<LoginResult>;
    logout: (notice?: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    status: "checking",
    notice: null,

    checkSession: async () => {
        // No refresh token means nobody has logged in on this browser.
        if (!getRefreshToken()) {
            set({ status: "unauthenticated" });
            return;
        }

        const ok = await refreshTokens();
        set({ status: ok ? "authenticated" : "unauthenticated" });
    },

    login: async (password) => {
        const res = await apiFetch("/auth/login", {
            method: "POST",
            body: { password },
        });

        if (res.ok) {
            const data = (await res.json()) as TokenResponse;
            setTokens(data.accessToken, data.refreshToken);
            set({ status: "authenticated", notice: null });
            return { ok: true };
        }

        // Backend returns the error as a plain JSON string, e.g.
        // "Invalid password." or "Too many failed login attempts." —
        // surfaced verbatim rather than re-worded.
        let message = "Invalid password.";
        try {
            const data = await res.text();
            if (typeof data === "string" && data.trim()) message = data;
        } catch {
            /* fall back to the generic message above */
        }

        return { ok: false, error: message };
    },

    logout: async (notice) => {
        const refreshToken = getRefreshToken();
        clearTokens();
        set({ status: "unauthenticated", notice: notice ?? null });

        // Best effort: revoking server-side stops a copied refresh token from being used later.
        if (refreshToken) {
            await apiFetch("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => undefined);
        }
    },
}));

// A 401 that survives a refresh attempt (from ANY endpoint) drops the user
// back to the login screen — registered once at module load.
registerUnauthorizedHandler(() => {
    useAuthStore.setState({ status: "unauthenticated" });
});