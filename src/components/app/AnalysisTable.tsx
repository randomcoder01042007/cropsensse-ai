import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Video } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HealthBadge, SourceBadge, StatusBadge } from "./badges";
import { signedUrl, type listAnalyses } from "@/services/analysisService";

type Row = Awaited<ReturnType<typeof listAnalyses>>[number];

function diseaseOf(r: Row): string | null {
  const d = r.analysis_diagnoses as unknown;
  const one = (Array.isArray(d) ? d[0] : d) as { disease: string | null; status: string } | null | undefined;
  return one?.status === "identified" && one.disease ? one.disease : null;
}

function Thumb({ row }: { row: Row }) {
  const img = row.analysis_images?.find((i) => i.kind === "original" || i.kind === "original_video");
  const isVideo = img?.kind === "original_video";
  const url = useQuery({ queryKey: ["thumb", img?.storage_path], queryFn: () => signedUrl(img!.storage_path), enabled: !!img && !isVideo, staleTime: 30 * 60e3 });
  return (
    <div className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-sm border bg-muted">
      {url.data ? <img src={url.data} alt="" loading="lazy" className="h-full w-full object-cover" /> : isVideo ? <Video className="h-4 w-4 text-muted-foreground" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

export function AnalysisTable({ rows, showImage }: { rows: Row[]; showImage?: boolean }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showImage && <TableHead className="pl-4">Image</TableHead>}
            <TableHead className={showImage ? "" : "pl-4"}>Date</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Crop</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Affected area</TableHead>
            <TableHead>Diagnosis</TableHead>
            <TableHead>Agent decision</TableHead>
            <TableHead className="pr-4 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {showImage && <TableCell className="pl-4"><Thumb row={r} /></TableCell>}
              <TableCell className={`whitespace-nowrap font-tabular text-muted-foreground ${showImage ? "" : "pl-4"}`}>{new Date(r.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="whitespace-nowrap">{r.fields?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>{r.crop_type}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {r.status === "completed" ? <HealthBadge status={r.health_status} /> : <StatusBadge status={r.status} />}
                  <SourceBadge source={r.source} />
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{r.affected_area != null ? `${r.affected_area}%` : "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{diseaseOf(r) ?? <span className="text-muted-foreground">-</span>}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{r.agent_decision ?? "—"}</TableCell>
              <TableCell className="pr-4 text-right">
                <Link to="/analyses/$id" params={{ id: r.id }} className="text-sm font-medium text-primary hover:underline">View</Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
