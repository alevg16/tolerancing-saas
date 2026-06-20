import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = { title: "New password · Tolerancing" };

export default async function UpdatePasswordPage() {
  // Reachable via the recovery link, which establishes a session in the callback.
  await requireUser();
  return <UpdatePasswordForm />;
}
