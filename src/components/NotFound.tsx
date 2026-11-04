import { Link } from 'react-router'

interface NotFoundProps {
  backTo?: string
  backLabel?: string
}

export function NotFound({ backTo = '/', backLabel = 'Go home' }: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center select-none">
      <p className="text-6xl font-bold text-[#2a2d3a] mb-4">404</p>
      <h1 className="text-xl font-semibold text-[#e2e4ed] mb-2">Page not found</h1>
      <p className="text-sm text-[#6b7280] mb-6">
        This page doesn't exist or was moved.
      </p>
      <Link
        to={backTo}
        className="px-4 py-2 text-sm rounded bg-[#c4af64]/10 text-[#c4af64] border border-[#c4af64]/30 hover:bg-[#c4af64]/20 transition-colors"
      >
        {backLabel}
      </Link>
    </div>
  )
}
