import { fetchJson, fetchJsonOrUndefined, requestJsonOrThrow, requestOrThrow } from "./httpErrors";
import type { RuleRecord, RulePayload } from "../db/types";

/** Return all rules. The backend already orders these by severity (high -> medium -> low), then name. */
export async function getRules(): Promise<RuleRecord[]> {
  return fetchJson<RuleRecord[]>("/rules");
}

/** Return a single rule by its id, or undefined if not found. */
export async function getRule(id: string): Promise<RuleRecord | undefined> {
  return fetchJsonOrUndefined<RuleRecord>(`/rules/${id}`);
}

/** Create a new rule. */
export async function createRule(payload: RulePayload): Promise<RuleRecord> {
  return requestJsonOrThrow<RuleRecord>("/rules", { method: "POST", body: payload });
}

/**
 * Update an existing rule. Partial - only the provided fields are changed.
 * The backend's PUT is a full-replace, so this fetches the current record
 * first and merges `changes` on top.
 *
 * `styleOverride` is merged with `"key" in changes` rather than `??`, so
 * that explicitly passing `styleOverride: undefined` (clearing an override)
 * is respected instead of falling back to the current value - RuleDetail
 * always sends this key explicitly on every save, either way.
 * @throws if the rule does not exist.
 */
export async function updateRule(id: string, changes: Partial<RulePayload>): Promise<RuleRecord> {
  const current = await getRule(id);
  if (!current) throw new Error(`rules: record "${id}" not found`);

  const merged = {
    name: changes.name ?? current.name,
    ruleType: changes.ruleType ?? current.ruleType,
    severity: changes.severity ?? current.severity,
    message: changes.message ?? current.message,
    styleOverride: "styleOverride" in changes ? changes.styleOverride : current.styleOverride,
  };

  return requestJsonOrThrow<RuleRecord>(`/rules/${id}`, { method: "PUT", body: merged });
}

/**
 * Delete a rule by id. Does NOT cascade - entities may still reference this
 * rule's id afterward; matches the backend's deliberate no-cascade behavior.
 * @throws if the rule does not exist.
 */
export async function deleteRule(id: string): Promise<void> {
  await requestOrThrow(`/rules/${id}`, { method: "DELETE" });
}
