import { db } from "@repo/database";
import { formsTable, fieldsTable } from "@repo/database/schema";
import { fieldSchema, type Field } from "@repo/database/validators/field";
import { eq, and, asc, sql } from "drizzle-orm";
import type { SelectForm, SelectField } from "@repo/database/schema";
import SlugService from "../slug/index";
import { z } from "zod";

export type FieldInput = Field;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateFormInput {
  creatorId: string;
  title: string;
  description?: string | null;
}

export interface ListMineInput {
  creatorId: string;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export interface UpdateFormInput {
  id: string;
  creatorId: string;
  title?: string;
  description?: string | null;
  fields?: FieldInput[];
  slug?: string;
}

export interface DeleteFormInput {
  id: string;
  creatorId: string;
}

export interface PublishFormInput {
  id: string;
  creatorId: string;
}

export interface UnpublishFormInput {
  id: string;
  creatorId: string;
}

export interface UpdateVisibilityInput {
  id: string;
  creatorId: string;
  visibility: "public" | "unlisted";
}

export interface GetPublicBySlugInput {
  slug: string;
}

/**
 * Public form shape — creator PII (`creatorId`, `passwordHash`) stripped.
 * `status` is omitted because the public read only succeeds for published forms.
 */
export interface PublicFormWithFields {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: "public" | "unlisted";
  confirmationMessage: string | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  maxResponses: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  fields: SelectField[];
}

export interface FormWithFields extends SelectForm {
  fields: SelectField[];
}

export interface ListMineResult {
  items: SelectForm[];
  page: number;
  pageSize: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const titleSchema = z.string().trim().min(1).max(200);

function makeError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// FormService
// ---------------------------------------------------------------------------

class FormService {
  private slugService = new SlugService();

  /**
   * Creates a new form with status="draft" and visibility="unlisted".
   * Auto-generates a unique slug from the title.
   * Rejects with `validation_error` if the title is empty or > 200 chars.
   */
  async create(input: CreateFormInput): Promise<SelectForm> {
    const titleResult = titleSchema.safeParse(input.title);
    if (!titleResult.success) {
      throw makeError("validation_error", "validation_error");
    }

    const slug = await this.slugService.generateFromTitle(titleResult.data);

    const [form] = await db
      .insert(formsTable)
      .values({
        creatorId: input.creatorId,
        slug,
        title: titleResult.data,
        description: input.description ?? null,
        status: "draft",
        visibility: "unlisted",
      })
      .returning();

    if (!form) {
      throw makeError("submission_failed", "Failed to create form");
    }

    return form;
  }

  /**
   * Returns a form by id with its fields ordered by display_order.
   * Returns null if not found.
   */
  async getById(id: string): Promise<FormWithFields | null> {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, id))
      .limit(1);

    if (!form) return null;

    const fields = await db
      .select()
      .from(fieldsTable)
      .where(eq(fieldsTable.formId, id))
      .orderBy(asc(fieldsTable.order));

    return { ...form, fields };
  }

  /**
   * Resolves a slug to a published form for public consumption.
   *
   * Security requirements (Req. 6.3, 6.4):
   * - If the slug does not map to any form → throws `form_not_found`
   * - If the slug maps to a form that is draft or unpublished → throws
   *   `form_not_found` (NOT `form_unavailable`) so the two cases are
   *   byte-equivalent to the caller and the slug's existence is not revealed.
   *
   * The returned object strips `creatorId` and `passwordHash` (Req. 6.2).
   */
  async getPublicBySlug(input: GetPublicBySlugInput): Promise<PublicFormWithFields> {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.slug, input.slug))
      .limit(1);

    // Both "not found" and "not published" cases throw the same error code so
    // callers cannot distinguish whether the slug exists (Req. 6.4).
    if (!form || form.status !== "published") {
      throw makeError("form_not_found", "form_not_found");
    }

    const fields = await db
      .select()
      .from(fieldsTable)
      .where(eq(fieldsTable.formId, form.id))
      .orderBy(asc(fieldsTable.order));

    // Strip creator PII: omit `creatorId` and `passwordHash` (Req. 6.2)
    const {
      creatorId: _creatorId,
      passwordHash: _passwordHash,
      status: _status,
      archived: _archived,
      ...publicFields
    } = form;

    return { ...publicFields, fields };
  }

  /**
   * Lists forms owned by the given creator, with pagination.
   * Excludes archived forms by default unless includeArchived is true.
   */
  async listMine(input: ListMineInput): Promise<ListMineResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(formsTable.creatorId, input.creatorId)];
    if (!input.includeArchived) {
      conditions.push(eq(formsTable.archived, false));
    }

    const whereClause = and(...conditions);

    const rows = await db
      .select()
      .from(formsTable)
      .where(whereClause)
      .orderBy(asc(formsTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formsTable)
      .where(whereClause);

    return {
      items: rows,
      page,
      pageSize,
      total: countResult?.count ?? 0,
    };
  }

  /**
   * Updates a form's title, description, and/or fields atomically.
   *
   * - Enforces ownership: throws `forbidden` if creatorId doesn't match.
   * - Validates title and all field configs BEFORE any DB write; throws
   *   `validation_error` without partial state on any violation.
   * - Saves form metadata + fields in a single Drizzle transaction.
   * - Preserves Creator-supplied field order (uses field.order as-is).
   * - When a payload contains both update fields and a `delete: true`
   *   instruction for the same form, treats as update only (Req. 3.7).
   */
  async update(input: UpdateFormInput): Promise<FormWithFields> {
    // Fetch the form to check ownership
    const [existing] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw makeError("form_not_found", "form_not_found");
    }

    if (existing.creatorId !== input.creatorId) {
      throw makeError("forbidden", "forbidden");
    }

    // Validate title if provided — do this BEFORE any DB writes
    let validatedTitle: string | undefined;
    if (input.title !== undefined) {
      const titleResult = titleSchema.safeParse(input.title);
      if (!titleResult.success) {
        throw makeError("validation_error", "validation_error");
      }
      validatedTitle = titleResult.data;
    }

    // Validate fields if provided — do this BEFORE any DB writes (atomic rejection)
    let validatedFields: FieldInput[] | undefined;
    if (input.fields !== undefined) {
      const fieldsResult = z.array(fieldSchema).safeParse(input.fields);
      if (!fieldsResult.success) {
        throw makeError("validation_error", "validation_error");
      }
      validatedFields = fieldsResult.data;
    }

    // Validate custom slug if provided — do this BEFORE any DB writes
    let validatedSlug: string | undefined;
    if (input.slug !== undefined && input.slug.trim() !== "") {
      validatedSlug = await this.slugService.validateCustomSlug(
        input.slug.trim(),
        input.id, // exclude current form so it can keep its own slug
      );
    }

    // Perform atomic update in a single transaction
    const result = await db.transaction(async (tx) => {
      // Build the update payload for the form row
      const updateValues: Partial<typeof formsTable.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (validatedTitle !== undefined) {
        updateValues.title = validatedTitle;
      }
      if (input.description !== undefined) {
        updateValues.description = input.description;
      }
      if (validatedSlug !== undefined) {
        updateValues.slug = validatedSlug;
      }

      const [updatedForm] = await tx
        .update(formsTable)
        .set(updateValues)
        .where(eq(formsTable.id, input.id))
        .returning();

      if (!updatedForm) {
        throw makeError("submission_failed", "Failed to update form");
      }

      // Replace fields atomically if provided
      let newFields: SelectField[] = [];
      if (validatedFields !== undefined) {
        // Delete all existing fields (FK cascade handles answers)
        await tx.delete(fieldsTable).where(eq(fieldsTable.formId, input.id));

        // Insert new fields preserving Creator-supplied order
        if (validatedFields.length > 0) {
          const insertValues = validatedFields.map((field) => ({
            formId: input.id,
            type: field.type,
            label: field.label,
            description: field.description ?? null,
            required: field.required ?? false,
            order: field.order,
            page: field.page ?? 0,
            showIf: field.showIf ?? null,
            config: field.config as Record<string, unknown>,
          }));

          newFields = await tx
            .insert(fieldsTable)
            .values(insertValues)
            .returning();

          // Sort by order to preserve Creator-supplied order in the return value
          newFields.sort((a, b) => a.order - b.order);
        }
      } else {
        // No field update — fetch existing fields ordered by display_order
        newFields = await tx
          .select()
          .from(fieldsTable)
          .where(eq(fieldsTable.formId, input.id))
          .orderBy(asc(fieldsTable.order));
      }

      return { ...updatedForm, fields: newFields };
    });

    return result;
  }

  /**
   * Deletes a form and all associated fields, responses, and answers
   * (cascaded via FK ON DELETE CASCADE in the schema).
   * Enforces ownership: throws `forbidden` if creatorId doesn't match.
   */
  async delete(input: DeleteFormInput): Promise<void> {
    const [existing] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw makeError("form_not_found", "form_not_found");
    }

    if (existing.creatorId !== input.creatorId) {
      throw makeError("forbidden", "forbidden");
    }

    await db.delete(formsTable).where(eq(formsTable.id, input.id));
  }

  /**
   * Publishes a form: sets status="published" and publishedAt=now.
   * Requires ownership and at least one field.
   * Throws `cannot_publish_empty_form` if the form has no fields.
   * Throws `forbidden` if creatorId doesn't match, `form_not_found` if missing.
   */
  async publish(input: PublishFormInput): Promise<SelectForm> {
    const [existing] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw makeError("form_not_found", "form_not_found");
    }

    if (existing.creatorId !== input.creatorId) {
      throw makeError("forbidden", "forbidden");
    }

    // Check that the form has at least one field
    const fields = await db
      .select({ id: fieldsTable.id })
      .from(fieldsTable)
      .where(eq(fieldsTable.formId, input.id))
      .limit(1);

    if (fields.length === 0) {
      throw makeError("cannot_publish_empty_form", "cannot_publish_empty_form");
    }

    const [updated] = await db
      .update(formsTable)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(formsTable.id, input.id))
      .returning();

    if (!updated) {
      throw makeError("submission_failed", "Failed to publish form");
    }

    return updated;
  }

  /**
   * Unpublishes a form: sets status="unpublished".
   * Enforces ownership: throws `forbidden` if creatorId doesn't match.
   */
  async unpublish(input: UnpublishFormInput): Promise<SelectForm> {
    const [existing] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw makeError("form_not_found", "form_not_found");
    }

    if (existing.creatorId !== input.creatorId) {
      throw makeError("forbidden", "forbidden");
    }

    const [updated] = await db
      .update(formsTable)
      .set({
        status: "unpublished",
        updatedAt: new Date(),
      })
      .where(eq(formsTable.id, input.id))
      .returning();

    if (!updated) {
      throw makeError("submission_failed", "Failed to unpublish form");
    }

    return updated;
  }

  /**
   * Updates a form's visibility independently of its status.
   * Accepts "public" or "unlisted".
   * Enforces ownership: throws `forbidden` if creatorId doesn't match.
   */
  async updateVisibility(input: UpdateVisibilityInput): Promise<SelectForm> {
    const [existing] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw makeError("form_not_found", "form_not_found");
    }

    if (existing.creatorId !== input.creatorId) {
      throw makeError("forbidden", "forbidden");
    }

    const [updated] = await db
      .update(formsTable)
      .set({
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(formsTable.id, input.id))
      .returning();

    if (!updated) {
      throw makeError("submission_failed", "Failed to update visibility");
    }

    return updated;
  }
}

export default FormService;
