import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '../../../../auth/authContext'
import { useLayoutOverride } from '../../../../components/LayoutOverride'
import { DEFAULT_QUALITY, CITIES } from '../../constants'
import { loadDefaultCity } from '../premium'
import { MarketManagerSidebar } from '../MarketManagerSidebar'
import { MarketManagerBottomBar } from '../MarketManagerBottomBar'
import { ItemDetailPanel } from './ItemDetailPanel'

// Two item variants side by side (e.g. a T5.3 vs a T6.2) sharing one city. Desktop only - the
// panels are too wide to stack usefully on mobile.
export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { setSidebar, setBottomBar } = useLayoutOverride()

  const a = params.get('a') ?? ''
  const b = params.get('b') ?? a
  const qa = Number(params.get('qa')) || DEFAULT_QUALITY
  const qb = Number(params.get('qb')) || DEFAULT_QUALITY
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
    <div className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-semibold text-[#e2e4ed] tracking-wide">
          Albion Online <span className="text-[#c4af64]">Compare</span>
        </h1>
        <select
          value={city}
          onChange={e => setParam('city', e.target.value)}
          className="bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-[#e2e4ed] focus:outline-none focus:border-[#c4af64] cursor-pointer"
        >
          {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <p className="lg:hidden text-sm text-[#6b7280] text-center py-16">
        Compare needs a wider screen - open this page on desktop.
      </p>

      <div className="hidden lg:grid grid-cols-2 gap-6">
        <ItemDetailPanel
          itemId={a}
          quality={qa}
          city={city}
          onItemId={id => setParam('a', id)}
          onQuality={q => setParam('qa', String(q))}
        />
        <ItemDetailPanel
          itemId={b}
          quality={qb}
          city={city}
          onItemId={id => setParam('b', id)}
          onQuality={q => setParam('qb', String(q))}
        />
      </div>
    </div>
  )
}
