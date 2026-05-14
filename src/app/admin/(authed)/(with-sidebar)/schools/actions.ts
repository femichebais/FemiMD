"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import { schools } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

export interface SchoolFormState {
  error?: string;
  name?: string;
}

export async function createSchool(
  _prevState: SchoolFormState,
  formData: FormData
): Promise<SchoolFormState> {
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }
  if (name.length > 200) {
    return { name, error: "Name must be 200 characters or fewer." };
  }

  try {
    await db.insert(schools).values({ name });
  } catch (err) {
    console.error("[admin/schools/createSchool]", err);
    return { name, error: "Could not create school. Try again." };
  }

  revalidatePath("/admin/schools");
  revalidatePath("/admin");
  return {};
}

export interface DeleteSchoolState {
  error?: string;
}

export async function deleteSchool(
  _prevState: DeleteSchoolState,
  formData: FormData
): Promise<DeleteSchoolState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing school id." };

  try {
    await db
      .update(schools)
      .set({ deletedAt: new Date() })
      .where(and(eq(schools.id, id), isNull(schools.deletedAt)));
  } catch (err) {
    console.error("[admin/schools/deleteSchool]", err);
    return { error: "Could not delete school." };
  }

  revalidatePath("/admin/schools");
  revalidatePath("/admin");
  return {};
}
