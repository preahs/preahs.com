import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().optional().default(false),
    rawSource: z.boolean().optional().default(false),
    toc: z.boolean().optional().default(false),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().optional().default(false),
    rawSource: z.boolean().optional().default(false),
    toc: z.boolean().optional().default(false),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    lastVerified: z.date().optional(),
  }),
});

const recipes = defineCollection({
  loader: file('./src/content/recipes.yaml'),
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    made: z.date(),
    kind: z.enum(['main', 'soup', 'salad', 'drink', 'dessert']).default('main'),
    note: z.string().optional(),
  }),
});

export const collections = { blog, docs, recipes };
