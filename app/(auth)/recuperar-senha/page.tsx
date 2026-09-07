import { AuthPage } from "@/components/auth/auth-page";
export const metadata = { title: "Recuperar senha" };
export default function Recover() {
  return <AuthPage mode="recover" />;
}
