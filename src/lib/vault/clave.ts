type DatosClave = {
  repoOwner: string;
  repoName: string;
  branch: string;
  basePath: string | null;
};

export function claveDeVault(userId: string, vault: DatosClave) {
  return `${userId}|${vault.repoOwner}/${vault.repoName}@${vault.branch}|${vault.basePath ?? ""}`;
}
