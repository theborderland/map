import {
  useState, useRef, useEffect, useCallback, useMemo, type ReactNode
} from "react"
import type { Tab, PanelView } from "../types"
import type { EntityRecord, RuleRecord, StyleRecord } from "../db/types"
import { AreasTab, RoadsTab, POIsTab, RulesTab, StylesTab } from "../tabs";
import LeftPanelHeader from "./LeftPanelHeader"
import LeftPanelMenu from "./LeftPanelMenu"
import GroupedEntityList from "./GroupedEntityList"
import AreaDetail from "./AreaDetail"
import RoadDetail from "./RoadDetail"
import POIDetail from "./POIDetail"
import RuleDetail from "./RuleDetail"
import StyleDetail from "./StyleDetail"
import { useMapStore } from "../store/mapStore"

interface Props {
  activeTab: Tab
  onUserTabChange: (tab: Tab) => void
  setActiveTabDirect: (tab: Tab) => void
  entities: EntityRecord[]
  rules: RuleRecord[]
  styles: StyleRecord[]
  selectedEntity: { id: string; key: number } | null
  onSelectEntity?: (entityId: string) => void
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>
  setRules: React.Dispatch<React.SetStateAction<RuleRecord[]>>
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>
}

const TABS: Tab[] = ["Areas", "Roads", "POIs", "Rules", "Styles"]

const DETAIL_COMPONENTS = {
  area: AreaDetail,
  road: RoadDetail,
  poi: POIDetail,
};

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
  setRules,
  setStyles,
}: Props) {
  const [navStack, setNavStack] = useState<PanelView[]>([{ type: "root" }])
  const currentView = navStack[navStack.length - 1]!
  const { isEditing, canChangeSelection, cancelEditing } = useMapStore()
  const currentViewTypeRef = useRef(currentView.type)

  // ── Navigation ─────────────────────────────────────────

  const navigate = useCallback((view: PanelView) => {
    setNavStack(prev => [...prev, view])
  }, [])

  const goBack = useCallback(() => {
    const isEntityCreate =
      currentView.type === "entity-create"
    const isOtherCreate =
      currentView.type === "rule-create" ||
      currentView.type === "style-create"

    // Editing blocks normal navigation, but going back from create is always allowed
    if (!isEntityCreate && !isOtherCreate && !canChangeSelection()) return

    // Cancel map editing if leaving an entity-create view
    if (isEntityCreate && isEditing) cancelEditing()

    setNavStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev)
  }, [canChangeSelection, currentView, isEditing, cancelEditing])

  const handleTabClick = useCallback((tab: Tab) => {
    if (!canChangeSelection()) return
    onUserTabChange(tab)
    setNavStack([{ type: "root" }])
  }, [canChangeSelection, onUserTabChange])

  // ── Helpers ────────────────────────────────────────────

  const getTabForEntity = (entity: EntityRecord): Tab => {
    switch (entity.geometry.type) {
      case "Polygon":
      case "MultiPolygon": return "Areas"
      case "LineString":
      case "MultiLineString": return "Roads"
      default: return "POIs"
    }
  }

  const getTitleForView = (view: PanelView): string => {
    switch (view.type) {
      case "root": return activeTab
      case "entity-group": return styles.find(s => s.type === view.styleType)?.displayName ?? view.styleType
      case "entity-detail": return entities.find(e => e.id === view.entityId)?.name ?? "Detail"
      case "entity-create": {
        const kindLabel = { area: "Area", road: "Road", poi: "POI" }[view.entityKind]
        const styleLabel = view.styleType
          ? styles.find(s => s.type === view.styleType)?.displayName
          : null
        return `New ${styleLabel ?? kindLabel}`
      }
      case "style-detail": return styles.find(s => s.id === view.styleId)?.displayName ?? "Style"
      case "style-create": return "New Style"
      case "rule-detail": return rules.find(r => r.id === view.ruleId)?.name ?? "Rule"
      case "rule-create": return "New Rule"
    }
  }

  // ── Create button ──────────────────────────────────────
  // Computed from the current view + active tab.
  // Returns undefined when creating isn't meaningful in the current context.

  const getCreateClick = (): (() => void) | undefined => {
    if (isEditing) return undefined

    switch (currentView.type) {
      case "root":
        switch (activeTab) {
          case "Areas": return () => navigate({ type: "entity-create", entityKind: "area" })
          case "Roads": return () => navigate({ type: "entity-create", entityKind: "road" })
          case "POIs": return () => navigate({ type: "entity-create", entityKind: "poi" })
          case "Rules": return () => navigate({ type: "rule-create" })
          case "Styles": return () => navigate({ type: "style-create" })
        }
        break
      case "entity-group": {
        const kind = activeTab === "Areas" ? "area" as const
          : activeTab === "Roads" ? "road" as const
            : "poi" as const
        return () => navigate({
          type: "entity-create",
          entityKind: kind,
          styleType: currentView.styleType,  // pre-selected
        })
      }
    }
    return undefined
  }

  // ── Render current view ────────────────────────────────

  function getEntityKind(entity: EntityRecord): "area" | "road" | "poi" {
    switch (entity.geometry.type) {
      case "Polygon":
      case "MultiPolygon": return "area"
      case "LineString":
      case "MultiLineString": return "road"
      default: return "poi"
    }
  }
  const renderCurrentView = (view: PanelView): ReactNode => {
    switch (view.type) {
      case "root":
        return tabContent();

      case "entity-group": {
        const groupEntities = entities.filter(e => e.styleType === view.styleType)
        return (
          <GroupedEntityList
            entities={groupEntities}
            styles={styles}
            navigate={navigate}
            onSelectEntity={onSelectEntity}
            groupByStyleType={false}
          />
        )
      }

      case "entity-detail": {
        const entity = entities.find(e => e.id === view.entityId)
        if (!entity) return null
        const Detail = DETAIL_COMPONENTS[getEntityKind(entity)]
        return <Detail
          entity={entity}
          styles={styles}
          setEntities={setEntities}
          onDelete={goBack}
        />
      }

      case "entity-create": {
        const Detail = DETAIL_COMPONENTS[view.entityKind]
        return (
          <Detail
            styles={styles}
            defaultStyleType={view.styleType}
            setEntities={setEntities}
            onCancel={goBack}
            onAfterCreate={(entityId) => {
              setNavStack(prev => [...prev.slice(0, -1), { type: "entity-detail", entityId }])
            }}
          />
        )
      }

      case "style-detail": {
        const style = styles.find(s => s.id === view.styleId)
        if (!style) return null
        return <StyleDetail
          style={style}
          setStyles={setStyles}
          onDelete={goBack}
        />
      }

      case "style-create":
        return (
          <StyleDetail
            setStyles={setStyles}
            onAfterCreate={(styleId) => {
              setNavStack(prev => [
                ...prev.slice(0, -1),
                { type: "style-detail", styleId },
              ])
            }}
          />
        )

      case "rule-detail": {
        const rule = rules.find(r => r.id === view.ruleId)
        if (!rule) return null
        return <RuleDetail
          rule={rule}
          setRules={setRules}
          onDelete={goBack}
        />
      }

      case "rule-create":
        return (
          <RuleDetail
            setRules={setRules}
            onAfterCreate={(ruleId) => {
              setNavStack(prev => [
                ...prev.slice(0, -1),
                { type: "rule-detail", ruleId },
              ])
            }}
          />
        )
    }
  }

  // ── Tab content ────────────────────────────────────────

  const tabContent = () => {
    switch (activeTab) {
      case "Areas": return <AreasTab entities={entities} styles={styles} navigate={navigate} onSelectEntity={onSelectEntity} />
      case "Roads": return <RoadsTab entities={entities} styles={styles} navigate={navigate} onSelectEntity={onSelectEntity} />
      case "POIs": return <POIsTab entities={entities} styles={styles} navigate={navigate} onSelectEntity={onSelectEntity} />
      case "Rules": return <RulesTab entities={entities} rules={rules} navigate={navigate} />
      case "Styles": return <StylesTab entities={entities} styles={styles} navigate={navigate} />
      default: return null
    }
  };

  // ── Map entity selection — one effect ──────────────────

  useEffect(() => {
    // Never navigate away from a create form via map click
    if (currentViewTypeRef.current === "entity-create") return;
    if (isEditing) return;  // don't disrupt active edit/create

    if (!selectedEntity) {
      setNavStack([{ type: "root" }]);
      return;
    }

    const entity = entities.find(e => e.id === selectedEntity.id)
    if (!entity) return

    const targetTab = getTabForEntity(entity)
    if (activeTab !== targetTab) setActiveTabDirect(targetTab)

    const shouldGroup = targetTab === "Areas" || targetTab === "Roads"
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
    )
  }, [selectedEntity?.id, selectedEntity?.key, isEditing])

  // ── Auto-scroll active tab ─────────────────────────────

  const activeRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [activeTab])

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
          onCreateClick={getCreateClick()}
        />
        <div>{renderCurrentView(currentView)}</div>
      </div>
    </>
  )
}