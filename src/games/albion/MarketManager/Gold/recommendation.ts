export interface RecStyle {
  label: string
  color: string
  bg: string
  border: string
}

// Keys MUST match the server's recommendation enum (forge-api analysis.py emits
// 'buy' | 'hold' | 'sell' from the RSI(14) 30/70 bands). recStyle falls back to 'hold' for
// anything unknown - the old map keyed these buy_gold/sell_gold and silently pinned the badge
// to Hold for every non-hold value.
export const REC_MAP: Record<string, RecStyle> = {
  buy: { label: 'Buy', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-700/40' },
  hold: { label: 'Hold', color: 'text-[#6b7280]', bg: 'bg-[#1a1d27]', border: 'border-[#2a2d3a]' },
  sell: { label: 'Sell', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700/40' },
}

export function recStyle(key: string): RecStyle {
  return REC_MAP[key] ?? REC_MAP.hold
}
