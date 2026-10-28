import type { VaultGuardado } from "@/lib/vault/tipos";
import { BloqueCopiable } from "./BloqueCopiable";
import { FilaAjuste, SeccionAjustes } from "./FilaAjuste";

const GITIGNORE_RECOMENDADO = `.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/cache
.trash/
.DS_Store`;

export function GuiaComputador({ vault }: { vault: VaultGuardado }) {
  const comandosRepo = `git init
git branch -M ${vault.branch}
git remote add origin https://github.com/${vault.repoOwner}/${vault.repoName}.git
git add .
git commit -m "Primer commit del vault"
git push -u origin ${vault.branch}`;

  return (
    <SeccionAjustes titulo="Obsidian en tu computador">
      <BloqueCopiable
        titulo="Crear el repositorio"
        descripcion="Solo si tu vault todavía no está en GitHub. Ejecútalo en la carpeta del vault."
        texto={comandosRepo}
      />
      <FilaAjuste
        titulo="Instalar el plugin Obsidian Git"
        descripcion="En Obsidian: Ajustes → Complementos de la comunidad → Explorar, busca «Obsidian Git», instálalo y actívalo."
      />
      <BloqueCopiable
        titulo=".gitignore recomendado"
        descripcion="Evita subir archivos de estado que cambian a cada rato y causan conflictos."
        texto={GITIGNORE_RECOMENDADO}
      />
      <FilaAjuste
        titulo="Intervalos sugeridos"
        descripcion="En los ajustes de Obsidian Git deja el intervalo de commit-and-sync en 120 minutos y activa «Pull on startup»."
      />
      <FilaAjuste
        titulo="Activar Pull on commit-and-sync"
        descripcion="Imprescindible: en cada ciclo trae primero lo nuevo de GitHub y luego sube. Sin esto, el push puede ser rechazado cuando la app guardó notas entre ciclos."
      />
      <FilaAjuste
        titulo="Traer o subir sin esperar"
        descripcion="Usa la paleta de comandos: «Obsidian Git: Pull» o «Obsidian Git: Commit-and-sync». Obsidian debe estar abierto para que el plugin corra."
      />
    </SeccionAjustes>
  );
}
