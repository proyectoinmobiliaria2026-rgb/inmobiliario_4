import Link from "next/link";
import { LeadsWorkbench } from "@/components/leads/leads-workbench";

export default function LeadsPage() {
  return (
    <main className="container">
      <h1>Seguimiento de leads</h1>
      <p>Organiza contactos, estados y próximos seguimientos.</p>
      <Link href="/">Volver al inicio</Link>
      <LeadsWorkbench />
    </main>
  );
}
