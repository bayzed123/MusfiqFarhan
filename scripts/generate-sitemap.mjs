import { writeFile } from 'node:fs/promises';
const site = 'https://www.musfiqrfarhan.blog';
const api = 'https://mrf-api.gadget02030.workers.dev';
const escapeXml = value => String(value).replace(/[<>&'\"]/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[char]));
const base = [
  { loc: `${site}/`, lastmod: new Date().toISOString().slice(0, 10) },
  { loc: `${site}/about.html` },
  { loc: `${site}/contact.html` },
  { loc: `${site}/privacy-policy.html` },
  { loc: `${site}/editorial-standards.html` }
];
let dynamic = [];
try { const response = await fetch(`${api}/api/public/sitemap`); if (response.ok) dynamic = (await response.json()).urls || []; } catch { /* keep stable sitemap available */ }
const urls = [...new Map([...base, ...dynamic].map(item => [item.loc, item])).values()];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(item => `  <url><loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
await writeFile('sitemap.xml', xml);
console.log(`Generated ${urls.length} sitemap URLs.`);
