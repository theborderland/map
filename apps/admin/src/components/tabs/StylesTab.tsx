import type { EntityRecord, StyleRecord } from "../../db/types";
import StyleCard from "../StyleCard";

export default function StylesTab({
  entities,
  styles,
  openStyle,
}: {
  entities: EntityRecord[];
  styles: StyleRecord[];
  openStyle: (id: string) => void;
}) {
  return (
    <div>
      <p className="tab-subtitle">Browse the map style definitions used by entities.</p>
      {styles.length === 0 ? (
        <p>No styles found.</p>
      ) : (
        <div className="left-entity-grid">
          {styles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              entityCount={entities.filter(e => e.styleType === style.type).length}
              onOpen={() => openStyle(style.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}