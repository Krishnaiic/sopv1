import { redirect } from "next/navigation";
import { requireActor } from "@/lib/authz";
import { Role } from "@/generated/prisma/enums";
import { getManagedSopLibraryItemForViewer } from "@/services/sopLibraryService";
import { SopUploadPreviewClient } from "./preview-client";

const VIEW_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.DEPARTMENT_ADMIN, Role.SUPERVISOR];

export default async function SopUploadPreviewPage(props: { params: Promise<{ id: string }> }) {
  const auth = await requireActor(VIEW_ROLES);
  if (!auth.ok) redirect("/admin/login");

  const { id } = await props.params;
  const result = await getManagedSopLibraryItemForViewer(auth.actor, id);
  if (!result.ok) redirect("/admin/sop?tab=draft");

  return <SopUploadPreviewClient item={result.item} />;
}

