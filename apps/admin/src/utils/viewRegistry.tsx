import type { ReactNode } from "react";
import type { PanelView, Tab } from "../types";
import type { EntityRecord, RuleRecord, StyleRecord } from "../db/types";
import EntityList from "../components/EntityList";
import { AreaDetail, RoadDetail, POIDetail, RuleDetail, StyleDetail } from "../components/details";
import { getEntityTab } from "./panelNavigation";
import {
    buildStyleNavigation, buildRuleNavigation,
    buildPOINavigation, buildRoadNavigation, buildAreaNavigation,
} from "./panelNavigation";

/** Everything a view handler needs to compute its title or render its content. */
export interface ViewContext {
    entities: EntityRecord[];
    rules: RuleRecord[];
    styles: StyleRecord[];
    setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
    setRules: React.Dispatch<React.SetStateAction<RuleRecord[]>>;
    setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>;
    setNavStack: React.Dispatch<React.SetStateAction<PanelView[]>>;
    bumpMapKey: () => void;
    goBack: () => void;
    openEntity: (entity: EntityRecord) => void;
    selectedPOIIcon: string;
    onSelectedPOIIconChange: (icon: string) => void;
    /** Content for the currently active root tab — only the "root" handler reads this. */
    rootTabContent: ReactNode;
}

interface ViewHandler {
    title: (view: PanelView, ctx: ViewContext) => string;
    render: (view: PanelView, ctx: ViewContext) => ReactNode;
}

/**
 * One entry per PanelView type. Each handler receives the *full* PanelView
 * union and narrows it itself with a plain `if (view.type !== "...")` guard
 * whenever it needs type-specific fields — ordinary TypeScript control-flow
 * narrowing, so no casts are needed anywhere in this file or at the call
 * site in LeftPanel. `Record<PanelView["type"], ViewHandler>` still forces
 * every view type to have exactly one entry — add a new PanelView variant
 * and TypeScript will refuse to compile until you add its handler here.
 */
export const VIEW_HANDLERS: Record<PanelView["type"], ViewHandler> = {
    root: {
        title: (view) => (view.type === "root" ? view.tab : ""),
        render: (_view, ctx) => ctx.rootTabContent,
    },

    "entity-group": {
        title: (view, ctx) => {
            if (view.type !== "entity-group") return "";
            return ctx.styles.find((s) => s.type === view.styleType)?.displayName ?? view.styleType;
        },
        render: (view, ctx) => {
            if (view.type !== "entity-group") return null;
            const groupEntities = ctx.entities.filter((e) => e.styleType === view.styleType);
            return (
                <EntityList
                    entities={groupEntities}
                    styles={ctx.styles}
                    openEntity={ctx.openEntity}
                    groupByStyleType={false}
                />
            );
        },
    },

    "entity-detail": {
        title: (view, ctx) => {
            if (view.type !== "entity-detail") return "";
            return ctx.entities.find((e) => e.id === view.entityId)?.name ?? "Detail";
        },
        render: (view, ctx) => {
            if (view.type !== "entity-detail") return null;
            const entity = ctx.entities.find((e) => e.id === view.entityId);
            if (!entity) return null;
            switch (getEntityTab(entity)) {
                case "Areas":
                    return (
                        <AreaDetail
                            key={entity.id}
                            entity={entity}
                            styles={ctx.styles}
                            rules={ctx.rules}
                            setEntities={ctx.setEntities}
                            goBack={ctx.goBack}
                            bumpMapKey={ctx.bumpMapKey}
                        />
                    );
                case "Roads":
                    return (
                        <RoadDetail
                            key={entity.id}
                            entity={entity}
                            styles={ctx.styles}
                            rules={ctx.rules}
                            setEntities={ctx.setEntities}
                            goBack={ctx.goBack}
                            bumpMapKey={ctx.bumpMapKey}
                        />
                    );
                case "POIs":
                    return (
                        <POIDetail
                            key={entity.id}
                            entity={entity}
                            rules={ctx.rules}
                            setEntities={ctx.setEntities}
                            goBack={ctx.goBack}
                            bumpMapKey={ctx.bumpMapKey}
                            selectedPOIIcon={ctx.selectedPOIIcon}
                            onSelectedPOIIconChange={ctx.onSelectedPOIIconChange}
                        />
                    );
                default:
                    return null;
            }
        },
    },

    "style-detail": {
        title: (view, ctx) => {
            if (view.type !== "style-detail") return "";
            return ctx.styles.find((s) => s.id === view.styleId)?.displayName ?? "Style";
        },
        render: (view, ctx) => {
            if (view.type !== "style-detail") return null;
            const style = ctx.styles.find((s) => s.id === view.styleId);
            if (!style) return null;
            return (
                <StyleDetail
                    key={style.id}
                    style={style}
                    setStyles={ctx.setStyles}
                    goBack={ctx.goBack}
                />
            );
        },
    },

    "style-create": {
        title: () => "New Style",
        render: (_view, ctx) => (
            <StyleDetail
                setStyles={ctx.setStyles}
                goBack={ctx.goBack}
                onAfterCreate={(styleId) => ctx.setNavStack(buildStyleNavigation(styleId))}
            />
        ),
    },

    "rule-detail": {
        title: (view, ctx) => {
            if (view.type !== "rule-detail") return "";
            return ctx.rules.find((r) => r.id === view.ruleId)?.name ?? "Rule";
        },
        render: (view, ctx) => {
            if (view.type !== "rule-detail") return null;
            const rule = ctx.rules.find((r) => r.id === view.ruleId);
            if (!rule) return null;
            return (
                <RuleDetail
                    key={rule.id}
                    rule={rule}
                    setRules={ctx.setRules}
                    goBack={ctx.goBack}
                />
            );
        },
    },

    "rule-create": {
        title: () => "New Rule",
        render: (_view, ctx) => (
            <RuleDetail
                setRules={ctx.setRules}
                goBack={ctx.goBack}
                onAfterCreate={(ruleId) => ctx.setNavStack(buildRuleNavigation(ruleId))}
            />
        ),
    },

    "poi-create": {
        title: () => "New POI",
        render: (_view, ctx) => (
            <POIDetail
                rules={ctx.rules}
                setEntities={ctx.setEntities}
                goBack={ctx.goBack}
                bumpMapKey={ctx.bumpMapKey}
                selectedPOIIcon={ctx.selectedPOIIcon}
                onSelectedPOIIconChange={ctx.onSelectedPOIIconChange}
                onAfterCreate={(entityId) => ctx.setNavStack(buildPOINavigation(entityId))}
            />
        ),
    },

    "road-create": {
        title: () => "New Road",
        render: (_view, ctx) => (
            <RoadDetail
                styles={ctx.styles}
                rules={ctx.rules}
                setEntities={ctx.setEntities}
                goBack={ctx.goBack}
                bumpMapKey={ctx.bumpMapKey}
                onAfterCreate={(entityId) => ctx.setNavStack(buildRoadNavigation(entityId))}
            />
        ),
    },

    "area-create": {
        title: () => "New Area",
        render: (_view, ctx) => (
            <AreaDetail
                styles={ctx.styles}
                rules={ctx.rules}
                setEntities={ctx.setEntities}
                goBack={ctx.goBack}
                bumpMapKey={ctx.bumpMapKey}
                onAfterCreate={(entityId) => ctx.setNavStack(buildAreaNavigation(entityId))}
            />
        ),
    },
};

/**
 * Explicit map from root tab to the create view it opens. A plain object —
 * no registry scanning, no `as any`, trivial to extend when a new
 * create-flow tab is added.
 */
const CREATE_VIEW_BY_TAB: Partial<Record<Tab, PanelView>> = {
    Styles: { type: "style-create" },
    Rules: { type: "rule-create" },
    POIs: { type: "poi-create" },
    Roads: { type: "road-create" },
    Areas: { type: "area-create" },
};

export function getCreateViewForTab(tab: Tab): PanelView | undefined {
    return CREATE_VIEW_BY_TAB[tab];
}