import type { PanelView } from "../types";
import type { EntityRecord, StyleRecord } from "../db/types";
import StyleCard from "../components/StyleCard";

export default function StylesTab({
  entities,
  styles,
  navigate,
}: {
  entities: EntityRecord[];
  styles: StyleRecord[];
  navigate: (view: PanelView) => void;
}) {
  return (
    <div>
      <p className="grouped-entity-subtitle">Browse the map style definitions used by entities.</p>
      {styles.length === 0 ? (
        <p>No styles found.</p>
      ) : (
        <div className="grid">
          {styles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              entityCount={entities.filter(e => e.styleType === style.type).length}
              onOpen={() => navigate({ type: 'style-detail', styleId: style.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}