import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState, ErrorState, TableSkeleton } from "@/components/app/states";
import { HealthBadge, SourceBadge } from "@/components/app/badges";
import { fieldService, createDemoFields } from "@/services/fieldService";
import type { Field } from "@/types";

export const Route = createFileRoute("/_authenticated/fields/")({
  head: () => ({ meta: [{ title: "Fields — CropSense AI" }, { name: "description", content: "Manage your monitored agricultural fields." }] }),
  component: FieldsPage,
});

export function FieldDialog({ open, onOpenChange, field }: { open: boolean; onOpenChange: (o: boolean) => void; field?: Field | null }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    if (!name) return setErr("Name is required.");
    const area = f.get("area") ? Number(f.get("area")) : null;
    if (area != null && (isNaN(area) || area < 0)) return setErr("Area must be a positive number.");
    const input = { name, location: String(f.get("location") || "") || null, primary_crop: String(f.get("crop") || "") || null, area_hectares: area };
    try {
      if (field) await fieldService.update(field.id, input); else await fieldService.create(input);
      qc.invalidateQueries({ queryKey: ["fields"] });
      qc.invalidateQueries({ queryKey: ["field", field?.id] });
      toast.success(field ? "Field updated" : "Field added");
      onOpenChange(false);
    } catch { setErr("Could not save the field."); }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setErr(null); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{field ? "Edit field" : "Add field"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={field?.name} required /></div>
          <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" name="location" defaultValue={field?.location ?? ""} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="crop">Crop</Label><Input id="crop" name="crop" defaultValue={field?.primary_crop ?? ""} /></div>
            <div className="space-y-1.5"><Label htmlFor="area">Area (ha)</Label><Input id="area" name="area" type="number" step="0.1" min="0" defaultValue={field?.area_hectares ?? ""} /></div>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <DialogFooter><Button type="submit">{field ? "Save changes" : "Add field"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["fields"], queryFn: fieldService.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);

  async function remove(f: Field) {
    if (!confirm(`Delete “${f.name}”? Analyses are kept but unlinked.`)) return;
    try { await fieldService.remove(f.id); qc.invalidateQueries({ queryKey: ["fields"] }); toast.success("Field deleted"); } catch { toast.error("Could not delete field"); }
  }

  return (
    <>
      <PageHeader title="Fields" description="Fields you monitor, with their latest visual health status." actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add field</Button>} />
      {q.isLoading ? <TableSkeleton /> : q.error ? <ErrorState message="Could not load fields." onRetry={() => q.refetch()} /> : q.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((f) => (
            <div key={f.id} className="flex flex-col rounded-md border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to="/fields/$id" params={{ id: f.id }} className="font-medium hover:underline">{f.name}</Link>
                <SourceBadge source={f.source} />
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {f.location || "No location"}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Crop</dt><dd className="mt-0.5 font-medium">{f.primary_crop || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Area</dt><dd className="mt-0.5 font-mono">{f.area_hectares ?? "—"} ha</dd></div>
                <div><dt className="text-muted-foreground">Created</dt><dd className="mt-0.5 font-mono">{new Date(f.created_at).toLocaleDateString()}</dd></div>
              </dl>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <HealthBadge status={f.health_status} />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete" onClick={() => remove(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No fields yet" description="Add your first field to group analyses and track health over time."
          action={<div className="flex gap-2"><Button size="sm" onClick={() => setOpen(true)}>Add field</Button><Button size="sm" variant="outline" onClick={async () => { await createDemoFields(); qc.invalidateQueries({ queryKey: ["fields"] }); }}>Load demo fields</Button></div>} />
      )}
      <FieldDialog open={open} onOpenChange={setOpen} field={editing} key={editing?.id ?? "new"} />
    </>
  );
}
