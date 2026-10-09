import { AlertTriangle, Info, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AnalysisDiagnosis, DiagnosisCandidate } from "@/types";

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const candidates = (v: unknown): DiagnosisCandidate[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object" && "disease" in x) as DiagnosisCandidate[]) : [];
const pct = (c: number | null | undefined) => (c == null ? null : Math.round((c <= 1 ? c * 100 : c) * 10) / 10);

export function pickDiagnosis(v: unknown): AnalysisDiagnosis | null {
  if (Array.isArray(v)) return (v[0] as AnalysisDiagnosis) ?? null;
  return (v as AnalysisDiagnosis | null) ?? null;
}

function Conf({ value, small }: { value: number | null | undefined; small?: boolean }) {
  const p = pct(value);
  if (p == null) return null;
  return (
    <div className={small ? "flex items-center gap-2" : "space-y-1"}>
      {!small && <div className="flex justify-between text-xs text-muted-foreground"><span>Confidence</span><span className="font-mono">{p}%</span></div>}
      <Progress value={p} className={small ? "h-1.5 w-24" : "h-2"} />
      {small && <span className="font-mono text-xs text-muted-foreground">{p}%</span>}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="eyebrow mb-1.5">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

function Candidates({ title, items }: { title: string; items: DiagnosisCandidate[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="eyebrow mb-1.5">{title}</p>
      <ul className="divide-y rounded-md border">
        {items.map((c, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <span><span className="text-muted-foreground">{c.crop}</span> · {c.disease}</span>
            <Conf value={c.confidence} small />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notice({ tone, children }: { tone: "warning" | "neutral"; children: React.ReactNode }) {
  return (
    <div className={tone === "warning" ? "space-y-3 rounded-md border border-warning/40 bg-warning/10 p-4" : "space-y-3 rounded-md border bg-muted/40 p-4"}>
      {children}
    </div>
  );
}

export function DiagnosisView({ d, compact }: { d: AnalysisDiagnosis | null; compact?: boolean }) {
  if (!d) return <p className="text-sm text-muted-foreground">No disease diagnosis for this analysis</p>;
  const disclaimer = d.disclaimer ? <p className="text-xs text-muted-foreground">{d.disclaimer}</p> : null;

  if (d.status === "identified") {
    const body = (
      <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {d.crop && <p className="text-xs text-muted-foreground">{d.crop}</p>}
            <p className="text-lg font-semibold">{d.is_healthy ? "Healthy" : d.disease ?? "Unnamed result"}</p>
          </div>
          {d.is_healthy ? (
            <Badge className="border-transparent bg-success/15 text-success">Healthy</Badge>
          ) : (
            <Badge className="border-transparent bg-warning/20 text-warning-foreground">Disease detected</Badge>
          )}
        </div>
        <Conf value={d.confidence} />
      </>
    );
    if (compact) return <div className="space-y-3">{body}{disclaimer}</div>;
    return (
      <div className="space-y-5">
        {body}
        {d.cause && <div><p className="eyebrow mb-1.5">Cause</p><p className="text-sm">{d.cause}</p></div>}
        <Section title="Symptoms" items={list(d.symptoms)} />
        <Section title="Prevention" items={list(d.prevention)} />
        <Section title="Management" items={list(d.management)} />
        <Candidates title="Other possibilities" items={candidates(d.other_possibilities)} />
        {disclaimer}
      </div>
    );
  }

  if (d.status === "uncertain") {
    return (
      <div className="space-y-3">
        <Notice tone="warning">
          <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-warning" /> Result uncertain — no disease confirmed</p>
          {d.message && <p className="text-sm">{d.message}</p>}
          {!compact && <Candidates title="Possible matches" items={candidates(d.other_possibilities)} />}
        </Notice>
        {disclaimer}
      </div>
    );
  }

  if (d.status === "crop_mismatch") {
    const looks = d.looks_like as DiagnosisCandidate | null;
    return (
      <div className="space-y-3">
        <Notice tone="warning">
          <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-warning" /> Crop mismatch</p>
          {d.message && <p className="text-sm">{d.message}</p>}
          {looks?.crop && <p className="text-sm">Looks more like {looks.crop}</p>}
        </Notice>
        {disclaimer}
      </div>
    );
  }

  const fallback =
    d.status === "crop_not_supported" ? "This crop is not supported by the disease model." : d.status === "model_not_loaded" ? "The disease model is not loaded." : "The disease model could not process this image.";
  return (
    <div className="space-y-3">
      <Notice tone="neutral">
        <p className="flex items-center gap-2 text-sm font-medium"><Info className="h-4 w-4 text-muted-foreground" /> No diagnosis available</p>
        <p className="text-sm text-muted-foreground">{d.message ?? fallback}</p>
      </Notice>
      {disclaimer}
    </div>
  );
}

export const DiagnosisIcon = Stethoscope;
