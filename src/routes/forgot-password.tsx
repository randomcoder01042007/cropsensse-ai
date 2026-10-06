import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — CropSense AI" },
      { name: "description", content: "Request a password reset link for your CropSense AI account." },
      { property: "og:title", content: "Reset password — CropSense AI" },
      { property: "og:description", content: "Request a password reset link." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const { error } = await authService.forgot(email);
    if (error) setError(error.message); else setSent(true);
  }
  return (
    <div className="grid-paper flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border bg-card p-8">
        <Logo />
        <h1 className="mt-6 text-lg font-semibold">Forgot your password?</h1>
        {sent ? (
          <p className="mt-2 text-sm text-muted-foreground">If an account exists for that email, a reset link is on its way.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Send reset link</Button>
          </form>
        )}
        <Link to="/auth" search={{ mode: "login" }} className="mt-6 block text-sm text-primary hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
