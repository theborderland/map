
interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog using wa-dialog's declarative `open` attribute.
 * Avoids imperative show()/hide() calls which can fail if the web
 * component hasn't finished upgrading when the effect runs.
 */
export default function ConfirmDialog({ open, message, onConfirm, onCancel }: Props) {
  return (
    <wa-dialog
      label="Confirm delete"
      open={open || undefined}
      onwa-after-hide={onCancel}
    >
      <p>{message}</p>
      <div
        slot="footer"
        style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}
      >
        <wa-button appearance="outlined" size="xs" onClick={onCancel}>
          Cancel
        </wa-button>
        <wa-button
          appearance="filled"
          size="xs"
          onClick={onConfirm}
        >
          <wa-icon slot="start" name="trash"></wa-icon>
          Delete
        </wa-button>
      </div>
    </wa-dialog>
  );
}