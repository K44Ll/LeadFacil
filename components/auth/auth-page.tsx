import { ArrowUpRight, Crosshair, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { AuthForm } from "@/components/auth/auth-form";
const copy = {
  login: {
    title: "Bom ter você por aqui.",
    subtitle: "Entre e encontre sua próxima grande oportunidade.",
  },
  signup: {
    title: "Novas conexões começam aqui.",
    subtitle: "Crie sua conta e dê o próximo passo nos seus negócios.",
  },
  recover: {
    title: "Vamos recuperar seu acesso.",
    subtitle: "Informe seu email para receber um link de recuperação.",
  },
  reset: {
    title: "Um novo começo.",
    subtitle: "Escolha uma nova senha para acessar seu workspace.",
  },
};
export function AuthPage({
  mode,
  linkError,
  sessionExpired,
}: {
  mode: keyof typeof copy;
  linkError?: boolean;
  sessionExpired?: boolean;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hero-pattern relative hidden flex-col overflow-hidden border-r p-12 lg:flex">
        <Logo />
        <div className="absolute inset-y-0 right-0 w-2/3 dot-pattern opacity-10" />
        <div className="relative my-auto max-w-lg py-20">
          <span className="mb-8 inline-flex rounded-2xl border border-primary/20 bg-primary/5 p-5 text-primary">
            <Crosshair className="size-10" strokeWidth={1} />
          </span>
          <p className="eyebrow mb-4 text-primary">
            Pequenas conexões. Grandes possibilidades.
          </p>
          <h2 className="text-5xl font-medium leading-[1.15] tracking-[-2px]">
            O próximo capítulo
            <br />
            do seu negócio
            <br />
            <span className="text-primary">começa com um oi.</span>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground">
            Descubra empresas com potencial, construa relacionamentos e
            transforme boas conversas em grandes projetos.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs">
            <Sparkles className="size-4 text-primary" />
            Encontre. Conecte. Cresça.
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          LeadFácil · Feito para quem faz negócios acontecerem.
        </p>
      </section>
      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-between">
          <div className="lg:invisible">
            <Logo />
          </div>
          <ThemeMenu />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-14">
          <p className="eyebrow mb-3">Seu próximo cliente está mais perto</p>
          <h1 className="text-[28px] font-medium tracking-[-1px]">
            {copy[mode].title}
          </h1>
          <p className="mb-8 mt-3 text-xs leading-5 text-muted-foreground">
            {copy[mode].subtitle}
          </p>
          <AuthForm
            mode={mode}
            linkError={linkError}
            sessionExpired={sessionExpired}
          />
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          Seu workspace é privado. Suas oportunidades, também.
        </p>
      </section>
    </div>
  );
}
