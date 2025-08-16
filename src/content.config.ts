import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
    }),
});

const pages = defineCollection({
  // Load Markdown and MDX files in the `src/content/pages/` directory.
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      heroImage: image().optional(),
    }),
});

const resume = defineCollection({
  // Load Markdown files in the `src/content/resume/` directory.
  loader: glob({ base: "./src/content/resume", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: z.object({
    name: z.string(),
    title: z.string(),
    email: z.string(),
    location: z.string(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
  }),
});

export const collections = { blog, pages, resume };
