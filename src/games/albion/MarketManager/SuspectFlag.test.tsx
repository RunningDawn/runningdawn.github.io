import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuspectFlag } from './SuspectFlag'

describe('SuspectFlag', () => {
  it('renders a marker whose tooltip preserves the raw troll ask', () => {
    render(<SuspectFlag rawAsk={799999} />)
    const flag = screen.getByTitle(/799,999 looks like a lone troll listing/)
    expect(flag).toBeInTheDocument()
    expect(flag.textContent).toContain('*')
  })
})
