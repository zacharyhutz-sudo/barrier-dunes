import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://zacharyhutz-sudo.github.io',
  base: '/barrier-dunes',
  integrations: [tailwind()],
});
