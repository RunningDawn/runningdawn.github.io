import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuth } from '../../../../auth/authContext'
import { useLayoutOverride } from '../../../../components/LayoutOverride'
import { DEFAULT_QUALITY, CITIES } from '../../constants'
import { loadDefaultCity } from '../premium'
import { MarketManagerSidebar } from '../MarketManagerSidebar'
import { MarketManagerBottomBar } from '../MarketManagerBottomBar'
import { ItemDetailPanel } from './ItemDetailPanel'

// Shareable per-item dashboard: /albion/market-manager/item/:itemId?quality=&city=.
// Variant switches rewrite the URL so every tier/enchant/quality view is linkable.
export function ItemDetailPage() {
  const { itemId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()

  const quality = Number(params.get('quality')) || DEFAULT_QUALITY
  const city = params.get('city') || loadDefaultCity()

  useEffect(() => {
    if (isAuthenticated) {
      setSidebar(MarketManagerSidebar)
      setBottomBar(MarketManagerBottomBar)
    } else {
      setSidebar(null)
      setBottomBar(null)
    }
    return () => { setSidebar(null); setBottomBar(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

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
          <select
            value={city}
            onChange={e => setParam('city', e.target.value)}
            className="bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-[#e2e4ed] focus:outline-none focus:border-[#c4af64] cursor-pointer"
          >
            {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
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
