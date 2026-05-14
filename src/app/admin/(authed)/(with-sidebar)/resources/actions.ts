"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { resources, resourceLevels } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "femi-media";

export type ResourceType = "pdf" | "link" | "slides";
export type Level = "middle" | "high" | "undergrad";

export interface ResourceFormState {
  error?: string;
  // Echo on validation failure so the form preserves input.
  values?: {
    title: string;
    type: ResourceType;
    url: string;
    levels: Level[];
  };
}

function readBaseFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "") as ResourceType;
  const url = String(formData.get("url") ?? "").trim();
  const levels = formData.getAll("levels").map(String) as Level[];
  return { title, type, url, levels };
}

function validate(values: {
  title: string;
  type: ResourceType;
  url: string;
  levels: Level[];
  hasFile: boolean;
}): string | null {
  if (!values.title) return "Title is required.";
  if (values.type !== "pdf" && values.type !== "link" && values.type !== "slides")
    return "Choose a type.";
  if (values.levels.length === 0) return "Select at least one level.";
  for (const l of values.levels) {
    if (l !== "middle" && l !== "high" && l !== "undergrad")
      return `Invalid level: ${l}`;
  }
  if (values.type === "link") {
    if (!values.url) return "URL is required for link resources.";
    if (!/^https?:\/\//i.test(values.url))
      return "URL must start with http(s)://";
  } else {
    if (!values.hasFile)
      return `${values.type === "pdf" ? "PDF" : "Slides"} file is required.`;
  }
  return null;
}

// =============================================================================
// createResource — uploads any file FIRST (so the row's url is final by
// the time we insert), then inserts. If insert fails, removes the file.
// =============================================================================

export async function createResource(
  _prevState: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  await requireRole("admin");

  const base = readBaseFields(formData);
  const file = formData.get("file");
  const hasFile = file instanceof Blob && file.size > 0;

  const err = validate({ ...base, hasFile });
  if (err) return { error: err, values: base };

  let url = base.url;
  let storagePath: string | null = null;

  // File upload path for pdf/slides
  if (base.type !== "link" && hasFile && file instanceof Blob) {
    // 25MB ceiling — PDFs/slides can be large but not unlimited.
    if (file.size > 25 * 1024 * 1024) {
      return { error: "File must be 25MB or smaller.", values: base };
    }

    const filename = (formData.get("filename") as string | null) ?? "file";
    const ext =
      filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      (base.type === "pdf" ? "pdf" : "pptx");
    const safeTitle =
      base.title.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") ||
      "resource";
    const path = `resources/${safeTitle}/${Date.now()}.${ext}`;

    const admin = createSupabaseAdminClient();
    const { error: upErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      console.error("[admin/resources/createResource] upload failed:", upErr);
      return { error: `Upload failed: ${upErr.message}`, values: base };
    }

    storagePath = path;
    url = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(resources)
        .values({
          title: base.title,
          type: base.type,
          url,
          storagePath,
        })
        .returning({ id: resources.id });

      if (base.levels.length > 0) {
        await tx.insert(resourceLevels).values(
          base.levels.map((l) => ({ resourceId: inserted.id, level: l }))
        );
      }
    });
  } catch (e) {
    console.error("[admin/resources/createResource] DB insert failed:", e);
    // Roll back the uploaded file so we don't leak orphans.
    if (storagePath) {
      const admin = createSupabaseAdminClient();
      await admin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }
    return { error: "Could not save resource.", values: base };
  }

  revalidatePath("/admin/resources");
  return {}; // success — caller clears the form
}

// =============================================================================
// deleteResource — soft delete. Keeps the file in storage so any active
// student link doesn't break mid-session; storage cleanup is a separate
// concern (cron, manual sweep, etc).
// =============================================================================

export interface DeleteResourceState {
  error?: string;
}

export async function deleteResource(
  _prevState: DeleteResourceState,
  formData: FormData
): Promise<DeleteResourceState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id" };

  try {
    await db
      .update(resources)
      .set({ deletedAt: new Date() })
      .where(and(eq(resources.id, id), isNull(resources.deletedAt)));
  } catch (e) {
    console.error("[admin/resources/deleteResource]", e);
    return { error: "Could not delete." };
  }

  revalidatePath("/admin/resources");
  return {};
}
