"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { libraryPages, libraryPageLevels } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "femi-media";

export type Level = "middle" | "high" | "undergrad";

export interface LibraryFormState {
  error?: string;
  // Echoed back so the form preserves inputs on failure.
  values?: {
    title: string;
    eyebrow: string;
    dek: string;
    slug: string;
    bodyMarkdown: string;
    coverImageUrl: string;
    levels: Level[];
  };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readFormValues(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const eyebrow = String(formData.get("eyebrow") ?? "").trim();
  const dek = String(formData.get("dek") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");
  const coverImageUrl = String(formData.get("cover_image_url") ?? "").trim();
  const levels = formData.getAll("levels").map(String) as Level[];
  return { title, eyebrow, dek, slug, bodyMarkdown, coverImageUrl, levels };
}

function validate(values: ReturnType<typeof readFormValues>): string | null {
  if (!values.title) return "Title is required.";
  if (!values.slug) return "Slug is required.";
  if (!SLUG_RE.test(values.slug))
    return "Slug must be lowercase kebab-case (e.g. myocardial-infarction).";
  if (!values.bodyMarkdown.trim()) return "Body content is required.";
  if (values.levels.length === 0) return "Choose at least one level.";
  for (const l of values.levels) {
    if (l !== "middle" && l !== "high" && l !== "undergrad") {
      return `Invalid level: ${l}`;
    }
  }
  return null;
}

// =============================================================================
// createLibraryPage
// =============================================================================

export async function createLibraryPage(
  _prevState: LibraryFormState,
  formData: FormData
): Promise<LibraryFormState> {
  await requireRole("admin");
  const values = readFormValues(formData);
  const errorMsg = validate(values);
  if (errorMsg) return { error: errorMsg, values };

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(libraryPages)
        .values({
          title: values.title,
          eyebrow: values.eyebrow || null,
          dek: values.dek || null,
          diagnosisSlug: values.slug,
          bodyMarkdown: values.bodyMarkdown,
          coverImageUrl: values.coverImageUrl || null,
        })
        .returning({ id: libraryPages.id });

      const pageId = inserted.id;
      if (values.levels.length > 0) {
        await tx.insert(libraryPageLevels).values(
          values.levels.map((l) => ({ libraryPageId: pageId, level: l }))
        );
      }
    });
  } catch (err) {
    // Slug collision is the most common cause.
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = /unique|duplicate/i.test(msg)
      ? "That slug is already in use. Pick another."
      : "Could not save the page.";
    console.error("[admin/library/createLibraryPage]", err);
    return { error: friendly, values };
  }

  revalidatePath("/admin/library");
  redirect(`/admin/library/${values.slug}`);
}

// =============================================================================
// updateLibraryPage
// =============================================================================

export async function updateLibraryPage(
  pageId: string,
  _prevState: LibraryFormState,
  formData: FormData
): Promise<LibraryFormState> {
  await requireRole("admin");
  const values = readFormValues(formData);
  const errorMsg = validate(values);
  if (errorMsg) return { error: errorMsg, values };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(libraryPages)
        .set({
          title: values.title,
          eyebrow: values.eyebrow || null,
          dek: values.dek || null,
          diagnosisSlug: values.slug,
          bodyMarkdown: values.bodyMarkdown,
          coverImageUrl: values.coverImageUrl || null,
        })
        .where(
          and(eq(libraryPages.id, pageId), isNull(libraryPages.deletedAt))
        );

      // Replace level mappings with the new set — simplest "diff" since
      // levels is a small fixed set (3 options max).
      await tx
        .delete(libraryPageLevels)
        .where(eq(libraryPageLevels.libraryPageId, pageId));
      if (values.levels.length > 0) {
        await tx.insert(libraryPageLevels).values(
          values.levels.map((l) => ({ libraryPageId: pageId, level: l }))
        );
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = /unique|duplicate/i.test(msg)
      ? "That slug is already in use. Pick another."
      : "Could not save changes.";
    console.error("[admin/library/updateLibraryPage]", err);
    return { error: friendly, values };
  }

  revalidatePath("/admin/library");
  revalidatePath(`/admin/library/${values.slug}`);
  return { values };
}

// =============================================================================
// deleteLibraryPage
// =============================================================================

export interface DeleteLibraryState {
  error?: string;
}

export async function deleteLibraryPage(
  _prevState: DeleteLibraryState,
  formData: FormData
): Promise<DeleteLibraryState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };

  try {
    await db
      .update(libraryPages)
      .set({ deletedAt: new Date() })
      .where(and(eq(libraryPages.id, id), isNull(libraryPages.deletedAt)));
  } catch (err) {
    console.error("[admin/library/deleteLibraryPage]", err);
    return { error: "Could not delete." };
  }

  revalidatePath("/admin/library");
  redirect("/admin/library");
}

// =============================================================================
// uploadLibraryImage — Supabase Storage upload via service role
// =============================================================================
// Bucket layout (configure manually in Supabase):
//   - Bucket name: femi-media
//   - Public read; admin (service role) writes only
//   - File path: library/{slug-or-random}/cover-{timestamp}.{ext}

export interface UploadImageResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function uploadLibraryImage(
  formData: FormData
): Promise<UploadImageResult> {
  await requireRole("admin");

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return { ok: false, error: "No file provided." };
  }
  const filename = (formData.get("filename") as string | null) ?? "image";
  const slugHint = (formData.get("slug") as string | null) ?? "untitled";

  // Limit to 5MB to avoid runaway uploads.
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be 5MB or smaller." };
  }

  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const safeSlug = slugHint.toLowerCase().replace(/[^a-z0-9-]/g, "") || "untitled";
  const path = `library/${safeSlug}/${Date.now()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (upErr) {
    console.error("[admin/library/uploadLibraryImage]", upErr);
    return { ok: false, error: upErr.message };
  }

  const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
