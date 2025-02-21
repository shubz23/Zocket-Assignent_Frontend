"use client";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Tranquiluxe } from "uvcanvas";

export default function SignUpPage() {
  return (
    <div className="flex h-screen mt-[-4rem]">
      <div className="w-1/2 h-full">
      <Tranquiluxe />
      </div>
      <div className="w-1/2 flex items-center justify-center">
        <SignUpForm />
      </div>
    </div>
  );
} 