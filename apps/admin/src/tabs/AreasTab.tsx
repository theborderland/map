import type { ReactNode } from "react";
import type { EntityRecord, StyleRecord } from "../db/types";
import EntityList from "../components/EntityList";

export default function AreasTab({
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

  const areaEntities = entities.filter((entity) =>
    entity.geometry.type === "Polygon" || entity.geometry.type === "MultiPolygon"
  );

  return (
    <EntityList
      subtitle="Manage geographic areas and polygons on the map."
      entities={areaEntities}
      styles={styles}
      openChild={openChild}
      onSelectEntity={onSelectEntity}
      groupByStyleType={true}
    />
  );
}
