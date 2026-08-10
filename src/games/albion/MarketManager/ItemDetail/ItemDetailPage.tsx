import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { NativeSelect } from '../../../../components/NativeSelect'
import { DEFAULT_QUALITY, CITIES } from '../../constants'
import { loadDefaultCity } from '../premium'
import { useMarketManagerChrome } from '../useMarketManagerChrome'
import { ItemDetailPanel } from './ItemDetailPanel'

// Shareable per-item dashboard: /albion/market-manager/item/:itemId?quality=&city=.
// Variant switches rewrite the URL so every tier/enchant/quality view is linkable.
export function ItemDetailPage() {
  const { itemId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  useMarketManagerChrome()

  const quality = Number(params.get('quality')) || DEFAULT_QUALITY
  const city = params.get('city') || loadDefaultCity()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-semibold text-[#e2e4ed] tracking-wide">
          Albion Online <span className="text-[#c4af64]">Item Detail</span>
        </h1>
        <div className="flex items-center gap-2">
          <NativeSelect value={city} onChange={e => setParam('city', e.target.value)}>
            {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </NativeSelect>
          <Link
            to={`/albion/market-manager/compare?a=${encodeURIComponent(itemId)}&qa=${quality}&b=${encodeURIComponent(itemId)}&qb=${quality}&city=${encodeURIComponent(city)}`}
            className="hidden lg:inline-block px-3 py-1.5 rounded text-xs font-medium bg-[#1a1d27] text-[#9ca3af] border border-[#2a2d3a] hover:text-[#e2e4ed] hover:bg-[#2a2d3a] transition-colors"
          >
            Compare
          </Link>
        </div>
      </div>

      <ItemDetailPanel
        itemId={itemId}
        quality={quality}
        city={city}
        onItemId={id => navigate(`/albion/market-manager/item/${encodeURIComponent(id)}?quality=${quality}&city=${encodeURIComponent(city)}`, { replace: true })}
        onQuality={q => setParam('quality', String(q))}
      />
    </div>
  )
}
