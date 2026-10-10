import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/authService";
import heroImg from "@/assets/field-hero.jpg";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" | "login" | undefined } => ({ mode: s["mode"] === "signup" ? "signup" : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — CropSense AI" },
      { name: "description", content: "Sign in or create a CropSense AI account to monitor your fields." },
      { property: "og:title", content: "Sign in — CropSense AI" },
      { property: "og:description", content: "Access your CropSense AI crop monitoring workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const signup = mode === "signup";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setInfo(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (signup) {
      const name = String(f.get("name") ?? "").trim();
      if (!name) return setError("Please enter your name.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== f.get("confirm")) return setError("Passwords do not match.");
      setBusy(true);
      const { data, error } = await authService.signUp(name, email, password);
      setBusy(false);
      if (error) return setError(error.message);
      if (data.session) navigate({ to: "/dashboard" });
      else setInfo("Check your inbox to confirm your email, then sign in.");
    } else {
      setBusy(true);
      const { error } = await authService.signIn(email, password);
      setBusy(false);
      if (error) return setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      navigate({ to: "/dashboard" });
    }
  }

  async function google() {
    const r = await authService.google();
    if (r.error) { toast.error("Google sign-in failed. Please try again."); return; }
    if (r.redirected) return;
    return navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/"><Logo /></Link>
          <h1 className="mt-10 text-2xl font-semibold tracking-tight">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{signup ? "Start monitoring your fields with computer vision." : "Sign in to your monitoring workspace."}</p>

          <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">Continue with Google</Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {signup && (
              <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required /></div>
            )}
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!signup && <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>}
              </div>
              <Input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required />
            </div>
            {signup ? (
              <div className="space-y-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox defaultChecked name="remember" /> Remember session</label>
            )}
            {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
            {info && <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm">{info}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Login"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {signup ? "Already have an account? " : "New to CropSense AI? "}
            <Link to="/auth" search={{ mode: signup ? "login" : "signup" }} className="font-medium text-primary hover:underline">
              {signup ? "Sign in" : "Create account"}
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src={heroImg} alt="Aerial view of a maize field" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute bottom-8 left-8 right-8 rounded-md border border-ink-foreground/20 bg-ink/80 p-5 text-ink-foreground">
          <p className="eyebrow text-ink-foreground/60">Perception → decision → action</p>
          <p className="mt-2 text-sm leading-relaxed">OpenCV 5 measures the field. The agent decides what to look at next. You get a visual assessment you can act on.</p>
        </div>
      </div>
    </div>
  );
}
