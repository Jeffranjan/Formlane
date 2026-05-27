import { z } from "../../schema";
import { publicProcedure, router } from "../../trpc";
import { db } from "@repo/database";
import { formsTable } from "@repo/database/models/form";
import { eq, and, desc, count } from "@repo/database";

const TAGS = ["Explore"];

/** Default and maximum page sizes for the explore listing (Req. 13.4). */
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

/**
 * Public summary of a form shown on the Explore page.
 * Deliberately excludes creator PII (Req. 13.1, 13.2, 13.3).
 */
const publicFormSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  publishedAt: z.date().nullable(),
});

export type PublicFormSummary = z.infer<typeof publicFormSummarySchema>;

const exploreListOutputSchema = z.object({
  items: z.array(publicFormSummarySchema),
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const exploreRouter = router({
  /**
   * List all published public forms for the Explore page (Req. 5.7, 5.8, 13.1–13.5).
   *
   * Only forms with `status="published"` AND `visibility="public"` are returned.
   * Results are ordered by `publishedAt DESC`.
   */
  list: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/explore",
        tags: TAGS,
        summary: "List published public forms for the Explore page",
      },
    })
    .input(
      z.object({
        page: z.number().int().positive().optional().default(1),
        pageSize: z
          .number()
          .int()
          .positive()
          .max(MAX_PAGE_SIZE)
          .optional()
          .default(DEFAULT_PAGE_SIZE),
      }),
    )
    .output(exploreListOutputSchema)
    .query(async ({ input }) => {
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const where = and(
        eq(formsTable.status, "published"),
        eq(formsTable.visibility, "public"),
      );

      const [rows, countRows] = await Promise.all([
        db
          .select({
            id: formsTable.id,
            slug: formsTable.slug,
            title: formsTable.title,
            description: formsTable.description,
            createdAt: formsTable.createdAt,
            publishedAt: formsTable.publishedAt,
          })
          .from(formsTable)
          .where(where)
          .orderBy(desc(formsTable.publishedAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ value: count() })
          .from(formsTable)
          .where(where),
      ]);

      const total = countRows[0]?.value ?? 0;

      return {
        items: rows,
        page,
        total: Number(total),
      };
    }),
});
