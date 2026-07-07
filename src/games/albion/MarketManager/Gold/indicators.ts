export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j]
      }
      result.push(sum / period)
    }
  }
  return result
}

// Wilder RSI from smoothed avg gain/loss. No losses -> fully overbought (100), unless the
// window is also flat (no gains) -> neutral (50). Mirrors forge-api analysis.py _rsi exactly.
function rsiValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50
  return 100 - 100 / (1 + avgGain / avgLoss)
}

export function rsi(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = []

  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }

  let avgG = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgL = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null)
      continue
    }
    if (i > period) {
      const diff = data[i] - data[i - 1]
      avgG = (avgG * (period - 1) + (diff > 0 ? diff : 0)) / period
      avgL = (avgL * (period - 1) + (diff < 0 ? -diff : 0)) / period
    }
    result.push(rsiValue(avgG, avgL))
  }

  return result
}
