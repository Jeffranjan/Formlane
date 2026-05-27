/**
 * Database seeder for Formlane demo data.
 *
 * Idempotent: safe to run multiple times. Checks for existing records by
 * email (user) and slug (forms) before inserting.
 *
 * Run with:
 *   pnpm --filter @repo/database seed
 */

import { hash, Algorithm } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { usersTable } from "./models/user";
import { formsTable } from "./models/form";
import { fieldsTable } from "./models/field";

// ---------------------------------------------------------------------------
// Argon2id config (mirrors packages/services/password-hasher/index.ts)
// ---------------------------------------------------------------------------
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// ---------------------------------------------------------------------------
// Demo data definitions
// ---------------------------------------------------------------------------

const DEMO_USER = {
  email: "demo@formlane.dev",
  fullName: "Demo User",
  password: "demo1234",
};

interface SeedField {
  type:
    | "short_text"
    | "long_text"
    | "email"
    | "number"
    | "single_select"
    | "multi_select"
    | "checkbox"
    | "dropdown"
    | "rating"
    | "date";
  label: string;
  description?: string;
  required: boolean;
  order: number;
  config: Record<string, unknown>;
}

interface SeedForm {
  slug: string;
  title: string;
  description: string;
  fields: SeedField[];
}

const DEMO_FORMS: SeedForm[] = [
  // -------------------------------------------------------------------------
  // 1. Developer Skills Survey
  // -------------------------------------------------------------------------
  {
    slug: "developer-skills-survey",
    title: "Developer Skills Survey",
    description:
      "Help us understand the skills and tools used by developers in our community.",
    fields: [
      {
        type: "short_text",
        label: "Your name",
        description: "First and last name",
        required: true,
        order: 0,
        config: { maxLength: 100 },
      },
      {
        type: "email",
        label: "Work email",
        required: true,
        order: 1,
        config: {},
      },
      {
        type: "single_select",
        label: "Years of experience",
        required: true,
        order: 2,
        config: {
          options: [
            { id: "exp-0", label: "Less than 1 year" },
            { id: "exp-1", label: "1–3 years" },
            { id: "exp-2", label: "3–5 years" },
            { id: "exp-3", label: "5–10 years" },
            { id: "exp-4", label: "More than 10 years" },
          ],
        },
      },
      {
        type: "multi_select",
        label: "Primary programming languages",
        description: "Select all that apply",
        required: true,
        order: 3,
        config: {
          options: [
            { id: "lang-ts", label: "TypeScript" },
            { id: "lang-js", label: "JavaScript" },
            { id: "lang-py", label: "Python" },
            { id: "lang-go", label: "Go" },
            { id: "lang-rs", label: "Rust" },
            { id: "lang-java", label: "Java" },
            { id: "lang-cs", label: "C#" },
          ],
        },
      },
      {
        type: "rating",
        label: "How would you rate your overall satisfaction with your current tech stack?",
        required: false,
        order: 4,
        config: { scaleMax: 10 },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Event Feedback Form
  // -------------------------------------------------------------------------
  {
    slug: "event-feedback-form",
    title: "Event Feedback Form",
    description:
      "We'd love to hear your thoughts on the event. Your feedback helps us improve future events.",
    fields: [
      {
        type: "dropdown",
        label: "Which session did you attend?",
        required: true,
        order: 0,
        config: {
          options: [
            { id: "sess-1", label: "Opening Keynote" },
            { id: "sess-2", label: "Workshop: Building with AI" },
            { id: "sess-3", label: "Panel: Future of Web Dev" },
            { id: "sess-4", label: "Closing Ceremony" },
          ],
        },
      },
      {
        type: "rating",
        label: "Overall event rating",
        description: "1 = Poor, 5 = Excellent",
        required: true,
        order: 1,
        config: { scaleMax: 5 },
      },
      {
        type: "long_text",
        label: "What did you enjoy most about the event?",
        required: false,
        order: 2,
        config: { maxLength: 2000 },
      },
      {
        type: "long_text",
        label: "What could we improve for next time?",
        required: false,
        order: 3,
        config: { maxLength: 2000 },
      },
      {
        type: "checkbox",
        label: "I would recommend this event to a colleague",
        required: false,
        order: 4,
        config: {},
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Product Feedback
  // -------------------------------------------------------------------------
  {
    slug: "product-feedback",
    title: "Product Feedback",
    description:
      "Share your experience with our product. Every response helps us build something better.",
    fields: [
      {
        type: "short_text",
        label: "Product or feature name",
        required: true,
        order: 0,
        config: { maxLength: 200 },
      },
      {
        type: "single_select",
        label: "How often do you use this product?",
        required: true,
        order: 1,
        config: {
          options: [
            { id: "freq-daily", label: "Daily" },
            { id: "freq-weekly", label: "Weekly" },
            { id: "freq-monthly", label: "Monthly" },
            { id: "freq-rarely", label: "Rarely" },
          ],
        },
      },
      {
        type: "rating",
        label: "How satisfied are you with the product?",
        description: "1 = Very dissatisfied, 10 = Very satisfied",
        required: true,
        order: 2,
        config: { scaleMax: 10 },
      },
      {
        type: "number",
        label: "How many team members use this product?",
        required: false,
        order: 3,
        config: { min: 1, max: 100000 },
      },
      {
        type: "long_text",
        label: "Describe a problem you encountered",
        description: "Please be as specific as possible",
        required: false,
        order: 4,
        config: { maxLength: 5000 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // ── 1. Demo user ──────────────────────────────────────────────────────────
  let userId: string;

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, DEMO_USER.email))
    .limit(1);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✓ Demo user already exists (id: ${userId})`);
  } else {
    const passwordHash = await hash(DEMO_USER.password, ARGON2_OPTIONS);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email: DEMO_USER.email,
        fullName: DEMO_USER.fullName,
        passwordHash,
        emailVerified: true,
      })
      .returning({ id: usersTable.id });

    if (!newUser) {
      throw new Error("Failed to insert demo user");
    }

    userId = newUser.id;
    console.log(`✓ Created demo user (id: ${userId})`);
  }

  // ── 2. Demo forms ─────────────────────────────────────────────────────────
  for (const formDef of DEMO_FORMS) {
    const [existingForm] = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(eq(formsTable.slug, formDef.slug))
      .limit(1);

    if (existingForm) {
      console.log(`✓ Form "${formDef.title}" already exists — skipping`);
      continue;
    }

    // Insert form
    const [newForm] = await db
      .insert(formsTable)
      .values({
        creatorId: userId,
        slug: formDef.slug,
        title: formDef.title,
        description: formDef.description,
        status: "published",
        visibility: "public",
        publishedAt: new Date(),
      })
      .returning({ id: formsTable.id });

    if (!newForm) {
      throw new Error(`Failed to insert form "${formDef.title}"`);
    }

    // Insert fields
    await db.insert(fieldsTable).values(
      formDef.fields.map((field) => ({
        formId: newForm.id,
        type: field.type,
        label: field.label,
        description: field.description ?? null,
        required: field.required,
        order: field.order,
        page: 0,
        showIf: null,
        config: field.config,
      })),
    );

    console.log(
      `✓ Created form "${formDef.title}" with ${formDef.fields.length} fields`,
    );
  }

  console.log("\n✅ Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
