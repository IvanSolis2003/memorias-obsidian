"use client";

import { useEffect, useState } from "react";
import { fechaLegible, haceCuanto } from "@/lib/tiempo";
import { mensajeDeError, pedirJson } from "./api";
import { BloqueCopiable } from "./BloqueCopiable";
import { FilaAjuste, SeccionAjustes } from "./FilaAjuste";
import styles from "./Conexiones.module.css";

type Conexion = {
  id: string;
  cliente: string;
  escritura: boolean;
  creadoEn: string;
  ultimoUso: string | null;
};

type Actividad = {
  id: string;
  accion: "crear" | "agregar" | "conectar" | "revocar" | "guardar" | "adjuntar";
  ruta: string | null;
  fecha: string;
};

type Datos = { conexiones: Conexion[]; actividad: Actividad[] };

const ACCIONES: Record<Actividad["accion"], string> = {
  crear: "Creó la nota",
  agregar: "Agregó texto a",
  conectar: "Se conectó",
  revocar: "Revocaste una conexión",
  guardar: "Guardó",
  adjuntar: "Adjuntó",
};

type PanelClaudeProps = {
  urlConector: string;
  tieneVault: boolean;
  onIrAObsidian: () => void;
};

export function PanelClaude({ urlConector, tieneVault, onIrAObsidian }: PanelClaudeProps) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tieneVault) return;
    let activo = true;
    pedirJson<Datos>("/api/connections")
      .then((respuesta) => {
        if (activo) setDatos(respuesta);
      })
      .catch((e) => {
        if (activo) setError(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [tieneVault, version]);

  async function revocar(conexion: Conexion) {
    if (!window.confirm(`¿Revocar el acceso de ${conexion.cliente}? Dejará de funcionar de inmediato.`)) return;
    try {
      await pedirJson("/api/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conexion.id }),
      });
      setError(null);
      setVersion((actual) => actual + 1);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  if (!tieneVault) {
    return (
      <SeccionAjustes titulo="Conector de Claude">
        <FilaAjuste
          titulo="Primero conecta tu vault"
          descripcion="El conector trabaja sobre tu vault de Obsidian. Conéctalo en la pestaña Obsidian y vuelve aquí."
        >
          <button type="button" className={styles.botonSecundario} onClick={onIrAObsidian}>
            Ir a Obsidian
          </button>
        </FilaAjuste>
      </SeccionAjustes>
    );
  }

  return (
    <>
      <SeccionAjustes titulo="Conector de Claude">
        <BloqueCopiable
          titulo="Dirección del conector"
          descripcion="Es la misma para todos: quedas identificado cuando apruebas el acceso con tu cuenta de GitHub."
          texto={urlConector}
        />
        <FilaAjuste
          titulo="Cómo agregarlo en Claude"
          apilada
          descripcion={
            <ol className={styles.pasos}>
              <li>En Claude abre Ajustes → Conectores.</li>
              <li>Elige «Agregar conector personalizado».</li>
              <li>Pega la dirección de arriba y ponle un nombre, por ejemplo Memorias Obsidian.</li>
              <li>Inicia sesión con GitHub si te lo pide y elige los permisos: solo lectura, o lectura y escritura.</li>
            </ol>
          }
        />
        <FilaAjuste
          titulo="Importante"
          descripcion="Los conectores personalizados dependen de tu plan de Claude y pueden requerir permisos de administrador en tu organización. Claude podrá buscar, leer, crear notas (y carpetas), agregar texto al final y reemplazar o borrar fragmentos; no borra notas completas ni las mueve. Cada cambio queda como un commit que puedes deshacer en GitHub."
        />
      </SeccionAjustes>

      <SeccionAjustes titulo="Conexiones activas">
        {!datos && !error && <FilaAjuste titulo="Cargando…" />}
        {datos && datos.conexiones.length === 0 && (
          <FilaAjuste titulo="Sin conexiones" descripcion="Todavía no hay ningún Claude conectado a tu vault." />
        )}
        {datos?.conexiones.map((conexion) => (
          <FilaAjuste
            key={conexion.id}
            titulo={conexion.cliente}
            descripcion={`${conexion.escritura ? "Lectura y escritura" : "Solo lectura"} · conectado ${fechaLegible(conexion.creadoEn)} · ${
              conexion.ultimoUso ? `último uso ${haceCuanto(conexion.ultimoUso)}` : "sin uso todavía"
            }`}
          >
            <button type="button" className={styles.botonPeligro} onClick={() => revocar(conexion)}>
              Revocar
            </button>
          </FilaAjuste>
        ))}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </SeccionAjustes>

      <SeccionAjustes titulo="Actividad reciente">
        {datos && datos.actividad.length === 0 && (
          <FilaAjuste titulo="Sin actividad" descripcion="Aquí verás lo que Claude cree o agregue en tu vault." />
        )}
        {datos?.actividad.map((fila) => (
          <FilaAjuste
            key={fila.id}
            titulo={fila.ruta ? `${ACCIONES[fila.accion]} ${fila.ruta}` : ACCIONES[fila.accion]}
            descripcion={fechaLegible(fila.fecha)}
          />
        ))}
      </SeccionAjustes>
    </>
  );
}
