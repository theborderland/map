import { fetchJson, fetchJsonOrUndefined, requestJsonOrThrow, requestOrThrow } from "./httpErrors";
import type { StyleRecord, StylePayload } from "../db/types";

/** Return all style definitions. The backend already orders these by displayName. */
export async function getStyles(): Promise<StyleRecord[]> {
  return fetchJson<StyleRecord[]>("/styles");
}

/** Return a single style by its id, or undefined if not found. */
export async function getStyle(id: string): Promise<StyleRecord | undefined> {
  return fetchJsonOrUndefined<StyleRecord>(`/styles/${id}`);
}

/**
 * Return a style by its type slug (e.g. 'neighbourhood'), or undefined.
 * No dedicated backend endpoint for this - fetches the full list and
 * filters, which is fine at this dataset's size.
 */
export async function getStyleByType(type: string): Promise<StyleRecord | undefined> {
  const styles = await getStyles();
  return styles.find((s) => s.type === type);
}

/**
 * Create a new style.
 * @throws if a style with the same type key already exists (surfaces the backend's own message).
 */
export async function createStyle(payload: StylePayload): Promise<StyleRecord> {
  return requestJsonOrThrow<StyleRecord>("/styles", { method: "POST", body: payload });
}

/**
 * Update an existing style. Partial - only the provided fields are changed.
 * The backend's PUT is a full-replace, so this fetches the current record
 * first and merges `changes` on top. The type key can't be changed after
 * creation, so it's never sent even if present in `changes`.
 * @throws if the style does not exist.
 */
export async function updateStyle(
  id: string,
  changes: Partial<Omit<StylePayload, "type">>,
): Promise<StyleRecord> {
  const current = await getStyle(id);
  if (!current) throw new Error(`styles: record "${id}" not found`);

  const merged = {
    displayName: changes.displayName ?? current.displayName,
    fillColor: changes.fillColor ?? current.fillColor,
    borderColor: changes.borderColor ?? current.borderColor,
    fillOpacity: changes.fillOpacity ?? current.fillOpacity,
    borderWidth: changes.borderWidth ?? current.borderWidth,
    dashPattern: changes.dashPattern ?? current.dashPattern,
  };

  return requestJsonOrThrow<StyleRecord>(`/styles/${id}`, { method: "PUT", body: merged });
}

/**
 * Delete a style by id.
 * @throws if the style does not exist.
 */
export async function deleteStyle(id: string): Promise<void> {
  await requestOrThrow(`/styles/${id}`, { method: "DELETE" });
}
