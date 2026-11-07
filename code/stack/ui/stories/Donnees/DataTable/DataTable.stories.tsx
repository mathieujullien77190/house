import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, DataTable } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './DataTable.en.md?raw'
import fr from './DataTable.fr.md?raw'
import detailsCode from './Details.source.md?raw'
import eventsCode from './Events.source.md?raw'

const COLUMNS = ['id', 'camera', 'label', 'started_at', 'clip_path']
const PAGE_SIZE = 5

/** 12 lignes inventées, paginées par 5 : les cellules sont rendues par le parent. */
const ALL = Array.from({ length: 12 }, (_, i) => ({
  id: `179294${1000 + i}.5-abcd${i}`,
  camera: 'voliere-exterieur',
  label: 'person',
  started_at: 1792941000 + i * 600,
  clip_path: i % 4 === 1 ? null : `clips/voliere-exterieur/179294${1000 + i}.mp4`,
}))

const Events = () => {
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const rows = ALL.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  return (
    <DataTable
      collapsed={collapsed}
      onToggle={() => setCollapsed((value) => !value)}
      title="events"
      description="Les événements de l’enregistreur copiés ici : identifiant, caméra, étiquette, début et le chemin du clip."
      detail={`${ALL.length} ligne(s)`}
      columns={COLUMNS}
      rows={rows.map((row) => [
        row.id,
        <span key="camera" className="font-semibold text-accent">
          {row.camera}
        </span>,
        <span key="label" className="rounded-full bg-green/15 px-2 font-semibold text-green">
          {row.label}
        </span>,
        row.started_at,
        row.clip_path ? (
          <span key="clip" className="inline-flex items-center gap-2">
            {row.clip_path} <Button>voir</Button>
          </span>
        ) : (
          <i key="clip" className="text-muted">
            null
          </i>
        ),
      ])}
      keys={rows.map((row) => row.id)}
      page={page}
      size={PAGE_SIZE}
      total={ALL.length}
      onPage={setPage}
    />
  )
}

/** Les visites d'une page : les colonnes principales dans la ligne, le reste dans le détail qui s'ouvre au clic. */
const VISITS = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  ip: i % 2 === 0 ? '192.168.1.66' : '203.0.113.7',
  origin: i % 2 === 0 ? 'maison' : 'internet',
  device: i % 2 === 0 ? 'Chrome 130 · Windows' : 'Safari 17 · iOS',
  camera: 'voliere-interieur',
  duration: 12 + i,
}))

const Details = () => {
  const [openKey, setOpenKey] = useState<string | null>(null)
  return (
    <DataTable
      title="guest_visits"
      description="Un clic sur une ligne montre le reste."
      detail={`${VISITS.length} ligne(s)`}
      columns={['id', 'ip', 'origin']}
      rows={VISITS.map((visit) => [visit.id, visit.ip, visit.origin])}
      keys={VISITS.map((visit) => String(visit.id))}
      details={VISITS.map((visit) => (
        <span key={visit.id}>
          {visit.device} · {visit.camera} · {visit.duration} s
        </span>
      ))}
      openKey={openKey}
      onRowClick={(key) => setOpenKey((current) => (current === key ? null : key))}
      page={0}
      size={10}
      total={VISITS.length}
      onPage={() => undefined}
    />
  )
}

const meta: Meta<typeof DataTable> = {
  title: 'Données/DataTable',
  component: DataTable,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const EventsStory: StoryObj<typeof DataTable> = {
  name: 'Events',
  parameters: source(eventsCode),
  render: () => <Events />,
}

export const DetailsStory: StoryObj<typeof DataTable> = {
  name: 'Détails au clic',
  parameters: source(detailsCode),
  render: () => <Details />,
}
