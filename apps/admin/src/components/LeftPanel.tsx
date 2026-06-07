import { useState, useRef, useEffect, type ReactNode } from "react";
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

type ChildPage = {
  parent: Tab;
  title: string;
  content: ReactNode;
};

type ViewState =
  | { type: "root" }
  | { type: "child"; stack: ChildPage[] };

export default function LeftPanel({ activeTab, setActiveTab }: Props) {
  const [view, setView] = useState<ViewState>({ type: "root" });

  const tabs: Tab[] = ["Areas", "Roads", "POIs", "Rules", "Styles"];

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    setView({ type: "root" });
  };

  const openChild = (content: ReactNode, title = "Details") => {
    setView((prev) => {
      const page: ChildPage = { parent: activeTab, title, content };
      if (prev.type === "child") {
        return { type: "child", stack: [...prev.stack, page] };
      }
      return { type: "child", stack: [page] };
    });
  };

  const goBack = () => {
    setView((prev) => {
      if (prev.type !== "child") return prev;
      if (prev.stack.length <= 1) return { type: "root" };
      return { type: "child", stack: prev.stack.slice(0, -1) };
    });
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
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <button onClick={goBack} style={{ position: "absolute", left: 0 }}>⬅ Back</button>
              <h3 style={{ textAlign: "center", margin: 0 }}>{view.stack[view.stack.length - 1].title}</h3>
            </div>
            <div>{view.stack[view.stack.length - 1].content}</div>
          </div>
        )}
      </div>
    </>
  );
}