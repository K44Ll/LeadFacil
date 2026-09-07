import { AuthPage } from "@/components/auth/auth-page";
export const metadata = { title: "Criar conta" };
export default function Signup() {
  return <AuthPage mode="signup" />;
}
