import { useState } from "react";
import type { Geometry } from "geojson";
import type { AttachedRule, EntityRecord } from "../db/types";
import { useMapEditStore, useIsEditingLocked } from "../store/mapEditStore";

interface UseEntityDetailFormArgs<T extends EntityRecord> {
    entity?: T;
    setEntities: React.Dispatch<React.SetStateAction<T[]>>;
    bumpMapKey: () => void;
    goBack?: () => void;
    /** Whether the caller has satisfied its own extra required fields
     *  (e.g. styleType for Area/Road). Defaults to true if omitted. */
    extraFieldsValid?: boolean;
}

/** Fields runSave always includes, merged with each caller's extra fields. */
interface BaseSavePayload {
  name: string;
  tagline: string;
  rules: AttachedRule[];
  geometry: Geometry;
}

/**
 * Shared form state and save/delete orchestration for entity detail
 * components (Area, Road, POI). Handles:
 *  - name/tagline/rules state
 *  - geometry resolution (local paste → map draw session → saved entity)
 *  - the "draw session still open" save guard
 *  - wiring handleSave/handleDelete through useMapEditStore + the DB
 *
 * Callers provide their own extra fields (styleType, bufferMeters, icon, …)
 * and pass a payload-building function into runSave.
 */
export function useEntityDetailForm<T extends EntityRecord>({
    entity,
    setEntities,
    bumpMapKey,
    goBack,
    extraFieldsValid = true,
}: UseEntityDetailFormArgs<T>) {
    const isCreate = !entity;

    const [name, setName] = useState(entity?.name ?? "");
    const [tagline, setTagline] = useState(entity?.tagline ?? "");
    const [attachedRules, setAttachedRules] = useState<AttachedRule[]>(entity?.rules ?? []);
    const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Prefer local GeometryEditor edits, then map tool edits from the store
    // (read imperatively — non-reactive, matches the original ref semantics),
    // then fall back to the entity's existing geometry.
    const geometry = pendingGeometry
        ?? useMapEditStore.getState().pendingGeometry
        ?? entity?.geometry
        ?? null;

    // Block form save while a draw session is still open on the map —
    // force the user to Save/Cancel that session first.
    const hasOpenDrawSession = useIsEditingLocked();
    const canSave = !hasOpenDrawSession && extraFieldsValid &&
        (isCreate ? (!!name.trim() && !!geometry) : !!name.trim());

    /**
     * Runs the save flow. `buildPayload` receives the resolved geometry and
     * must return the fields specific to this entity kind (styleType,
     * bufferMeters, icon, description, link, …) — name/tagline/rules/geometry
     * are already included in the base payload merged in here.
     *
     * `ops.updateEntity`/`createEntity` are typed against the exact payload
     * shape this call produces (base fields + P), matching the real db
     * functions' EntityPayload signature exactly rather than a widened
     * Record<string, unknown> — avoids contravariant assignment errors.
     *
     * `onCreate` is called with the created entity, used by callers to
     * navigate to its detail view.
     */
    const runSave = async <P extends Record<string, unknown>>(
        buildPayload: (geometry: Geometry) => P,
        ops: {
            updateEntity: (id: string, payload: BaseSavePayload & P) => Promise<T>;
            createEntity: (payload: BaseSavePayload & P) => Promise<T>;
            onCreate?: (created: T) => void;
        }
    ) => {
        if (!canSave || !geometry) return;
        setIsSaving(true);

        const basePayload: BaseSavePayload & P = {
            name: name.trim(),
            tagline: tagline.trim(),
            rules: attachedRules,
            geometry,
            ...buildPayload(geometry),
        };

        if (entity) {
            const updated = await ops.updateEntity(entity.id, basePayload);
            setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
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