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
        <wa-button size="xs" appearance="outlined" onClick={onBack} className="back-button">
          <wa-icon name="chevron-left"></wa-icon>
        </wa-button>
      ) : null}
      <h2 className="title">{title}</h2>
    </div>
  );
}
