import type { ReactNode } from "react";

export default function RoadsTab({
  openChild,
}: {
  openChild: (content: ReactNode, title?: string) => void;
}) {
  return (
    <div>
      <h2>Roads</h2>
      <p>Manage road network.</p>

      <button onClick={() => openChild("Edit road properties", "Road Properties")}>
        Edit Roads
      </button>
    </div>
  );
}