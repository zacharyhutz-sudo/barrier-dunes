import { pages, publicOrigin } from '../lib/seo';

export function GET() {
  const entries = Object.values(pages).map(({ path }) =>
    `  <url><loc>${publicOrigin}${path}</loc></url>`
  );
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
