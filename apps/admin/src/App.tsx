import { useState } from "react";
import "./App.css";
import LeftPanel from "./components/LeftPanel";
import MapView from "./components/MapView";
import type { Tab } from "./types";


function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Areas");

  return (
    <div className="container">
      <div className="left">
        <LeftPanel activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="right">
        <MapView />
      </div>
    </div>
  );
}

export default App;