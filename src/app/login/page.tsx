import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in · Tolerancing" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const { error, redirectTo } = await searchParams;
  const initialError =
    error === "auth_callback"
      ? "We couldn't confirm that link. Try signing in."
      : undefined;

  return <LoginForm initialError={initialError} redirectTo={redirectTo} />;
}
