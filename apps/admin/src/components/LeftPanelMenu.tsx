// LeftPanelMenu
// Extracted menu rendering for the left panel. Renders the list of primary
// `tabs`, highlights the active tab, and exposes `onTabClick` for navigation.
import type { Tab } from "../types";
import type { RefObject } from "react";
import { Fragment } from "react";

const TABS: { tab: Tab; icon: string }[] = [
  { tab: "Areas", icon: "draw-polygon" },
  { tab: "Roads", icon: "road" },
  { tab: "POIs", icon: "location-dot" },
  { tab: "Rules", icon: "list-check" },
  { tab: "Styles", icon: "palette" },
  { tab: "Deleted camps", icon: "trash-restore" },
  { tab: "Settings", icon: "gear" },
];

export default function LeftPanelMenu({
  activeTab,
  onTabClick,
  activeRef,
}: {
  activeTab: Tab;
  onTabClick: (tab: Tab) => void;
  activeRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="menu">
      <div className="menu-inner">
        {TABS.map(({ tab, icon }) => {
          const buttonId = `menu-${icon}`;
          return (
            <Fragment key={tab}>
              <button
                id={buttonId}
                // Attach the activeRef to the currently active tab for auto-scroll.
                ref={activeTab === tab ? activeRef : null}
                className={`menu-item ${activeTab === tab ? "active" : ""}`}
                type="button"
                aria-label={tab}
                aria-current={activeTab === tab ? "page" : undefined}
                onClick={() => onTabClick(tab)}
              >
                <wa-icon name={icon} aria-hidden="true"></wa-icon>
              </button>
              <wa-tooltip show-delay={50} placement="right" for={buttonId}>
                {tab}
              </wa-tooltip>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
