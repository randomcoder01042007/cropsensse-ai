export interface OverlayRegion {
  id: string;
  label: string;
  x: number; y: number; w: number; h: number;
  contour?: [number, number][] | null;
  area_percent?: number | null;
  severity?: string;
}

export type OverlayLayer = "original" | "mask" | "regions" | "processed";

/**
 * Draws computer-vision annotations as an SVG layer over an image.
 * Coordinates are normalised (0..1) as returned by the vision service contract.
 */
export function CvOverlay({ regions, layer, showLabels = true }: { regions: OverlayRegion[]; layer: OverlayLayer; showLabels?: boolean }) {
  if (layer === "original") return null;
  return (
    <>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="veg-hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="2" className="stroke-cv-veg" strokeWidth="0.6" opacity="0.5" />
        </pattern>
        <mask id="veg-cut">
          <rect width="100" height="100" fill="white" />
          {regions.map((r) => (r.contour?.length ? <polygon key={r.id} points={r.contour.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")} fill="black" /> : null))}
        </mask>
      </defs>
      {(layer === "mask" || layer === "processed") && <rect width="100" height="100" fill="url(#veg-hatch)" mask="url(#veg-cut)" />}
      {(layer === "regions" || layer === "processed" || layer === "mask") &&
        regions.map((r) => (
          <g key={r.id}>
            {r.contour?.length ? (
              <polygon
                points={r.contour.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
                className="fill-cv-suspect stroke-cv-suspect"
                fillOpacity={layer === "mask" ? 0.55 : 0.22}
                strokeWidth="0.35"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {layer !== "mask" && (
              <rect
                x={r.x * 100} y={r.y * 100} width={r.w * 100} height={r.h * 100}
                fill="none" className="stroke-cv-scan animate-dash" strokeWidth="1.5" strokeDasharray="6 6" vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        ))}
    </svg>
    {showLabels && layer !== "mask" && regions.map((r) => (
      <span key={r.id + "l"} className="pointer-events-none absolute -translate-y-full rounded-sm bg-ink px-1 font-mono text-[10px] leading-4 whitespace-nowrap text-ink-foreground" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%` }}>
        {r.id} · {r.area_percent ?? "—"}%
      </span>
    ))}
    </>
  );
}

export function CvLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cv-veg" /> Vegetation</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cv-suspect" /> Suspicious region</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-cv-scan" /> Analysed region</span>
    </div>
  );
}
