import { redirect } from "next/navigation";

export default function ProduitsPage() {
  redirect("/catalogue?tab=produits");
}
