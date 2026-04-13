import { notFound } from "next/navigation";
import { getPublicSopDetail } from "@/lib/public-departments";
import { requireViewerUser } from "@/lib/viewer-access";
import { SopPublicView } from "./sop-public-view";

type SopViewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SopViewPage({ params }: SopViewPageProps) {
  await requireViewerUser();

  const { id } = await params;
  const sop = await getPublicSopDetail(id);

  if (!sop) {
    notFound();
  }

  const departmentLabel = sop.subDepartmentName ? `${sop.departmentName} / ${sop.subDepartmentName}` : sop.departmentName;

  return (
    <SopPublicView
      documentId={sop.id}
      title={sop.title}
      versionLabel={sop.version}
      effectiveDate={sop.effectiveDate}
      departmentLabel={departmentLabel}
    />
  );
}
