import { useState } from 'react'
import { useItemSearch } from './useItemSearch'
import { ItemListPage } from './ItemListPage'

export function ItemIndexPage() {
  const [query, setQuery] = useState('')
  const { items, loading, error } = useItemSearch(query)

  return (
    <ItemListPage
      title="Item Index"
      placeholder="Search items by name…"
      query={query}
      onQuery={setQuery}
      items={items}
      loading={loading}
      error={error}
      emptyFiltered="No items match your search."
      empty="No items found."
    />
  )
}
