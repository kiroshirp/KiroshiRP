import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({site: process.env.SITE_URL || 'https://kiroshirp.pages.dev', base: process.env.BASE_PATH || '/', trailingSlash: 'always', integrations: [sitemap({filter: page=>!page.endsWith('/admin/')})], output: 'static'});
