const { z } = require('zod');

/**
 * Standard Normalized Job Schema across all scrapers & providers
 */
const StandardJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string(),
  url: z.string(),
  datePosted: z.string().nullable().optional().or(z.string()),
  postedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  publishedAt: z.string().nullable().optional(),
  dateRaw: z.string().nullable().optional(),
  dateStatus: z.enum(['parsed', 'inferred', 'unknown']).optional(),
  isFresh: z.boolean().optional(),
  postedAtLabel: z.string().optional(),
  logo: z.string(),
  source: z.string().min(1),
  experienceLevel: z.string(),
  remote: z.boolean(),
  isRemote: z.boolean(),
  tags: z.array(z.string()),
  descriptionSnippet: z.string(),
  salary: z.string(),
  fingerprint: z.string().min(1)
});

module.exports = {
  StandardJobSchema
};
