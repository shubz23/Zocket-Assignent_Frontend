"use client";

import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { AuthCheck } from "@/components/auth/auth-check";

export default function DashboardPage() {
  return (
    <AuthCheck>
      <UserDashboard />
    </AuthCheck>
  );
} 