import { useEffect, useRef } from "react";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const skip =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || skip) return;

    let x = window.innerWidth / 2, y = window.innerHeight / 3;
    let tx = x, ty = y, raf = 0;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const tick = () => {
      x += (tx - x) * 0.12;   // easing = smooth trailing motion
      y += (ty - y) * 0.12;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}