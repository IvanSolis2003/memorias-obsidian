import { Suspense } from "react";
import { VistaGrafo } from "@/components/grafo/VistaGrafo";

export default function GrafoPage() {
  return (
    <Suspense fallback={null}>
      <VistaGrafo />
    </Suspense>
  );
}
