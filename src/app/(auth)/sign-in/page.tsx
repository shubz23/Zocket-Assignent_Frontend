"use client";

import { SignInForm } from "@/components/auth/sign-in-form";
import { Tranquiluxe } from "uvcanvas";

export default function SignInPage() {
  return (
    <div className="flex h-screen mt-[-4rem]">
      <div className="w-1/2 h-full">
      <Tranquiluxe />
      </div>
      <div className="w-1/2 flex items-center justify-center">
        <SignInForm />
      </div>
    </div>
  );
} 