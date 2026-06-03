import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    /** Must match one of the category ids defined in src/lib/blog.ts */
    category: z.string(),
    draft: z.boolean().optional().default(false),
    rawSource: z.boolean().optional().default(false),
  }),
});

export const collections = { blog };
