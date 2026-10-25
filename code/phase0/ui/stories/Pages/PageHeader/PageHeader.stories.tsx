import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, Page, PageHeader } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './PageHeader.en.md?raw'
import fr from './PageHeader.fr.md?raw'
import connectedCode from './Connected.source.md?raw'
import errorCode from './Error.source.md?raw'

const meta: Meta<typeof PageHeader> = {
  title: 'Pages/PageHeader',
  component: PageHeader,
  parameters: prose({ fr, en }),
}

export default meta

export const Connected: StoryObj<typeof PageHeader> = {
  parameters: source(connectedCode),
  render: () => (
    <Page>
      <PageHeader
        title="House"
        status="1 caméra(s)"
        actions={
          <>
            <Button>Rafraîchir</Button>
            <Button>Oublier la clé</Button>
          </>
        }
      />
    </Page>
  ),
}

export const Error: StoryObj<typeof PageHeader> = {
  parameters: source(errorCode),
  render: () => (
    <Page>
      <PageHeader title="House Sync" status="clé refusée" tone="error" />
    </Page>
  ),
}
