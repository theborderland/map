// Header shown at the top of the left panel content area.
// Shows the current view title, an optional back button on the left,
// and an optional create button on the right.
export default function LeftPanelHeader({
  title,
  showBack,
  onBack,
  onCreateClick,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  onCreateClick?: () => void;
}) {
  return (
    <div className="left-panel-header">
      {showBack && (
        <>
          <wa-button
            id="tooltip-back"
            size="xs"
            appearance="outlined"
            onClick={onBack}
            className="back-button"
          >
            <wa-icon name="chevron-left"></wa-icon>
          </wa-button>
          <wa-tooltip placement="right" for="tooltip-back">
            Go back
          </wa-tooltip>
        </>
      )}

      <h2 className="title">{title}</h2>

      {/* Only rendered when the current view supports creating a new item. */}
      {onCreateClick && (
        <wa-button
          size="xs"
          appearance="outlined"
          onClick={onCreateClick}
          style={{ marginLeft: "auto" }}
        >
          <wa-icon slot="start" name="plus"></wa-icon>
          New
        </wa-button>
      )}
    </div>
  );
}