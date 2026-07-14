import {
  useRef, useEffect, type ReactNode
} from "react";
import type { Tab, PanelView, EditMode } from "../types";
import type { EntityRecord, RuleRecord, StyleRecord } from "../db/types";
import { AreasTab, RoadsTab, POIsTab, RulesTab, StylesTab } from "./tabs";
import LeftPanelHeader from "./LeftPanelHeader";
import LeftPanelMenu from "./LeftPanelMenu";
import GroupedEntityList from "./GroupedEntityList";
import { AreaDetail, RoadDetail, POIDetail, RuleDetail, StyleDetail } from "./details";
import {
  buildEntityNavigation, buildGroupNavigation,
  buildRuleNavigation, buildStyleNavigation,
  buildRuleCreateNavigation, buildStyleCreateNavigation,
  createRoot, getEntityTab,
} from "../utils/panelNavigation";

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
  editMode: EditMode;
  pendingGeometryRef: React.RefObject<GeoJSON.Geometry | null>;
  onCancelEdit: () => void;
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
  editMode,
  pendingGeometryRef,
  onCancelEdit
}: Props) {
  const currentView = navStack[navStack.length - 1]!;
  const isEditing = editMode !== "idle";

  // ── Navigation ──────────────────────────────────────────
  const openGroup = (tab: Tab, styleType: string) => { if (isEditing) return; setNavStack(buildGroupNavigation(tab, styleType)); };
  const openStyle = (styleId: string) => { if (isEditing) return; setNavStack(buildStyleNavigation(styleId)); };
  const openRule = (ruleId: string) => { if (isEditing) return; setNavStack(buildRuleNavigation(ruleId)); };
  const openEntity = (entity: EntityRecord) => { if (isEditing) return; setNavStack(buildEntityNavigation(entity)); };
  const goBack = () => { if (isEditing) return; setNavStack((prev) => prev.length > 1 ? prev.slice(0, -1) : prev); };
  const handleTabClick = (tab: Tab) => { if (isEditing) return; setNavStack([createRoot(tab)]); };

  // ── Create button ───────────────────────────────────────
  // Only shown on root views for Rules and Styles — Areas/Roads/POIs
  // will get their own create flow when drawing is added later.

  const getCreateClick = (): (() => void) | undefined => {
    if (isEditing) return undefined;
    if (currentView.type !== "root") return undefined;
    if (currentView.tab === "Rules") return () => setNavStack(buildRuleCreateNavigation());
    if (currentView.tab === "Styles") return () => setNavStack(buildStyleCreateNavigation());
    return undefined;
  };

  // ── Title ───────────────────────────────────────────────

  const getTitleForView = (view: PanelView): string => {
    switch (view.type) {
      case "root": return view.tab;
      case "entity-group": return styles.find((s) => s.type === view.styleType)?.displayName ?? view.styleType;
      case "entity-detail": return entities.find((e) => e.id === view.entityId)?.name ?? "Detail";
      case "style-detail": return styles.find((s) => s.id === view.styleId)?.displayName ?? "Style";
      case "style-create": return "New Style";
      case "rule-detail": return rules.find((r) => r.id === view.ruleId)?.name ?? "Rule";
      case "rule-create": return "New Rule";
    }
  };

  // ── Render current view ─────────────────────────────────

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
            return (
              <AreaDetail
                key={entity.id}
                entity={entity}
                styles={styles}
                rules={rules}
                setEntities={setEntities}
                goBack={goBack}
                bumpMapKey={bumpMapKey}
                pendingGeometryRef={pendingGeometryRef}
                onCancelEdit={onCancelEdit}
              />
            );
          case "Roads":
            return <RoadDetail
              key={entity.id}
              entity={entity}
              styles={styles}
              rules={rules}
              setEntities={setEntities}
              goBack={goBack}
              bumpMapKey={bumpMapKey}
              pendingGeometryRef={pendingGeometryRef}
              onCancelEdit={onCancelEdit}     
            />;
          case "POIs":
            return <POIDetail
              key={entity.id}
              entity={entity}
              rules={rules}
              setEntities={setEntities}
              goBack={goBack}
              bumpMapKey={bumpMapKey}
              pendingGeometryRef={pendingGeometryRef}
              onCancelEdit={onCancelEdit}
            />;
        }
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

      case "style-create":
        return (
          <StyleDetail
            setStyles={setStyles}
            goBack={goBack}
            // After create, navigate to the new style's detail view.
            onAfterCreate={(styleId) => setNavStack(buildStyleNavigation(styleId))}
          />
        );

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

      case "rule-create":
        return (
          <RuleDetail
            setRules={setRules}
            goBack={goBack}
            // After create, navigate to the new rule's detail view.
            onAfterCreate={(ruleId) => setNavStack(buildRuleNavigation(ruleId))}
          />
        );
    }
  };

  // ── Tab content ─────────────────────────────────────────

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
    <div className={isEditing ? "is-editing left-container" : "left-container"}>
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
          onCreateClick={getCreateClick()}
        />
        <div>{renderCurrentView(currentView)}</div>
      </div>
    </div>
  );
}