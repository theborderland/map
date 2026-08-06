import { useState } from "react";
import type { Geometry } from "geojson";
import type { AttachedRule, EntityRecord } from "../db/types";
import { useMapEditStore, useIsEditingLocked } from "../store/mapEditStore";

interface UseEntityDetailFormArgs<T extends EntityRecord> {
    entity?: T;
    setEntities: React.Dispatch<React.SetStateAction<T[]>>;
    bumpMapKey: () => void;
    goBack?: () => void;
    /** Whether the caller's own extra fields (styleType, icon, etc.) are
     *  individually valid. Defaults to true if omitted. */
    extraFieldsValid?: boolean;
    /** Whether the caller's own extra fields differ from their last-saved
     *  values. Combined with this hook's own dirty tracking (name/tagline/
     *  rules/geometry) to decide whether Save should be enabled. Ignored
     *  in create mode, where Save is always enabled once required fields
     *  are filled in. Defaults to false if omitted. */
    extraFieldsDirty?: boolean;
}

interface Baseline {
    name: string;
    tagline: string;
    rules: AttachedRule[];
    geometry: Geometry | null;
}

const sameRules = (a: AttachedRule[], b: AttachedRule[]) => JSON.stringify(a) === JSON.stringify(b);
const sameGeometry = (a: Geometry | null, b: Geometry | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Shared form state and save/delete orchestration for entity detail
 * components (Area, Road, POI). Handles:
 *  - name/tagline/rules state
 *  - geometry resolution (local paste → map draw session → saved entity)
 *  - the "draw session still open" save guard
 *  - dirty tracking: Save stays disabled until something actually
 *    changes, and re-disables immediately after a successful save
 *  - wiring handleSave/handleDelete through useMapEditStore + the DB
 *
 * Callers provide their own extra fields (styleType, bufferMeters, icon, …)
 * and pass a payload-building function into runSave, plus `extraFieldsDirty`
 * so their own fields participate in the dirty check.
 */
export function useEntityDetailForm<T extends EntityRecord>({
    entity,
    setEntities,
    bumpMapKey,
    goBack,
    extraFieldsValid = true,
    extraFieldsDirty = false,
}: UseEntityDetailFormArgs<T>) {
    const isCreate = !entity;
    const hasOpenDrawSession = useIsEditingLocked();

    const [name, setName] = useState(entity?.name ?? "");
    const [tagline, setTagline] = useState(entity?.tagline ?? "");
    const [attachedRules, setAttachedRules] = useState<AttachedRule[]>(entity?.rules ?? []);
    const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Snapshot of the fields this hook owns, as of the last successful save
    // (or the entity's original values, for an existing entity that hasn't
    // been saved yet in this session). Compared against current state to
    // drive isDirty — updated in place after every successful save so Save
    // immediately re-disables until the next real change.
    const [baseline, setBaseline] = useState<Baseline>({
        name: entity?.name ?? "",
        tagline: entity?.tagline ?? "",
        rules: entity?.rules ?? [],
        geometry: entity?.geometry ?? null,
    });

    // Prefer local GeometryEditor edits, then map tool edits from the store
    // (read imperatively — non-reactive, matches the original ref semantics),
    // then fall back to the entity's existing geometry.
    const geometry = pendingGeometry
        ?? useMapEditStore.getState().pendingGeometry
        ?? entity?.geometry
        ?? null;

    const isDirty =
        name !== baseline.name ||
        tagline !== baseline.tagline ||
        !sameRules(attachedRules, baseline.rules) ||
        !sameGeometry(geometry, baseline.geometry) ||
        extraFieldsDirty;

    // Block form save while a draw session is still open on the map —
    // force the user to Save/Cancel that session first. In edit mode, also
    // require an actual change (isDirty) so Save stays disabled until
    // something differs from what's already persisted.
    const canSave = !hasOpenDrawSession && extraFieldsValid &&
        (isCreate ? (!!name.trim() && !!geometry) : (!!name.trim() && isDirty));

    /**
     * Runs the save flow. `buildPayload` receives the resolved geometry and
     * must return the fields specific to this entity kind (styleType,
     * bufferMeters, icon, description, link, …) — name/tagline/rules/geometry
     * are already included in the base payload merged in here.
     *
     * On a successful update (not create), this hook's own baseline resets
     * to the just-saved values so isDirty — and therefore canSave — goes
     * false immediately. `ops.onSaved` lets the caller do the same for its
     * own extra fields.
     *
     * `ops.onCreate` is called with the created entity, used by callers to
     * navigate to its detail view.
     */
    const runSave = async <P extends Record<string, unknown>>(
        buildPayload: (geometry: Geometry) => P,
        ops: {
            updateEntity: (id: string, payload: Record<string, unknown>) => Promise<T>;
            createEntity: (payload: Record<string, unknown>) => Promise<T>;
            onCreate?: (created: T) => void;
            onSaved?: () => void;
        }
    ) => {
        if (!canSave || !geometry) return;
        setIsSaving(true);

        const basePayload = {
            name: name.trim(),
            tagline: tagline.trim(),
            rules: attachedRules,
            geometry,
            ...buildPayload(geometry),
        };

        if (entity) {
            const updated = await ops.updateEntity(entity.id, basePayload);
            setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            // Reset baseline to what was just saved so Save re-disables immediately.
            setBaseline({
                name: name.trim(),
                tagline: tagline.trim(),
                rules: attachedRules,
                geometry,
            });
            ops.onSaved?.();
        } else {
            const created = await ops.createEntity(basePayload);
            setEntities((prev) => [...prev, created]);
            ops.onCreate?.(created);
        }

        useMapEditStore.getState().setPendingGeometry(null);
        bumpMapKey();
        useMapEditStore.getState().cancelEdit();
        setIsSaving(false);
    };

    const runDelete = async (deleteEntity: (id: string) => Promise<void>) => {
        if (!entity) return;
        await deleteEntity(entity.id);
        setEntities((prev) => prev.filter((e) => e.id !== entity.id));
        goBack?.();
    };

    return {
        isCreate,
        name, setName,
        tagline, setTagline,
        attachedRules, setAttachedRules,
        geometry,
        setPendingGeometry,
        hasOpenDrawSession,
        canSave,
        isSaving,
        runSave,
        runDelete,
    };
}