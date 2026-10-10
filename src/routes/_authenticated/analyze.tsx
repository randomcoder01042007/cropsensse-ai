import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FlaskConical, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel } from "@/components/app/states";
import { createAnalysis, validateUpload } from "@/services/analysisService";
import { fieldService } from "@/services/fieldService";
import { getSystemHealth } from "@/lib/system.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analyze")({
  head: () => ({ meta: [{ title: "New Crop Analysis — CropSense AI" }, { name: "description", content: "Upload a crop image or video for computer-vision analysis." }] }),
  component: Analyze,
});

const CROPS = ["Maize", "Soybean", "Wheat", "Rice", "Cotton", "Tomato", "Potato", "Sugarcane", "Other"];

function Analyze() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fields = useQuery({ queryKey: ["fields"], queryFn: fieldService.list });
  const health = useQuery({ queryKey: ["health"], queryFn: () => getSystemHealth(), staleTime: 60000 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [fieldId, setFieldId] = useState<string>("none");
  const [crop, setCrop] = useState("Maize");
  const [mode, setMode] = useState<"standard" | "detailed">("standard");
  const [notes, setNotes] = useState("");
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const visionAvailable = health.data?.visionAvailable ?? false;

  useEffect(() => { if (health.data) setDemo(!health.data.visionAvailable); }, [health.data]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined | null) {
    const err = validateUpload(f);
    setError(err);
    if (err || !f) { setFile(null); setPreview(null); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function start() {
    const err = validateUpload(file);
    if (err) return setError(err);
    setBusy(true);
    try {
      const a = await createAnalysis({ file: file!, fieldId: fieldId === "none" ? null : fieldId, cropType: crop, mode, notes, demo });
      qc.invalidateQueries({ queryKey: ["analyses"] });
      navigate({ to: "/analyses/$id", params: { id: a.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the analysis.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Analyze" title="New Crop Analysis" description="Upload a field image or short video. It is stored privately in your workspace." />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Upload">
          <p className="mb-3 rounded-md border bg-accent px-3 py-2 text-xs text-accent-foreground">For best disease detection: one leaf filling the frame, in focus, in daylight, plain background.</p>
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
              className={cn("grid-paper flex aspect-[4/3] flex-col items-center justify-center rounded-md border-2 border-dashed text-center transition-colors", drag ? "border-primary bg-accent" : "border-border")}
            >
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Drag and drop an image or video</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP up to 15 MB · MP4 up to 50 MB</p>
              <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>Choose File</Button>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-md border bg-ink">
              {file.type.startsWith("video/") ? <video src={preview!} controls className="aspect-[4/3] w-full object-contain" /> : <img src={preview!} alt="Selected upload preview" className="aspect-[4/3] w-full object-contain" />}
              <button onClick={() => pick(null)} className="absolute right-2 top-2 rounded-md bg-card p-1.5" aria-label="Remove file"><X className="h-4 w-4" /></button>
              <div className="border-t border-ink-foreground/10 px-3 py-2 font-mono text-xs text-ink-foreground/80">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Upload file" />
          {error && <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        </Panel>

        <Panel title="Analysis details">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Select value={fieldId} onValueChange={setFieldId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No field</SelectItem>
                  {fields.data?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {fields.data?.length === 0 && <p className="text-xs text-muted-foreground"><Link to="/fields" className="text-primary hover:underline">Add a field</Link> to track health over time.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Crop type</Label>
              <Select value={crop} onValueChange={setCrop}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{c === "Other" ? "Other / not sure (no crop filter)" : c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Analysis mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["standard", "detailed"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-md border p-3 text-left text-sm", mode === m ? "border-primary bg-accent" : "hover:bg-muted")}>
                    <div className="font-medium capitalize">{m}</div>
                    <div className="text-xs text-muted-foreground">{m === "standard" ? "Segmentation + regions" : "Adds finer region search"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Weather, growth stage, anything notable…" rows={3} /></div>
            <div className="rounded-md border border-dashed p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="demo" className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-warning" /> Demo mode</Label>
                <Switch id="demo" checked={demo} onCheckedChange={setDemo} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {demo
                  ? "Uses the mock vision adapter. Results are labelled Demo and are not real OpenCV output. Disease diagnosis needs the real backend."
                  : visionAvailable
                    ? "Sends the image to the connected OpenCV 5 vision engine."
                    : "The vision engine is not connected — the image will upload but processing will report unavailable."}
              </p>
            </div>
            <Input type="hidden" />
            <Button className="w-full" size="lg" onClick={start} disabled={busy || !file}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : "Start Analysis"}
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
