import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Inline script run before paint so the saved/OS theme applies without a flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* storage unavailable */ }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
