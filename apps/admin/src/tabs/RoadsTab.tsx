export default function RoadsTab({
  openChild,
}: {
  openChild: (content: string) => void;
}) {
  return (
    <div>
      <h2>Roads</h2>
      <p>Manage road network.</p>

      <button onClick={() => openChild("Edit road properties")}>
        Edit Roads
      </button>
    </div>
  );
}