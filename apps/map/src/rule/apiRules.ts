import { Rule, Severity } from "./index";
import * as Rules from "./rules";
import type { MapEntity } from "../entities";
import type { ApiRuleZone } from "../loaders/loadApiLayers";
import { applyStyleOverride } from "../api/styles";
import type * as L from "leaflet";

type RuleFactory = (
    zone: any,
    severity: Severity,
    shortMsg: string,
    message: string,
    skipFor?: (entity: MapEntity) => boolean,
    styleOverride?: L.PathOptions,
    isApiRule?: boolean,
) => Rule;

// Maps the API's rule.ruleType to the check that is run against the rule's zone.
// - overlap:   the camp may not overlap the area
// - proximity: the camp may not be within distanceMeters of the area (the distance is already
//              baked into the zone geometry by loadApiLayers, so the check is the same)
// Keys are normalized (lowercase, letters only), see normalizeKey().
const RULE_FACTORIES: Record<string, RuleFactory> = {
    overlap: Rules.isOverlappingOrContained,
    proximity: Rules.isOverlappingOrContained,
};

// The API has no notion of "this rule does not apply to camp type X", so exemptions stay in code,
// keyed by rule name. Example: { "Close to fire road": ["public-offering", "sound-camp", "art"] }
const SKIP_FOR_AREA_TYPES: Record<string, string[]> = {};

const normalizeKey = (value?: string | null) => (value ?? "").toLowerCase().replace(/[^a-z]/g, "");

/** Parses the API severity string (case-insensitive), defaulting to Low so a typo never hides a rule completely. */
function parseSeverity(value?: string | null): Severity {
    switch (normalizeKey(value)) {
        case "high":
            return Severity.High;
        case "medium":
            return Severity.Medium;
        case "none":
            return Severity.None;
        default:
            return Severity.Low;
    }
}

/** Turns the rule zones loaded from the API into rules the editor can run on every entity. */
export function buildApiRules(zones: ApiRuleZone[] = []): Rule[] {
    const rules: Rule[] = [];
    for (const { rule, layer } of zones) {
        const factory = RULE_FACTORIES[normalizeKey(rule.ruleType)];
        if (!factory) {
            console.warn(`[apiRules] unknown ruleType "${rule.ruleType}" on rule "${rule.name}", skipping`);
            continue;
        }
        const exempt = SKIP_FOR_AREA_TYPES[rule.name ?? ""];
        const styleOverride = rule.styleOverride?.fillColor
            ? applyStyleOverride({}, rule.styleOverride)
            : undefined;
        rules.push(
            factory(
                layer,
                parseSeverity(rule.severity),
                rule.name ?? "",
                rule.message ?? "",
                exempt ? (entity) => exempt.includes(entity.areaType) : undefined,
                styleOverride,
                true,
            ),
        );
    }
    return rules;
}
