import { useState, useRef, useEffect } from "react";
import type { Tab } from "../types";
import AreasTab from "../tabs/AreasTab";
import RoadsTab from "../tabs/RoadsTab";
import POIsTab from "../tabs/POIsTab";
import RulesTab from "../tabs/RulesTab";
import StylesTab from "../tabs/StylesTab";

interface Props {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

type ViewState =
  | { type: "root" }
  | { type: "child"; parent: Tab; content: string };

export default function LeftPanel({ activeTab, setActiveTab }: Props) {
  const [view, setView] = useState<ViewState>({ type: "root" });

  const tabs: Tab[] = ["Areas", "Roads", "POIs", "Rules", "Styles"];

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    setView({ type: "root" });
  };

  const openChild = (content: string) => {
    setView({ type: "child", parent: activeTab, content });
  };

  const goBack = () => {
    setView({ type: "root" });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "Areas":
        return <AreasTab openChild={openChild} />;
      case "Roads":
        return <RoadsTab openChild={openChild} />;
      case "POIs":
        return <POIsTab openChild={openChild} />;
      case "Rules":
        return <RulesTab openChild={openChild} />;
      case "Styles":
        return <StylesTab openChild={openChild} />;
      default:
        return null;
    }
  };

  // Auto-scroll active tab into view
  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  return (
    <>
      {/* Menu */}
      <div className="menu">
        <div className="menu-inner">
          {tabs.map((tab) => (
            <div
              key={tab}
              ref={activeTab === tab ? activeRef : null}
              className={`menu-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {view.type === "root" && renderTab()}

        {view.type === "child" && (
          <div>
            <button onClick={goBack}>⬅ Back</button>
            <h3>{view.parent}</h3>
            <p>{view.content}</p>
          </div>
        )}
      </div>
    </>
  );
}