import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Portal to <body> so no ancestor's styles (nowrap cells, transformed drag
  // cards, overflow) leak into the dialog or its fixed positioning.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={`bg-[#1a1d27] border border-[#2a2d3a] rounded-lg w-full ${maxWidth} mx-4 overflow-hidden max-h-[90dvh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d3a]">
          <p className="text-sm font-semibold text-[#e2e4ed] tracking-wide">{title}</p>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#e2e4ed] transition-colors cursor-pointer text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto min-h-0 break-words">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
