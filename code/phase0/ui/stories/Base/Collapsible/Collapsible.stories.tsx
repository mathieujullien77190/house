import type { Meta, StoryObj } from '@storybook/react-vite'
import { Collapsible, SpecList } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Collapsible.en.md?raw'
import fr from './Collapsible.fr.md?raw'
import configCode from './Config.source.md?raw'

const meta: Meta<typeof Collapsible> = {
  title: 'Base/Collapsible',
  component: Collapsible,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Config: StoryObj<typeof Collapsible> = {
  parameters: source(configCode),
  args: {
    title: 'Configuration globale',
    detail: 'docker',
    defaultOpen: true,
    children: (
      <SpecList
        items={[
          { id: 'version', label: 'Version', value: '29.9.2' },
          { id: 'storage', label: 'Stockage', value: 'overlayfs · /var/lib/docker' },
        ]}
      />
    ),
  },
}
