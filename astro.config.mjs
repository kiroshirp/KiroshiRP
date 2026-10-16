import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({site: process.env.SITE_URL || 'https://kiroshirp.github.io', base: process.env.BASE_PATH || '/KiroshiRP', trailingSlash: 'always', integrations: [sitemap()], output: 'static'});
