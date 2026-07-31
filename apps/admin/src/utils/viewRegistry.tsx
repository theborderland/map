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
}

interface ViewHandler<V extends PanelView> {
    title: (view: V, ctx: ViewContext) => string;
    render: (view: V, ctx: ViewContext) => ReactNode;
    /** Only "root" views can show the header's Create button — see getCreateAction below. */
    createTargetTab?: Tab;
}

// Narrows PanelView to just the variant matching a given "type" literal.
type ViewOfType<K extends PanelView["type"]> = Extract<PanelView, { type: K }>;

/**
 * Every PanelView type has exactly one entry here — its title and how to
 * render it. Adding a new view (a future "poi-create"-style flow, etc.)
 * means adding one entry, not touching three separate switch statements
 * scattered through LeftPanel.
 */
export const VIEW_HANDLERS: { [K in PanelView["type"]]: ViewHandler<ViewOfType<K>> } = {
    root: {
        title: (view) => view.tab,
        render: (_view, ctx) => ctx.rootTabContent, // set by LeftPanel
    },

    "entity-group": {
        title: (view, ctx) =>
            ctx.styles.find((s) => s.type === view.styleType)?.displayName ?? view.styleType,
        render: (view, ctx) => {
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
        title: (view, ctx) => ctx.entities.find((e) => e.id === view.entityId)?.name ?? "Detail",
        render: (view, ctx) => {
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
        title: (view, ctx) => ctx.styles.find((s) => s.id === view.styleId)?.displayName ?? "Style",
        render: (view, ctx) => {
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
        createTargetTab: "Styles",
        render: (_view, ctx) => (
            <StyleDetail
                setStyles={ctx.setStyles}
                goBack={ctx.goBack}
                onAfterCreate={(styleId) => ctx.setNavStack(buildStyleNavigation(styleId))}
            />
        ),
    },

    "rule-detail": {
        title: (view, ctx) => ctx.rules.find((r) => r.id === view.ruleId)?.name ?? "Rule",
        render: (view, ctx) => {
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
        createTargetTab: "Rules",
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
        createTargetTab: "POIs",
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
        createTargetTab: "Roads",
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
        createTargetTab: "Areas",
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
 * Given the active root tab, returns the PanelView the header's Create
 * button should navigate to — derived by scanning VIEW_HANDLERS for the
 * one whose createTargetTab matches, rather than a hardcoded if-chain.
 */
export function getCreateViewForTab(tab: Tab): PanelView | undefined {
    const entry = (Object.entries(VIEW_HANDLERS) as [PanelView["type"], ViewHandler<any>][])
        .find(([, handler]) => handler.createTargetTab === tab);
    return entry ? ({ type: entry[0] } as PanelView) : undefined;
}