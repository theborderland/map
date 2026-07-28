import { useState, useEffect, useRef } from "react";
import type { Geometry } from "geojson";
import LeftPanel from "./components/LeftPanel";
import MapView from "./components/MapView";
import LoginPage from "./components/LoginPage";
import type { EditMode, PanelView, Tab, EntityKind } from "./types";
import { CREATE_DRAW_MODE_BY_KIND } from "./types";
import type { EntityRecord, RuleRecord, StyleRecord, SettingsRecord } from "./db/types";
import {
  isAuthenticated, resetAndReseed,
  getEntities, getStyles, getRules, updateEntity,
  getSettings
} from "./db";
import {
  buildEntityNavigation, createRoot, getActiveTabFromNav,
} from "./utils/panelNavigation";
import { DEFAULT_POI_ICON } from "./utils/Icons";

function App() {
  const [selectedPOIIcon, setSelectedPOIIcon] = useState(DEFAULT_POI_ICON);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [styles, setStyles] = useState<StyleRecord[]>([]);
  const [rules, setRules] = useState<RuleRecord[]>([]);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navStack, setNavStack] = useState<PanelView[]>([createRoot("Areas")]);
  // Incrementing this forces all GeoJSON layers in MapView to remount,
  // picking up geometry changes that Leaflet wouldn't detect otherwise.
  const [mapKey, setMapKey] = useState(0);

  // Edit state — low frequency, fine as React state
  const [editMode, setEditMode] = useState<EditMode>("idle");
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Pending geometry — written on every vertex drag, must not trigger re-renders
  const pendingGeometryRef = useRef<Geometry | null>(null);
  // Set by saveGeometry/cancelEdit right before flipping editMode, so
  // MapEditController's cleanup can tell which action just happened.
  const draftActionRef = useRef<"save" | "cancel" | null>(null);

  const currentView = navStack[navStack.length - 1];
  const activeTab: Tab = getActiveTabFromNav(navStack, entities);
  const selectedEntityId = currentView.type === "entity-detail" ? currentView.entityId : null;
  const creatingKind: EntityKind | null =
    currentView.type === "poi-create" ? "poi" :
      currentView.type === "road-create" ? "road" :
        null;

  /** Bumps mapKey so MapView GeoJSON layers remount after a geometry save. */
  const bumpMapKey = () => setMapKey((k) => k + 1);

  const openEntity = (entityId: string | null) => {
    if (editMode !== "idle") return; // Block selection changes during edit
    if (entityId === null) {
      setNavStack([createRoot(activeTab)]);
      return;
    }
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    setNavStack(buildEntityNavigation(entity));
  };

  const startCreateDraw = () => {
    if (!creatingKind) return;
    setEditingEntityId(null);
    setEditMode(CREATE_DRAW_MODE_BY_KIND[creatingKind]);
  };

  // Activates a geometry edit mode for the given entity.
  const startEdit = (entityId: string, mode: Exclude<EditMode, "idle">) => {
    pendingGeometryRef.current = null;
    setEditingEntityId(entityId);
    setEditMode(mode);
  };

  // Saves the pending geometry to the DB, then exits edit mode.
  // If no geometry was changed (ref is null) edit mode is still exited cleanly.
  const saveGeometry = async () => {
    draftActionRef.current = "save";
    const geom = pendingGeometryRef.current;
    if (geom && editingEntityId) {
      // Editing an existing entity — persist immediately.
      const updated = await updateEntity(editingEntityId, { geometry: geom });
      setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
      bumpMapKey();
      pendingGeometryRef.current = null;
    }
    // Creating a new entity: geom stays in pendingGeometryRef — the entity
    // doesn't exist yet, it's finalized later via the form's own Save/Create.
    setEditMode("idle");
    setEditingEntityId(null);
  };

  // Cancels edit mode. MapEditController's cleanup handles visual restore.
  const cancelEdit = () => {
    draftActionRef.current = "cancel";
    if (editingEntityId) {
      // Editing an existing entity — fully discard.
      pendingGeometryRef.current = null;
    }
    // Creating a new entity: MapEditController's cleanup restores
    // pendingGeometryRef to the pre-session snapshot instead of nulling it.
    setEditMode("idle");
    setEditingEntityId(null);
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (authenticated) {
        setIsLoading(true);

        // During development its nice to reset and reseed the database on each load to have a consistent starting point. :)
        await resetAndReseed();
        const [entitiesData, stylesData, rulesData, settingsData] = await Promise.all([
          getEntities(), getStyles(), getRules(), getSettings(),
        ]);
        setEntities(entitiesData);
        setStyles(stylesData);
        setRules(rulesData);
        setSettings(settingsData);
      }
      setIsLoading(false);
    };
    initializeApp();
  }, [authenticated]);

  if (!authenticated) return <LoginPage onLoginSuccess={() => setAuthenticated(true)} />;
  // Guard loading until settings is ready too — settings can be null initially:
  if (isLoading || !settings) return <div className="loading">Loading data…</div>;

  return (
    <div className="container">
      <LeftPanel
        activeTab={activeTab}
        entities={entities}
        rules={rules}
        styles={styles}
        setEntities={setEntities}
        setRules={setRules}
        setStyles={setStyles}
        navStack={navStack}
        setNavStack={setNavStack}
        bumpMapKey={bumpMapKey}
        editMode={editMode}
        pendingGeometryRef={pendingGeometryRef}
        onCancelEdit={cancelEdit}
        onSettingsSaved={setSettings}
        selectedPOIIcon={selectedPOIIcon}
        onSelectedPOIIconChange={setSelectedPOIIcon}
      />
      <MapView
        entities={entities}
        styles={styles}
        mapKey={mapKey}
        selectedEntityId={selectedEntityId}
        openEntity={openEntity}
        editMode={editMode}
        editingEntityId={editingEntityId}
        pendingGeometryRef={pendingGeometryRef}
        draftActionRef={draftActionRef}
        onStartEdit={startEdit}
        onSaveGeometry={saveGeometry}
        onCancelEdit={cancelEdit}
        creatingKind={creatingKind}
        onStartCreate={startCreateDraw}
        settings={settings}
        selectedPOIIcon={selectedPOIIcon}
      />
    </div>
  );
}

export default App;