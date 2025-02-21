"use client";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminRoleCheck } from "@/components/auth/admin-role-check";

export default function AdminPage() {
  return (
    <AdminRoleCheck>
      <AdminDashboard />
    </AdminRoleCheck>
  );
} 