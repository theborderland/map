// Responsible for rendering lists of entities. Supports two modes:
// - Flat list (groupByStyleType = false): renders a grid of `EntityCard` items.
// - Grouped list (groupByStyleType = true): shows `GroupedEntityCard` entries that open
//   child pages listing the group's entities via `openChild`.
import type { ReactNode } from "react";
import type { EntityRecord, StyleRecord } from "../db/types";
import EntityCard from "./EntityCard";
import GroupedEntityCard from "./GroupedEntityCard";
import EntityDetail from "./EntityDetail";

interface Props {
  subtitle: string;
  entities: EntityRecord[];
  styles: StyleRecord[];
  openChild: (content: ReactNode, title?: string) => void;
  onSelectEntity?: (entityId: string) => void;
  groupByStyleType?: boolean;
  setEntities?: any;
}

export default function GroupedEntityList({
  subtitle,
  entities,
  styles,
  openChild,
  onSelectEntity,
  groupByStyleType = false,
  setEntities,
}: Props) {
  // Map styles by type for quick lookup when rendering entity details.
  const styleByType = new Map(styles.map((style) => [style.type, style]));

  // Handle entity card click: open a child page with the entity's full details.
  const openEntity = (entity: EntityRecord) => {
    onSelectEntity?.(entity.id);

    openChild(
      <EntityDetail
        entity={entity}
        style={styleByType.get(entity.styleType)}
        setEntities={setEntities}
      />,
      entity.name || entity.id
    );
  };

  // Flat mode: render entities as a simple grid without grouping by styleType.
  const renderEntityList = (
    entities: EntityRecord[],
    fixedStyle?: StyleRecord
  ) => (
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

  // Grouped mode: organize entities by styleType and show group cards.
  // Build a map of styleType -> entities, then sort groups alphabetically by display name.
  function renderGroupedList(entities: EntityRecord[]): ReactNode {
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
      const styleA = styleByType.get(a)?.displayName ?? a;
      const styleB = styleByType.get(b)?.displayName ?? b;

      return styleA.localeCompare(styleB);
    });

    return <div className="grid">
      {sortedGroups.map(([styleType, groupEntities]) => {
        const style = styleByType.get(styleType);
        const groupName = style?.displayName ?? styleType;

        return (
          <GroupedEntityCard
            key={styleType}
            groupName={groupName}
            groupCount={groupEntities.length}
            style={style}
            onOpen={() =>
              // open this list again with the entities of the group
              openChild(
                <GroupedEntityList
                  subtitle={groupName}
                  entities={groupEntities}
                  styles={styles}
                  openChild={openChild}
                  onSelectEntity={onSelectEntity}
                  groupByStyleType={false}
                  setEntities={setEntities}
                />,
                groupName
              )
            } />
        );
      })}
    </div>;
  }

  return (
    <div>
      <p className="grouped-entity-subtitle">{subtitle}</p>

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