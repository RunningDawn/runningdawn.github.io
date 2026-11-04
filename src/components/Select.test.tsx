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
      <output data-testid="picked">{value?.value ?? 'none'}</output>
    </>
  )
}

describe('Select search', () => {
  it('filters as you type; Enter picks the first match', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('ta{Enter}')
    expect(screen.getByTestId('picked')).toHaveTextContent('Tauren')
    await user.click(screen.getByRole('combobox', { name: 'Pick' }))
    await user.keyboard('warr')
    expect(screen.queryByRole('option', { name: 'Warlock' })).not.toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('picked')).toHaveTextContent('Warrior')
  })
})
