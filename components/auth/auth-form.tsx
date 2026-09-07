"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { authenticate } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AuthForm({
  mode,
  linkError = false,
  sessionExpired = false,
}: {
  mode: "login" | "signup" | "recover" | "reset";
  linkError?: boolean;
  sessionExpired?: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate, {});
  const [show, setShow] = useState(false);
  const labels = {
    login: "Entrar no workspace",
    signup: "Criar minha conta",
    recover: "Enviar link de recuperação",
    reset: "Salvar nova senha",
  };
  return (
    <>
      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        {mode === "signup" && (
          <label className="block">
            <span className="field-label">Seu nome</span>
            <Input
              name="name"
              placeholder="Como podemos chamar você?"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              className="h-11"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="block">
            <span className="field-label">Email</span>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              required
              className="h-11"
            />
          </label>
        )}
        {mode !== "recover" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium">
                {mode === "reset" ? "Nova senha" : "Senha"}
              </label>
              {mode === "login" && (
                <Link
                  href="/recuperar-senha"
                  className="text-[11px] text-muted-foreground hover:text-primary"
                >
                  Esqueceu a senha?
                </Link>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                maxLength={128}
                placeholder="Pelo menos 8 caracteres"
                required
                className="h-11 pr-11"
              />
              <button
                type="button"
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3.5 text-muted-foreground"
              >
                {show ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
        )}
        {(state.error || linkError || sessionExpired) && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive"
          >
            {state.error ||
              (sessionExpired
                ? "Sua sessão expirou. Entre novamente para continuar."
                : "Este link expirou ou é inválido. Solicite um novo email de recuperação.")}
          </p>
        )}
        {state.success && (
          <p
            role="status"
            className="rounded-lg border border-success/20 bg-success/5 p-3 text-xs leading-5 text-success"
          >
            {state.success}
          </p>
        )}
        <Button className="primary-cta h-11 w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {labels[mode]}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            Ainda não tem uma conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary">
              Comece por aqui
            </Link>
          </>
        ) : (
          <Link href="/login" className="text-primary">
            Voltar para o login
          </Link>
        )}
      </p>
    </>
  );
}
