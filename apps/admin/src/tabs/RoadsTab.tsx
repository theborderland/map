import type { ReactNode } from "react";
import type { EntityRecord, StyleRecord } from "../db/types";
import EntityList from "../components/EntityList";

export default function RoadsTab({
  entities,
  styles,
  openChild,
  onSelectEntity,
}: {
  entities: EntityRecord[];
  styles: StyleRecord[];
  openChild: (content: ReactNode, title?: string) => void;
  onSelectEntity?: (entityId: string) => void;
}) {
  const roadEntities = entities.filter((entity) =>
    entity.geometry.type === "LineString" || entity.geometry.type === "MultiLineString"
  );

  return (
    <EntityList
      subtitle="Browse and inspect road features for routing and access."
      entities={roadEntities}
      styles={styles}
      openChild={openChild}
      onSelectEntity={onSelectEntity}
      groupByStyleType={true}
    />
  );
}