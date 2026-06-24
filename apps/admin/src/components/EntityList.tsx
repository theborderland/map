// Responsible for rendering lists of entities. Supports two modes:
// - Flat list (groupByStyleType = false): renders a grid of `EntityCard` items.
// - Grouped list (groupByStyleType = true): shows `GroupCard` entries that open
//   child pages listing the group's entities via `openChild`.
import type { ReactNode } from "react";
import type { EntityRecord, StyleRecord } from "../db/types";
import EntityCard from "./EntityCard";
import GroupCard from "./GroupCard";

interface EntityListProps {
  subtitle: string;
  entities: EntityRecord[];
  styles: StyleRecord[];
  openChild: (content: ReactNode, title?: string) => void;
  onSelectEntity?: (entityId: string) => void;
  groupByStyleType?: boolean;
}

// Helper to convert GeoJSON geometry types into human-readable labels.
const formatGeometry = (type: string) => {
  switch (type) {
    case "Point":
      return "Point";
    case "LineString":
      return "Line";
    case "MultiLineString":
      return "Multi-line";
    case "Polygon":
      return "Polygon";
    case "MultiPolygon":
      return "Multi-polygon";
    default:
      return type;
  }
};
 

export default function GroupedEntityList({
  subtitle,
  entities,
  styles,
  openChild,
  onSelectEntity,
  groupByStyleType,
}: EntityListProps) {
  // Map styles by type for quick lookup when rendering entity details.
  const styleByType = new Map(styles.map((style) => [style.type, style]));

  // Handle entity card click: open a child page with the entity's full details.
  const handleOpen = (entity: EntityRecord) => {
    if (onSelectEntity) onSelectEntity(entity.id);
    const style = styleByType.get(entity.styleType);

    openChild(
      <div className="item-card">
        <h3>{entity.name || entity.id}</h3>
        <p className="item-meta">
          {style?.displayName ?? entity.styleType} · {formatGeometry(entity.geometry.type)}
        </p>
        {entity.tagline && <p className="tagline">{entity.tagline}</p>}
        {entity.description && <p>{entity.description}</p>}
        {entity.link && (
          <p>
            <a href={entity.link} target="_blank" rel="noreferrer">
              {entity.link}
            </a>
          </p>
        )}
        <p>
          <strong>Rule references:</strong> {entity.rules.length}
        </p>
        {entity.rules.length > 0 && (
          <ul>
            {entity.rules.map((rule) => (
              <li key={rule.ruleId}>
                {rule.ruleId}{rule.distanceMeters ? ` (${rule.distanceMeters}m)` : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
      </div>,
      entity.name || entity.id
    );
  };

  // Flat mode: render entities as a simple grid without grouping by style.
  if (!groupByStyleType) {
    return (
      <div>
        <p>{subtitle}</p>

        {entities.length === 0 ? (
          <p>No items found yet.</p>
        ) : (
          <div className="grid">
            {entities.map((entity) => {
              const style = styleByType.get(entity.styleType);
              return (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  style={style}
                  onOpen={() => handleOpen(entity)}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Grouped mode: organize entities by styleType and show group cards.
  // Build a map of styleType -> entities, then sort groups alphabetically by display name.
  const grouped = new Map<string, EntityRecord[]>();
  entities.forEach((entity) => {
    if (!grouped.has(entity.styleType)) {
      grouped.set(entity.styleType, []);
    }
    grouped.get(entity.styleType)!.push(entity);
  });

  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const styleA = styleByType.get(a[0])?.displayName ?? a[0];
    const styleB = styleByType.get(b[0])?.displayName ?? b[0];
    return styleA.localeCompare(styleB);
  });

  // Handle group card click: open a child page listing all entities in that group.
  const handleOpenGroup = (styleType: string, groupName: string, groupEntities: EntityRecord[]) => {
    const style = styleByType.get(styleType);

    openChild(
      <div className="grid">
        {groupEntities.map((entity) => (
          <EntityCard key={entity.id} entity={entity} style={style} onOpen={() => handleOpen(entity)} />
        ))}
      </div>,
      groupName
    );
  };

  return (
    <div>
      <p>{subtitle}</p>

      {entities.length === 0 ? (
        <p>No items found yet.</p>
      ) : (
        <div className="grid">
          {sortedGroups.map(([styleType, groupEntities]) => {
            const style = styleByType.get(styleType);
            const groupName = style?.displayName ?? styleType;
            return (
              <GroupCard
                key={styleType}
                groupName={groupName}
                groupCount={groupEntities.length}
                style={style}
                onOpen={() => handleOpenGroup(styleType, groupName, groupEntities)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

