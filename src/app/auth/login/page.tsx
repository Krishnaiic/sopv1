import { Suspense } from "react";
import { UserLoginClient } from "./login-client";

export default function UserLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)] text-sm text-slate-600">
          Loading…
        </div>
      }
    >
      <UserLoginClient />
    </Suspense>
  );
}
