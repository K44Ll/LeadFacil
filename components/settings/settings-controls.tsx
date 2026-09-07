"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Check, Loader2, Plus, Save, Tag as TagIcon } from "lucide-react";
import { useMounted, usePreference } from "@/hooks/use-preference";
import { useMutation } from "@/hooks/use-mutation";
import { THEMES } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Profile, Tag } from "@/types/crm";
export function ProfileSettings({ profile }: { profile: Profile }) {
  const { pending, mutate } = useMutation();
  const [avatar, setAvatar] = useState(profile.avatar_url || "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        mutate({
          type: "profile",
          name: String(form.get("name")),
          avatar_url: avatar,
        });
      }}
      className="panel p-5 sm:p-6"
    >
      <h2 className="text-sm font-medium">Seu perfil</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Como você aparece no seu workspace.
      </p>
      <div className="my-6 flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage
            src={profile.avatar_url || undefined}
            alt={profile.name}
          />
          <AvatarFallback className="bg-accent text-lg text-primary">
            {profile.name
              .split(" ")
              .slice(0, 2)
              .map((s) => s[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{profile.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Seu espaço para construir novas conexões.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Nome</span>
          <Input
            name="name"
            defaultValue={profile.name}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label>
          <span className="field-label">Email da conta</span>
          <Input
            type="email"
            value={profile.email}
            readOnly
            className="text-muted-foreground"
          />
          <span className="mt-1.5 block text-[10px] text-muted-foreground">
            Vinculado à sua identidade de acesso.
          </span>
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">URL do avatar</span>
          <Input
            type="url"
            placeholder="https://..."
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
          <span className="mt-1.5 block text-[10px] text-muted-foreground">
            Uma imagem pública em HTTPS. Deixe vazio para usar suas iniciais.
          </span>
        </label>
      </div>
      <div className="mt-5 flex justify-end border-t pt-4">
        <Button disabled={pending} className="text-xs">
          {pending ? <Loader2 className="animate-spin" /> : <Save />}Salvar
          perfil
        </Button>
      </div>
    </form>
  );
}
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [density, setDensity] = usePreference("density", "comfortable");
  const [sidebar, setSidebar] = usePreference("sidebar", "expanded");
  return (
    <section id="aparencia" className="panel scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-sm font-medium">Seu espaço. Seu estilo.</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Encontre o tema que combina com seu momento.
      </p>
      <div className="my-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-pressed={mounted && theme === t.id}
            className={`group overflow-hidden rounded-xl border text-left transition-all ${mounted && theme === t.id ? "border-primary ring-1 ring-primary/20" : "hover:border-muted-foreground/50"}`}
          >
            <div
              className={`theme-preview preview-${t.id} flex h-28 gap-2 p-3`}
            >
              <div className="w-6 rounded bg-[var(--preview-card)]" />
              <div className="flex-1">
                <div className="mb-3 h-1 w-1/2 rounded bg-[var(--preview-primary)]" />
                <div className="mb-2 flex gap-1.5">
                  {[0, 1, 2].map((n) => (
                    <div
                      key={n}
                      className="h-5 flex-1 rounded bg-[var(--preview-card)]"
                    />
                  ))}
                </div>
                <div className="relative flex h-10 items-end gap-1 overflow-hidden rounded bg-[var(--preview-card)] px-2 pt-2">
                  {[35, 55, 40, 70, 58, 85, 72, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-[var(--preview-primary)] opacity-70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{t.name}</span>
                {mounted && theme === t.id && (
                  <Check className="size-3.5 text-primary" />
                )}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {t.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="space-y-4 border-t pt-5">
        <label className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-xs font-medium">
              Densidade da interface
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Mais espaço ou mais informações por vez.
            </span>
          </span>
          <select
            className="native-select"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
          >
            <option value="comfortable">Confortável</option>
            <option value="compact">Compacta</option>
          </select>
        </label>
        <label className="flex flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-xs font-medium">Barra lateral</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Escolha como prefere navegar.
            </span>
          </span>
          <select
            className="native-select"
            value={sidebar}
            onChange={(e) => setSidebar(e.target.value)}
          >
            <option value="expanded">Expandida</option>
            <option value="collapsed">Recolhida</option>
          </select>
        </label>
      </div>
    </section>
  );
}
export function TagsSettings({ tags }: { tags: Tag[] }) {
  const [name, setName] = useState("");
  const { pending, mutate } = useMutation();
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <TagIcon className="size-4 text-muted-foreground" />
        Tags do workspace
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Crie marcadores para dar mais contexto às suas oportunidades.
      </p>
      <div className="my-5 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t.id}
            className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs"
          >
            {t.name}
          </span>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutate({ type: "create_tag", name }, () => setName(""));
        }}
      >
        <Input
          aria-label="Nome da nova tag"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Enviar proposta"
          minLength={2}
          maxLength={40}
          required
        />
        <Button variant="outline" disabled={pending}>
          <Plus />
          Criar tag
        </Button>
      </form>
    </section>
  );
}
