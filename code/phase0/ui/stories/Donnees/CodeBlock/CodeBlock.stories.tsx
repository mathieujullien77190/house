import type { Meta, StoryObj } from '@storybook/react-vite'
import { CodeBlock } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './CodeBlock.en.md?raw'
import fr from './CodeBlock.fr.md?raw'
import composeCode from './Compose.source.md?raw'

const meta: Meta<typeof CodeBlock> = {
  title: 'Données/CodeBlock',
  component: CodeBlock,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Compose: StoryObj<typeof CodeBlock> = {
  parameters: source(composeCode),
  args: {
    label: 'docker-compose.yml',
    code: 'services:\n  go2rtc:\n    image: alexxit/go2rtc:latest\n    restart: unless-stopped\n    networks:\n      - sync_net\n',
  },
}
