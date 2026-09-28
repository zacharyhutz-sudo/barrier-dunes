import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// GitHub Pages serves this repository from /barrier-dunes/.
// Cloudflare Pages and local development serve it from the domain root.
// GITHUB_ACTIONS is automatically set to "true" during the existing
// GitHub Pages deployment workflow, so no manual switch is required.
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: isGitHubPages
    ? 'https://zacharyhutz-sudo.github.io'
    : process.env.SITE_URL || undefined,
  base: isGitHubPages ? '/barrier-dunes' : '/',
  trailingSlash: 'always',
  integrations: [tailwind()],
});
