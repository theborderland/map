// LeftPanelHeader
// Header used inside the left panel. Displays a centered title and an optional
// back button for child pages. Keeps header layout consistent for root and child views.
export default function LeftPanelHeader({
  title,
  showBack,
  onBack,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="left-panel-header">
      {showBack ? (
        <wa-button size="xs" appearance="outlined" onClick={onBack} style={{ position: "absolute", left: 0 }}>
          <wa-icon name="caret-left"></wa-icon>
        </wa-button>
      ) : null}
      <h2 style={{ textAlign: "center", margin: 0 }}>{title}</h2>
    </div>
  );
}
