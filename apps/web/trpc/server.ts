import type { ServerRouter } from "@repo/trpc/client";
import { createTRPCProxyClient } from "@repo/trpc/client";
import { cookies } from "next/headers";
import { createTRPCHttpBatchClientClient } from "~/trpc/create-client";

async function getCookieHeaders(): Promise<Record<string, string>> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
      .join("; ");
    return cookieHeader ? { Cookie: cookieHeader } : {};
  } catch {
    // cookies() throws outside of a request context (e.g. during static generation)
    return {};
  }
}

export const api = createTRPCProxyClient<ServerRouter>({
  links: [createTRPCHttpBatchClientClient({ headers: getCookieHeaders })],
});

export const apiStreaming = createTRPCProxyClient<ServerRouter>({
  links: [
    createTRPCHttpBatchClientClient({
      enableStreaming: true,
      headers: getCookieHeaders,
    }),
  ],
});
