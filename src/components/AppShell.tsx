"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Drawer, type PestanaDrawer } from "./Drawer";
import { detectarDeslizamiento, puntoDeToque, type Punto } from "./gestos";
import {
  IconoBuscar,
  IconoCarpeta,
  IconoChevronDerecha,
  IconoChevronIzquierda,
  IconoEnlace,
  IconoFlechaSaliente,
  IconoInfo,
  IconoLapiz,
  IconoLibro,
  IconoLista,
  IconoMarcador,
  IconoMas,
  IconoPanelDerecho,
  IconoPanelIzquierdo,
  IconoPuntos,
} from "./Icons";
import { AvisoSync } from "./AvisoSync";
import { ProveedorVault } from "./ContextoVault";
import { DialogoActualizaciones } from "./DialogoActualizaciones";
import { DialogoNuevaNota } from "./DialogoNuevaNota";
import { DialogoPestanas } from "./DialogoPestanas";
import { DialogoSelector } from "./DialogoSelector";
import { ProveedorEdicion } from "./edicion/ContextoEdicion";
import { useEdicion } from "./edicion/useEdicion";
import { FileTree } from "./FileTree";
import { MenuMas } from "./MenuMas";
import { PanelBusqueda } from "./PanelBusqueda";
import { PanelMarcadores } from "./PanelMarcadores";
import { PanelBacklinks } from "./panelDerecho/PanelBacklinks";
import { PanelEsquema } from "./panelDerecho/PanelEsquema";
import { PanelPropiedades } from "./panelDerecho/PanelPropiedades";
import { PanelSalientes } from "./panelDerecho/PanelSalientes";
import { useDatosNota, type DatosNota } from "./useDatosNota";
import { useEnLinea } from "./useEnLinea";
import { useHistorial } from "./useHistorial";
import { useMarcadores } from "./useMarcadores";
import { useRutasDeNotas } from "./useRutasDeNotas";
import { usePestanas } from "./usePestanas";
import { useSincronizacion } from "./useSincronizacion";
import { useTema } from "./useTema";
import { limpiarCachesPwa } from "@/lib/pwa";
import { haceCuanto } from "@/lib/tiempo";
import { limpiarAlmacenamiento } from "@/lib/vault/store";
import { carpetaDeRuta } from "@/lib/vault/nombres";
import { rutaDeUrl, tituloDeRuta, urlDeNota } from "@/lib/vault/url";
import styles from "./AppShell.module.css";

const BORDE_GESTO = 24;

function crearPestanasIzquierdas(
  explorador: ReactNode,
  busqueda: ReactNode,
  marcadores: ReactNode,
): PestanaDrawer[] {
  return [
    {
      id: "explorador",
      etiqueta: "Explorador de archivos",
      icono: <IconoCarpeta />,
      contenido: explorador,
    },
    {
      id: "busqueda",
      etiqueta: "Búsqueda",
      icono: <IconoBuscar />,
      contenido: busqueda,
    },
    {
      id: "marcadores",
      etiqueta: "Marcadores y tags",
      icono: <IconoMarcador />,
      contenido: marcadores,
    },
  ];
}

function crearPestanasDerechas(datos: DatosNota | null, onNavegar: () => void): PestanaDrawer[] {
  return [
    {
      id: "backlinks",
      etiqueta: "Backlinks",
      icono: <IconoEnlace />,
      contenido: <PanelBacklinks datos={datos} onNavegar={onNavegar} />,
    },
    {
      id: "salientes",
      etiqueta: "Enlaces salientes",
      icono: <IconoFlechaSaliente />,
      contenido: <PanelSalientes datos={datos} onNavegar={onNavegar} />,
    },
    {
      id: "esquema",
      etiqueta: "Esquema",
      icono: <IconoLista />,
      contenido: <PanelEsquema datos={datos} onNavegar={onNavegar} />,
    },
    {
      id: "propiedades",
      etiqueta: "Propiedades",
      icono: <IconoInfo />,
      contenido: <PanelPropiedades datos={datos} />,
    },
  ];
}

type AppShellProps = {
  children: ReactNode;
  claveVault: string | null;
};

export function AppShell({ children, claveVault }: AppShellProps) {
  const [izquierdoAbierto, setIzquierdoAbierto] = useState(false);
  const [derechoAbierto, setDerechoAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nuevaNota, setNuevaNota] = useState<{ carpeta: string } | null>(null);
  const [selector, setSelector] = useState<{ nuevaPestana: boolean } | null>(null);
  const [pestanasAbiertas, setPestanasAbiertas] = useState(false);
  const [consultaBusqueda, setConsultaBusqueda] = useState("");
  const router = useRouter();
  const { tema, alternar } = useTema();
  const enLinea = useEnLinea();
  const sincronizacion = useSincronizacion(claveVault);
  const rutas = useRutasDeNotas(claveVault, sincronizacion.version);
  const pathname = usePathname();
  const rutaActiva = rutaDeUrl(pathname);
  const historial = useHistorial(pathname);
  const marcadores = useMarcadores(claveVault);
  const pestanas = usePestanas(claveVault, pathname);
  const datosNota = useDatosNota(claveVault, rutaActiva, sincronizacion.version);
  const edicion = useEdicion(claveVault, rutaActiva, enLinea, sincronizacion.notificarCambioLocal);
  const estadoEdicion = edicion.sesion?.estado;
  const guardarDeshabilitado =
    !enLinea ||
    edicion.sesion?.fase !== "lista" ||
    estadoEdicion === "limpio" ||
    estadoEdicion === "guardado" ||
    estadoEdicion === "guardando";
  const etiquetaGuardar =
    estadoEdicion === "guardando"
      ? "Guardando…"
      : estadoEdicion === "guardado"
        ? "Guardado"
        : estadoEdicion === "error"
          ? "Reintentar"
          : "Guardar";
  const inicio = useRef<Punto | null>(null);
  const ultimaActualizacion = sincronizacion.info?.ultimaActualizacion ?? null;

  useEffect(() => {
    if (!claveVault) return;
    function alTeclear(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "o") {
        evento.preventDefault();
        setSelector({ nuevaPestana: false });
      }
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [claveVault]);

  function abrirNota(ruta: string) {
    if (!edicion.confirmarSalida()) return;
    if (selector?.nuevaPestana) pestanas.abrir(urlDeNota(ruta));
    setSelector(null);
    router.push(urlDeNota(ruta));
  }

  function activarPestana(id: string) {
    if (!edicion.confirmarSalida()) return;
    const url = pestanas.activar(id);
    setPestanasAbiertas(false);
    if (url && url !== pathname) router.push(url);
  }

  function cerrarPestana(id: string) {
    if (id === pestanas.activa && !edicion.confirmarSalida()) return;
    const url = pestanas.cerrar(id);
    if (url) {
      setPestanasAbiertas(false);
      router.push(url);
    }
  }

  function nuevaPestana() {
    setPestanasAbiertas(false);
    setSelector({ nuevaPestana: true });
  }

  function abrirNuevaNota(carpeta: string) {
    if (!claveVault || !edicion.confirmarSalida()) return;
    setIzquierdoAbierto(false);
    setNuevaNota({ carpeta });
  }

  function alCrearNota(ruta: string) {
    setNuevaNota(null);
    sincronizacion.notificarCambioLocal();
    edicion.editarRuta(ruta);
    router.push(urlDeNota(ruta));
  }

  async function cerrarSesion() {
    if (!edicion.confirmarSalida()) return;
    await Promise.all([limpiarAlmacenamiento(), limpiarCachesPwa()]).catch(() => null);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function alTocar(e: TouchEvent) {
    const punto = puntoDeToque(e.touches[0]);
    const enBorde = punto.x <= BORDE_GESTO || punto.x >= window.innerWidth - BORDE_GESTO;
    inicio.current = enBorde ? punto : null;
  }

  function alSoltar(e: TouchEvent) {
    const desde = inicio.current;
    inicio.current = null;
    if (!desde) return;
    const direccion = detectarDeslizamiento(desde, puntoDeToque(e.changedTouches[0]));
    const desdeIzquierda = desde.x <= BORDE_GESTO;
    if (desdeIzquierda && direccion === "derecha") setIzquierdoAbierto(true);
    if (!desdeIzquierda && direccion === "izquierda") setDerechoAbierto(true);
  }

  return (
    <div className={styles.shell} onTouchStart={alTocar} onTouchEnd={alSoltar}>
      <header className={styles.barraSuperior}>
        <button
          type="button"
          className={styles.boton}
          aria-label="Abrir panel izquierdo"
          onClick={() => setIzquierdoAbierto(true)}
        >
          <IconoPanelIzquierdo />
        </button>
        <h1 className={styles.titulo}>
          {rutaActiva ? tituloDeRuta(rutaActiva) : pathname === "/grafo" ? "Grafo" : pathname === "/cuenta" ? "Cuenta" : "Memorias Ivan"}
        </h1>
        {rutaActiva && claveVault && (
          <div className={styles.acciones}>
            {edicion.modo === "edicion" && (
              <button
                type="button"
                className={styles.botonGuardar}
                disabled={guardarDeshabilitado}
                onClick={() => edicion.guardar()}
              >
                {etiquetaGuardar}
              </button>
            )}
            <button
              type="button"
              className={styles.boton}
              aria-label={edicion.modo === "edicion" ? "Volver a lectura" : "Editar nota"}
              onClick={edicion.alternarModo}
            >
              {edicion.modo === "edicion" ? <IconoLibro /> : <IconoLapiz />}
            </button>
          </div>
        )}
        <button
          type="button"
          className={styles.boton}
          aria-label="Abrir panel derecho"
          onClick={() => setDerechoAbierto(true)}
        >
          <IconoPanelDerecho />
        </button>
      </header>

      {!enLinea && <div className={styles.sinConexion}>Sin conexión · usando las notas guardadas</div>}

      <main className={styles.contenido}>
        <ProveedorVault clave={claveVault} version={sincronizacion.version}>
          <ProveedorEdicion valor={edicion}>{children}</ProveedorEdicion>
        </ProveedorVault>
      </main>

      <nav className={styles.barraInferior} aria-label="Navegación">
        <button
          type="button"
          className={styles.boton}
          aria-label="Atrás"
          disabled={!historial.puedeAtras}
          onClick={() => edicion.confirmarSalida() && router.back()}
        >
          <IconoChevronIzquierda />
        </button>
        <button
          type="button"
          className={styles.boton}
          aria-label="Adelante"
          disabled={!historial.puedeAdelante}
          onClick={() => edicion.confirmarSalida() && router.forward()}
        >
          <IconoChevronDerecha />
        </button>
        <button
          type="button"
          className={styles.boton}
          aria-label="Nueva nota"
          disabled={!claveVault}
          onClick={() => abrirNuevaNota(carpetaDeRuta(rutaActiva))}
        >
          <IconoMas />
        </button>
        <button
          type="button"
          className={styles.boton}
          aria-label="Pestañas abiertas"
          disabled={!claveVault}
          onClick={() => setPestanasAbiertas(true)}
        >
          <span className={styles.contadorPestanas}>{Math.max(pestanas.pestanas.length, 1)}</span>
        </button>
        <button
          type="button"
          className={styles.boton}
          aria-label="Más opciones"
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <IconoPuntos />
        </button>
      </nav>

      {menuAbierto && (
        <MenuMas
          tema={tema}
          puedeActualizar={claveVault !== null && sincronizacion.estado.fase !== "sincronizando"}
          descripcionActualizar={
            ultimaActualizacion ? `Actualizado ${haceCuanto(ultimaActualizacion)}` : null
          }
          onActualizar={sincronizacion.actualizar}
          marcadaActual={rutaActiva && claveVault ? marcadores.marcadores.includes(rutaActiva) : null}
          onMarcador={() => rutaActiva && marcadores.alternar(rutaActiva)}
          onGrafo={() =>
            edicion.confirmarSalida() &&
            router.push(rutaActiva ? `/grafo?nota=${encodeURIComponent(rutaActiva)}` : "/grafo")
          }
          onSelector={() => setSelector({ nuevaPestana: false })}
          onAlternarTema={alternar}
          onConexiones={() => edicion.confirmarSalida() && router.push("/conexiones")}
          onCuenta={() => edicion.confirmarSalida() && router.push("/cuenta")}
          onCerrarSesion={cerrarSesion}
          onCerrar={() => setMenuAbierto(false)}
        />
      )}

      <AvisoSync
        estado={sincronizacion.estado}
        onCerrar={sincronizacion.descartarAviso}
        onReintentar={sincronizacion.actualizar}
      />

      {nuevaNota && claveVault && (
        <DialogoNuevaNota
          clave={claveVault}
          rutas={rutas ?? []}
          carpetaInicial={nuevaNota.carpeta}
          enLinea={enLinea}
          onCreada={alCrearNota}
          onCerrar={() => setNuevaNota(null)}
        />
      )}

      {pestanasAbiertas && claveVault && (
        <DialogoPestanas
          pestanas={pestanas.pestanas}
          activa={pestanas.activa}
          onActivar={activarPestana}
          onCerrarPestana={cerrarPestana}
          onNueva={nuevaPestana}
          onCerrar={() => setPestanasAbiertas(false)}
        />
      )}

      {selector && claveVault && (
        <DialogoSelector
          clave={claveVault}
          version={sincronizacion.version}
          onElegir={abrirNota}
          onCerrar={() => setSelector(null)}
        />
      )}

      {sincronizacion.dialogoAbierto && sincronizacion.info && (
        <DialogoActualizaciones
          vacio={sincronizacion.info.vacio}
          ultimaActualizacion={sincronizacion.info.ultimaActualizacion}
          onAceptar={sincronizacion.actualizar}
          onRechazar={sincronizacion.cerrarDialogo}
        />
      )}

      <Drawer
        lado="izquierdo"
        abierto={izquierdoAbierto}
        onCerrar={() => setIzquierdoAbierto(false)}
        pestanas={crearPestanasIzquierdas(
          <FileTree
            rutas={rutas}
            rutaActiva={rutaActiva}
            onAbrir={() => setIzquierdoAbierto(false)}
            onNuevaNota={abrirNuevaNota}
          />,
          <PanelBusqueda
            clave={claveVault}
            version={sincronizacion.version}
            consulta={consultaBusqueda}
            onConsulta={setConsultaBusqueda}
            onNavegar={() => setIzquierdoAbierto(false)}
          />,
          <PanelMarcadores
            clave={claveVault}
            version={sincronizacion.version}
            marcadores={marcadores.marcadores}
            onNavegar={() => setIzquierdoAbierto(false)}
          />,
        )}
      />
      <Drawer
        lado="derecho"
        abierto={derechoAbierto}
        onCerrar={() => setDerechoAbierto(false)}
        pestanas={crearPestanasDerechas(datosNota, () => setDerechoAbierto(false))}
      />
    </div>
  );
}
