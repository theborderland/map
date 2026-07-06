import type { Tab } from "../../types";
import type { EntityRecord, StyleRecord } from "../../db/types";
import GroupedEntityList from "../GroupedEntityList";

export default function POIsTab({
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
  const poiEntities = entities.filter((entity) => entity.geometry.type === "Point");

  return (
    <GroupedEntityList
      subtitle="List points of interest and service locations."
      entities={poiEntities}
      styles={styles}
      openGroup={(styleType) => openGroup("POIs", styleType)}
      openEntity={openEntity}
    />
  );
}