import { useState, useEffect } from "react";
import "./App.css";
import LeftPanel from "./components/LeftPanel";
import MapView from "./components/MapView";
import LoginPage from "./components/LoginPage";
import type { Tab } from "./types";
import type { EntityRecord, RuleRecord, StyleRecord } from "./db/types";
import {
  isAuthenticated,
  seedIfEmpty,
  getEntities, getStyles, getRules,
} from './db';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [activeTab, setActiveTab] = useState<Tab>("Areas");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      if (authenticated) {
        setIsLoading(true);
        await seedIfEmpty();
        // await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate loading delay
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
          setActiveTab={setActiveTab}
        />
      </div>

      <div className="right">
        <MapView />
      </div>
    </div>
  );
}

export default App;