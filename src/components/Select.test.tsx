import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, type SelectOption } from './Select'

const OPTS: SelectOption[] = ['Druid', 'Tauren', 'Troll', 'Warlock', 'Warrior'].map(v => ({ value: v, label: v }))

function Harness() {
  const [value, setValue] = useState<SelectOption | null>(null)
  return (
    <>
      <Select aria-label="Pick" options={OPTS} value={value} onChange={setValue} />
      <output>{value?.value ?? 'none'}</output>
    </>
  )
}

describe('Select type-ahead', () => {
  it('picks by prefix and cycles on a repeated letter', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('ta')
    expect(screen.getByRole('status')).toHaveTextContent('Tauren')
    await new Promise(r => setTimeout(r, 750))
    await user.keyboard('ww')
    expect(screen.getByRole('status')).toHaveTextContent('Warrior')
    await user.keyboard('z')
    expect(screen.getByRole('status')).toHaveTextContent('Warrior')
  })
})
