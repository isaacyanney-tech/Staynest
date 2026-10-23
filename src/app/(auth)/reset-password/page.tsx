import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Choose a new password">You followed a reset link, so you can set a new password now.</AuthHeading>
      <ResetPasswordForm />
    </>
  );
}
