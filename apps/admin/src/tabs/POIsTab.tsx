import type { ReactNode } from "react";
import type { EntityRecord, StyleRecord } from "../db/types";
import EntityList from "../components/EntityList";

export default function POIsTab({
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
  const poiEntities = entities.filter((entity) => entity.geometry.type === "Point");

  return (
    <EntityList
      subtitle="List points of interest and service locations."
      entities={poiEntities}
      styles={styles}
      openChild={openChild}
      onSelectEntity={onSelectEntity}
    />
  );
}