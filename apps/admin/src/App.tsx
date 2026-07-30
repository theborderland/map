import { useState, useEffect } from "react";
import LeftPanel from "./components/LeftPanel";
import MapView from "./components/MapView";
import LoginPage from "./components/LoginPage";
import type { PanelView, Tab, EntityKind } from "./types";
import type { EntityRecord, RuleRecord, StyleRecord, SettingsRecord } from "./db/types";
import {
  isAuthenticated, resetAndReseed,
  getEntities, getStyles, getRules, getSettings,
} from "./db";
import { buildEntityNavigation, createRoot, getActiveTabFromNav } from "./utils/panelNavigation";
import { DEFAULT_POI_ICON } from "./utils/Icons";
import { useMapEditStore } from "./store/mapEditStore";

function App() {
  const [selectedPOIIcon, setSelectedPOIIcon] = useState(DEFAULT_POI_ICON);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [styles, setStyles] = useState<StyleRecord[]>([]);
  const [rules, setRules] = useState<RuleRecord[]>([]);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navStack, setNavStack] = useState<PanelView[]>([createRoot("Areas")]);
  const [mapKey, setMapKey] = useState(0);

  const currentView = navStack[navStack.length - 1];
  const activeTab: Tab = getActiveTabFromNav(navStack, entities);
  const selectedEntityId = currentView.type === "entity-detail" ? currentView.entityId : null;
  const creatingKind: EntityKind | null =
    currentView.type === "poi-create" ? "poi" :
    currentView.type === "road-create" ? "road" :
    currentView.type === "area-create" ? "area" :
    null;

  /** Bumps mapKey so MapView GeoJSON layers remount after a geometry save. */
  const bumpMapKey = () => setMapKey((k) => k + 1);

  // Bind entity update callbacks once so the store's saveGeometry action
  // can update App's entities state without editMode/pendingGeometry/etc.
  // being threaded down as props through MapView/LeftPanel/Detail components.
  useEffect(() => {
    useMapEditStore.getState().bindEntityCallbacks(setEntities, bumpMapKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync the nav-derived creatingKind into the store — navStack itself
  // stays as App-owned React state, only its derived edit-relevant value
  // needs to be visible to the map-editing subsystem.
  useEffect(() => {
    useMapEditStore.getState().setCreatingKind(creatingKind);
  }, [creatingKind]);

  const openEntity = (entityId: string | null) => {
    if (useMapEditStore.getState().editMode !== "idle") return; // Block selection changes during edit
    if (entityId === null) {
      setNavStack([createRoot(activeTab)]);
      return;
    }
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return;
    setNavStack(buildEntityNavigation(entity));
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
        settings={settings}
        selectedPOIIcon={selectedPOIIcon}
      />
    </div>
  );
}

export default App;