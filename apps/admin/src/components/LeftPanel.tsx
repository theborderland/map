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
import GroupedEntityList from "./GroupedEntityList";
import EntityDetail from '../components/EntityDetail'
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
  setEntities: any
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
  setEntities
}: Props) {
  /**
   * `view` holds either the root view (main tab) or a stack of child pages.
   * Child pages represent drill-down views opened via `openChild`.
   */
  const [view, setView] = useState<ViewState>({ type: "root" });
  const [pendingSelection, setPendingSelection] = useState<{ entityId: string; tab: Tab } | null>(null);
  const { isEditing, canChangeSelection } = useMapStore();

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

  // Switch to a primary tab via user interaction and reset any child stack.
  const handleTabClick = useCallback((tab: Tab) => {
    if (!canChangeSelection()) return;
    onUserTabChange(tab)
    setView({ type: 'root' })
  }, [canChangeSelection, onUserTabChange])

  // Push a new child page onto the stack, which will be rendered in the left panel.
  // The `title` is shown in the header.
  const openChild = useCallback((content: ReactNode, title = "Details") => {
    setView((prev) => {
      const page: ChildPage = { parent: activeTab, title, content };
      if (prev.type === "child") {
        return { type: "child", stack: [...prev.stack, page] };
      }
      return { type: "child", stack: [page] };
    });
  }, [activeTab]);

  const buildSelectionStack = useCallback((entity: EntityRecord, style?: StyleRecord) => {
    const targetTab = getTabForEntity(entity);
    const shouldGroup = targetTab === "Areas" || targetTab === "Roads";

    if (!shouldGroup) {
      return [{
        parent: targetTab,
        title: entity.name || entity.id,
        content: (
          <EntityDetail
            entity={entity}
            style={style}
            setEntities={setEntities}
          />
        )
      }];
    }

    const groupEntities = entities.filter((item) => getTabForEntity(item) === targetTab && item.styleType === entity.styleType);
    const groupName = style?.displayName ?? entity.styleType;
    const groupPage = {
      parent: targetTab,
      title: groupName,
      content: (
        <GroupedEntityList
          subtitle=""
          entities={groupEntities}
          styles={styles}
          openChild={openChild}
          onSelectEntity={onSelectEntity}
          setEntities={setEntities}
        />
      ),
    };

    const detailPage = {
      parent: targetTab,
      title: entity.name || entity.id,
      content: (
        <EntityDetail
          entity={entity}
          style={style}
          setEntities={setEntities}
        />
      )
    };

    return [groupPage, detailPage];
  }, [entities, styles, getTabForEntity, openChild]);

  // Pop the active child page. If the stack is empty, return to root.
  const goBack = useCallback(() => {
    if (!canChangeSelection()) return;
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
        return <StylesTab entities={entities} styles={styles} openChild={openChild} />;
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
    if (isEditing) return;  // don't rebuild while editing

    const entity = entities.find((item) => item.id === selectedEntity.id);
    if (!entity) return;

    const targetTab = getTabForEntity(entity);
    setPendingSelection({ entityId: selectedEntity.id, tab: targetTab });
    if (activeTab !== targetTab) {
      setActiveTabDirect(targetTab);
    }
  }, [selectedEntity, entities, activeTab, setActiveTabDirect, isEditing]);

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
      <LeftPanelMenu tabs={TABS} activeTab={activeTab} onTabClick={handleTabClick} activeRef={activeRef} />

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