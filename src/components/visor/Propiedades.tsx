import { fechaLegible } from "@/lib/tiempo";
import styles from "./Propiedades.module.css";

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function textoDe(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") {
    if (!REGEX_FECHA_ISO.test(valor)) return valor;
    return valor.includes("T00:00:00") ? valor.slice(0, 10) : fechaLegible(valor);
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function Valor({ valor }: { valor: unknown }) {
  if (Array.isArray(valor)) {
    return (
      <span className={styles.chips}>
        {valor.map((elemento, indice) => (
          <span key={indice} className={styles.chip}>
            {textoDe(elemento)}
          </span>
        ))}
      </span>
    );
  }
  if (typeof valor === "boolean") {
    return <input type="checkbox" checked={valor} readOnly disabled />;
  }
  return <span className={styles.texto}>{textoDe(valor)}</span>;
}

export function ListaPropiedades({ propiedades }: { propiedades: Record<string, unknown> }) {
  return (
    <dl className={styles.lista}>
      {Object.entries(propiedades).map(([clave, valor]) => (
        <div key={clave} className={styles.fila}>
          <dt className={styles.clave}>{clave}</dt>
          <dd className={styles.valor}>
            <Valor valor={valor} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Propiedades({ propiedades }: { propiedades: Record<string, unknown> }) {
  if (Object.keys(propiedades).length === 0) return null;

  return (
    <details className={styles.bloque} open>
      <summary className={styles.titulo}>Propiedades</summary>
      <ListaPropiedades propiedades={propiedades} />
    </details>
  );
}
