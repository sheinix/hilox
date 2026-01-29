import { z } from "zod";

const TONE_OPTIONS = ["professional", "casual", "urgent", "neutral"] as const;
const LENGTH_OPTIONS = ["7", "8", "9", "10"] as const;

/** Language names for thread output (model writes thread in this language). */
const THREAD_LANGUAGE_OPTIONS = ["English", "Spanish", "French", "German", "Portuguese", "Italian"] as const;

export const generateRequestSchema = z.object({
  url: z.string().url().optional(),
  pastedText: z.string().max(150_000).optional(),
  tone: z.enum(TONE_OPTIONS).default("professional"),
  length: z.enum(LENGTH_OPTIONS).default("8"),
  angle: z.string().max(500).optional(),
  threadLanguage: z.enum(THREAD_LANGUAGE_OPTIONS).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const extractResponseSchema = z.object({
  title: z.string(),
  siteName: z.string(),
  byline: z.string().optional(),
  text: z.string(),
  excerpt: z.string().optional(),
});

export type ExtractResponse = z.infer<typeof extractResponseSchema>;

export const threadOutlineItemSchema = z.object({
  topic: z.string(),
  bullets: z.array(z.string()),
});

export const threadOutlineSchema = z.object({
  tweets: z.array(threadOutlineItemSchema),
});

export type ThreadOutlineItem = z.infer<typeof threadOutlineItemSchema>;
export type ThreadOutline = z.infer<typeof threadOutlineSchema>;

export const generateResponseSchema = z.object({
  tweets: z.array(z.string().max(280)),
  meta: z.object({
    title: z.string(),
    siteName: z.string(),
    url: z.string().optional(),
    tone: z.string(),
    length: z.string(),
    createdAt: z.string(),
  }),
  sources: z.object({
    title: z.string(),
    url: z.string().optional(),
    siteName: z.string(),
  }),
  hookVariants: z.array(z.string()).optional(),
  debug: z
    .object({
      extractedCharCount: z.number().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export type GenerateResponse = z.infer<typeof generateResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export { TONE_OPTIONS, LENGTH_OPTIONS, THREAD_LANGUAGE_OPTIONS };
