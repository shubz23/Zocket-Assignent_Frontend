"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode, useEffect } from "react";
import { User } from "@/lib/types";

interface AuthCheckProps {
  children: ReactNode;
}

export function AuthCheck({ children }: AuthCheckProps) {
  const router = useRouter();
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
  const currentUser = useQuery(api.users.getCurrentUser, { email: userEmail });

  useEffect(() => {
    if (!userEmail || currentUser === null) {
      router.push("/sign-in");
    }
  }, [userEmail, currentUser, router]);

  if (!userEmail || currentUser === undefined) {
    return <div>Loading...</div>;
  }

  if (currentUser === null) {
    return null;
  }

  return <>{children}</>;
} 