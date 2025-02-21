"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode, useEffect } from "react";
import { User } from "@/lib/types";

interface AdminRoleCheckProps {
  children: ReactNode;
}

export function AdminRoleCheck({ children }: AdminRoleCheckProps) {
  const router = useRouter();
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
  const currentUser = useQuery(api.users.getCurrentUser, { email: userEmail });

  useEffect(() => {
    if (!userEmail || currentUser === null || 
      (currentUser && currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
      router.push("/dashboard");
    }
  }, [userEmail, currentUser, router]);

  if (!userEmail || currentUser === undefined) {
    return <div>Loading...</div>;
  }

  if (currentUser === null || 
    (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
    return null;
  }

  return <>{children}</>;
} 