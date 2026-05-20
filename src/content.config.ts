import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
	type: 'content',
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			client: z.string(),
			date: z.date(),
			summary: z.string(),
			tags: z.array(z.string()),
			image: image().optional(),
		}),
});

const posts = defineCollection({
	type: 'content',
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.date(),
			updatedDate: z.date().optional(),
			tags: z.array(z.string()).default([]),
			image: image().optional(),
			draft: z.boolean().default(false),
		}),
});

export const collections = { 'case-studies': caseStudies, posts };
