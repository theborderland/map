import type { ReactNode } from "react";

export default function RulesTab({
  openChild,
}: {
  openChild: (content: ReactNode, title?: string) => void;
}) {
  return (
    <div>
      <h2>Rules</h2>
      <p>Configure rules.</p>
      <ul>
        <li>
          <button onClick={() => openChild("1", "Title 1")}>
            Edit rule #1
          </button>
        </li>
        <li>
          <button onClick={() => openChild("2", "Title 2")}>
            Edit rule #2
          </button>
        </li>
      </ul>
    </div>
  );
}