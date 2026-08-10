import { useState } from 'react'
import { MARKET_CATEGORIES } from './marketCategories'
import { useCategoryItems } from './ItemIndex/useCategoryItems'
import { ItemListPage } from './ItemIndex/ItemListPage'

// One dynamic page for every item-backed category (Ore, Fire Staff, Helm Cloth, …). Routes and
// sidebar links are generated from MARKET_CATEGORIES in AlbionLayout. Same table pipeline as
// the Item Index, but the item list comes from the by-category endpoint and the name filter is
// client-side over that already-loaded list.
export function CategoryPage({ slug }: { slug: string }) {
  const label = MARKET_CATEGORIES.find(c => c.slug === slug)?.label ?? slug
  const [filter, setFilter] = useState('')
  const { items, loading, error } = useCategoryItems(slug)

  return (
    <ItemListPage
      title={label}
      placeholder={`Filter ${label} items…`}
      query={filter}
      onQuery={setFilter}
      items={items}
      loading={loading}
      error={error}
      filterClientSide
      // Resources have no quality tiers - refining pages hide the quality filter.
      showQuality={!slug.startsWith('refining/')}
      emptyFiltered="No items match your filter."
      empty="No items in this category."
    />
  )
}
