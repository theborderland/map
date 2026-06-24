import { useState, useEffect } from "react";
import LeftPanel from "./components/LeftPanel";
import MapView from "./components/MapView";
import LoginPage from "./components/LoginPage";
import type { Tab } from "./types";
import type { EntityRecord, RuleRecord, StyleRecord } from "./db/types";
import {
  isAuthenticated,
  resetAndReseed,
  getEntities, getStyles, getRules,
} from './db';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [styles, setStyles] = useState<StyleRecord[]>([]);
  const [rules, setRules] = useState<RuleRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Areas");
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; key: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleUserTabChange = (tab: Tab) => {
    setSelectedEntity(null);
    setActiveTab(tab);
  };

  const setActiveTabDirect = (tab: Tab) => {
    setActiveTab(tab);
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
          onUserTabChange={handleUserTabChange}
          setActiveTabDirect={setActiveTabDirect}
          entities={entities}
          rules={rules}
          styles={styles}
          selectedEntity={selectedEntity}
          onSelectEntity={(entityId: string) => setSelectedEntity({ id: entityId, key: Date.now() })}
        />
      </div>

      <div className="right">
        <MapView
          entities={entities}
          styles={styles}
          selectedEntityId={selectedEntity?.id ?? null}
          onSelectEntity={(entityId: string) => setSelectedEntity({ id: entityId, key: Date.now() })}
          onClearSelection={() => setSelectedEntity(null)}
        />
      </div>
    </div>
  );
}

export default App;