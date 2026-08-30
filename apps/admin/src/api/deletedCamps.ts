import { fetchJson, requestOrThrow } from "./httpErrors";

export interface DeletedCamp {
  id: number;
  name?: string;
  timeStamp: string;
  deleteReason?: string;
}

export async function getDeletedCamps(): Promise<DeletedCamp[]> {
  const camps = await fetchJson<DeletedCamp[]>("/camps/deleted");
  // recently deleted first
  return [...camps].sort((a, b) => {
    const deletedAtA = Date.parse(a.timeStamp);
    const deletedAtB = Date.parse(b.timeStamp);
    if (Number.isNaN(deletedAtA)) return 1;
    if (Number.isNaN(deletedAtB)) return -1;
    return deletedAtB - deletedAtA;
  });
}

export async function restoreCamp(id: number): Promise<void> {
  await requestOrThrow(`/camps/${encodeURIComponent(id)}/restore`, {
    method: "POST",
  });
}