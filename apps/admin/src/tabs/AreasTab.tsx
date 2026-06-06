export default function AreasTab({
  openChild,
}: {
  openChild: (content: string) => void;
}) {
  return (
    <div>
      <h2>Areas</h2>
      <p>Manage geographic areas.</p>

      <button onClick={() => openChild("Create a new area")}>
        Create Area
      </button>
    </div>
  );
}