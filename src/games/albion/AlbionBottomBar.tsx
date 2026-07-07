import { BottomBar } from '../../components/BottomBar'

// Default bottom bar for the albion section (splash + any tool that doesn't override
// it). The Market Manager swaps in its own ticker bar via LayoutOverride. Empty on
// purpose — the shared BottomBar shell already renders the Forgehaven attribution.
export function AlbionBottomBar() {
  return <BottomBar />
}
