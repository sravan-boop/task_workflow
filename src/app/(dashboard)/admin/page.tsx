"use client";

import dynamic from "next/dynamic";

const AdminContent = dynamic(
  () =>
    import("@/components/admin/admin-content").then((m) => m.AdminContent),
  { ssr: false }
);

export default function AdminPage() {
  return <AdminContent />;
}
