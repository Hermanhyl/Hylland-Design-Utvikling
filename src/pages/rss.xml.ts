import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	return rss({
		title: 'Hylland Design & Utvikling — Blogg',
		description: 'Artikler om frontend-utvikling, UX/UI-design og webutvikling.',
		site: context.site!.toString(),
		items: [],
	});
}
