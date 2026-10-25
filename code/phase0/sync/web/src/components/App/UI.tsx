import ClipsSection from '@/components/ClipsSection'
import KeyForm from '@/components/KeyForm'
import MediaPanel from '@/components/MediaPanel'
import TableSection from '@/components/TableSection'
import Totals, { buildTotals } from '@/components/Totals'
import Button from '@/components/UI/Button'
import {
  BACKUP_TITLE,
  CHECKING_TEXT,
  DATABASE_TITLE,
  ERROR_CLASS,
  HEADER_CLASS,
  INTRO,
  INTRO_CLASS,
  LOADING_TEXT,
  LOCKED_TEXT,
  LOGOUT_LABEL,
  META_CLASS,
  MUTED_CLASS,
  PAGE_CLASS,
  PATH_CLASS,
  REFRESH_LABEL,
  REFRESH_NOTE,
  SECTION_TITLE_CLASS,
  TITLE,
  TITLE_CLASS,
} from './constants'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, overview, loadedAt, media, refreshTick, onConnect, onLogout, onRefresh, onOpen, onClose }: AppUIProps) => {
  const ready = status === 'ready'
  return (
    <div className={PAGE_CLASS}>
      <header className={HEADER_CLASS}>
        <h1 className={TITLE_CLASS}>{TITLE}</h1>
        {ready ? (
          <div className={META_CLASS}>
            <span>
              {loadedAt ? `mis à jour ${loadedAt} · ` : ''}
              {REFRESH_NOTE}
            </span>
            <Button onClick={onRefresh}>{REFRESH_LABEL}</Button>
            <Button onClick={onLogout}>{LOGOUT_LABEL}</Button>
          </div>
        ) : (
          <span className={META_CLASS}>{status === 'checking' ? CHECKING_TEXT : LOCKED_TEXT}</span>
        )}
      </header>
      <p className={INTRO_CLASS}>{INTRO}</p>
      {message ? <p className={ERROR_CLASS}>{message}</p> : null}

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}

      {ready && !overview ? <p className={MUTED_CLASS}>{LOADING_TEXT}</p> : null}
      {ready && overview ? (
        <>
          <Totals totals={buildTotals(overview)} />
          {media ? <MediaPanel media={media} onClose={onClose} /> : null}
          <h2 className={SECTION_TITLE_CLASS}>
            {DATABASE_TITLE}
            <span className={PATH_CLASS}>{overview.database.path}</span>
          </h2>
          {overview.database.tables.map((table) => (
            <TableSection key={table.name} table={table} refreshTick={refreshTick} onOpen={onOpen} />
          ))}
          <h2 className={SECTION_TITLE_CLASS}>
            {BACKUP_TITLE}
            <span className={PATH_CLASS}>{overview.backup.path}</span>
          </h2>
          <ClipsSection refreshTick={refreshTick} onOpen={onOpen} />
        </>
      ) : null}
    </div>
  )
}

export default AppUI
