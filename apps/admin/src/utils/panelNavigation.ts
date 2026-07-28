import type { EntityRecord } from "../db";
import type { PanelView, Tab } from "../types";

export function getActiveTabFromNav(navStack: PanelView[], entities: EntityRecord[]): Tab {
    const current = navStack[navStack.length - 1];
    switch (current.type) {
        case "entity-detail": {
            const entity = entities.find(e => e.id === current.entityId);
            return entity ? getEntityTab(entity) : "Areas";
        }
        case "entity-group": return current.tab;
        case "style-detail":
        case "style-create": return "Styles";
        case "rule-detail":
        case "rule-create": return "Rules";
        case "poi-create": return "POIs";
        case "road-create": return "Roads";
        case "root": return current.tab;
        default: throw new Error("Unhandled PanelView type");
    }
}

export function getEntityTab(entity: EntityRecord): Tab {
    switch (entity.geometry.type) {
        case "Polygon":
        case "MultiPolygon": return "Areas";
        case "LineString":
        case "MultiLineString": return "Roads";
        default: return "POIs";
    }
}

function needsGrouping(tab: Tab): boolean {
    return tab === "Areas" || tab === "Roads";
}

export function buildEntityNavigation(entity: EntityRecord): PanelView[] {
    const tab = getEntityTab(entity);
    return needsGrouping(tab)
        ? [createRoot(tab),
        { type: "entity-group", tab, styleType: entity.styleType },
        { type: "entity-detail", entityId: entity.id }]
        : [createRoot(tab),
        { type: "entity-detail", entityId: entity.id }];
}

export function buildGroupNavigation(tab: Tab, styleType: string): PanelView[] {
    return [createRoot(tab),
    { type: "entity-group", tab, styleType }];
}

export function buildStyleNavigation(styleId: string): PanelView[] {
    return [createRoot("Styles"), { type: "style-detail", styleId }];
}

export function buildRuleNavigation(ruleId: string): PanelView[] {
    return [createRoot("Rules"), { type: "rule-detail", ruleId }];
}

/** Navigates to a blank create form for a new style. */
export function buildStyleCreateNavigation(): PanelView[] {
    return [createRoot("Styles"), { type: "style-create" }];
}

/** Navigates to a blank create form for a new rule. */
export function buildRuleCreateNavigation(): PanelView[] {
    return [createRoot("Rules"), { type: "rule-create" }];
}

/** Navigates to a blank create form for a new POI. */
export function buildPOICreateNavigation(): PanelView[] {
    return [createRoot("POIs"), { type: "poi-create" }];
}

/** Navigates to the newly created POI's own detail view. */
export function buildPOINavigation(entityId: string): PanelView[] {
    return [createRoot("POIs"), { type: "entity-detail", entityId }];
}

/** Navigates to a blank create form for a new road. */
export function buildRoadCreateNavigation(): PanelView[] {
    return [createRoot("Roads"), { type: "road-create" }];
}

/** Navigates directly to the newly created road's detail view. */
export function buildRoadNavigation(entityId: string): PanelView[] {
    return [createRoot("Roads"), { type: "entity-detail", entityId }];
}

export function createRoot(tab: Tab): PanelView {
    return { type: "root", tab };
}