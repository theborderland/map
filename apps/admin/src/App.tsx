import { useState, useEffect } from "react";
import LeftPanel from "./components/LeftPanel";
import MapView from "./components/MapView";
import LoginPage from "./components/LoginPage";
import type { PanelView, Tab } from "./types";
import type { EntityRecord, RuleRecord, StyleRecord } from "./db/types";
import {
  isAuthenticated,
  resetAndReseed,
  getEntities, getStyles, getRules,
} from "./db";
import { buildEntityNavigation, createRoot, getActiveTabFromNav } from "./utils/panelNavigation";

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [styles, setStyles] = useState<StyleRecord[]>([]);
  const [rules, setRules] = useState<RuleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [navStack, setNavStack] = useState<PanelView[]>([createRoot("Areas")]);

  const currentView = navStack[navStack.length - 1];
  const activeTab: Tab = getActiveTabFromNav(navStack, entities);

  const selectedEntityId =
    currentView.type === "entity-detail"
      ? currentView.entityId
      : null;

  const openEntity = (entityId: string | null) => {
    if (entityId === null) {
      setNavStack([createRoot(activeTab)]);
      return;
    }
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;

    setNavStack(buildEntityNavigation(entity));
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (authenticated) {
        setIsLoading(true);

        // During development its nice to reset and reseed the database on each load to have a consistent starting point. :)
        await resetAndReseed();
        const [entitiesData, stylesData, rulesData] = await Promise.all([
          getEntities(), getStyles(), getRules(),
        ]);
        // await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate loading delay
        setEntities(entitiesData);
        setStyles(stylesData);
        setRules(rulesData);
      }
      setIsLoading(false);
    };

    initializeApp();
  }, [authenticated]);

  if (!authenticated) {
    return <LoginPage onLoginSuccess={() => setAuthenticated(true)} />;
  }

  if (isLoading) {
    return <div className="loading">Loading data…</div>;
  }

  return (
    <div className="container">
      <div className="left">
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
        />
      </div>

      <div className="right">
        <MapView
          entities={entities}
          styles={styles}
          selectedEntityId={selectedEntityId ?? null}
          openEntity={openEntity}
        />
      </div>
    </div>
  );
}

export default App;