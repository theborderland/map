import { useState, useEffect } from "react";
import type { EntityRecord } from "../db/types";
import { useMapStore } from "../store/mapStore";
import { updateEntity, createEntity, deleteEntity } from "../db";

const FIRE_ROAD_TYPE = "fireroad";

interface UseEntityFormArgs {
    entity?: EntityRecord;
    defaultStyleType?: string;
    entityKind?: "area" | "road" | "poi";
    setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
    goBack?: () => void;
    onAfterCreate?: (id: string) => void;
}

export function useEntityForm({
    entity,
    defaultStyleType,
    entityKind,
    setEntities,
    goBack,
    onAfterCreate,
}: UseEntityFormArgs) {
    const isCreate = !entity;
    const {
        isEditing, startEditing, stopEditing, cancelEditing,
        pendingGeometry, setCreatingStyleType, incrementMapVersion,
    } = useMapStore();

    const [name, setName] = useState(entity?.name ?? "");
    const [tagline, setTagline] = useState(entity?.tagline ?? "");
    const [description, setDescription] = useState(entity?.description ?? "");
    const [link, setLink] = useState(entity?.link ?? "");
    const [selectedStyleType, setSelectedStyleType] = useState(
        entity?.styleType ?? defaultStyleType ?? ""
    );

    // Keep store in sync so MapCreateHandler can style the drawn layer correctly.
    useEffect(() => {
        if (isCreate) setCreatingStyleType(selectedStyleType || null);
    }, [isCreate, selectedStyleType, setCreatingStyleType]);

    useEffect(() => {
        return () => { setCreatingStyleType(null); };
    }, [setCreatingStyleType]);

    // Ensures geometry is saved in the correct type for each entity kind.
// Collapses single-element multi-geometries to their simpler form,
// and forces fire roads to always use MultiLineString.
const normalizeGeometry = (geom: GeoJSON.Geometry): GeoJSON.Geometry => {
  if (entityKind === "area") {
    // Collapse MultiPolygon with a single polygon back to Polygon.
    if (geom.type === "MultiPolygon") {
      const coords = (geom as GeoJSON.MultiPolygon).coordinates;
      if (coords.length === 1) {
        return { type: "Polygon", coordinates: coords[0]! };
      }
    }
    return geom;
  }

  if (entityKind === "road") {
    if (selectedStyleType === FIRE_ROAD_TYPE) {
      // Fire roads must always be MultiLineString, even with a single line.
      if (geom.type === "LineString") {
        return { type: "MultiLineString", coordinates: [(geom as GeoJSON.LineString).coordinates] };
      }
    } else {
      // Walking paths: collapse MultiLineString with a single line back to LineString.
      if (geom.type === "MultiLineString") {
        const coords = (geom as GeoJSON.MultiLineString).coordinates;
        if (coords.length === 1) {
          return { type: "LineString", coordinates: coords[0]! };
        }
      }
    }
    return geom;
  }

  return geom;
};

    const handleSave = async (extra?: { icon?: string }) => {
        if (entity) {
            const geometry = normalizeGeometry(pendingGeometry ?? entity.geometry);
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
            stopEditing();
            // Bump version so MapView GeoJSON layers remount and pick up the new geometry.
            incrementMapVersion();
            setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        } else {
            if (!pendingGeometry || !selectedStyleType) return;
            const geometry = normalizeGeometry(pendingGeometry);
            const created = await createEntity({
                styleType: selectedStyleType,
                name: name.trim(),
                tagline: tagline.trim(),
                description: description.trim(),
                link: link.trim(),
                geometry,
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
        goBack?.();
    };

    const handleCancelGeometry = () => {
        cancelEditing();
        if (isCreate) goBack?.();
    };

    return {
        isCreate, isEditing, pendingGeometry, startEditing,
        handleSave, handleDelete, handleCancelGeometry,
        name, setName,
        tagline, setTagline,
        description, setDescription,
        link, setLink,
        selectedStyleType, setSelectedStyleType,
    };
}