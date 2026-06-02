import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description:
    "Ingresá a tu cuenta FollowArg para gestionar tus pedidos de seguidores y servicios SMM.",
};

export default function LoginPage() {
  return <LoginForm />;
}
