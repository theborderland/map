interface Props {
  /** Label shown in the confirm dialog, e.g. "Delete 'Camp Sunrise'?" */
  message?: string;
  onDelete: () => void;
  disabled?: boolean;
}

/** Shows a delete button that opens a confirmation dialog before executing. */
export default function DeleteButton({ message = "Are you sure you want to delete this?", onDelete, disabled }: Props) {
  const handleConfirm = () => {
    onDelete();
  };
  return (
    <>
      <wa-button
        size="xs"
        appearance="outlined"
        variant="danger"
        disabled={disabled}
        data-dialog="open delete-dialog"
      >
        <wa-icon slot="start" name="trash"></wa-icon>
        Delete
      </wa-button>

      <wa-dialog
        id="delete-dialog"
        label="Confirm delete"
      >
        <p>{message}</p>
        <div
          slot="footer"
          style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}
        >
          <wa-button appearance="outlined" size="xs" data-dialog="close">
            Cancel
          </wa-button>
          <wa-button
            appearance="filled-outlined"
            size="xs"
            variant="danger"
            onClick={handleConfirm}
          >
            <wa-icon slot="start" name="trash"></wa-icon>
            Delete
          </wa-button>
        </div>
      </wa-dialog>
    </>
  );
}