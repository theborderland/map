// LeftPanelMenu
// Extracted menu rendering for the left panel. Renders the list of primary
// `tabs`, highlights the active tab, and exposes `onTabClick` for navigation.
import type { Tab } from "../types";
import type { RefObject } from "react";

export default function LeftPanelMenu({
  tabs,
  activeTab,
  onTabClick,
  activeRef,
}: {
  tabs: Tab[];
  activeTab: Tab;
  onTabClick: (tab: Tab) => void;
  activeRef: RefObject<HTMLDivElement | null>;
}) {
  // Attach the activeRef to the currently active tab for auto-scroll.
  return (
    <div className="menu">
      <div className="menu-inner">
        {tabs.map((tab: Tab) => (
          <div
            key={tab}
            ref={activeTab === tab ? activeRef : null}
            className={`menu-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => onTabClick(tab)}
          >
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
}
