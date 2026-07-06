// Header shown at the top of the left panel content area.
// Shows the current view title and an optional back button for child views.
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
      {showBack && (
        <>
          <wa-button id="tooltip-right" size="xs" appearance="outlined" onClick={onBack} className="back-button" >
            <wa-icon name="chevron-left"></wa-icon>
          </wa-button>
          <wa-tooltip placement="right" for="tooltip-right">
            Cancel/Go back
          </wa-tooltip>
        </>
      )}
      <h2 className="title">{title}</h2>
    </div>
  );
}