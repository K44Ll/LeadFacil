"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Building2,
  Folder,
  LayoutDashboard,
  Search,
  Kanban,
  Settings,
  Palette,
  MapPin,
  Tag,
  Plus,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { THEMES } from "@/lib/themes";
export interface SearchIndex {
  leads: { id: string; company_name: string; city: string }[];
  lists: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}
export function CommandMenu({ index }: { index: SearchIndex }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  function go(href: string) {
    setOpen(false);
    router.push(href);
  }
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2.5 rounded-lg border bg-background px-3 text-muted-foreground transition-colors hover:border-input md:w-72"
        aria-label="Busca global"
      >
        <Search className="size-3.5" />
        <span className="hidden text-xs md:inline">
          Buscar em seu workspace...
        </span>
        <kbd className="ml-auto hidden rounded border px-1.5 text-[10px] md:block">
          Ctrl K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Busca global"
        description="Encontre empresas, cidades, listas, tags e ações."
      >
        <Command>
        <CommandInput placeholder="O que você está procurando?" />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            {[
              { name: "Dashboard", href: "/", icon: LayoutDashboard },
              { name: "Buscar leads", href: "/buscar", icon: Search },
              { name: "Ir para Leads", href: "/leads", icon: Building2 },
              { name: "Abrir Pipeline", href: "/pipeline", icon: Kanban },
              { name: "Nova lista", href: "/listas?nova=1", icon: Plus },
              { name: "Configurações", href: "/configuracoes", icon: Settings },
            ].map((a) => (
              <CommandItem key={a.href} onSelect={() => go(a.href)}>
                <a.icon />
                {a.name}
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Empresas">
            {index.leads.map((l) => (
              <CommandItem
                key={l.id}
                value={`${l.company_name} ${l.city} ${l.id}`}
                onSelect={() => go(`/leads/${l.id}`)}
              >
                <Building2 />
                <span>{l.company_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {l.city}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Listas">
            {index.lists.map((l) => (
              <CommandItem key={l.id} onSelect={() => go(`/listas/${l.id}`)}>
                <Folder />
                {l.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Cidades">
            {[...new Set(index.leads.map((l) => l.city))].map((city) => (
              <CommandItem
                key={city}
                onSelect={() => go(`/leads?q=${encodeURIComponent(city)}`)}
              >
                <MapPin />
                {city}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tags">
            {index.tags.map((t) => (
              <CommandItem key={t.id} onSelect={() => go(`/leads?tag=${t.id}`)}>
                <Tag />
                {t.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Alterar tema">
            {THEMES.map((t) => (
              <CommandItem
                key={t.id}
                onSelect={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
              >
                <Palette />
                {t.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
