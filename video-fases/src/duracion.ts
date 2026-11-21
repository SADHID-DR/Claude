import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

export const existe = async (src: string): Promise<boolean> => {
  try {
    const respuesta = await fetch(src, { method: "HEAD" });
    return respuesta.ok;
  } catch {
    return false;
  }
};

export const medirAudio = async (src: string): Promise<number | null> => {
  if (!(await existe(src))) {
    return null;
  }
  try {
    const entrada = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src),
    });
    return await entrada.computeDuration();
  } catch {
    return null;
  }
};
