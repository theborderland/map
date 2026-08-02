import { useRef, useEffect } from "react";
import type { Tab, PanelView } from "../types";
import type { EntityRecord, RuleRecord, SettingsRecord, StyleRecord } from "../db/types";
import { AreasTab, RoadsTab, POIsTab, RulesTab, StylesTab, SettingsTab } from "./tabs";
import LeftPanelHeader from "./LeftPanelHeader";
import LeftPanelMenu from "./LeftPanelMenu";
import {
  buildEntityNavigation, buildGroupNavigation, buildStyleNavigation,
  buildRuleNavigation, createRoot,
} from "../utils/panelNavigation";
import { VIEW_HANDLERS, getCreateViewForTab, type ViewContext } from "../utils/viewRegistry";
import { useIsEditingLocked } from "../store/mapEditStore";

interface Props {
  activeTab: Tab;
  entities: EntityRecord[];
  rules: RuleRecord[];
  styles: StyleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  setRules: React.Dispatch<React.SetStateAction<RuleRecord[]>>;
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>;
  navStack: PanelView[];
  setNavStack: React.Dispatch<React.SetStateAction<PanelView[]>>;
  bumpMapKey: () => void;
  onSettingsSaved: (settings: SettingsRecord) => void;
  selectedPOIIcon: string;
  onSelectedPOIIconChange: (icon: string) => void;
}

export default function LeftPanel({
  activeTab,
  entities,
  rules,
  styles,
  setEntities,
  setRules,
  setStyles,
  navStack,
  setNavStack,
  bumpMapKey,
  onSettingsSaved,
  selectedPOIIcon,
  onSelectedPOIIconChange,
}: Props) {
  const currentView = navStack[navStack.length - 1]!;
  const isEditing = useIsEditingLocked();

  // ── Navigation ──────────────────────────────────────────
  const openGroup = (tab: Tab, styleType: string) => { if (isEditing) return; setNavStack(buildGroupNavigation(tab, styleType)); };
  const openStyle = (styleId: string) => { if (isEditing) return; setNavStack(buildStyleNavigation(styleId)); };
  const openRule = (ruleId: string) => { if (isEditing) return; setNavStack(buildRuleNavigation(ruleId)); };
  const openEntity = (entity: EntityRecord) => { if (isEditing) return; setNavStack(buildEntityNavigation(entity)); };
  const goBack = () => { if (isEditing) return; setNavStack((prev) => prev.length > 1 ? prev.slice(0, -1) : prev); };
  const handleTabClick = (tab: Tab) => { if (isEditing) return; setNavStack([createRoot(tab)]); };

  // ── Create button ───────────────────────────────────────
  // Looks up which create-view (if any) targets the active tab by scanning
  // the registry, instead of a hardcoded if-chain per tab.
  const getCreateClick = (): (() => void) | undefined => {
    if (isEditing) return undefined;
    if (currentView.type !== "root") return undefined;
    const createView = getCreateViewForTab(currentView.tab);
    return createView ? () => setNavStack([createView]) : undefined;
  };

  // ── Root tab content ────────────────────────────────────
  const rootTabContent = (() => {
    switch (activeTab) {
      case "Areas": return <AreasTab entities={entities} styles={styles} openGroup={openGroup} openEntity={openEntity} />;
      case "Roads": return <RoadsTab entities={entities} styles={styles} openGroup={openGroup} openEntity={openEntity} />;
      case "POIs": return <POIsTab entities={entities} styles={styles} openGroup={openGroup} openEntity={openEntity} />;
      case "Rules": return <RulesTab entities={entities} rules={rules} openRule={openRule} />;
      case "Styles": return <StylesTab entities={entities} styles={styles} openStyle={openStyle} />;
      case "Settings": return <SettingsTab onSettingsSaved={onSettingsSaved} />;
      default: return null;
    }
  })();

  // ── View context ────────────────────────────────────────
  // Bundles everything VIEW_HANDLERS entries need.
  const ctx: ViewContext & { rootTabContent: React.ReactNode } = {
    entities, rules, styles,
    setEntities, setRules, setStyles,
    setNavStack, bumpMapKey, goBack, openEntity,
    selectedPOIIcon, onSelectedPOIIconChange,
    rootTabContent,
  };

  // ── Auto-scroll active tab into view in the menu ───────────
  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  const handler = VIEW_HANDLERS[currentView.type];

  return (
    <div className={isEditing ? "is-editing left-container" : "left-container"}>
      <LeftPanelMenu
        activeTab={activeTab}
        onTabClick={handleTabClick}
        activeRef={activeRef}
      />
      <div className="content">
        <LeftPanelHeader
          title={handler.title(currentView, ctx)}
          showBack={navStack.length > 1}
          onBack={goBack}
          onCreateClick={getCreateClick()}
        />
        <div>{handler.render(currentView, ctx)}</div>
      </div>
    </div>
  );
}