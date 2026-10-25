import type { StorybookConfig } from '@storybook/react-vite'

// Une story = un dossier dans stories/, avec sa prose (.en.md, .fr.md) et son snippet (.source.md).
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
}

export default config
