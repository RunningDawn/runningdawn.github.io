import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScanIndicator } from './DataFreshness'

const fetchedAt = new Date('2026-07-03T00:00:00Z')

describe('ScanIndicator', () => {
  it('shows a person icon and a custom title for a user override', () => {
    const dataAt = new Date('2026-07-02T23:00:00Z') // 1h old
    render(<ScanIndicator dataAt={dataAt} fetchedAt={fetchedAt} source="user" by="Alice" />)
    expect(screen.getAllByTitle(/custom price by alice/i).length).toBeGreaterThan(0)
    expect(screen.getByText('\u{1F464}')).toBeInTheDocument()
  })

  it('shows a relative age and scan title for ADP data', () => {
    const dataAt = new Date('2026-07-02T21:00:00Z') // 3h old
    render(<ScanIndicator dataAt={dataAt} fetchedAt={fetchedAt} source="adp" />)
    expect(screen.getByText('3h')).toBeInTheDocument()
    expect(screen.getByTitle(/scanned in game/i)).toBeInTheDocument()
    expect(screen.queryByText('\u{1F464}')).toBeNull()
  })

  it('renders "never" when the market was never scanned', () => {
    render(<ScanIndicator dataAt={null} fetchedAt={fetchedAt} />)
    expect(screen.getByText('never')).toBeInTheDocument()
  })
})
