import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
  /**
   * Optional headers to inject into every request.
   * Accepts a plain object or a function that returns one (called per-request).
   * Used by the RSC server client to forward the incoming `Cookie` header.
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;

  // Server-side (RSC) needs the full external URL so it can reach the API
  // directly. Client-side MUST use the relative "/trpc" path which Next.js
  // rewrites to the API — this keeps cookies on the same domain and avoids
  // cross-origin cookie issues (SameSite, third-party cookie blocking, etc.).
  const isServer = typeof window === "undefined";
  const url = isServer
    ? (process.env.API_URL ?? env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/trpc")
    : "/trpc";

  return c({
    url,
    headers: opts?.headers,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
