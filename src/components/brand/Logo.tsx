import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" className="fill-primary" />
      <path d="M7 11V7h4M21 7h4v4M25 21v4h-4M11 25H7v-4" className="stroke-primary-foreground" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M11 21c0-6 4-10 10-10 0 6-4 10-10 10Z" className="fill-primary-foreground" />
      <path d="M11 21l6-6" className="stroke-primary" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>
        CropSense <span className="text-primary">AI</span>
      </span>
    </span>
  );
}
