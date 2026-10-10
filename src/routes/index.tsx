
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, BarChart3, Leaf, Sparkles, Bot, Cpu, Database, Eye, FileText, GitCompare, Layers, Map, ScanSearch, Server, Cloud, Upload, Workflow,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { CvOverlay, CvLegend, type OverlayRegion } from "@/components/cv/CvOverlay";
import heroImg from "@/assets/field-hero.jpg";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/app/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CropSense AI — Smarter Crop Monitoring with Computer Vision" },
      { name: "description", content: "CropSense AI combines OpenCV 5 computer vision and agentic analysis to identify visual crop stress and monitor field health." },
      { property: "og:title", content: "CropSense AI — Smarter Crop Monitoring with Computer Vision" },
      { property: "og:description", content: "OpenCV 5 computer vision plus an agent that decides when to look closer. Visual crop-health assessment for every field." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanSearch, emoji: "🔍", t: "See stress early", d: "OpenCV highlights suspicious patches on every leaf photo — with measured affected area, not guesses.", cta: "Start an analysis", to: "/analyze", a: "var(--neon-blue)", b: "var(--neon-cyan)" },
  { icon: Sparkles, emoji: "🧠", t: "Agent that looks closer", d: "When something looks off, the agent re-checks the region or asks for a better photo — every step logged.", cta: "See agent activity", to: "/dashboard", a: "var(--neon-violet)", b: "var(--neon-magenta)" },
  { icon: Leaf, emoji: "🌱", t: "Track every field", d: "Organise analyses by field and crop, and follow health over time — weekly reports included.", cta: "Open fields", to: "/fields", a: "var(--neon-green)", b: "var(--neon-cyan)" },
] as const;

const HERO_REGIONS: OverlayRegion[] = [
  { id: "R1", label: "R1", x: 0.53, y: 0.14, w: 0.22, h: 0.26, area_percent: 4.8, contour: [[0.56,0.18],[0.64,0.15],[0.73,0.19],[0.74,0.3],[0.68,0.38],[0.58,0.37],[0.54,0.27]] },
  { id: "R2", label: "R2", x: 0.52, y: 0.6, w: 0.13, h: 0.18, area_percent: 2.1, contour: [[0.54,0.63],[0.6,0.61],[0.64,0.66],[0.63,0.75],[0.56,0.77],[0.53,0.7]] },
  { id: "R3", label: "R3", x: 0.21, y: 0.5, w: 0.1, h: 0.22, area_percent: 1.6, contour: [[0.23,0.53],[0.28,0.51],[0.3,0.6],[0.29,0.7],[0.24,0.71],[0.22,0.62]] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#capabilities" className="hover:text-foreground">Capabilities</a>
            <a href="#agentic" className="hover:text-foreground">Agentic vision</a>
            <a href="#technology" className="hover:text-foreground">Technology</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth" search={{ mode: "login" }}>Sign in</Link></Button>
            <Button asChild size="sm" className="bg-electric btn-glow"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="grid-paper border-b">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="eyebrow">OpenCV 5 · Agentic analysis</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Smarter crop monitoring — <span className="text-rainbow">powered by computer vision</span></h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              CropSense AI combines OpenCV 5 computer vision and agentic analysis to help identify visual crop stress, monitor field health, and support earlier decisions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-electric btn-glow"><Link to="/analyze">Start Analysis <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/dashboard">Explore Dashboard</Link></Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Visual assessment only — CropSense AI does not diagnose specific diseases.</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section aria-labelledby="highlights" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-neon-violet/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-neon-cyan/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow">Why CropSense</p>
          <h2 id="highlights" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Three things it does well — <span className="text-rainbow">without guesswork</span></h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Link key={f.t} to={f.to} className="feature-card group block focus-visible:outline-none" style={{ ["--strip-a" as string]: f.a, ["--strip-b" as string]: f.b }}>
                <div className="flex items-start justify-between">
                  <span className="feature-icon"><f.icon className="h-5 w-5" /></span>
                  <span className="text-xl" aria-hidden>{f.emoji}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">{f.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">From photo to field decision in four steps</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-4">
          {[
            { icon: Upload, t: "Upload", d: "Drop a JPG, PNG, WEBP or MP4 captured in the field or by drone." },
            { icon: Eye, t: "OpenCV 5 Analysis", d: "Quality check, vegetation segmentation, contour detection and measurements." },
            { icon: Bot, t: "Agent Decision", d: "The agent reviews results and decides whether to look closer or request a new image." },
            { icon: BarChart3, t: "Assessment", d: "A visual crop-health assessment with regions, measurements and next steps." },
          ].map((s, i) => (
            <li key={s.t} className="bg-card p-6">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <s.icon className="mt-4 h-5 w-5 text-primary" />
              <h3 className="mt-3 font-medium">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="capabilities" className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow">Capabilities</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Built for agronomists, not demos</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ScanSearch, t: "Computer Vision", d: "Excess-green segmentation, HSV thresholds, contour extraction and sharpness metrics." },
              { icon: Map, t: "Field Monitoring", d: "Organise analyses by field and crop, with health status tracked over time." },
              { icon: Layers, t: "Visual Anomaly Detection", d: "Suspicious regions highlighted with bounding boxes, contours and affected-area %." },
              { icon: Workflow, t: "Agentic Analysis", d: "An agent loop that requests region re-analysis or human review when needed." },
              { icon: GitCompare, t: "Historical Comparison", d: "Compare each analysis with the field's previous result to spot change early." },
              { icon: FileText, t: "Reports", d: "Weekly and monthly field reports, ready for export." },
            ].map((c) => (
              <div key={c.t} className="rounded-md border bg-background p-5">
                <c.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-medium">{c.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AgenticSection />

      <section id="technology" className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow">Technology</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">A clean, service-oriented stack</h2>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {[
              { icon: Eye, t: "OpenCV 5", d: "Vision engine" },
              { icon: Cpu, t: "Python", d: "Processing" },
              { icon: Server, t: "FastAPI", d: "REST service" },
              { icon: Bot, t: "AI Agent", d: "Pluggable provider" },
              { icon: Database, t: "PostgreSQL", d: "Analysis store" },
              { icon: Cloud, t: "AWS", d: "Deploy target" },
            ].map((t) => (
              <div key={t.t} className="bg-background p-5">
                <t.icon className="h-5 w-5 text-muted-foreground" />
                <div className="mt-3 text-sm font-medium">{t.t}</div>
                <div className="text-xs text-muted-foreground">{t.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Start Monitoring Smarter</h2>
          <Button asChild size="lg" variant="secondary"><Link to="/auth" search={{ mode: "signup" }}>Create free account <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} CropSense AI</footer>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-md border bg-ink">
        <div className="flex items-center justify-between border-b border-ink-foreground/10 px-3 py-2 font-mono text-[11px] text-ink-foreground/70">
          <span>north-plot-a / IMG_0412.jpg</span>
          <span>illustration</span>
        </div>
        <div className="relative">
          <img src={heroImg} alt="Aerial maize field with computer-vision annotations" width={1600} height={1008} className="block h-auto w-full" />
          <CvOverlay regions={HERO_REGIONS} layer="processed" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"><div className="animate-scan h-px w-full bg-cv-scan/70" /></div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 hidden w-60 rounded-md border bg-card p-4 shadow-sm sm:block">
        <p className="eyebrow">Measurements</p>
        <dl className="mt-2 space-y-1.5 text-sm">
          {[["Vegetation coverage", "84.2%"], ["Suspicious regions", "3"], ["Affected area", "8.5%"], ["Image quality", "91"]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-mono">{v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="absolute -right-3 -top-5 hidden w-64 rounded-md border bg-card p-4 shadow-sm md:block">
        <p className="eyebrow">Agent decision</p>
        <p className="mt-1.5 font-mono text-xs text-primary">REQUEST_REGION_ANALYSIS</p>
        <p className="mt-1 text-xs text-muted-foreground">3 regions exceed the stress threshold. Re-analysing R1–R3 at full resolution.</p>
      </div>
      <div className="mt-10 sm:mt-12"><CvLegend /></div>
    </div>
  );
}

const FLOW = [
  { t: "Image", d: "A field photo arrives with crop and field context." },
  { t: "OpenCV analysis", d: "Vegetation is segmented and measured by the vision engine." },
  { t: "Suspicious region", d: "Contours with abnormal colour or texture are isolated." },
  { t: "Agent decision", d: "The agent can use computer-vision results to determine whether additional analysis is required." },
  { t: "Region analysis", d: "OpenCV re-runs focused analysis on the selected regions." },
  { t: "Final assessment", d: "A visual assessment and recommended next steps are produced." },
];

function AgenticSection() {
  const [i, setI] = useState(3);
  return (
    <section id="agentic" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <p className="eyebrow">Agentic vision</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight">Not image → fixed result. Perception → decision → action → new perception.</h2>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <ol className="relative space-y-1 border-l pl-6">
          {FLOW.map((f, idx) => (
            <li key={f.t}>
              <button
                onClick={() => setI(idx)}
                className={cn("relative w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors", idx === i ? "bg-accent font-medium" : "text-muted-foreground hover:bg-muted")}
              >
                <span className={cn("absolute -left-[31px] top-3.5 h-2.5 w-2.5 rounded-full border-2 bg-background", idx <= i ? "border-primary bg-primary" : "border-border")} />
                <span className="mr-2 font-mono text-xs">{String(idx + 1).padStart(2, "0")}</span>{f.t}
              </button>
            </li>
          ))}
        </ol>
        <div className="rounded-md border bg-card p-6">
          <p className="eyebrow">Step {i + 1} of {FLOW.length}</p>
          <h3 className="mt-2 text-lg font-semibold">{FLOW[i]?.t}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{FLOW[i]?.d}</p>
          <div className="mt-6 grid grid-cols-6 gap-1">
            {FLOW.map((_, idx) => <div key={idx} className={cn("h-1 rounded-full", idx <= i ? "bg-primary" : "bg-muted")} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
