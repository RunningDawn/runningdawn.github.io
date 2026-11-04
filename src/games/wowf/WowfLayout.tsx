import { Routes, Route } from 'react-router'
import { ForgeLayout } from '../../components/ForgeLayout'
import { NotFound } from '../../components/NotFound'
import { BottomBar } from '../../components/BottomBar'
import { WowfSplash } from './WowfSplash'
import { WowfSidebar } from './WowfSidebar'
import { CharacterRoster } from './CharacterRoster'
import { Loot } from './Loot'
import { LootEvent } from './LootEvent'
import { LootHistory } from './LootHistory'
import { Events } from './Events'
import { EventManage } from './EventManage'
import { SrAdmin } from './SrAdmin'
import { Raids } from './Raids'
import { GuildRoster } from './GuildRoster'
import { Availability } from './Availability'
import { AvailabilityViewer } from './AvailabilityViewer'
import { Register } from './Register'
import { AuditLog } from './AuditLog'

function WowfSettings() {
  return <p className="px-5 py-4 text-sm text-[#6b7280]">No settings yet.</p>
}

// WoW: Forever section. Mounted at /wow-forever/*; the splash sits at the index.
export default function WowfLayout() {
  return (
    <Routes>
      <Route element={
        <ForgeLayout
          homePath="/wow-forever"
          sidebar={WowfSidebar}
          settings={WowfSettings}
          bottomBar={BottomBar}
        />
      }>
        <Route index element={<WowfSplash />} />
        <Route path="roster" element={<CharacterRoster />} />
        <Route path="availability" element={<Availability />} />
        <Route path="register" element={<Register />} />
        <Route path="loot" element={<Loot />} />
        <Route path="loot/:eventId" element={<LootEvent />} />
        <Route path="loot-history" element={<LootHistory />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:eventId" element={<EventManage />} />
        <Route path="availability-viewer" element={<AvailabilityViewer />} />
        <Route path="sr-admin" element={<SrAdmin />} />
        <Route path="raids" element={<Raids />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="guild" element={<GuildRoster />} />
        <Route path="*" element={<NotFound backTo="/wow-forever" backLabel="Back to WoW: Forever" />} />
      </Route>
    </Routes>
  )
}
