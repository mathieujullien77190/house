import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './Button.en.md?raw'
import fr from './Button.fr.md?raw'
import variantsCode from './Variants.source.md?raw'

const meta: Meta<typeof Button> = {
  title: 'Base/Button',
  component: Button,
  parameters: prose({ fr, en }),
}

export default meta

export const Variants: StoryObj<typeof Button> = {
  parameters: source(variantsCode),
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button>Rafraîchir</Button>
      <Button variant="active">Maintenant</Button>
      <Button variant="danger">Oublier la clé</Button>
      <Button disabled>Plus tard</Button>
    </div>
  ),
}
