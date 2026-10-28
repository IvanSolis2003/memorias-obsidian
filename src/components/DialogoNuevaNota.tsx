"use client";

import { useMemo, useState, type FormEvent } from "react";
import { crearNota } from "@/lib/vault/guardar";
import { carpetasDeRutas, validarNombreNota } from "@/lib/vault/nombres";
import styles from "./DialogoNuevaNota.module.css";

type DialogoNuevaNotaProps = {
  clave: string;
  rutas: string[];
  carpetaInicial: string;
  enLinea: boolean;
  onCreada: (ruta: string) => void;
  onCerrar: () => void;
};

export function DialogoNuevaNota({
  clave,
  rutas,
  carpetaInicial,
  enLinea,
  onCreada,
  onCerrar,
}: DialogoNuevaNotaProps) {
  const carpetas = useMemo(() => carpetasDeRutas(rutas), [rutas]);
  const [nombre, setNombre] = useState("");
  const [carpeta, setCarpeta] = useState(carpetas.includes(carpetaInicial) ? carpetaInicial : "");
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (creando) return;
    const resultado = validarNombreNota(nombre, carpeta, rutas);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    setCreando(true);
    setError(null);
    try {
      await crearNota(clave, resultado.ruta);
      onCreada(resultado.ruta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la nota.");
      setCreando(false);
    }
  }

  return (
    <div className={styles.fondo} role="presentation">
      <form className={styles.dialogo} onSubmit={enviar} aria-labelledby="titulo-nueva-nota">
        <h2 id="titulo-nueva-nota" className={styles.titulo}>
          Nueva nota
        </h2>

        <label className={styles.etiqueta} htmlFor="nombre-nota">
          Nombre
        </label>
        <input
          id="nombre-nota"
          className={styles.campo}
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setError(null);
          }}
          autoFocus
          autoCapitalize="sentences"
          autoComplete="off"
          placeholder="Sin título"
        />

        <label className={styles.etiqueta} htmlFor="carpeta-nota">
          Carpeta
        </label>
        <select
          id="carpeta-nota"
          className={styles.campo}
          value={carpeta}
          onChange={(e) => {
            setCarpeta(e.target.value);
            setError(null);
          }}
        >
          <option value="">Raíz del vault</option>
          {carpetas.map((ruta) => (
            <option key={ruta} value={ruta}>
              {ruta}
            </option>
          ))}
        </select>

        {!enLinea && (
          <p className={styles.aviso}>Sin conexión: no se puede crear la nota ahora.</p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.acciones}>
          <button type="button" className={styles.secundario} onClick={onCerrar} disabled={creando}>
            Cancelar
          </button>
          <button type="submit" className={styles.primario} disabled={creando || !enLinea}>
            {creando ? "Creando…" : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
}
