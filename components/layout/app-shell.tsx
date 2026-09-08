"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  Building2,
  Kanban,
  FolderOpen,
  History,
  Settings,
  ChevronsUpDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  CircleHelp,
  Menu,
  ArrowUpRight,
  LogOut,
  Sparkles,
  Check,
  User,
} from "lucide-react";
import { Logo, OpenStreetMapAttribution } from "@/components/shared";
import { ThemeMenu } from "./theme-menu";
import { CommandMenu, type SearchIndex } from "./command-menu";
import { usePreference } from "@/hooks/use-preference";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/auth/actions";
import type { Profile } from "@/types/crm";
const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/buscar", label: "Buscar Leads", icon: Search },
  { href: "/leads", label: "Leads", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/listas", label: "Listas", icon: FolderOpen },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
export function AppShell({
  children,
  profile,
  index,
  leadCount,
  hasOpenStreetMapData,
}: {
  children: React.ReactNode;
  profile: Profile;
  index: SearchIndex;
  leadCount: number;
  hasOpenStreetMapData: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = usePreference("sidebar", "expanded");
  const [density] = usePreference("density", "comfortable");
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const current = navigation.find((n) =>
    n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
  );
  function navContent(isMobile = false) {
    return (
      <>
        <div className="flex h-[78px] items-center px-6">
          <Logo />
        </div>
        <div className="px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mb-6 flex w-full items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                  {profile.name[0]}
                </span>
                <span className="sidebar-label min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    Meu workspace
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    Espaço pessoal
                  </span>
                </span>
                <ChevronsUpDown className="sidebar-label size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Workspace atual</DropdownMenuLabel>
              <DropdownMenuItem>
                <Check className="text-primary" />
                Meu workspace
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Espaços de equipe estarão disponíveis em uma próxima versão.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="eyebrow sidebar-label mb-3 px-3">Workspace</p>
          <nav
            aria-label={isMobile ? "Navegação mobile" : "Navegação principal"}
            className="space-y-1"
          >
            {navigation.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => setMobile(false)}
                className={cn(
                  "nav-link",
                  i === 6 && "mt-6 border-t border-border pt-4 !h-14",
                )}
                data-active={current?.href === item.href}
                aria-current={current?.href === item.href ? "page" : undefined}
              >
                <item.icon
                  className="size-[17px] shrink-0"
                  strokeWidth={1.65}
                />
                <span className="sidebar-label">{item.label}</span>
                {item.href === "/leads" && (
                  <span className="sidebar-label ml-auto rounded bg-muted px-1.5 py-.5 text-[10px] tabular-nums">
                    {leadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="sidebar-extra mb-4 rounded-xl border border-primary/15 bg-primary/5 p-3.5">
            <Sparkles className="mb-2 size-4 text-primary" />
            <p className="text-xs font-medium">
              Boas conexões. Novos projetos.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Sua próxima oportunidade está mais perto do que imagina.
            </p>
            <Link
              href="/buscar"
              className="mt-3 flex items-center justify-between text-[11px] font-medium text-primary"
            >
              Encontrar oportunidades
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <button onClick={() => setHelp(true)} className="nav-link w-full">
            <CircleHelp className="size-4 shrink-0" />
            <span className="sidebar-label">Central de ajuda</span>
            <ArrowUpRight className="sidebar-label ml-auto size-3" />
          </button>
          <div className="my-3 border-t" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-muted"
                aria-label="Menu da conta"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                  {profile.name
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </span>
                <span className="sidebar-label min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {profile.name}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {profile.email}
                  </span>
                </span>
                <ChevronsUpDown className="sidebar-label size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/configuracoes">
                  <User />
                  Editar perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void logout();
                }}
              >
                <LogOut />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    );
  }
  return (
    <div
      className={cn(
        "min-w-0 overflow-x-clip",
        collapsed === "collapsed" && "sidebar-collapsed",
        density === "compact" && "density-compact",
      )}
    >
      <a
        href="#main"
        className="sr-only fixed left-4 top-4 z-[100] rounded bg-primary p-3 text-primary-foreground focus:not-sr-only"
      >
        Pular para o conteúdo
      </a>
      <aside className="app-sidebar">{navContent()}</aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent
          side="left"
          className="flex w-[260px] flex-col gap-0 bg-sidebar p-0"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SheetDescription className="sr-only">
            Navegue pelo seu workspace
          </SheetDescription>
          {navContent(true)}
        </SheetContent>
      </Sheet>
      <div className="app-main min-h-screen">
        <header className="sticky top-0 z-30 flex h-[65px] items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3 text-xs">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobile(true)}
              aria-label="Abrir menu"
            >
              <Menu />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden text-muted-foreground md:flex"
              onClick={() =>
                setCollapsed(
                  collapsed === "collapsed" ? "expanded" : "collapsed",
                )
              }
              aria-label={
                collapsed === "collapsed"
                  ? "Expandir sidebar"
                  : "Recolher sidebar"
              }
            >
              {collapsed === "collapsed" ? (
                <PanelLeftOpen />
              ) : (
                <PanelLeftClose />
              )}
            </Button>
            <span className="hidden text-muted-foreground lg:inline">
              Workspace
            </span>
            <ChevronRight className="hidden size-3 text-muted-foreground lg:block" />
            <span>{current?.label || "Detalhes"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CommandMenu index={index} />
            <div className="mx-1 hidden h-5 border-l sm:block" />
            <ThemeMenu />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Atividade do workspace"
                  className="relative"
                >
                  <Bell className="size-4" />
                  <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Seu workspace</DropdownMenuLabel>
                <p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
                  {leadCount} leads organizados. Acompanhe suas conversas e
                  últimas buscas no histórico.
                </p>
                <DropdownMenuItem asChild>
                  <Link href="/historico">
                    <History />
                    Ver atividade recente
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="main"
          className="page-enter mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7"
        >
          {children}
          <footer className="mt-8 flex items-center justify-between border-t pt-4 text-[10px] text-muted-foreground">
            {hasOpenStreetMapData ? (
              <OpenStreetMapAttribution />
            ) : (
              <span>Feito para transformar conexões em oportunidades.</span>
            )}
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              Workspace privado
            </span>
          </footer>
        </main>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Da descoberta à próxima parceria</DialogTitle>
            <DialogDescription>
              Seu fluxo comercial em um só lugar.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-5 py-3 text-sm">
            {[
              "Busque empresas por nicho, localização e perfil digital.",
              "Priorize pelo Opportunity Score e confira seus fatores.",
              "Organize leads em listas e registre suas conversas.",
              "Mova oportunidades no pipeline conforme a negociação avança.",
            ].map((text, i) => (
              <li key={text} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-primary">
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Use Ctrl + K ou ⌘ + K para navegar, buscar empresas e trocar de
            tema.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
