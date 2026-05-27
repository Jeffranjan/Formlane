import { z } from "../../schema";
import { publicProcedure, router } from "../../trpc";

export const healthRouter = router({
  getHealth: publicProcedure
    .meta({ openapi: { method: "GET", path: "/health" } })
    .input(z.undefined())
    .output(z.object({ status: z.literal("healthy") }))
    .query(async () => {
      return { status: "healthy" };
    }),
});
