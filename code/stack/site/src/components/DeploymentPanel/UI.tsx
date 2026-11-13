import RichText from '@/components/UI/RichText'
import { CELL_CLASS, HEADERS, HEAD_CELL_CLASS, LINK_CLASS, NAME_CLASS, REMINDER_CLASS, ROLE_CLASS, TABLE_CLASS } from './constants'
import type { DeploymentPanelUIProps } from './types'

const DeploymentPanelUI = ({ entries, reminders }: DeploymentPanelUIProps) => {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              {HEADERS.map((header) => (
                <th key={header} className={HEAD_CELL_CLASS}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className={CELL_CLASS}>
                  <div className={NAME_CLASS}>{entry.name}</div>
                  <div className={ROLE_CLASS}>{entry.role}</div>
                </td>
                <td className={CELL_CLASS}>
                  {entry.url ? (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                      {entry.url}
                    </a>
                  ) : (
                    <span className={ROLE_CLASS}>pas de page</span>
                  )}
                </td>
                <td className={CELL_CLASS}>{entry.account}</td>
                <td className={CELL_CLASS}>
                  <RichText text={entry.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={REMINDER_CLASS}>
        {reminders.map((reminder) => (
          <li key={reminder}>{reminder}</li>
        ))}
      </ul>
    </div>
  )
}

export default DeploymentPanelUI
