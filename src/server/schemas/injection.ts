import { z } from "zod";

export const injectionTypeEnum = z.enum(["morning", "evening"]);

export const createInjectionSchema = z.object({
  userName: z.string().min(1, "User name is required"),
  injectionTime: z.string().datetime(),
  injectionType: injectionTypeEnum,
  notes: z.string().optional(),
});

export const getInjectionsSchema = z.object({
  date: z.string().optional().nullable(),
  userName: z.string().optional().nullable(),
});

export const todayStatusSchema = z.object({
  userName: z.string().optional().nullable(),
});

export type InjectionType = z.infer<typeof injectionTypeEnum>;
export type CreateInjectionInput = z.infer<typeof createInjectionSchema>;
export type GetInjectionsInput = z.infer<typeof getInjectionsSchema>;
