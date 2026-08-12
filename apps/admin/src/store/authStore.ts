import { create } from "zustand";
import { apiFetch, registerUnauthorizedHandler } from "../lib/httpClient";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type LoginResult = { ok: true } | { ok: false; error: string };

interface AuthStore {
    status: AuthStatus;
    /** Calls the auth check endpoint once on app load to restore an existing
     *  session — needed because the session cookie is HttpOnly and can't
     *  be read directly by the frontend. */
    checkSession: () => Promise<void>;
    login: (password: string) => Promise<LoginResult>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    status: "checking",

    checkSession: async () => {
        try {
            const res = await apiFetch("/auth-check", { method: "GET" });
            set({ status: res.ok ? "authenticated" : "unauthenticated" });
        } catch {
            // Network error, or the auth check endpoint doesn't exist yet — fail
            // closed and just show the login screen.
            set({ status: "unauthenticated" });
        }
    },

    login: async (password) => {
        const res = await apiFetch("/login", {
            method: "POST",
            body: { password },
        });
        
        if (res.ok) {
            set({ status: "authenticated" });
            return { ok: true };
        }

        // Backend returns the error as a plain JSON string, e.g.
        // "Invalid password." or "Too many failed login attempts." —
        // surfaced verbatim rather than re-worded.
        let message = "Invalid password.";
        try {
            const data = await res.text();
            console.log(data);
            if (typeof data === "string" && data.trim()) message = data;
        } catch {
            /* fall back to the generic message above */
        }

        return { ok: false, error: message };
    },
}));

// A 401 from ANY endpoint (not just login) drops the user back to the
// login screen — registered once at module load.
registerUnauthorizedHandler(() => {
    useAuthStore.setState({ status: "unauthenticated" });
});