import { apiFetch, type ApiFetchOptions } from "../lib/httpClient";

/** Thrown for any non-OK API response. Carries the status code so callers
 *  that need to distinguish "not found" from a real failure - e.g.
 *  entities.ts trying Area/Road/Poi in turn - can do so without guessing
 *  from the message text. */
export class HttpError extends Error {
  public readonly status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Parses a non-OK response body into a readable message. Different
 *  endpoints can return different shapes - a bare JSON string, an ASP.NET
 *  ProblemDetails object ({ title, detail, ... }), or plain text - so this
 *  tries each in turn rather than assuming one specific shape. */
async function extractErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText || `Request failed with status ${res.status}`;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.detail === "string" && parsed.detail) return parsed.detail;
      if (typeof parsed.title === "string" && parsed.title) return parsed.title;
    }
  } catch {
    // Body wasn't JSON - fall through and use the raw text.
  }

  return text;
}

/** GET a single resource - returns undefined on 404, throws on any other non-OK status. */
export async function fetchJsonOrUndefined<T>(path: string): Promise<T | undefined> {
  const res = await apiFetch(path, { method: "GET" });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new HttpError(await extractErrorMessage(res), res.status);
  return res.json() as Promise<T>;
}

/** GET a resource that's always expected to succeed (e.g. a list endpoint). */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: "GET" });
  if (!res.ok) throw new HttpError(await extractErrorMessage(res), res.status);
  return res.json() as Promise<T>;
}

/** POST/PUT/DELETE - throws a descriptive HttpError on any non-OK response (including 404). */
export async function requestOrThrow(path: string, options: ApiFetchOptions): Promise<Response> {
  const res = await apiFetch(path, options);
  if (!res.ok) throw new HttpError(await extractErrorMessage(res), res.status);
  return res;
}

/** Same as requestOrThrow, but parses and returns the JSON response body. */
export async function requestJsonOrThrow<T>(path: string, options: ApiFetchOptions): Promise<T> {
  const res = await requestOrThrow(path, options);
  return res.json() as Promise<T>;
}
