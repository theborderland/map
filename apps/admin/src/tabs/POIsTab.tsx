export default function POIsTab({
  openChild,
}: {
  openChild: (content: string) => void;
}) {
  return (
    <div>
      <h2>POIs</h2>
      <ul>
        <li>Gas station</li>
        <li>Restaurant</li>
      </ul>

      <button onClick={() => openChild("All POIs list")}>
        View All
      </button>
    </div>
  );
}