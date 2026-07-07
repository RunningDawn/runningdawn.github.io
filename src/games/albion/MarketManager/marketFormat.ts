// Silver amounts across the Market Manager: rounded, thousands-separated, '-' for no value.
export function fmt(n: number | null | undefined): string {
  if (n == null) return '-'
  return Math.round(n).toLocaleString('en-US')
}
