import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'

interface Props {
  label: ReactNode
  title: string
  message: ReactNode
  onConfirm: () => unknown
  confirmLabel?: string
  cancelLabel?: string
  className?: string
  ariaLabel?: string
}

// A button that opens an in-page confirm dialog before running onConfirm.
// Used for destructive actions; the inline ConfirmButton stays for small row toggles.
export function ConfirmDialogButton({
  label, title, message, onConfirm, confirmLabel = 'Yes', cancelLabel = 'No', className, ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button type="button" aria-label={ariaLabel} onClick={() => setOpen(true)} className={className ?? 'text-xs text-[#4b5563] hover:text-red-400 cursor-pointer'}>
        {label}
      </button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title={title}>
          <div className="px-5 py-4 space-y-4">
            <div className="text-sm text-[#9ca3af]">{message}</div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="forge-btn cursor-pointer">{cancelLabel}</button>
              <button type="button" onClick={confirm} disabled={busy} className="px-3 py-1.5 rounded text-sm font-medium text-white bg-red-600/80 hover:bg-red-600 cursor-pointer disabled:opacity-40">
                {confirmLabel}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
