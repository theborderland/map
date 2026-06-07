import type { ReactNode } from "react";

export default function StylesTab({
  openChild,
}: {
  openChild: (content: ReactNode, title?: string) => void;
}) {
  return (
    <div>
      <h2>Styles</h2>
      <p>Customize map styles.</p>

      <button onClick={() => openChild("Style editor panel", "Style Editor")}>
        Edit Styles
      </button>
    </div>
  );
}