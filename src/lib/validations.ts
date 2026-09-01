import { z } from "zod";

const platformSchema = z.enum(["FACEBOOK", "INSTAGRAM", "YOUTUBE"]);

export const createPostSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),

    content: z.string().trim().min(1, "Content is required").max(10000),

    status: z.enum(["DRAFT", "SCHEDULED"]),

    scheduledAt: z.string().datetime().optional().nullable(),

    platforms: z.array(platformSchema).min(1, "Select at least one platform"),

    mediaUrls: z.array(z.string()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.status === "SCHEDULED" && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledAt"],
        message: "A schedule date/time is required when scheduling a post",
      });
    }

    if (data.status === "SCHEDULED" && data.scheduledAt) {
      const when = new Date(data.scheduledAt);

      if (when.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledAt"],
          message: "Scheduled time must be in the future",
        });
      }
    }
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;
