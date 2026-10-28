"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { leerNota } from "@/lib/vault/store";
import { leerUltimaNota } from "@/lib/vault/ultima";
import { urlDeNota } from "@/lib/vault/url";
import { useClaveVault } from "./ContextoVault";
import styles from "./InicioVault.module.css";

export function InicioVault() {
  const clave = useClaveVault();
  const router = useRouter();

  useEffect(() => {
    if (!clave) return;
    const ruta = leerUltimaNota(clave);
    if (!ruta) return;
    let activo = true;
    leerNota(clave, ruta)
      .then((nota) => {
        if (activo && nota) router.replace(urlDeNota(ruta));
      })
      .catch(() => null);
    return () => {
      activo = false;
    };
  }, [clave, router]);

  return (
    <div className={styles.vacio}>
      <p>Abre una nota desde el panel izquierdo.</p>
    </div>
  );
}
