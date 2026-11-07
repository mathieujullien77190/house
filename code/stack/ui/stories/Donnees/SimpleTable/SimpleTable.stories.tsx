import type { Meta, StoryObj } from '@storybook/react-vite'
import { SimpleTable } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './SimpleTable.en.md?raw'
import fr from './SimpleTable.fr.md?raw'
import addressesCode from './Addresses.source.md?raw'

const COLUMNS = ['Adresse', 'Matériel', 'Port']
const ROWS = [
  ['192.168.1.254', 'Freebox (la box)', ''],
  ['192.168.1.139 (mini.local)', 'Mini PC ACEMAGIC K1', '22, 8080, 8081, 8090'],
  ['192.168.1.33', 'Switch TP-Link ES208GP', '80'],
  ['192.168.1.141', 'Caméra Reolink voliere-exterieur', '554'],
]

const meta: Meta<typeof SimpleTable> = {
  title: 'Données/SimpleTable',
  component: SimpleTable,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const AddressesStory: StoryObj<typeof SimpleTable> = {
  name: 'Adresses',
  parameters: source(addressesCode),
  render: () => <SimpleTable columns={COLUMNS} rows={ROWS} keys={ROWS.map((row) => row[0])} />,
}
