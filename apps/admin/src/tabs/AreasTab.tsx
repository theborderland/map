import type { ReactNode } from "react";

export default function AreasTab({
  openChild,
}: {
  openChild: (content: ReactNode, title?: string) => void;
}) {

  const specificAreaContent = (
    <div>
      <p>Content goes here</p>
    </div>
  );

  const childAreaContent = (
    <div>
      <p>Child page here</p>
      <button onClick={() => openChild(specificAreaContent, "Artic Chill Area")}>
        Open Artic Chill area
      </button>
    </div>
  );

  return (
    <div>
      <h2>Areas</h2>
      <p>Manage geographic areas.</p>

      <button onClick={() => openChild(childAreaContent, "Neighborhoods")}>
        Open Neighborhoods page
      </button>
    </div>
  );
}