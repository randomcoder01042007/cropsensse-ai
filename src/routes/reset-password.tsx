import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — CropSense AI" },
      { name: "description", content: "Choose a new password for your CropSense AI account." },
      { property: "og:title", content: "Set a new password — CropSense AI" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = String(f.get("password") ?? "");
    if (p.length < 8) return setError("Password must be at least 8 characters.");
    if (p !== f.get("confirm")) return setError("Passwords do not match.");
    const { error } = await authService.updatePassword(p);
    if (error) return setError(error.message);
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="grid-paper flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border bg-card p-8">
        <Logo />
        <h1 className="mt-6 text-lg font-semibold">Set a new password</h1>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" required /></div>
          <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" required /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      </div>
    </div>
  );
}
