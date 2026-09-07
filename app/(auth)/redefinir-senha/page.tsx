import { AuthPage } from "@/components/auth/auth-page";
export const metadata = { title: "Redefinir senha" };
export default function Reset() {
  return <AuthPage mode="reset" />;
}
