import type { Decorator } from '@storybook/react-vite'

/** Un cadre de la largeur d'une page des apps, pour les composants qui s'étalent. */
export const boxed: Decorator = (Story) => (
  <div className="mx-auto max-w-[1100px]">
    <Story />
  </div>
)
