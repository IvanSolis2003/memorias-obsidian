"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  EditorSelection,
  EditorState,
  RangeSetBuilder,
  type ChangeSpec,
  type Extension,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type ContextoEnlace = {
  consulta: string;
  desde: number;
  hasta: number;
};

export type ManoEditor = {
  envolver: (marca: string) => void;
  prefijarLinea: (prefijo: string) => void;
  alternarTitulo: () => void;
  insertar: (texto: string, desplazamiento?: number) => void;
  insertarEnLineaPropia: (texto: string) => void;
  reemplazar: (desde: number, hasta: number, texto: string) => void;
  textoDespues: (posicion: number, largo: number) => string;
  enfocar: () => void;
};

type EditorMarkdownProps = {
  valorInicial: string;
  onCambio: (texto: string) => void;
  onContextoEnlace: (contexto: ContextoEnlace | null) => void;
};

const REGEX_CERCO = /^\s*(`{3,}|~{3,})/;
const MARCAS: { regex: RegExp; clase: string }[] = [
  { regex: /\*\*[^*\n]+\*\*/g, clase: "cm-negrita" },
  { regex: /(?<![*\w])\*[^*\s][^*\n]*\*(?!\*)/g, clase: "cm-cursiva" },
  { regex: /`[^`\n]+`/g, clase: "cm-codigo-en-linea" },
  { regex: /!?\[\[[^\]\n]+\]\]/g, clase: "cm-enlace-interno" },
  { regex: /(?<=^|\s)#[\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*/gu, clase: "cm-etiqueta" },
  { regex: /==[^=\n]+==/g, clase: "cm-resaltado" },
  { regex: /%%[^%\n]+%%/g, clase: "cm-comentario" },
  { regex: /^\s*[-*+] \[[ xX]\]/g, clase: "cm-tarea" },
];

function lineasEspeciales(doc: Text) {
  const codigo = new Set<number>();
  const propiedades = new Set<number>();
  let marca = "";
  for (let n = 1; n <= doc.lines; n++) {
    const texto = doc.line(n).text;
    const cerco = REGEX_CERCO.exec(texto);
    if (cerco) {
      if (!marca) marca = cerco[1][0];
      else if (cerco[1][0] === marca) marca = "";
      codigo.add(n);
    } else if (marca) {
      codigo.add(n);
    }
  }
  if (doc.lines > 1 && doc.line(1).text.trim() === "---") {
    for (let n = 2; n <= doc.lines; n++) {
      if (doc.line(n).text.trim() === "---") {
        for (let i = 1; i <= n; i++) propiedades.add(i);
        break;
      }
    }
  }
  return { codigo, propiedades };
}

function construirDecoraciones(vista: EditorView): DecorationSet {
  const { doc } = vista.state;
  const { codigo, propiedades } = lineasEspeciales(doc);
  const constructor = new RangeSetBuilder<Decoration>();
  let ultimaLinea = 0;

  for (const { from, to } of vista.visibleRanges) {
    let posicion = from;
    while (posicion <= to) {
      const linea = doc.lineAt(posicion);
      posicion = linea.to + 1;
      if (linea.number <= ultimaLinea) continue;
      ultimaLinea = linea.number;

      if (propiedades.has(linea.number)) {
        constructor.add(linea.from, linea.from, Decoration.line({ class: "cm-propiedades" }));
        continue;
      }
      if (codigo.has(linea.number)) {
        constructor.add(linea.from, linea.from, Decoration.line({ class: "cm-bloque-codigo" }));
        continue;
      }

      const titulo = /^(#{1,6})\s/.exec(linea.text);
      if (titulo) {
        constructor.add(
          linea.from,
          linea.from,
          Decoration.line({ class: `cm-titulo cm-titulo-${titulo[1].length}` }),
        );
      } else if (/^\s*>/.test(linea.text)) {
        constructor.add(linea.from, linea.from, Decoration.line({ class: "cm-cita" }));
      }

      const marcas: { desde: number; hasta: number; clase: string }[] = [];
      for (const { regex, clase } of MARCAS) {
        regex.lastIndex = 0;
        for (const coincidencia of linea.text.matchAll(regex)) {
          const inicio = linea.from + (coincidencia.index ?? 0);
          marcas.push({ desde: inicio, hasta: inicio + coincidencia[0].length, clase });
        }
      }
      marcas.sort((a, b) => a.desde - b.desde || a.hasta - b.hasta);
      for (const marca of marcas) {
        constructor.add(marca.desde, marca.hasta, Decoration.mark({ class: marca.clase }));
      }
    }
  }
  return constructor.finish();
}

const decoracionesMarkdown = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(vista: EditorView) {
      this.decorations = construirDecoraciones(vista);
    }

    update(cambio: ViewUpdate) {
      if (cambio.docChanged || cambio.viewportChanged) {
        this.decorations = construirDecoraciones(cambio.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const temaEditor = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--text-normal)",
    backgroundColor: "transparent",
    fontSize: "16px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-text)",
    lineHeight: "1.6",
    overflow: "auto",
    overscrollBehavior: "contain",
  },
  ".cm-content": { padding: "16px 0 96px", caretColor: "var(--interactive-accent)" },
  ".cm-line": { padding: "0 2px" },
  ".cm-cursor": { borderLeftColor: "var(--interactive-accent)", borderLeftWidth: "2px" },
  ".cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--interactive-accent) 35%, transparent)",
  },
  ".cm-titulo": { fontWeight: "600", color: "var(--text-normal)" },
  ".cm-titulo-1": { fontSize: "1.6em" },
  ".cm-titulo-2": { fontSize: "1.4em" },
  ".cm-titulo-3": { fontSize: "1.2em" },
  ".cm-cita": { color: "var(--text-muted)", borderLeft: "3px solid var(--interactive-accent)" },
  ".cm-negrita": { fontWeight: "700" },
  ".cm-cursiva": { fontStyle: "italic" },
  ".cm-codigo-en-linea": {
    fontFamily: "var(--font-monospace)",
    backgroundColor: "var(--code-background)",
    borderRadius: "4px",
  },
  ".cm-enlace-interno": { color: "var(--text-accent)" },
  ".cm-etiqueta": { color: "var(--text-accent)" },
  ".cm-resaltado": { backgroundColor: "rgba(255, 208, 0, 0.3)" },
  ".cm-comentario": { color: "var(--text-faint)" },
  ".cm-tarea": { color: "var(--text-accent)" },
  ".cm-bloque-codigo": {
    fontFamily: "var(--font-monospace)",
    fontSize: "0.9em",
    backgroundColor: "var(--code-background)",
  },
  ".cm-propiedades": { color: "var(--text-muted)", fontSize: "0.9em" },
});

function aplicarCambios(editor: EditorView, cambios: ChangeSpec) {
  const conjunto = editor.state.changes(cambios);
  editor.dispatch({
    changes: conjunto,
    selection: editor.state.selection.map(conjunto, 1),
    scrollIntoView: true,
    userEvent: "input",
  });
}

function contextoDeEnlace(estado: EditorState): ContextoEnlace | null {
  const seleccion = estado.selection.main;
  if (!seleccion.empty) return null;
  const linea = estado.doc.lineAt(seleccion.head);
  const antes = linea.text.slice(0, seleccion.head - linea.from);
  const coincidencia = /\[\[([^\][|#\n]*)$/.exec(antes);
  if (!coincidencia) return null;
  return {
    consulta: coincidencia[1],
    desde: seleccion.head - coincidencia[1].length,
    hasta: seleccion.head,
  };
}

export const EditorMarkdown = forwardRef<ManoEditor, EditorMarkdownProps>(function EditorMarkdown(
  { valorInicial, onCambio, onContextoEnlace },
  referencia,
) {
  const contenedor = useRef<HTMLDivElement>(null);
  const vista = useRef<EditorView | null>(null);
  const alCambiar = useRef(onCambio);
  const alCambiarContexto = useRef(onContextoEnlace);
  const [inicial] = useState(valorInicial);

  useEffect(() => {
    alCambiar.current = onCambio;
    alCambiarContexto.current = onContextoEnlace;
  });

  useEffect(() => {
    if (!contenedor.current) return;
    const escucha = EditorView.updateListener.of((cambio) => {
      if (cambio.docChanged) alCambiar.current(cambio.state.doc.toString());
      if (cambio.docChanged || cambio.selectionSet) {
        alCambiarContexto.current(contextoDeEnlace(cambio.state));
      }
    });
    const extensiones: Extension[] = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      EditorView.lineWrapping,
      decoracionesMarkdown,
      temaEditor,
      escucha,
    ];
    const editor = new EditorView({
      state: EditorState.create({ doc: inicial, extensions: extensiones }),
      parent: contenedor.current,
    });
    vista.current = editor;
    return () => {
      editor.destroy();
      vista.current = null;
    };
  }, [inicial]);

  useImperativeHandle(
    referencia,
    () => ({
      envolver(marca) {
        const editor = vista.current;
        if (!editor) return;
        editor.dispatch(
          editor.state.changeByRange((rango) =>
            rango.empty
              ? {
                  changes: { from: rango.from, insert: marca + marca },
                  range: EditorSelection.cursor(rango.from + marca.length),
                }
              : {
                  changes: [
                    { from: rango.from, insert: marca },
                    { from: rango.to, insert: marca },
                  ],
                  range: EditorSelection.range(
                    rango.from + marca.length,
                    rango.to + marca.length,
                  ),
                },
          ),
          { scrollIntoView: true, userEvent: "input" },
        );
        editor.focus();
      },
      prefijarLinea(prefijo) {
        const editor = vista.current;
        if (!editor) return;
        const { from, to } = editor.state.selection.main;
        const primera = editor.state.doc.lineAt(from).number;
        const ultima = editor.state.doc.lineAt(to).number;
        const todasLoTienen = Array.from({ length: ultima - primera + 1 }, (_, i) =>
          editor.state.doc.line(primera + i).text.startsWith(prefijo),
        ).every(Boolean);
        const cambios = [];
        for (let n = primera; n <= ultima; n++) {
          const linea = editor.state.doc.line(n);
          cambios.push(
            todasLoTienen
              ? { from: linea.from, to: linea.from + prefijo.length }
              : { from: linea.from, insert: prefijo },
          );
        }
        aplicarCambios(editor, cambios);
        editor.focus();
      },
      alternarTitulo() {
        const editor = vista.current;
        if (!editor) return;
        const linea = editor.state.doc.lineAt(editor.state.selection.main.head);
        const actual = /^(#{1,6}) /.exec(linea.text);
        const cambio = !actual
          ? { from: linea.from, insert: "# " }
          : actual[1].length < 6
            ? { from: linea.from, insert: "#" }
            : { from: linea.from, to: linea.from + 7 };
        aplicarCambios(editor, cambio);
        editor.focus();
      },
      insertar(texto, desplazamiento) {
        const editor = vista.current;
        if (!editor) return;
        const { from, to } = editor.state.selection.main;
        editor.dispatch({
          changes: { from, to, insert: texto },
          selection: { anchor: from + (desplazamiento ?? texto.length) },
          scrollIntoView: true,
          userEvent: "input",
        });
        editor.focus();
      },
      insertarEnLineaPropia(texto) {
        const editor = vista.current;
        if (!editor) return;
        const { from, to } = editor.state.selection.main;
        const linea = editor.state.doc.lineAt(from);
        const hayTextoAntes = linea.text.slice(0, from - linea.from).trim().length > 0;
        const insertado = `${hayTextoAntes ? "\n\n" : ""}${texto}\n\n`;
        editor.dispatch({
          changes: { from, to, insert: insertado },
          selection: { anchor: from + insertado.length },
          scrollIntoView: true,
          userEvent: "input",
        });
        editor.focus();
      },
      reemplazar(desde, hasta, texto) {
        const editor = vista.current;
        if (!editor) return;
        editor.dispatch({
          changes: { from: desde, to: hasta, insert: texto },
          selection: { anchor: desde + texto.length },
          scrollIntoView: true,
          userEvent: "input",
        });
        editor.focus();
      },
      textoDespues(posicion, largo) {
        const editor = vista.current;
        return editor ? editor.state.sliceDoc(posicion, posicion + largo) : "";
      },
      enfocar() {
        vista.current?.focus();
      },
    }),
    [],
  );

  return <div ref={contenedor} style={{ height: "100%" }} />;
});
