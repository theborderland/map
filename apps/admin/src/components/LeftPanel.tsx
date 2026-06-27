import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { Tab, PanelView } from "../types";
import type { EntityRecord, RuleRecord, StyleRecord } from "../db/types";
import { AreasTab, RoadsTab, POIsTab, RulesTab, StylesTab } from "../tabs";
import LeftPanelHeader from "./LeftPanelHeader";
import LeftPanelMenu from "./LeftPanelMenu";
import GroupedEntityList from "./GroupedEntityList";
import EntityDetail from "./EntityDetail";
import StyleDetail from "./StyleDetail";
import RuleDetail from "./RuleDetail";
import { useMapStore } from "../store/mapStore";

interface Props {
  activeTab: Tab;
  onUserTabChange: (tab: Tab) => void;
  setActiveTabDirect: (tab: Tab) => void;
  entities: EntityRecord[];
  rules: RuleRecord[];
  styles: StyleRecord[];
  selectedEntity: { id: string; key: number } | null;
  onSelectEntity?: (entityId: string) => void;
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
}

export const TABS: Tab[] = ["Areas", "Roads", "POIs", "Rules", "Styles"];

export default function LeftPanel({
  activeTab,
  onUserTabChange,
  setActiveTabDirect,
  entities,
  rules,
  styles,
  selectedEntity,
  onSelectEntity,
  setEntities,
}: Props) {
  // Stack of views. The last item is what's currently shown.
  // Always starts with root so there's always at least one item.
  const [navStack, setNavStack] = useState<PanelView[]>([{ type: "root" }]);
  const currentView = navStack[navStack.length - 1]!;

  const { isEditing, canChangeSelection } = useMapStore();

  // ── Navigation ─────────────────────────────────────────

  const navigate = useCallback((view: PanelView) => {
    setNavStack((prev) => [...prev, view]);
  }, []);

  const goBack = useCallback(() => {
    if (!canChangeSelection()) return;
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, [canChangeSelection]);

  const handleTabClick = useCallback((tab: Tab) => {
    if (!canChangeSelection()) return;
    onUserTabChange(tab);
    setNavStack([{ type: "root" }]);
  }, [canChangeSelection, onUserTabChange]);

  // ── Helpers ────────────────────────────────────────────

  const getTabForEntity = (entity: EntityRecord): Tab => {
    switch (entity.geometry.type) {
      case "Polygon":
      case "MultiPolygon":
        return "Areas";
      case "LineString":
      case "MultiLineString":
        return "Roads";
      default:
        return "POIs";
    }
  };

  const getTitleForView = (view: PanelView): string => {
    switch (view.type) {
      case "root":
        return activeTab;
      case "entity-group":
        return styles.find((s) => s.type === view.styleType)?.displayName ?? view.styleType;
      case "entity-detail":
        return entities.find((e) => e.id === view.entityId)?.name ?? "Detail";
      case "style-detail":
        return styles.find((s) => s.id === view.styleId)?.displayName ?? "Style";
      case "rule-detail":
        return rules.find((r) => r.id === view.ruleId)?.name ?? "Rule";
    }
  };

  // ── Render current view ────────────────────────────────
  // Called at render time — always uses current props so content is never stale.

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
            navigate={navigate}
            onSelectEntity={onSelectEntity}
          />
        );
      }

      case "entity-detail": {
        const entity = entities.find((e) => e.id === view.entityId);
        if (!entity) return null;
        const style = styles.find((s) => s.type === entity.styleType);
        return (
          <EntityDetail
            entity={entity}
            style={style}
            setEntities={setEntities}
          />
        );
      }

      case "style-detail": {
        const style = styles.find((s) => s.id === view.styleId);
        if (!style) return null;
        return <StyleDetail style={style} />;
      }

      case "rule-detail": {
        const rule = rules.find((r) => r.id === view.ruleId);
        if (!rule) return null;
        return <RuleDetail rule={rule} />;
      }
    }
  };

  // ── Root tab content ───────────────────────────────────
  // Memoized to avoid remounting tab components on unrelated state changes.

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "Areas":
        return <AreasTab entities={entities} styles={styles} navigate={navigate} onSelectEntity={onSelectEntity} />;
      case "Roads":
        return <RoadsTab entities={entities} styles={styles} navigate={navigate} onSelectEntity={onSelectEntity} />;
      case "POIs":
        return <POIsTab entities={entities} styles={styles} navigate={navigate} onSelectEntity={onSelectEntity} />;
      case "Rules":
        return <RulesTab entities={entities} rules={rules} navigate={navigate} />;
      case "Styles":
        return <StylesTab entities={entities} styles={styles} navigate={navigate} />;
      default:
        return null;
    }
  }, [activeTab, entities, styles, rules, navigate, onSelectEntity]);

  // ── Map entity selection ───────────────────────────────
  // Single effect replacing the previous pendingSelection two-effect pattern.

  useEffect(() => {
    if (!selectedEntity) {
      setNavStack([{ type: "root" }]);
      return;
    }
    if (isEditing) return;

    const entity = entities.find((e) => e.id === selectedEntity.id);
    if (!entity) return;

    const targetTab = getTabForEntity(entity);
    if (activeTab !== targetTab) setActiveTabDirect(targetTab);

    const shouldGroup = targetTab === "Areas" || targetTab === "Roads";
    setNavStack(
      shouldGroup
        ? [
          { type: "root" },
          { type: "entity-group", styleType: entity.styleType },
          { type: "entity-detail", entityId: entity.id },
        ]
        : [
          { type: "root" },
          { type: "entity-detail", entityId: entity.id },
        ]
    );
  }, [selectedEntity?.id, selectedEntity?.key, isEditing]);

  // ── Auto-scroll active tab into view ──────────────────

  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  // ── Render ─────────────────────────────────────────────

  return (
    <>
      <LeftPanelMenu
        tabs={TABS}
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