import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { EntityKind } from "../types";
import { CREATE_DRAW_MODE_BY_KIND } from "../types";
import { useMapEditStore } from "../store/mapEditStore";

const BUTTONS = {
  EDIT_VERTICES: "geo-edit-vertices",
  MOVE: "geo-move",
  ADD_SHAPE: "geo-add-shape",
  SAVE: "geo-save",
  CANCEL: "geo-cancel",
};

const CREATE_LABELS: Record<EntityKind, { title: string; className: string }> = {
  poi: { title: "Add POI", className: "leaflet-pm-icon-marker" },
  road: { title: "Add road", className: "leaflet-pm-icon-polyline" },
  area: { title: "Add area", className: "leaflet-pm-icon-polygon" },
};

interface Props {
  selectedEntityId: string | null;
  selectedEntityType: EntityKind | null;
}

/**
 * Adds geometry edit controls to Geoman's native toolbar. Shows different
 * button sets depending on a create flow being active (creatingKind, from
 * the store) or an existing entity being selected (selectedEntityType, prop).
 *
 * All edit-mode state comes from the Zustand store, so button callbacks
 * call store actions directly via getState() — no stale-closure ref needed,
 * since store actions are stable and getState() always reads fresh values.
 */
export default function MapGeometryToolbar({ selectedEntityId, selectedEntityType }: Props) {
  const map = useMap();
  const editMode = useMapEditStore((s) => s.editMode);
  const editingEntityId = useMapEditStore((s) => s.editingEntityId);
  const creatingKind = useMapEditStore((s) => s.creatingKind);

  useEffect(() => {
    const toolbar = map.pm.Toolbar;
    const isEditing = editMode !== "idle";
    const hasSelection = !!selectedEntityId && selectedEntityType !== null;

    // A create flow's draw session is "active" once the user has clicked
    // "Add …" and is mid-draw (editingEntityId is always null during create).
    const isCreatingActive =
      creatingKind !== null &&
      editMode === CREATE_DRAW_MODE_BY_KIND[creatingKind] &&
      editingEntityId === null;

    Object.values(BUTTONS).forEach((name) => {
      try { toolbar.deleteControl(name); } catch { /* already absent */ }
    });

    // ── Create flow (POI, Road, or Area) ────────────
    if (creatingKind) {
      const labels = CREATE_LABELS[creatingKind];

      if (isCreatingActive) {
        toolbar.createCustomControl({
          name: BUTTONS.SAVE,
          block: "custom",
          title: "Save",
          className: "leaflet-toolbar-icon-save",
          toggle: false,
          onClick: () => { void useMapEditStore.getState().saveGeometry(); },
        });
        toolbar.createCustomControl({
          name: BUTTONS.CANCEL,
          block: "custom",
          title: "Cancel (Esc)",
          className: "leaflet-toolbar-icon-cancel",
          toggle: false,
          onClick: () => { useMapEditStore.getState().cancelEdit(); },
        });
      } else {
        toolbar.createCustomControl({
          name: BUTTONS.ADD_SHAPE,
          block: "custom",
          title: labels.title,
          className: labels.className,
          toggle: false,
          onClick: () => { useMapEditStore.getState().startCreateDraw(); },
        });
      }

      return () => {
        Object.values(BUTTONS).forEach((name) => {
          try { toolbar.deleteControl(name); } catch { /* already absent */ }
        });
      };
    }

    // ── Existing selection (edit an already-saved entity) ─
    if (!hasSelection && !isEditing) return;

    if (isEditing && editingEntityId === selectedEntityId) {
      toolbar.createCustomControl({
        name: BUTTONS.SAVE,
        block: "custom",
        title: "Save",
        className: "leaflet-toolbar-icon-save",
        toggle: false,
        onClick: () => { void useMapEditStore.getState().saveGeometry(); },
      });
      toolbar.createCustomControl({
        name: BUTTONS.CANCEL,
        block: "custom",
        title: "Cancel (Esc)",
        className: "leaflet-toolbar-icon-cancel",
        toggle: false,
        onClick: () => { useMapEditStore.getState().cancelEdit(); },
      });
    } else if (!isEditing && hasSelection) {
      const type = selectedEntityType!;
      const labels = CREATE_LABELS[type];

      toolbar.createCustomControl({
        name: BUTTONS.EDIT_VERTICES,
        block: "custom",
        title: type === "road" ? "Edit road" : type === "poi" ? "Move POI(s)" : "Edit shape",
        className: type === "poi" ? "leaflet-toolbar-icon-move" : "leaflet-pm-icon-edit",
        toggle: false,
        onClick: () => {
          if (!selectedEntityId) return;
          useMapEditStore.getState().startEdit(
            selectedEntityId,
            type === "road" ? "editLine" : type === "poi" ? "movePOI" : "vertices"
          );
        },
      });

      if (type !== "poi") {
        toolbar.createCustomControl({
          name: BUTTONS.MOVE,
          block: "custom",
          title: type === "road" ? "Move road(s)" : "Move shape(s)",
          className: "leaflet-toolbar-icon-move",
          toggle: false,
          onClick: () => {
            if (!selectedEntityId) return;
            useMapEditStore.getState().startEdit(selectedEntityId, type === "road" ? "dragLine" : "drag");
          },
        });
      }

      toolbar.createCustomControl({
        name: BUTTONS.ADD_SHAPE,
        block: "custom",
        title: labels.title,
        className: labels.className,
        toggle: false,
        onClick: () => {
          if (!selectedEntityId) return;
          useMapEditStore.getState().startEdit(
            selectedEntityId,
            type === "road" ? "drawLine" : type === "poi" ? "drawPOI" : "draw"
          );
        },
      });
    }

    // Clean up buttons when dependencies change or component unmounts.
    return () => {
      Object.values(BUTTONS).forEach((name) => {
        try { toolbar.deleteControl(name); } catch { /* already absent */ }
      });
    };
  }, [map, editMode, editingEntityId, selectedEntityId, selectedEntityType, creatingKind]);

  return null;
}