export default function RulesTab({
  openChild,
}: {
  openChild: (content: string) => void;
}) {
  return (
    <div>
      <h2>Rules</h2>
      <p>Configure rules engine.</p>

      <button onClick={() => openChild("Advanced rule settings")}>
        Configure
      </button>
    </div>
  );
}