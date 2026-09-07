import { EmptyState } from "@/components/shared";
export default function NotFound() {
  return (
    <EmptyState
      title="Esta página não foi encontrada."
      description="O endereço pode ter mudado ou este item não pertence ao seu workspace."
      href="/"
      action="Voltar ao Dashboard"
    />
  );
}
