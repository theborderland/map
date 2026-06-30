import type { StyleRecord } from "../db/types"

export function EntityFormFields({
  name, setName,
  selectedStyleType, setSelectedStyleType,
  tagline, setTagline,
  compatibleStyles,
}: {
  name: string
  setName: (v: string) => void
  selectedStyleType: string
  setSelectedStyleType: (v: string) => void
  tagline: string
  setTagline: (v: string) => void
  compatibleStyles: StyleRecord[]
}) {
  return (
    <>
      <div className="form-field">
        <label className="form-label">Name</label>
        <input
          className="form-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter a name"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Style</label>
        <select
          className="form-select"
          value={selectedStyleType}
          onChange={e => setSelectedStyleType(e.target.value)}
        >
          <option value="">Select style…</option>
          {compatibleStyles.map(s => (
            <option key={s.id} value={s.type}>{s.displayName}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Tagline</label>
        <input
          className="form-input"
          type="text"
          value={tagline}
          onChange={e => setTagline(e.target.value)}
          placeholder="Short tagline (optional)"
        />
      </div>
    </>
  )
}