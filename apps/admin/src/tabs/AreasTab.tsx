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
      <wa-button size="s" onClick={() => openChild(specificAreaContent, "Artic Chill Area")}>
        Open Artic Chill area
      </wa-button>
    </div>
  );

  return (
    <div>
      <h2>Areas</h2>
      <p>Manage geographic areas.</p>
      <wa-button size="s" onClick={() => openChild(childAreaContent, "Neighborhoods")}>
        Open Neighborhoods page
      </wa-button>
    </div>
  );
}