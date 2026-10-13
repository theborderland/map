import { useEffect, useMemo, useState } from "react";
import { getDeletedCamps, restoreCamp, type DeletedCamp } from "../../api/deletedCamps";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function DeletedCampsTab() {
  const [camps, setCamps] = useState<DeletedCamp[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDeletedCamps()
      .then((data) => { if (!cancelled) setCamps(data); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load deleted camps.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredCamps = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return camps;
    return camps.filter((camp) =>
      [camp.id, camp.name, camp.timeStamp, formatDate(camp.timeStamp), camp.deleteReason]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(query))
    );
  }, [camps, search]);

  const handleRestore = async (camp: DeletedCamp) => {
    setRestoringId(camp.id);
    setError(null);
    try {
      await restoreCamp(camp.id);
      setCamps((current) => current.filter((item) => item.id !== camp.id));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not restore the camp.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="deleted-camps">
      <p className="tab-subtitle">Review deleted camps and restore them to the map.</p>
      <wa-input
        className="deleted-camps-search"
        type="search"
        placeholder="Search id, name, date, or delete reason"
        autocomplete="off"
        value={search}
        onInput={(event: Event) => setSearch((event.target as HTMLInputElement).value)}
      />

      {error && <p className="form-hint-warning deleted-camps-error">{error}</p>}
      {loading ? (
        <p className="item-meta">Loading deleted camps…</p>
      ) : filteredCamps.length === 0 ? (
        <p className="item-meta">No deleted camps found.</p>
      ) : (
        <div className="deleted-camps-list">
          {filteredCamps.map((camp) => (
            <article className="deleted-camp-card" key={camp.id}>
              <div className="deleted-camp-heading">
                <h3>{camp.name || "(unnamed)"}</h3>
                <div className="deleted-camp-heading-actions">
                  <span className="deleted-camp-id">#{camp.id}</span>
                  <wa-button
                    id={`restore-${camp.id}`}
                    size="xs"
                    appearance="outlined"
                    aria-label={`Restore ${camp.name || camp.id}`}
                    title={"Restore"}
                    disabled={restoringId !== null || undefined}
                    onClick={() => handleRestore(camp)}
                  >
                    <wa-icon name="rotate-left"></wa-icon>
                  </wa-button>
                  <wa-tooltip show-delay={50} placement="bottom" for={`restore-${camp.id}`}>
                    Restore
                  </wa-tooltip>
                </div>
              </div>
              <p className="deleted-camp-date">Deleted {formatDate(camp.timeStamp)}</p>
              <div className="deleted-camp-reason">{camp.deleteReason || "(no reason given)"}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}