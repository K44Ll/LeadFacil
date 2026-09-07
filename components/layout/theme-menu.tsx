"use client";
import { useTheme } from "next-themes";
import { Check, Palette } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { useMounted } from "@/hooks/use-preference";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Alterar tema">
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Aparência</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => setTheme(t.id)}>
            <span
              className={`theme-preview preview-${t.id} size-4 rounded-full border`}
            />
            {t.name}
            {mounted && theme === t.id && (
              <Check className="ml-auto size-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
