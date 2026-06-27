import type { PanelView } from "../types";
import type { EntityRecord, StyleRecord } from "../db/types";
import GroupedEntityList from "../components/GroupedEntityList";

export default function POIsTab({
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
  const poiEntities = entities.filter((entity) => entity.geometry.type === "Point");

  return (
    <GroupedEntityList
      subtitle="List points of interest and service locations."
      entities={poiEntities}
      styles={styles}
      navigate={navigate}
      onSelectEntity={onSelectEntity}
    />
  );
}