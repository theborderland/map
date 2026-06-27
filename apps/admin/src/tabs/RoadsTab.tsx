import type { PanelView } from "../types";
import type { EntityRecord, StyleRecord } from "../db/types";
import GroupedEntityList from "../components/GroupedEntityList";

export default function RoadsTab({
  entities,
  styles,
  navigate,
  onSelectEntity,
}: {
  entities: EntityRecord[];
  styles: StyleRecord[];
  navigate: (view: PanelView) => void;
  onSelectEntity?: (entityId: string) => void;
}) {
  const roadEntities = entities.filter((entity) =>
    entity.geometry.type === "LineString" || entity.geometry.type === "MultiLineString"
  );

  return (
    <GroupedEntityList
      subtitle="Browse and inspect road features for routing and access."
      entities={roadEntities}
      styles={styles}
      navigate={navigate}
      onSelectEntity={onSelectEntity}
      groupByStyleType={true}
    />
  );
}