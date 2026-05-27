import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Prevent apps/web from importing apps/api directly.
    // apps/web must only consume @repo/trpc (type-only) and never reach into
    // the API app's source, preserving the monorepo's type-only coupling
    // boundary (Requirements 19.1, 19.3).
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@repo/api", "../../../apps/api/**", "../../api/**", "../api/**"],
              message:
                "apps/web must not import from apps/api. Use @repo/trpc for shared types instead.",
            },
          ],
        },
      ],
    },
  },
];
