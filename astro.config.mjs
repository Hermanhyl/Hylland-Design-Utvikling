// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || 'https://hermanhylland.no',
	output: 'static',
	integrations: [react(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
