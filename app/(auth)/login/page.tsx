import { AuthPage } from "@/components/auth/auth-page";
export const metadata = { title: "Entrar" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthPage
      mode="login"
      linkError={error === "link"}
      sessionExpired={error === "session"}
    />
  );
}
