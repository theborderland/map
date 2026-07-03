export default function LeftPanelHeader({
  title,
  showBack,
  onBack,
  onCreateClick,
}: {
  title: string
  showBack?: boolean
  onBack?: () => void
  onCreateClick?: () => void     // undefined = hide the button
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
      {onCreateClick && (
        <>
        <wa-button id="tooltip-left" size="xs" appearance="outlined" onClick={onCreateClick} className="create-button">
          <wa-icon name="plus"></wa-icon>
        </wa-button>
        <wa-tooltip placement="left" for="tooltip-left">
            Create new
          </wa-tooltip>
        </>
      )}
    </div>
  )
}