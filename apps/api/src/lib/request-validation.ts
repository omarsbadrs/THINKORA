import { z, ZodSchema, ZodError } from 'zod';

export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[];
  public readonly statusCode = 400;

  constructor(error: ZodError) {
    const message = error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.issues = error.issues;
  }
}

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

export function validateParams<T>(schema: ZodSchema<T>, params: unknown): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

// Common reusable schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const idParamStringSchema = z.object({
  id: z.string().min(1),
});

export type Pagination = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
