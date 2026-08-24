import Link from "next/link";
import { PublicationsWorkbench } from "@/components/publications/publications-workbench";

export default function PublicationsPage() {
  return (
    <main className="container">
      <h1>Publicaciones y scheduler</h1>
      <p>Programa y publica contenido en redes sociales.</p>
      <Link href="/">Volver al inicio</Link>
      <PublicationsWorkbench />
    </main>
  );
}
