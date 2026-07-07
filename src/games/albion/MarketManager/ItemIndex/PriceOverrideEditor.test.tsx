import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceOverrideEditor } from './PriceOverrideEditor'

const fetchSpy = vi.fn()
globalThis.fetch = fetchSpy

function ok(payload: unknown) {
  return new Response(JSON.stringify({ status: 'ok', message: '', payload }), { status: 200 })
}

beforeEach(() => {
  fetchSpy.mockReset()
  fetchSpy.mockResolvedValue(ok({ sell_price_min: 200, by: 'A', at: 't' }))
})

describe('PriceOverrideEditor', () => {
  it('saves a manual price via PUT with the market key and amount', async () => {
    render(
      <PriceOverrideEditor
        itemId="T4_BAG" city="Caerleon" quality={2} current={null} isOverride={false} />,
    )
    await userEvent.click(screen.getByLabelText('Edit market price'))
    await userEvent.type(screen.getByLabelText('Manual price in silver'), '200')
    await userEvent.click(screen.getByTitle('Save'))

    await waitFor(() => {
      const put = fetchSpy.mock.calls.find(c => c[1]?.method === 'PUT')
      expect(put).toBeTruthy()
      expect(String(put![0])).toContain('/game/albion/price-overrides')
      expect(JSON.parse(put![1].body)).toMatchObject({
        item_id: 'T4_BAG', city: 'Caerleon', quality: 2, sell_price_min: 200,
      })
    })
  })

  it('clears an existing override via DELETE on the market path', async () => {
    render(
      <PriceOverrideEditor
        itemId="T4_BAG" city="Caerleon" quality={2} current={200} isOverride={true} />,
    )
    await userEvent.click(screen.getByLabelText('Edit market price'))
    await userEvent.click(screen.getByTitle(/clear override/i))

    await waitFor(() => {
      const del = fetchSpy.mock.calls.find(c => c[1]?.method === 'DELETE')
      expect(del).toBeTruthy()
      expect(String(del![0])).toContain('/game/albion/price-overrides/T4_BAG/Caerleon/2')
    })
  })

  it('does not PUT when the entered value is not a positive number', async () => {
    render(
      <PriceOverrideEditor
        itemId="T4_BAG" city="Caerleon" quality={2} current={null} isOverride={false} />,
    )
    await userEvent.click(screen.getByLabelText('Edit market price'))
    await userEvent.type(screen.getByLabelText('Manual price in silver'), '0')
    await userEvent.click(screen.getByTitle('Save'))
    expect(fetchSpy.mock.calls.some(c => c[1]?.method === 'PUT')).toBe(false)
  })
})
