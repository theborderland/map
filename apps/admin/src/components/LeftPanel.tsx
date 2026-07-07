import {
  useRef, useEffect, type ReactNode
} from "react";
import type { Tab, PanelView } from "../types";
import type { EntityRecord, RuleRecord, StyleRecord } from "../db/types";
import { AreasTab, RoadsTab, POIsTab, RulesTab, StylesTab } from "./tabs";
import LeftPanelHeader from "./LeftPanelHeader";
import LeftPanelMenu from "./LeftPanelMenu";
import GroupedEntityList from "./GroupedEntityList";
import { AreaDetail, RoadDetail, POIDetail, RuleDetail, StyleDetail } from "./details"
import { buildEntityNavigation, buildGroupNavigation, buildRuleNavigation, buildStyleNavigation, createRoot, getEntityTab } from "../utils/panelNavigation";


interface Props {
  activeTab: Tab;
  entities: EntityRecord[];
  rules: RuleRecord[];
  styles: StyleRecord[];
  onSelectEntity?: (entityId: string) => void;
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  setRules: React.Dispatch<React.SetStateAction<RuleRecord[]>>;
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>;
  navStack: PanelView[];
  setNavStack: React.Dispatch<React.SetStateAction<PanelView[]>>;
  bumpMapKey: () => void;
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
  bumpMapKey
}: Props) {
  const currentView = navStack[navStack.length - 1]!;

  // ── Navigation ─────────────────────────────────────────
  const openGroup       = (tab: Tab, styleType: string) => { setNavStack(buildGroupNavigation(tab, styleType)); };
  const openStyle       = (styleId: string)             => { setNavStack(buildStyleNavigation(styleId)); };
  const openRule        = (ruleId: string)              => { setNavStack(buildRuleNavigation(ruleId)); };
  const goBack          = ()                            => { setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)); };
  const handleTabClick  = (tab: Tab)                    => { setNavStack([createRoot(tab)]); };

  // ── Map entity selection ───────────────────────────────────
  // When an entity is selected on the map, switch to its tab and open its detail view.
  const openEntity      = (entity: EntityRecord)        => { setNavStack(buildEntityNavigation(entity)); };

  // ── Helpers ──────────────────────────────────────────────

  const getTitleForView = (view: PanelView): string => {
    switch (view.type) {
      case "root": return view.tab;
      case "entity-group": return styles.find((s) => s.type === view.styleType)?.displayName ?? view.styleType;
      case "entity-detail": return entities.find((e) => e.id === view.entityId)?.name ?? "Detail";
      case "style-detail": return styles.find((s) => s.id === view.styleId)?.displayName ?? "Style";
      case "rule-detail": return rules.find((r) => r.id === view.ruleId)?.name ?? "Rule";
    }
  };

  // ── Render current view ───────────────────────────────────
  // Always renders fresh from current props so content is never stale.

  const renderCurrentView = (view: PanelView): ReactNode => {
    switch (view.type) {
      case "root":
        return tabContent;

      case "entity-group": {
        const groupEntities = entities.filter((e) => e.styleType === view.styleType);
        return (
          <GroupedEntityList
            entities={groupEntities}
            styles={styles}
            openEntity={openEntity}
            groupByStyleType={false}
          />
        );
      }

      case "entity-detail": {
        const entity = entities.find((e) => e.id === view.entityId);
        if (!entity) return null;
        switch (getEntityTab(entity)) {
          case "Areas":
            return <AreaDetail
              key={entity.id}
              entity={entity}
              styles={styles}
              rules={rules}
              setEntities={setEntities}
              goBack={goBack}
              bumpMapKey={bumpMapKey}
            />;
          case "Roads":
            return <RoadDetail
              key={entity.id}
              entity={entity}
              styles={styles}
              rules={rules}
              setEntities={setEntities}
              goBack={goBack}
              bumpMapKey={bumpMapKey}
            />;
          case "POIs":
            return <POIDetail
              key={entity.id}
              entity={entity}
              styles={styles}
              rules={rules}
              setEntities={setEntities}
              goBack={goBack}
              bumpMapKey={bumpMapKey}
            />;
        };
        break;
      }

      case "style-detail": {
        const style = styles.find((s) => s.id === view.styleId);
        if (!style) return null;
        return (
          <StyleDetail
            key={style.id}
            style={style}
            setStyles={setStyles}
            goBack={goBack}
          />
        );
      }

      case "rule-detail": {
        const rule = rules.find((r) => r.id === view.ruleId);
        if (!rule) return null;
        return (
          <RuleDetail
            key={rule.id}
            rule={rule}
            setRules={setRules}
            goBack={goBack}
          />
        );
      }
    }
  };

  // ── Tab content ────────────────────────────────────────
  // Avoids remounting tab components when only the child stack changes.

  const tabContent = (() => {
    switch (activeTab) {
      case "Areas": return <AreasTab entities={entities} styles={styles} openGroup={openGroup} openEntity={openEntity} />;
      case "Roads": return <RoadsTab entities={entities} styles={styles} openGroup={openGroup} openEntity={openEntity} />;
      case "POIs": return <POIsTab entities={entities} styles={styles} openGroup={openGroup} openEntity={openEntity} />;
      case "Rules": return <RulesTab entities={entities} rules={rules} openRule={openRule} />;
      case "Styles": return <StylesTab entities={entities} styles={styles} openStyle={openStyle} />;
      default: return null;
    }
  })();

  // ── Auto-scroll active tab into view in the menu ───────────

  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <>
      <LeftPanelMenu
        activeTab={activeTab}
        onTabClick={handleTabClick}
        activeRef={activeRef}
      />
      <div className="content">
        <LeftPanelHeader
          title={getTitleForView(currentView)}
          showBack={navStack.length > 1}
          onBack={goBack}
        />
        <div>{renderCurrentView(currentView)}</div>
      </div>
    </>
  );
}