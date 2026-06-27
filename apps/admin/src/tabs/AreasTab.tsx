import type { PanelView } from "../types";
import type { EntityRecord, StyleRecord } from "../db/types";
import GroupedEntityList from "../components/GroupedEntityList";

export default function AreasTab({
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
  const areaEntities = entities.filter(
    (entity) => entity.geometry.type === "Polygon" || entity.geometry.type === "MultiPolygon"
  );

  return (
    <GroupedEntityList
      subtitle="Manage geographic areas and polygons on the map."
      entities={areaEntities}
      styles={styles}
      navigate={navigate}
      onSelectEntity={onSelectEntity}
      groupByStyleType={true}
    />
  );
}