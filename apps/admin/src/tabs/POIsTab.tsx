import type { ReactNode } from "react";

export default function POIsTab({
  openChild,
}: {
  openChild: (content: ReactNode, title?: string) => void;
}) {
  return (
    <div>
      <h2>POI list</h2>
      <ul>
        <li>
          <a href="#" onClick={() => openChild("1", "Title 1")}>
            POI #1
          </a>
        </li>
        <li>
          <a href="#" onClick={() => openChild("2", "Title 2")}>
            POI #2
          </a>
        </li>
      </ul>
    </div>
  );
}