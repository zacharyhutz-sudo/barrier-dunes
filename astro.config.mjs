import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Root-path build for Cloudflare Pages/custom-domain hosting.
export default defineConfig({
  trailingSlash: 'always',
  integrations: [tailwind()],
});
