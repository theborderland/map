import { fetchJson, requestJsonOrThrow } from "./httpErrors";
import type { SettingsRecord } from "../db/types";

export interface SettingsUpdate {
  concurrencyToken: string;
  isEditEnabled: boolean;
  editText: string;
  editButtonPassword: string | null;
  isDeleteJobEnabled: boolean;
  deleteJobScheduledTime: string;
  snapDistance: number;
}

/** Return the current settings. Requires an authenticated admin session. */
export async function getSettings(): Promise<SettingsRecord> {
  return fetchJson<SettingsRecord>("/settings/admin");
}

/**
 * Full-replace update of every field except the real admin password (see
 * updateAdminPassword). `update.concurrencyToken` must be the value from
 * the most recent getSettings()/updateSettings()/updateAdminPassword()
 * call - if another session saved in between, this throws with a message
 * telling the user to refresh and retry.
 */
export async function updateSettings(update: SettingsUpdate): Promise<SettingsRecord> {
  return requestJsonOrThrow<SettingsRecord>("/settings/admin", { method: "PUT", body: update });
}

/**
 * Updates the real admin login password. Separate from updateSettings
 * (matches the backend's own separate endpoint) - write-only, the
 * response only carries the new concurrency token, never anything about
 * the password itself.
 */
export async function updateAdminPassword(
  concurrencyToken: string,
  password: string,
): Promise<{ concurrencyToken: string }> {
  return requestJsonOrThrow<{ concurrencyToken: string }>("/settings/admin/password", {
    method: "POST",
    body: { concurrencyToken, password },
  });
}
