import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

export const medirAudio = async (src: string): Promise<number | null> => {
  try {
    const respuesta = await fetch(src, { method: "HEAD" });
    if (!respuesta.ok) {
      return null;
    }
    const entrada = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src),
    });
    return await entrada.computeDuration();
  } catch {
    return null;
  }
};
