import { useRef, useState, type ReactNode } from "react";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageViewer({ src, alt, isVideo, children, label }: { src: string | null; alt: string; isVideo?: boolean; children?: ReactNode; label?: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="group relative overflow-hidden rounded-md border bg-ink">
      <div className="absolute left-2 top-2 z-10">{label}</div>
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-90">
        <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.5))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Reset zoom" onClick={() => setZoom(1)}><RotateCcw className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" aria-label="Fullscreen" onClick={() => ref.current?.requestFullscreen?.()}><Maximize2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-auto">
        {src ? (
          <div className="relative transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
            {isVideo ? (
              <video src={src} controls className="block max-h-full w-full" />
            ) : (
              <img src={src} alt={alt} className="block h-auto w-full" />
            )}
            {children}
          </div>
        ) : (
          <p className="text-sm text-ink-foreground/70">Image unavailable</p>
        )}
      </div>
    </div>
  );
}
