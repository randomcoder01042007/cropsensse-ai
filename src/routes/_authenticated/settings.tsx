import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, TableSkeleton } from "@/components/app/states";
import { getSystemHealth } from "@/lib/system.functions";
import { cn } from "@/lib/utils";

type Tab = "profile" | "preferences" | "notifications" | "analysis" | "status";
export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({ tab: (["profile", "preferences", "notifications", "analysis", "status"] as const).find((t) => t === s.tab) }),
  head: () => ({ meta: [{ title: "Settings — CropSense AI" }, { name: "description", content: "Profile, preferences and system status." }] }),
  component: SettingsPage,
});

type Prefs = { units?: "ha" | "acre"; notify_anomaly?: boolean; notify_completed?: boolean; notify_reports?: boolean; default_mode?: "standard" | "detailed"; quality_threshold?: number };

function SettingsPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data });
  const health = useQuery({ queryKey: ["health"], queryFn: () => getSystemHealth() });
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({});
  useEffect(() => { if (profile.data) { setName(profile.data.full_name ?? ""); setOrg(profile.data.organization ?? ""); setPrefs((profile.data.preferences as Prefs) ?? {}); } }, [profile.data]);

  async function save(patch?: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: name, organization: org, preferences: next as unknown as Json });
    if (error) toast.error("Could not save"); else toast.success("Saved");
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs value={tab ?? "profile"} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="preferences">Preferences</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger><TabsTrigger value="analysis">Analysis Settings</TabsTrigger><TabsTrigger value="status">System Status</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <Panel>
            <div className="grid max-w-md gap-4">
              <div className="space-y-1.5"><Label>Email</Label><Input value={user.email ?? ""} disabled /></div>
              <div className="space-y-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="o">Organization</Label><Input id="o" value={org} onChange={(e) => setOrg(e.target.value)} /></div>
              <Button className="w-fit" onClick={() => save()}>Save profile</Button>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="preferences" className="mt-4">
          <Panel>
            <Row label="Area units" desc="Display field areas in hectares or acres.">
              <div className="flex rounded-md border p-0.5 text-sm">{(["ha", "acre"] as const).map((u) => <button key={u} onClick={() => save({ units: u })} className={cn("rounded-sm px-3 py-1", (prefs.units ?? "ha") === u ? "bg-accent font-medium" : "text-muted-foreground")}>{u}</button>)}</div>
            </Row>
          </Panel>
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <Panel>
            <Row label="Visual anomaly detected"><Switch checked={prefs.notify_anomaly ?? true} onCheckedChange={(v) => save({ notify_anomaly: v })} /></Row>
            <Row label="Analysis completed"><Switch checked={prefs.notify_completed ?? true} onCheckedChange={(v) => save({ notify_completed: v })} /></Row>
            <Row label="Report generated"><Switch checked={prefs.notify_reports ?? true} onCheckedChange={(v) => save({ notify_reports: v })} /></Row>
          </Panel>
        </TabsContent>
        <TabsContent value="analysis" className="mt-4">
          <Panel>
            <Row label="Default analysis mode">
              <div className="flex rounded-md border p-0.5 text-sm">{(["standard", "detailed"] as const).map((m) => <button key={m} onClick={() => save({ default_mode: m })} className={cn("rounded-sm px-3 py-1 capitalize", (prefs.default_mode ?? "standard") === m ? "bg-accent font-medium" : "text-muted-foreground")}>{m}</button>)}</div>
            </Row>
            <Row label="Minimum image quality" desc="Below this score the agent requests a new image (rule-based policy uses 55).">
              <Input type="number" className="w-24" min={0} max={100} value={prefs.quality_threshold ?? 55} onChange={(e) => setPrefs({ ...prefs, quality_threshold: Number(e.target.value) })} onBlur={() => save()} />
            </Row>
          </Panel>
        </TabsContent>
        <TabsContent value="status" className="mt-4">
          <Panel title="System Status" actions={<Button size="sm" variant="ghost" onClick={() => health.refetch()}><RefreshCw className={cn("h-3.5 w-3.5", health.isFetching && "animate-spin")} /> Re-check</Button>}>
            {health.isLoading ? <TableSkeleton rows={7} /> : (
              <ul className="divide-y">{health.data?.services.map((s) => (
                <li key={s.key} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", s.state === "online" ? "bg-success" : s.state === "offline" ? "bg-destructive" : "bg-warning")} />{s.label}</span>
                  <span className="text-right text-xs text-muted-foreground">{s.detail}</span>
                </li>))}</ul>
            )}
            {health.data && <p className="mt-3 font-mono text-[11px] text-muted-foreground">Checked {new Date(health.data.checkedAt).toLocaleTimeString()}</p>}
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <div><div className="text-sm font-medium">{label}</div>{desc && <div className="text-xs text-muted-foreground">{desc}</div>}</div>
      {children}
    </div>
  );
}
