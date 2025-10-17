import { Moon, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useDarkMode } from "~/hooks/use-dark-mode";

export function DarkModeToggle() {
  const { isDark, toggleDarkMode, mounted } = useDarkMode();

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled className="h-9 w-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="h-9 w-9"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}
