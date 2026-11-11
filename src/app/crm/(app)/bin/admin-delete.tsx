import { getCurrentUser } from "@/lib/supabase/server";
import { DeleteButton } from "./delete-button";
import type { Deletable } from "./rules";

/** Renders the Delete button only for the Super Admin. */
export async function AdminDelete({ table, id, what }: { table: Deletable; id: string; what: string }) {
  const user = await getCurrentUser();
  if (user?.role !== "super_admin") return null;
  return <DeleteButton table={table} id={id} what={what} />;
}
