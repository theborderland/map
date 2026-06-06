export default function StylesTab({
  openChild,
}: {
  openChild: (content: string) => void;
}) {
  return (
    <div>
      <h2>Styles</h2>
      <p>Customize map styles.</p>

      <button onClick={() => openChild("Style editor panel")}>
        Edit Styles
      </button>
    </div>
  );
}