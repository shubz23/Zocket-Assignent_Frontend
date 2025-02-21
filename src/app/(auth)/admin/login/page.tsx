"use client";

import { AdminSignInForm } from "@/components/auth/admin-sign-in-form";
import { Tranquiluxe } from "uvcanvas";

export default function AdminLoginPage() {
  return (
    <div className="flex h-screen mt-[-4rem]">
      <div className="w-1/2 h-full backdrop-blur-sm">
        <Tranquiluxe />
      </div>
      <div className="w-1/2 flex items-center justify-center">
        <AdminSignInForm />
      </div>
    </div>
  );
} 