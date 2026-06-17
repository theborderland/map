import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { Tab } from "../types";
import type { EntityRecord, RuleRecord, StyleRecord } from "../db/types";
import AreasTab from "../tabs/AreasTab";
import RoadsTab from "../tabs/RoadsTab";
import POIsTab from "../tabs/POIsTab";
import RulesTab from "../tabs/RulesTab";
import StylesTab from "../tabs/StylesTab";
import LeftPanelHeader from "./LeftPanelHeader";
import LeftPanelMenu from "./LeftPanelMenu";
import EntityList from "../components/EntityList";

interface Props {
  activeTab: Tab;
  onUserTabChange: (tab: Tab) => void;
  setActiveTabDirect: (tab: Tab) => void;
  entities: EntityRecord[];
  rules: RuleRecord[];
  styles: StyleRecord[];
  selectedEntity: { id: string; key: number } | null;
  onSelectEntity?: (entityId: string) => void;
}

type ChildPage = {
  parent: Tab;
  title: string;
  content: ReactNode;
};

type ViewState =
  | { type: "root" }
  | { type: "child"; stack: ChildPage[] };

// Primary tabs shown in the left menu. Hoisted outside the component for stability.
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
}: Props) {
  /**
   * `view` holds either the root view (main tab) or a stack of child pages.
   * Child pages represent drill-down views opened via `openChild`.
   */
  const [view, setView] = useState<ViewState>({ type: "root" });
  const [pendingSelection, setPendingSelection] = useState<{ entityId: string; tab: Tab } | null>(null);

  const formatGeometry = (type: string) => {
    switch (type) {
      case "Point":
        return "Point";
      case "LineString":
        return "Line";
      case "MultiLineString":
        return "Multi-line";
      case "Polygon":
        return "Polygon";
      case "MultiPolygon":
        return "Multi-polygon";
      default:
        return type;
    }
  };

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

  const createEntityDetail = (entity: EntityRecord, style?: StyleRecord) => (
    <div className="item-card">
      <h3>{entity.name || entity.id}</h3>
      <p className="item-meta">
        {style?.displayName ?? entity.styleType} · {formatGeometry(entity.geometry.type)}
      </p>
      {entity.tagline && <p className="tagline">{entity.tagline}</p>}
      {entity.description && <p>{entity.description}</p>}
      {entity.link && (
        <p>
          <a href={entity.link} target="_blank" rel="noreferrer">
            {entity.link}
          </a>
        </p>
      )}
      <p>
        <strong>Rule references:</strong> {entity.rules.length}
      </p>
      {entity.rules.length > 0 && (
        <ul>
          {entity.rules.map((rule) => (
            <li key={rule.ruleId}>
              {rule.ruleId}{rule.distanceMeters ? ` (${rule.distanceMeters}m)` : ""}
            </li>
          ))}
        </ul>
      )}
      <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
    </div>
  );

  // Switch to a primary tab via user interaction and reset any child stack.
  const handleTabClick = useCallback((tab: Tab) => {
    onUserTabChange(tab);
    setView({ type: "root" });
  }, [onUserTabChange]);

  // Push a new child page onto the stack. The `title` is shown in the header.
  const openChild = useCallback((content: ReactNode, title = "Details") => {
    setView((prev) => {
      const page: ChildPage = { parent: activeTab, title, content };
      if (prev.type === "child") {
        return { type: "child", stack: [...prev.stack, page] };
      }
      return { type: "child", stack: [page] };
    });
  }, [activeTab]);

  // const openSelectedEntityChild = useCallback((content: ReactNode, title = "Details") => {
  //   setView({ type: "child", stack: [{ parent: activeTab, title, content }] });
  // }, [activeTab]);

  const buildSelectionStack = useCallback((entity: EntityRecord, style?: StyleRecord) => {
    const targetTab = getTabForEntity(entity);
    const shouldGroup = targetTab === "Areas" || targetTab === "Roads";

    if (!shouldGroup) {
      return [{ parent: targetTab, title: entity.name || entity.id, content: createEntityDetail(entity, style) }];
    }

    const groupEntities = entities.filter((item) => getTabForEntity(item) === targetTab && item.styleType === entity.styleType);
    const groupName = style?.displayName ?? entity.styleType;

    const groupPage = {
      parent: targetTab,
      title: groupName,
      content: (
        <EntityList
          subtitle=""
          entities={groupEntities}
          styles={styles}
          openChild={openChild}
          onSelectEntity={onSelectEntity}
          groupByStyleType={false}
        />
      ),
    };

    const detailPage = {
      parent: targetTab,
      title: entity.name || entity.id,
      content: createEntityDetail(entity, style),
    };

    return [groupPage, detailPage];
  }, [entities, styles, getTabForEntity, openChild, createEntityDetail]);

  // Pop the active child page. If the stack is empty, return to root.
  const goBack = useCallback(() => {
    setView((prev) => {
      if (prev.type !== "child") return prev;
      if (prev.stack.length <= 1) return { type: "root" };
      return { type: "child", stack: prev.stack.slice(0, -1) };
    });
  }, []);

  // Memoize the content for the currently active primary tab to avoid
  // remounting tab components unnecessarily when only the child stack changes.
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case "Areas":
        return <AreasTab entities={entities} styles={styles} openChild={openChild} onSelectEntity={onSelectEntity} />;
      case "Roads":
        return <RoadsTab entities={entities} styles={styles} openChild={openChild} onSelectEntity={onSelectEntity} />;
      case "POIs":
        return <POIsTab entities={entities} styles={styles} openChild={openChild} onSelectEntity={onSelectEntity} />;
      case "Rules":
        return <RulesTab rules={rules} openChild={openChild} />;
      case "Styles":
        return <StylesTab styles={styles} openChild={openChild} />;
      default:
        return null;
    }
  }, [activeTab, entities, styles, rules, openChild]);

  // Auto-scroll active tab into view in the horizontal menu.
  const activeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  useEffect(() => {
    if (!selectedEntity) {
      setPendingSelection(null);
      setView({ type: "root" });
      return;
    }

    const entity = entities.find((item) => item.id === selectedEntity.id);
    if (!entity) return;

    const targetTab = getTabForEntity(entity);
    setPendingSelection({ entityId: selectedEntity.id, tab: targetTab });
    if (activeTab !== targetTab) {
      setActiveTabDirect(targetTab);
    }
  }, [selectedEntity, entities, activeTab, setActiveTabDirect]);

  useEffect(() => {
    if (!pendingSelection) return;
    if (activeTab !== pendingSelection.tab) return;

    const entity = entities.find((item) => item.id === pendingSelection.entityId);
    if (!entity) {
      setPendingSelection(null);
      return;
    }

    const style = styles.find((styleItem) => styleItem.type === entity.styleType);
    const stack = buildSelectionStack(entity, style);
    setView({ type: "child", stack });
    setPendingSelection(null);
  }, [pendingSelection, activeTab, entities, styles, buildSelectionStack]);

  return (
    <>
      {/* Menu */}
      <LeftPanelMenu tabs={TABS} activeTab={activeTab} onTabClick={handleTabClick} activeRef={activeRef} />

      {/* Content area: header (shared for root + child pages) and the body */}
      <div className="content">
        <LeftPanelHeader
          title={view.type === "root" ? activeTab : view.stack[view.stack.length - 1].title}
          showBack={view.type === "child"}
          onBack={goBack}
        />

        <div>{view.type === "root" ? tabContent : view.stack[view.stack.length - 1].content}</div>
      </div>
    </>
  );
}