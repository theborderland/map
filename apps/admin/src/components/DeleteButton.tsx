import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  /** Label shown in the confirm dialog, e.g. "Delete 'Camp Sunrise'?" */
  message?: string;
  onDelete: () => void;
  disabled?: boolean;
}

/** Shows a delete button that opens a confirmation dialog before executing. */
export default function DeleteButton({ message = "Are you sure you want to delete this?", onDelete, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    onDelete();
  };

  return (
    <>
      <wa-button
        size="xs"
        appearance="outlined"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <wa-icon slot="start" name="trash"></wa-icon>
        Delete
      </wa-button>

      <ConfirmDialog
        open={open}
        message={message}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}