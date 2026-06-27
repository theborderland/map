// Responsible for rendering lists of entities. Supports two modes:
// - Flat list (groupByStyleType = false): renders a grid of `EntityCard` items.
// - Grouped list (groupByStyleType = true): shows `GroupedEntityCard` entries that open
import type { EntityRecord, StyleRecord } from "../db/types";
import type { PanelView } from "../types";
import EntityCard from "./EntityCard";
import GroupedEntityCard from "./GroupedEntityCard";

interface Props {
  subtitle?: string;
  entities: EntityRecord[];
  styles: StyleRecord[];
  navigate: (view: PanelView) => void;
  onSelectEntity?: (entityId: string) => void;
  groupByStyleType?: boolean;
}

export default function GroupedEntityList({
  subtitle,
  entities,
  styles,
  navigate,
  onSelectEntity,
  groupByStyleType = false,
}: Props) {
  const styleByType = new Map(styles.map((s) => [s.type, s]));

  const openEntity = (entity: EntityRecord) => {
    onSelectEntity?.(entity.id);
    navigate({ type: "entity-detail", entityId: entity.id });
  };

  const renderEntityList = (entities: EntityRecord[], fixedStyle?: StyleRecord) => (
    <div className="grid">
      {entities.map((entity) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          style={fixedStyle ?? styleByType.get(entity.styleType)}
          onOpen={() => openEntity(entity)}
        />
      ))}
    </div>
  );

  function renderGroupedList(entities: EntityRecord[]) {
    const grouped = new Map<string, EntityRecord[]>();
    entities.forEach((entity) => {
      const group = grouped.get(entity.styleType);
      if (group) {
        group.push(entity);
      } else {
        grouped.set(entity.styleType, [entity]);
      }
    });

    const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => {
      const nameA = styleByType.get(a)?.displayName ?? a;
      const nameB = styleByType.get(b)?.displayName ?? b;
      return nameA.localeCompare(nameB);
    });

    return (
      <div className="grid">
        {sortedGroups.map(([styleType, groupEntities]) => {
          const style = styleByType.get(styleType);
          return (
            <GroupedEntityCard
              key={styleType}
              groupName={style?.displayName ?? styleType}
              groupCount={groupEntities.length}
              style={style}
              onOpen={() => navigate({ type: "entity-group", styleType })}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {subtitle && <p className="grouped-entity-subtitle">{subtitle}</p>}
      {entities.length === 0 ? (
        <p>No items found yet.</p>
      ) : groupByStyleType ? (
        renderGroupedList(entities)
      ) : (
        renderEntityList(entities)
      )}
    </div>
  );
}