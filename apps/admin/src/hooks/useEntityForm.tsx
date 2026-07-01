import { useState, useEffect } from "react";
import type { EntityRecord } from "../db/types";
import { useMapStore } from "../store/mapStore";
import { updateEntity, createEntity, deleteEntity } from "../db";

interface Props {
    entity?: EntityRecord;
    defaultStyleType?: string;
    setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
    onCancel?: () => void;
    onAfterCreate?: (id: string) => void;
    /** Called after successful delete so LeftPanel can navigate back. */
    onDelete?: () => void;
}

/** Custom hook to manage the state and actions for an entity form (Area, Road, POI). */
export function useEntityForm({
    entity,
    defaultStyleType,
    setEntities,
    onCancel,
    onAfterCreate,
    onDelete,
}: Props) {
    const isCreate = !entity;

    const {
        isEditing,
        startEditing,
        stopEditing,
        cancelEditing,
        pendingGeometry,
        setCreatingStyleType,
    } = useMapStore();

    const [name, setName] = useState(entity?.name ?? "");
    const [tagline, setTagline] = useState(entity?.tagline ?? "");
    const [description, setDescription] = useState(entity?.description ?? "");
    const [link, setLink] = useState(entity?.link ?? "");
    const [selectedStyleType, setSelectedStyleType] = useState(
        entity?.styleType ?? defaultStyleType ?? ""
    );

    useEffect(() => {
        if (isCreate) setCreatingStyleType(selectedStyleType || null);
    }, [isCreate, selectedStyleType, setCreatingStyleType]);

    const handleSave = async (extra?: { icon?: string }) => {
        if (entity) {
            const geometry = pendingGeometry ?? entity.geometry;
            const updated = await updateEntity(entity.id, {
                name: name.trim(),
                tagline: tagline.trim(),
                description: description.trim(),
                link: link.trim(),
                styleType: selectedStyleType,
                geometry,
                rules: entity.rules,
                ...(extra?.icon !== undefined ? { icon: extra.icon } : {}),
            });
            if (isEditing) stopEditing();
            setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        } else {
            if (!pendingGeometry || !selectedStyleType) return;
            const created = await createEntity({
                styleType: selectedStyleType,
                name: name.trim(),
                tagline: tagline.trim(),
                description: description.trim(),
                link: link.trim(),
                geometry: pendingGeometry,
                rules: [],
                ...(extra?.icon !== undefined ? { icon: extra.icon } : {}),
            });
            stopEditing();
            setEntities((prev) => [...prev, created]);
            onAfterCreate?.(created.id);
        }
    };

    /** Deletes the entity (Area, Road, POI) from the DB, removes it from state, then navigates back. */
    const handleDelete = async () => {
        if (!entity) return;
        if (isEditing) stopEditing();
        await deleteEntity(entity.id);
        setEntities((prev) => prev.filter((e) => e.id !== entity.id));
        onDelete?.();
    };

    const handleCancelGeometry = () => {
        cancelEditing();
        if (isCreate) onCancel?.();
    };

    return {
        isCreate,
        isEditing,
        pendingGeometry,
        startEditing,
        handleSave,
        handleDelete,
        handleCancelGeometry,
        name, setName,
        tagline, setTagline,
        description, setDescription,
        link, setLink,
        selectedStyleType, setSelectedStyleType,
    };
}