import { useEffect, useState } from "react";
import type { SettingsRecord } from "../../db/types";
import { getSettings, updateSettings, updateAdminPassword } from "../../api";
import { useDirtyState } from "../../hooks/useDirtyState";
import { apiFetch } from "../../lib/httpClient";
import { useAuthStore } from "../../store/authStore";

interface Props {
    onSettingsSaved: (settings: SettingsRecord) => void;
}

interface SettingsFields {
    snapDistance: number;
    editText: string;
    editButtonPassword: string;
    isEditEnabled: boolean;
    isDeleteJobEnabled: boolean;
    deleteJobScheduledTime: string;
    /** Write-only: always starts empty. Only sent to the backend if non-empty on save. */
    adminPassword: string;
}

const EMPTY_FIELDS: SettingsFields = {
    snapDistance: 20,
    editText: "",
    editButtonPassword: "",
    isEditEnabled: true,
    isDeleteJobEnabled: false,
    deleteJobScheduledTime: "03:00",
    adminPassword: "",
};

// TODO : Wtf does this do? Make error message handling better..
async function readErrorMessage(res: Response): Promise<string> {
    const text = await res.text().catch(() => "");
    if (!text) return res.statusText || `Request failed with status ${res.status}`;

    try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "string") return parsed;
        if (parsed && typeof parsed === "object") {
            if (typeof (parsed as { detail?: string }).detail === "string" && (parsed as { detail?: string }).detail) {
                return (parsed as { detail: string }).detail;
            }
            if (typeof (parsed as { title?: string }).title === "string" && (parsed as { title?: string }).title) {
                return (parsed as { title: string }).title;
            }
            if (typeof (parsed as { message?: string }).message === "string" && (parsed as { message?: string }).message) {
                return (parsed as { message: string }).message;
            }
        }
    } catch {
        // Response body was not JSON; fall back to the raw text below.
    }

    return text;
}

export default function SettingsTab({ onSettingsSaved }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Settings now live entirely behind a real API with optimistic
    // concurrency (see AdminSettingsService on the backend) - this token
    // must be echoed back on every write and is updated after each save.
    const [concurrencyToken, setConcurrencyToken] = useState("");

    const [snapDistance, setSnapDistance] = useState(0);
    const [editText, setEditText] = useState("");
    const [editButtonPassword, setEditButtonPassword] = useState("");
    const [isEditEnabled, setIsEditEnabled] = useState(true);
    const [isDeleteJobEnabled, setIsDeleteJobEnabled] = useState(false);
    const [deleteJobScheduledTime, setDeleteJobScheduledTime] = useState("03:00");
    const [adminPassword, setAdminPassword] = useState("");

    // Initial value is a placeholder — actual baseline is committed once the
    // async load resolves, via dirty.commit() below, since the real values
    // aren't known yet when this hook first runs.
    const dirty = useDirtyState<SettingsFields>(EMPTY_FIELDS);

    const currentValues: SettingsFields = {
        snapDistance, editText, editButtonPassword,
        isEditEnabled, isDeleteJobEnabled, deleteJobScheduledTime, adminPassword,
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const settings = await getSettings();
                if (cancelled) return;

                setSnapDistance(settings.snapDistance);
                setEditText(settings.editText);
                setEditButtonPassword(settings.editButtonPassword ?? "");
                setIsEditEnabled(settings.isEditEnabled);
                setIsDeleteJobEnabled(settings.isDeleteJobEnabled);
                setDeleteJobScheduledTime(settings.deleteJobScheduledTime);
                setConcurrencyToken(settings.concurrencyToken);
                // adminPassword intentionally left empty - the real
                // password is never returned by the backend.

                dirty.commit({
                    snapDistance: settings.snapDistance,
                    editText: settings.editText,
                    editButtonPassword: settings.editButtonPassword ?? "",
                    isEditEnabled: settings.isEditEnabled,
                    isDeleteJobEnabled: settings.isDeleteJobEnabled,
                    deleteJobScheduledTime: settings.deleteJobScheduledTime,
                    adminPassword: "",
                });
            } catch (err) {
                if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load settings.");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // A non-empty adminPassword always counts as "dirty" - it's never part
    // of the loaded baseline (which is always ""), so useDirtyState's own
    // comparison already covers this correctly.
    const canSave = !isLoading && dirty.isDirty(currentValues);

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        setSaveError(null);

        try {
            const updated = await updateSettings({
                concurrencyToken,
                isEditEnabled,
                editText,
                editButtonPassword,
                isDeleteJobEnabled,
                deleteJobScheduledTime,
                snapDistance,
            });

            setConcurrencyToken(updated.concurrencyToken);
            onSettingsSaved(updated);

            // Must come last: the backend ends every session on a password change, including this one.
            if (adminPassword.trim() !== "") {
                await updateAdminPassword(updated.concurrencyToken, adminPassword.trim());
                await useAuthStore.getState().logout("Password changed, please log in again.");
                return;
            }

            setAdminPassword(""); // clear the write-only field back to empty after a successful save
            dirty.commit({ ...currentValues, adminPassword: "" });
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportGeoJSON = async () => {
        setIsExporting(true);

        try {
            // Goes through apiFetch so the Bearer token is attached and an expired one is refreshed.
            const res = await apiFetch("/settings/geojson", { method: "GET" });

            if (!res.ok) {
                throw new Error(await readErrorMessage(res));
            }

            const disposition = res.headers.get("Content-Disposition") ?? "";
            const fallbackName = `festival-map-${new Date().toISOString().slice(0, 10)}.geojson`;
            const match = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
            const fileName = match?.[1] ?? fallbackName;

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = fileName;
            link.rel = "noopener";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to export GeoJSON.";
            console.log(message);
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) return <p className="item-meta">Loading settings…</p>;
    if (loadError) return <p className="item-meta">Failed to load settings: {loadError}</p>;

    const isConcurrencyConflict = saveError?.toLowerCase().includes("Concurrency conflict") ?? false;

    return (
        <div className="entity-detail">
            <div className="form-fields">

                {saveError && (
                    <p className="item-meta" style={{ color: "var(--wa-color-red-60, #c00)" }}>
                        {saveError}
                        {isConcurrencyConflict && " Reload the page before trying again."}
                    </p>
                )}

                <div className="form-field">
                    <label className="form-label">Snap distance (admin view only)</label>
                    <p className="item-meta">
                        Distance in pixels for snapping to existing entities while drawing. Set to 0 to disable snapping.
                    </p>
                    <wa-input
                        type="number"
                        value={snapDistance.toString()}
                        min={0}
                        onInput={(e: Event) => setSnapDistance(Number((e.target as HTMLInputElement).value))}
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Admin login password</label>
                    <p className="item-meta">
                        Leave blank to keep the current password unchanged. For security, the current password is never shown here.
                    </p>
                    <wa-input
                        type="password"
                        value={adminPassword}
                        placeholder="New password"
                        onInput={(e: Event) => setAdminPassword((e.target as HTMLInputElement).value)}
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Edit button info text</label>
                    <p className="item-meta">
                        This text will be shown near the edit button in the lower left corner.
                    </p>
                    <wa-textarea
                        value={editText}
                        rows={4}
                        onInput={(e: Event) => setEditText((e.target as HTMLTextAreaElement).value)}
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Password protect edit mode</label>
                    <p className="item-meta">
                        Leave empty for no password.
                    </p>
                    <wa-input
                        style={{ marginBottom: "0.25rem" }}
                        type="text"
                        value={editButtonPassword}
                        placeholder="No password"
                        disabled={!isEditEnabled || undefined}
                        onInput={(e: Event) => setEditButtonPassword((e.target as HTMLInputElement).value)}
                    />
                    <wa-checkbox
                        checked={isEditEnabled || undefined}
                        defaultChecked={isEditEnabled || undefined}
                        onChange={(e: Event) => setIsEditEnabled((e.target as HTMLInputElement).checked)}
                    >
                        Map edit mode enabled
                    </wa-checkbox>
                </div>

                <div className="form-field">
                    <label className="form-label">Automatic deletion schedule</label>
                    <p className="item-meta">
                        Delete areas without contact info every day at a specific time (Swedish time).
                    </p>
                    <wa-input
                        style={{ marginBottom: "0.25rem" }}
                        type="time"
                        value={deleteJobScheduledTime}
                        disabled={!isDeleteJobEnabled || undefined}
                        onInput={(e: Event) => setDeleteJobScheduledTime((e.target as HTMLInputElement).value)}
                    />
                    <wa-checkbox
                        defaultChecked={isDeleteJobEnabled || undefined}
                        onChange={(e: Event) => setIsDeleteJobEnabled((e.target as HTMLInputElement).checked)}
                    >
                        Enable automatic deletion
                    </wa-checkbox>
                </div>
            </div>

            <div className="form-field" style={{ marginTop: "0.5rem" }}>
                <label className="form-label">Map data export</label>
                <p className="item-meta">
                    Export all current entities as a single GeoJSON file for backup or sharing.
                </p>
                <wa-button
                    size="xs"
                    appearance="outlined"
                    disabled={isExporting || undefined}
                    loading={isExporting || undefined}
                    onClick={handleExportGeoJSON}
                >
                    <wa-icon slot="start" name="download"></wa-icon>
                    {isExporting ? "Exporting…" : "Export GeoJSON"}
                </wa-button>
            </div>

            <div className="form-actions" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>

                <wa-button
                    size="xs"
                    appearance="outlined"
                    disabled={(!canSave || isSaving) || undefined}
                    onClick={handleSave}
                >
                    <wa-icon slot="start" name="floppy-disk"></wa-icon>
                    {isSaving ? "Saving…" : "Save"}
                </wa-button>
            </div>
        </div>
    );
}
