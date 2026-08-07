import * as L from "leaflet"
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { EntityKind } from "../types";
import type { AreaEditAction, RoadEditAction, PoiEditAction } from "../store/mapEditStore";
import { useMapEditStore } from "../store/mapEditStore";

const BUTTONS = {
  EDIT_VERTICES: "geo-edit-vertices",
  MOVE: "geo-move",
  ADD_SHAPE: "geo-add-shape",
  SAVE: "geo-save",
  CANCEL: "geo-cancel",
};

const CREATE_LABELS: Record<EntityKind, { title: string; addIconClassName: string }> = {
  poi: { title: "Add POI", addIconClassName: "leaflet-pm-icon-marker" },
  road: { title: "Add road", addIconClassName: "leaflet-pm-icon-polyline" },
  area: { title: "Add area", addIconClassName: "leaflet-pm-icon-polygon" },
};

interface Props {
  selectedEntityId: string | null;
  selectedEntityType: EntityKind | null;
}

function clearButtons(toolbar: L.PM.PMMapToolbar) {
  Object.values(BUTTONS).forEach((name) => {
    try { toolbar.deleteControl(name); } catch { /* already absent */ }
  });
}

function addSaveCancelButtons(toolbar: L.PM.PMMapToolbar) {
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
}

/** Starts the correctly-typed edit session for whichever button was
 *  pressed, keeping the per-kind action mapping in one place instead of
 *  scattered across three separate onClick handlers. */
function startEditForKind(entityId: string, kind: EntityKind, purpose: "primary" | "move" | "add") {
  const store = useMapEditStore.getState();
  if (kind === "area") {
    const action: AreaEditAction = purpose === "primary" ? "vertices" : purpose === "move" ? "dragPolygon" : "drawPolygon";
    store.startEdit(entityId, "area", action);
  } else if (kind === "road") {
    const action: RoadEditAction = purpose === "primary" ? "editLine" : purpose === "move" ? "dragLine" : "drawLine";
    store.startEdit(entityId, "road", action);
  } else {
    // POI has no separate "move" button — its primary action IS moving.
    const action: PoiEditAction = purpose === "add" ? "drawPOI" : "movePOI";
    store.startEdit(entityId, "poi", action);
  }
}

function addExistingEntityButtons(toolbar: L.PM.PMMapToolbar, entityId: string, kind: EntityKind) {
  const labels = CREATE_LABELS[kind];

  toolbar.createCustomControl({
    name: BUTTONS.EDIT_VERTICES,
    block: "custom",
    title: kind === "road" ? "Edit road" : kind === "poi" ? "Move POI(s)" : "Edit shape",
    className: kind === "poi" ? "leaflet-toolbar-icon-move" : "leaflet-pm-icon-edit",
    toggle: false,
    onClick: () => startEditForKind(entityId, kind, "primary"),
  });

  if (kind !== "poi") {
    toolbar.createCustomControl({
      name: BUTTONS.MOVE,
      block: "custom",
      title: kind === "road" ? "Move road(s)" : "Move shape(s)",
      className: "leaflet-toolbar-icon-move",
      toggle: false,
      onClick: () => startEditForKind(entityId, kind, "move"),
    });
  }

  toolbar.createCustomControl({
    name: BUTTONS.ADD_SHAPE,
    block: "custom",
    title: labels.title,
    className: labels.addIconClassName,
    toggle: false,
    onClick: () => startEditForKind(entityId, kind, "add"),
  });
}

function addCreateWaitingButton(toolbar: L.PM.PMMapToolbar, kind: EntityKind) {
  const labels = CREATE_LABELS[kind];
  toolbar.createCustomControl({
    name: BUTTONS.ADD_SHAPE,
    block: "custom",
    title: labels.title,
    className: labels.addIconClassName,
    toggle: false,
    onClick: () => { useMapEditStore.getState().startCreateDraw(); },
  });
}

/**
 * Adds geometry edit controls to Geoman's native toolbar. Which buttons
 * show is a direct, exhaustive match on the store's MapEditState — no
 * stale-closure ref needed (store actions are stable, getState() always
 * reads fresh), and no ad-hoc "is a create flow active" boolean to keep
 * in sync (the union's `status` field is the single source of truth).
 */
export default function MapGeometryToolbar({ selectedEntityId, selectedEntityType }: Props) {
  const map = useMap();
  const editState = useMapEditStore((s) => s.state);

  useEffect(() => {
    const toolbar: L.PM.PMMapToolbar = map.pm.Toolbar;
    clearButtons(toolbar);

    if (editState.status === "creating") {
      if (editState.drawing) addSaveCancelButtons(toolbar);
      else addCreateWaitingButton(toolbar, editState.kind);
      return () => clearButtons(toolbar);
    }

    if (editState.status === "editing") {
      if (editState.entityId === selectedEntityId) addSaveCancelButtons(toolbar);
      return () => clearButtons(toolbar);
    }

    // idle
    if (selectedEntityId && selectedEntityType) {
      addExistingEntityButtons(toolbar, selectedEntityId, selectedEntityType);
    }
    return () => clearButtons(toolbar);
  }, [map, editState, selectedEntityId, selectedEntityType]);

  return null;
}