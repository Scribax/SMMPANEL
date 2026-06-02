import type { Metadata } from "next";
import AddFundsForm from "./AddFundsForm";

export const metadata: Metadata = {
  title: "Cargar Saldo",
  description:
    "Acreditá saldo en tu cuenta FollowArg vía MercadoPago para pagar pedidos de servicios SMM.",
};

export default function AddFundsPage() {
  return <AddFundsForm />;
}
