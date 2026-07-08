import Constants from 'expo-constants';

/**
 * Actualizador in-app: consulta la última release publicada en GitHub
 * (donde CI sube cada APK firmado con el keystore estable) y la compara
 * con el build instalado. Como la firma es fija, el APK nuevo se instala
 * ENCIMA del existente sin desinstalar y sin perder datos.
 */

const RELEASES_LATEST =
  'https://api.github.com/repos/SADHID-DR/Claude/releases/latest';

export interface UpdateInfo {
  build: number;
  url: string;
}

/** Nº de build instalado (lo inyecta CI en app.json → extra.buildNumber). */
export function currentBuild(): number {
  const extra = Constants.expoConfig?.extra as { buildNumber?: number } | undefined;
  return typeof extra?.buildNumber === 'number' ? extra.buildNumber : 0;
}

/** Versión legible para mostrar en la app. */
export function versionLabel(): string {
  const v = Constants.expoConfig?.version ?? '1.0.0';
  const b = currentBuild();
  return b > 0 ? `v${v} · build ${b}` : `v${v}`;
}

/**
 * Comprueba si hay un APK más nuevo publicado. Devuelve null si ya estás
 * al día, si no hay red o si la respuesta no es la esperada (nunca lanza).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(RELEASES_LATEST, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const m = /^apk-(\d+)$/.exec(String(data?.tag_name ?? ''));
    if (!m) return null;
    const build = parseInt(m[1], 10);
    const asset = Array.isArray(data?.assets)
      ? data.assets.find(
          (a: any) => typeof a?.name === 'string' && a.name.endsWith('.apk')
        )
      : null;
    const url: string | undefined =
      asset?.browser_download_url ?? data?.html_url;
    if (!url || !Number.isFinite(build)) return null;
    if (currentBuild() > 0 && build <= currentBuild()) return null;
    if (currentBuild() === 0) return null; // dev/web: no ofrecer APK
    return { build, url };
  } catch {
    return null;
  }
}
