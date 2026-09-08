import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/auth/reset-password-view";

export const metadata: Metadata = {
  title: "Nueva contraseña",
};

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
