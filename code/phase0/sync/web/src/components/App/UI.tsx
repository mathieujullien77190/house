import { Button, Notice, Page, PageHeader, SectionTitle, Tabs, Totals } from '@house/ui'
import ClipsSection from '@/components/ClipsSection'
import KeyForm from '@/components/KeyForm'
import MediaPanel from '@/components/MediaPanel'
import TableSection from '@/components/TableSection'
import { buildTotals } from '@/lib/totals'
import {
  BACKUP_TITLE,
  CHECKING_TEXT,
  DATABASE_TITLE,
  INTRO,
  LOADING_TEXT,
  LOCKED_TEXT,
  LOGOUT_LABEL,
  REFRESH_LABEL,
  REFRESH_NOTE,
  TABS,
  TABS_CLASS,
  TABS_LABEL,
  TITLE,
} from './constants'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, overview, loadedAt, media, refreshTick, tab, onTab, onConnect, onLogout, onRefresh, onOpen, onClose }: AppUIProps) => {
  const ready = status === 'ready'
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : `${loadedAt ? `mis à jour ${loadedAt} · ` : ''}${REFRESH_NOTE}`
  return (
    <Page>
      <PageHeader
        title={TITLE}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        actions={
          ready ? (
            <>
              <Button onClick={onRefresh}>{REFRESH_LABEL}</Button>
              <Button onClick={onLogout}>{LOGOUT_LABEL}</Button>
            </>
          ) : null
        }
      />
      <Notice text={INTRO} />

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}
      {ready && !overview ? <Notice text={LOADING_TEXT} /> : null}

      {ready && overview ? (
        <>
          <div className={TABS_CLASS}>
            <Tabs label={TABS_LABEL} options={TABS} value={tab} onChange={onTab} />
          </div>
          <Totals totals={buildTotals(overview)} />
          {media ? <MediaPanel media={media} onClose={onClose} /> : null}
          {tab === 'db' ? (
            <>
              <SectionTitle text={DATABASE_TITLE} detail={overview.database.path} />
              {overview.database.tables.map((table) => (
                <TableSection key={table.name} table={table} refreshTick={refreshTick} onOpen={onOpen} />
              ))}
            </>
          ) : (
            <>
              <SectionTitle text={BACKUP_TITLE} detail={overview.backup.path} />
              <ClipsSection refreshTick={refreshTick} onOpen={onOpen} />
            </>
          )}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
