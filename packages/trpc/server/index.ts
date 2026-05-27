import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { formsRouter } from "./routes/forms/route";
import { analyticsRouter } from "./routes/analytics/route";
import { responsesRouter } from "./routes/responses/route";
import { exploreRouter } from "./routes/explore/route";
import { submissionsRouter } from "./routes/submissions/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  forms: formsRouter,
  analytics: analyticsRouter,
  responses: responsesRouter,
  explore: exploreRouter,
  submissions: submissionsRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
