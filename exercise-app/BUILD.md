# Compilar e instalar en tu Android

Este proyecto es **Expo (managed)**. La forma recomendada de obtener un **APK
instalable** es **EAS Build** (compila en la nube de Expo; no necesitas Android
Studio ni el SDK de Android en tu ordenador).

Ya está todo configurado (`eas.json` con un perfil `preview` que genera un
**APK** de instalación directa).

## Opción A — APK instalable con EAS Build (recomendada)

Requisitos: Node instalado y una **cuenta de Expo** (gratis en https://expo.dev).

En tu ordenador, dentro de `exercise-app/`:

```bash
# 1) Instala la CLI de EAS (una vez)
npm install -g eas-cli

# 2) Inicia sesión con tu cuenta de Expo
eas login

# 3) Vincula el proyecto (crea el proyecto en tu cuenta; acepta cuando pregunte)
eas init

# 4) Compila el APK en la nube
eas build -p android --profile preview
# (atajo equivalente: npm run build:apk)
```

Al terminar (unos minutos), la terminal te da un **enlace**. Ábrelo en el móvil
y **descarga el APK**, o escanea el **QR** que muestra EAS.

### Instalar el APK en el teléfono
1. Descarga el `.apk` en el móvil.
2. Al abrirlo, Android pedirá permiso para **"instalar apps de fuentes
   desconocidas"**: actívalo para tu navegador/gestor de archivos.
3. Pulsa **Instalar**. Listo, la app "Ejercicios" queda instalada.

## Opción B — Probarla ya sin compilar (Expo Go)

La forma más rápida de usarla en el móvil (sin generar APK):

```bash
# En tu ordenador, dentro de exercise-app/
npm install
npx expo start
```

Instala **Expo Go** desde Google Play y **escanea el QR**. El teléfono y el
ordenador deben estar en la **misma red Wi-Fi**. Si no lo están, usa un túnel:

```bash
npx expo start --tunnel
```

> Expo Go es ideal para probar y desarrollar. Para tener la app instalada de
> forma permanente (sin depender del servidor de desarrollo), usa la Opción A.

## Notas / solución de problemas

- **buildType**: el perfil `preview` genera un **APK** (`android.buildType:
  "apk"`), directamente instalable. El perfil `production` genera un
  **AAB** (`app-bundle`) para publicar en Google Play.
- **Nueva arquitectura**: el proyecto usa `newArchEnabled: true`. Si una
  compilación fallara por una librería, ponlo en `false` en `app.json` y
  vuelve a compilar.
- **Iconos**: la app ya trae icono propio (una mancuerna verde) en
  `assets/icon.png`, `assets/adaptive-icon.png` y `assets/splash.png`, ya
  referenciados en `app.json`. Para cambiarlo, sustituye esos PNG.
- **Atajos npm**: `npm run build:apk` (APK, perfil preview) y
  `npm run build:aab` (AAB para Google Play, perfil production).
- **Versión**: `app.json` → `expo.version` (nombre visible) y el `versionCode`
  de Android lo gestiona EAS automáticamente (`appVersionSource: remote`).
