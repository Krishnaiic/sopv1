import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <NotificationsClient />
    </div>
  );
}
