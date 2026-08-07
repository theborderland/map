import { useEffect, useState } from "react";
import type { SettingsRecord } from "../../db/types";
import { getSettings, updateSettings } from "../../db";
import { useDirtyState } from "../../hooks/useDirtyState";

interface Props {
    onSettingsSaved: (settings: SettingsRecord) => void;
}

interface SettingsFields {
    snapDistance: number;
    editButtonInfoText: string;
    editModePassword: string;
    mapEditModeEnabled: boolean;
    adminLoginPassword: string;
    autoDeleteEnabled: boolean;
    autoDeleteTime: string;
}

const EMPTY_FIELDS: SettingsFields = {
    snapDistance: 0,
    editButtonInfoText: "",
    editModePassword: "",
    mapEditModeEnabled: true,
    adminLoginPassword: "",
    autoDeleteEnabled: false,
    autoDeleteTime: "03:00",
};

export default function SettingsTab({ onSettingsSaved }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snapDistance, setSnapDistance] = useState(0);
    const [editButtonInfoText, setEditButtonInfoText] = useState("");
    const [editModePassword, setEditModePassword] = useState("");
    const [mapEditModeEnabled, setMapEditModeEnabled] = useState(true);
    const [adminLoginPassword, setAdminLoginPassword] = useState("");
    const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
    const [autoDeleteTime, setAutoDeleteTime] = useState("03:00");

    // Initial value is a placeholder — actual baseline is committed once the
    // async load resolves, via dirty.commit() below, since the real values
    // aren't known yet when this hook first runs.
    const dirty = useDirtyState<SettingsFields>(EMPTY_FIELDS);

    const currentValues: SettingsFields = {
        snapDistance, editButtonInfoText, editModePassword,
        mapEditModeEnabled, adminLoginPassword, autoDeleteEnabled, autoDeleteTime,
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const s = await getSettings();
            if (cancelled) return;
            setSnapDistance(s.snapDistance);
            setEditButtonInfoText(s.editButtonInfoText);
            setEditModePassword(s.editModePassword);
            setMapEditModeEnabled(s.mapEditModeEnabled);
            setAdminLoginPassword(s.adminLoginPassword);
            setAutoDeleteEnabled(s.autoDeleteEnabled);
            setAutoDeleteTime(s.autoDeleteTime);
            dirty.commit({
                snapDistance: s.snapDistance,
                editButtonInfoText: s.editButtonInfoText,
                editModePassword: s.editModePassword,
                mapEditModeEnabled: s.mapEditModeEnabled,
                adminLoginPassword: s.adminLoginPassword,
                autoDeleteEnabled: s.autoDeleteEnabled,
                autoDeleteTime: s.autoDeleteTime,
            });
            setIsLoading(false);
        })();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const canSave = !isLoading && dirty.isDirty(currentValues);

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        const updated = await updateSettings(currentValues);
        onSettingsSaved(updated);
        dirty.commit(currentValues);
        setIsSaving(false);
    };

    if (isLoading) return <p className="item-meta">Loading settings…</p>;

    return (
        <div className="entity-detail">
            <div className="form-fields">

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
                    <wa-input
                        type="text"
                        value={adminLoginPassword}
                        onInput={(e: Event) => setAdminLoginPassword((e.target as HTMLInputElement).value)}
                    />
                </div>

                <div className="form-field">
                    <label className="form-label">Edit button info text</label>
                    <p className="item-meta">
                        This text will be shown near the edit button in the lower left corner.
                    </p>
                    <wa-textarea
                        value={editButtonInfoText}
                        rows={4}
                        onInput={(e: Event) => setEditButtonInfoText((e.target as HTMLTextAreaElement).value)}
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
                        value={editModePassword}
                        placeholder="No password"
                        disabled={!mapEditModeEnabled || undefined}
                        onInput={(e: Event) => setEditModePassword((e.target as HTMLInputElement).value)}
                    />
                    <wa-checkbox
                        checked={mapEditModeEnabled || undefined}
                        defaultChecked={mapEditModeEnabled || undefined}
                        onChange={(e: Event) => setMapEditModeEnabled((e.target as HTMLInputElement).checked)}
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
                        value={autoDeleteTime}
                        disabled={!autoDeleteEnabled || undefined}
                        onInput={(e: Event) => setAutoDeleteTime((e.target as HTMLInputElement).value)}
                    />
                    <wa-checkbox
                        defaultChecked={autoDeleteEnabled || undefined}
                        onChange={(e: Event) => setAutoDeleteEnabled((e.target as HTMLInputElement).checked)}
                    >
                        Enable automatic deletion
                    </wa-checkbox>
                </div>
            </div>

            <div className="form-actions">
                <wa-button
                    style={{ marginLeft: "auto" }}
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