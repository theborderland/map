import type { Tab } from "../../types";
import type { EntityRecord, StyleRecord } from "../../db/types";
import EntityList from "../EntityList";

export default function RoadsTab({
  entities,
  styles,
  openGroup,
  openEntity,
}: {
  entities: EntityRecord[];
  styles: StyleRecord[];
  openGroup: (tab: Tab, styleType: string) => void;
  openEntity: (entity: EntityRecord) => void;
}) {
  const roadEntities = entities.filter((entity) =>
    entity.geometry.type === "LineString" || entity.geometry.type === "MultiLineString"
  );

  return (
    <EntityList
      subtitle="Browse and inspect road features for routing and access."
      entities={roadEntities}
      styles={styles}
      openGroup={(styleType) => openGroup("Roads", styleType)}
      openEntity={openEntity}
      groupByStyleType={true}
    />
  );
}