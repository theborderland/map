import type { Tab } from "../../types";
import type { EntityRecord, StyleRecord } from "../../db/types";
import EntityList from "../EntityList";

export default function AreasTab({
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
  const areaEntities = entities.filter(
    (entity) => entity.geometry.type === "Polygon" || entity.geometry.type === "MultiPolygon"
  );

  return (
    <EntityList
      subtitle="Manage geographic areas and polygons on the map."
      entities={areaEntities}
      styles={styles}
      openGroup={(styleType) => openGroup("Areas", styleType)}
      openEntity={openEntity}
      groupByStyleType={true}
    />
  );
}