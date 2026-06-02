import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Crear Cuenta Gratis",
  description:
    "Creá tu cuenta gratuita en FollowArg y empezá a crecer en redes sociales hoy mismo.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
