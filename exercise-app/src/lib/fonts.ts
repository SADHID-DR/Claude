import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import {
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';

/**
 * Mapa de assets para `useFonts`. Cargamos Barlow (cuerpo/etiquetas) en las
 * pesos que realmente usamos y Barlow Condensed (display/títulos/números)
 * en las pesos fuertes. Look "athletic" del pairing Sports/Fitness.
 */
export const fontAssets = {
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
};

/** fontWeight (RN) → familia Barlow concreta (las fuentes custom no heredan weight). */
const WEIGHT_TO_FAMILY: Record<string, string> = {
  '100': 'Barlow_300Light',
  '200': 'Barlow_300Light',
  '300': 'Barlow_300Light',
  '400': 'Barlow_400Regular',
  normal: 'Barlow_400Regular',
  '500': 'Barlow_500Medium',
  '600': 'Barlow_600SemiBold',
  '700': 'Barlow_700Bold',
  bold: 'Barlow_700Bold',
  '800': 'Barlow_800ExtraBold',
  '900': 'Barlow_900Black',
};

let installed = false;

/**
 * Inyecta Barlow como fuente global mapeando el `fontWeight` de cada <Text>/
 * <TextInput> a la familia correcta. Un componente que ya define `fontFamily`
 * (p. ej. los títulos con Barlow Condensed) manda y no se toca. Es un único
 * punto central y reversible: no hay que editar las ~150 pesos inline.
 */
export function installGlobalFont() {
  if (installed) return;
  installed = true;

  const patch = (Comp: any) => {
    const orig = Comp?.render;
    if (typeof orig !== 'function') return;
    Comp.render = function patchedRender(...args: any[]) {
      const el = orig.apply(this, args);
      try {
        if (!el || !el.props) return el;
        const flat = (StyleSheet.flatten(el.props.style) || {}) as Record<string, any>;
        if (flat.fontFamily) return el; // familia explícita (Condensed) gana
        const weight = String(flat.fontWeight ?? '400');
        const family = WEIGHT_TO_FAMILY[weight] ?? 'Barlow_400Regular';
        return React.cloneElement(el, { style: [{ fontFamily: family }, el.props.style] });
      } catch {
        return el;
      }
    };
  };

  patch(Text);
  patch(TextInput);
}
