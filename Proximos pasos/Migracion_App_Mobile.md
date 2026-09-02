# Migración a App Mobile — App Jardín Ground

Guía paso a paso para pasar de "la app web funciona en el celular" a "los técnicos
tienen un ícono en el celular que abre la app, con acceso a la cámara, y opcionalmente
publicada en Play Store / App Store".

Este documento cubre el **paso 4** de la guía de producción. Asume que la app web
ya está en producción (ver `Implementacion_Web.md`).

Hay tres caminos posibles según qué tan "app nativa" necesites. Los explico en
orden de esfuerzo y costo.

---

## Cuadro comparativo de las tres opciones

| | PWA | WebView wrapper (Capacitor) | React Native / nativo |
|---|---|---|---|
| **Qué es** | Tu mismo frontend, con `manifest.json` y service worker. "Instalás" desde el browser | Una app nativa vacía que abre tu web | Una app escrita de nuevo en RN/Swift/Kotlin |
| **Costo de desarrollo** | Bajo (1–2 días) | Medio (1–2 semanas) | Alto (1–3 meses, USD 5k–20k) |
| **Acceso a cámara nativa** | Sí (con permisos del browser) | Sí nativo, mejor rendimiento | Sí nativo, mejor rendimiento |
| **Escaneo de QR** | Sí (`BarcodeDetector` API o librería JS) | Sí nativo, más rápido y offline | Sí offline y ultra-rápido |
| **Publicar en Play / App Store** | No (solo "Agregar a inicio") | Sí, con un poco más de laburo | Sí |
| **Notificaciones push** | Limitado en iOS, OK en Android | Sí | Sí |
| **Funciona offline** | Limitado (con service worker) | Sí, si lo configurás | Sí, es lo fuerte |
| **Mantenimiento** | 1 sola base de código | 1 sola base de código (mismo React) | 2 bases de código |

### Mi recomendación

Sabiendo que el uso principal es **técnico escaneando QR en campo con poca señal**:

1. **Corto plazo (esta semana): PWA.** Convertir el frontend en una PWA. El técnico
   entra a la URL desde el celular, hace "Agregar a inicio de pantalla", y queda con
   un ícono. **El QR se escanea con la cámara del browser**. Cero costo extra. Para
   5–10 técnicos, sobra.

2. **Mediano plazo (cuando ya esté en uso y quieras Play Store): Capacitor.** Es
   un wrapper que toma tu build de Vite y lo envuelve en un WebView nativo. Es
   **el mismo código React que ya tenés**, no reescribís nada. Costo: 1–2 semanas
   de laburo.

3. **Largo plazo (si crece mucho y necesitás offline real + push): evaluar React
   Native o un rewrite.** Pero esperá a tener data de uso real antes de gastar acá.

---

## Opción 1 — PWA (Progressive Web App) — Recomendada para arrancar

Una PWA es **la misma web** pero con un `manifest.json` y un service worker que
permiten al celular instalarla como si fuera una app. El técnico entra a tu URL,
el browser le ofrece "Agregar a inicio de pantalla", y queda con un ícono propio
que abre la app sin barra de navegador.

### 1.1 Instalar el plugin de PWA para Vite

En la carpeta `frontend`:

```bash
cd frontend
npm install -D vite-plugin-pwa
```

### 1.2 Configurar `vite.config.js`

**Archivo:** `frontend/vite.config.js`

Reemplazar el contenido actual por:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Jardín Ground',
        short_name: 'Jardín',
        description: 'App de Relevamiento Jardín Ground',
        theme_color: '#2F5233',     // tu color primario, sección 2
        background_color: '#ffffff',
        display: 'standalone',      // sin barra de browser
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cachear assets estáticos y respuestas de la API para que cargue
        // instantáneamente la segunda vez, aún con señal floja.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.jardinground\.com\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
```

### 1.3 Generar los íconos

Necesitás tres tamaños:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-512-maskable.png` (512×512, con padding para Android adaptativo)

Si tenés un logo real, usalo. Si no, generá uno rápido con un placeholder. La
especificación dice que mientras no haya logo real, se usa el fallback "Jardín
Ground" en texto (sección 2.1).

Herramientas útiles:
- https://www.pwabuilder.com/imageGenerator (subís una imagen, te genera todos los
  tamaños y variantes maskable).
- O desde línea de comandos: `npx pwa-asset-generator logo.svg ./public`

### 1.4 Forzar HTTPS en el manifest

**Archivo:** `frontend/index.html`

Vite PWA detecta si está en HTTPS, pero asegurate de que el manifest no apunte
a `localhost` en producción. El `start_url` y `scope` quedan relativos (`/`), así
que se adaptan al dominio.

### 1.5 Probar la PWA en el celular

1. Deployá la app web (ver `Implementacion_Web.md`).
2. Abrí `https://app.jardinground.com` en **Chrome de Android** o **Safari de iOS**.
3. En Android: Chrome debería mostrar un banner "Agregar a pantalla de inicio".
   Si no aparece, tocá el menú (⋮) → "Instalar app" o "Agregar a pantalla principal".
4. En iOS: tocá el botón de compartir (⬆️) → "Agregar a pantalla de inicio".
5. Una vez instalada, abrila desde el ícono. **No debe verse la barra de URL del
   browser**. Eso confirma que `display: 'standalone'` está funcionando.
6. Probá escanear un QR desde la app abierta: andá a Equipo → ícono de QR → y
   usá la cámara del browser para escanear el QR de otro equipo.

### 1.6 Limitaciones de PWA que vas a encontrarte

- **iOS no permite instalar PWA en la App Store.** Solo se instala "manualmente"
  desde Safari. Para 5 técnicos en una empresa, no es problema. Si querés que
  la app esté en la App Store, necesitás ir a Capacitor o React Native.
- **Las notificaciones push en iOS son limitadas** (recién en 16.4+ con
  complicadas). En Android funcionan bien.
- **El service worker no persiste en Safari private mode.** Tenerlo en cuenta si
  algún técnico usa ese modo.
- **Si el técnico borra el cache del browser, la PWA desaparece.** No es desinstalación
  "real", pero se comporta igual.

---

## Opción 2 — Capacitor (WebView wrapper nativo)

Capacitor toma tu **build de producción de Vite** y lo envuelve en una app nativa
para Android e iOS. Vos seguís desarrollando en React normal, y Capacitor se
encarga de la parte nativa. Es el camino más rápido para llegar a las stores.

### 2.1 Prerrequisitos

**Para Android:**
- Android Studio instalado
- JDK 17 (`brew install openjdk@17` en Mac, o descargar de Adoptium)
- Variable de entorno `JAVA_HOME` apuntando al JDK

**Para iOS (solo en Mac):**
- Xcode instalado (App Store)
- CocoaPods (`sudo gem install cocoapods`)
- Una cuenta de Apple Developer (USD 99/año) para firmar y publicar

### 2.2 Instalar Capacitor

En la carpeta `frontend`:

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```

### 2.3 Inicializar el proyecto Capacitor

```bash
npx cap init "Jardín Ground" "ar.com.jardinground" --web-dir=dist
```

Esto crea el archivo `capacitor.config.json`. Editá el `server.url` para apuntar
a tu deploy de producción:

```json
{
  "appId": "ar.com.jardinground",
  "appName": "Jardín Ground",
  "webDir": "dist",
  "server": {
    "url": "https://app.jardinground.com",
    "cleartext": false
  }
}
```

**Decisión clave:** ¿querés que la app cargue desde el deploy web (como PWA pero
dentro de un WebView) o que sea 100% offline con los assets empaquetados?

- **`server.url` configurado** (recomendado para arrancar): la app abre tu web
  deployada. Cambios en la web se reflejan sin rebuild. Pero necesita conexión.
- **Sin `server.url`**: la app incluye los assets estáticos empaquetados. Funciona
  offline pero cada cambio requiere rebuild y resubir a las stores.

Para validar el modelo de uso, empezá con `server.url`. Después podés migrar a
offline-first si lo necesitás.

### 2.4 Agregar plugins de cámara y QR nativo

Capacitor tiene plugins oficiales y de la comunidad. Para tu caso, los importantes
son:

```bash
npm install @capacitor/camera
npm install @capacitor/share
npm install @capacitor/network          # detectar conexión
```

Para el escaneo de QR nativo, hay dos opciones:

- **A) Usar el input file con `capture` de HTML5** (sin plugin extra). El browser
  dentro del WebView abre la cámara nativa, escanea, y devuelve el resultado. Es
  lo más simple y suele alcanzar.
- **B) Plugin `@capacitor-mlkit/barcode-scanning`**: usa el ML Kit de Google, que
  es más rápido y funciona offline. Requiere agregar la dependencia de Gradle en
  Android. Mejor experiencia pero más laburo de setup.

**Mi recomendación:** empezá con la opción A. Si los técnicos se quejan de
velocidad o precisión de escaneo, pasá a la opción B.

### 2.5 Compilar para Android

```bash
npm run build              # genera dist/
npx cap sync android       # copia dist/ al proyecto Android
npx cap open android       # abre Android Studio
```

En Android Studio:
1. Esperá que Gradle termine de sincronizar (la primera vez tarda varios minutos).
2. **Generar el keystore de firma** (Build → Generate Signed Bundle / APK).
   - Es un archivo `.jks` que te identifica como desarrollador. **Guardalo bien,
     si lo perdés no podés actualizar la app nunca más**.
   - Anotá las contraseñas en un gestor seguro (1Password, Bitwarden).
3. **Crear la firma**: Build → Generate Signed Bundle or APK → Android App Bundle.
4. Te genera un archivo `.aab` (no `.apk`) en `android/app/release/`.
5. Ese `.aab` es el que subís a Google Play Console.

### 2.6 Publicar en Google Play

1. Crear cuenta de Google Play Developer (USD 25, una sola vez).
   https://play.google.com/console
2. Crear una nueva aplicación.
3. En "App content" completar:
   - **App category**: Negocio / Herramientas
   - **Privacy policy**: subir un link a tu política de privacidad (obligatorio
     si recolectás datos, ver sección 6 de este documento).
   - **App access**: explicar cómo se accede (login, qué credenciales).
4. En "Store presence" completar la ficha:
   - **App name**: "Jardín Ground"
   - **Short description** (80 chars): "Relevamiento de equipos en campo"
   - **Full description** (4000 chars): detallar funcionalidad.
   - **Screenshots**: al menos 2 de celular, 1 de tablet si aplica.
   - **App icon**: 512×512 PNG, 32-bit con alpha.
   - **Feature graphic**: 1024×500 PNG (banner de la ficha).
5. En "Release" → "Production" → "Create new release" → subir el `.aab`.
6. Completar el "Content rating questionnaire" (es un formulario, ~5 min).
7. **Target API level**: Google exige apuntar a Android 14 (API 34) o superior
   desde agosto 2025. Verificá en `android/app/build.gradle`.
8. Submit for review. La revisión tarda 1–7 días la primera vez. Después,
   aprobaciones de updates son más rápidas.

### 2.7 Compilar para iOS (solo en Mac)

```bash
npm run build
npx cap sync ios
npx cap open ios
```

En Xcode:
1. Seleccionar el target del proyecto → "Signing & Capabilities" → seleccionar
   tu equipo de desarrollo.
2. **Configurar Bundle Identifier**: debe coincidir con el de tu Apple Developer
   account (algo como `ar.com.jardinground`).
3. **Versión y Build**: 1.0.0 / 1 para el primer release.
4. **Capabilities**: agregar "Camera" si vas a usarla.
5. **Info.plist**: agregar las descripciones de uso de cámara:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>La cámara se usa para escanear códigos QR de equipos.</string>
   ```
6. **Archive** (Product → Archive). Cuando termine, abrí el Organizer y subí
   a App Store Connect.

### 2.8 Publicar en App Store

1. Necesitás una Apple Developer account (USD 99/año). https://developer.apple.com
2. App Store Connect: https://appstoreconnect.apple.com
3. Crear la app con el mismo Bundle ID.
4. Completar la ficha: nombre, descripción, screenshots (obligatorio screenshots
   de 6.7" y 6.1" para iPhone), keywords, URL de privacy policy.
5. Subir el build desde Xcode Organizer.
6. **App Review Information**: contacto, notas para el revisor (explicar que es
   una app interna, dar credenciales de prueba si aplica).
7. Submit for review. La revisión tarda 1–3 días. Apple es más estricto que
   Google: si rechazan, te dicen por qué y resubís.

### 2.9 Actualizar la app en stores

Cada vez que cambies algo en la web **que NO requiera cambio de código nativo**,
como agregar un campo o cambiar colores, no necesitás resubir a las stores. El
WebView carga la URL cada vez (por el `server.url`).

Si cambias la configuración de Capacitor (agregás un plugin, cambiás el ícono,
actualizás dependencias nativas), ahí sí necesitás rebuild + resubir a las stores.

---

## Opción 3 — React Native / nativo puro

**No recomendado para este proyecto.** Solo tiene sentido si:
- Necesitás offline-first real (la app debe funcionar SIN conexión y sincronizar
  después).
- Necesitás acceso a APIs nativas no cubiertas por Capacitor (Bluetooth, NFC, etc.).
- Tu volumen de técnicos es >50 y querés la mejor performance posible.

**Costo:** 1–3 meses de un developer. USD 5k–20k dependiendo de la complejidad.

Si en el futuro decidís ir por acá, el camino es:
1. Reimplementar las pantallas en React Native (mismo equipo de devs que conoce
   React, curva de aprendizaje baja).
2. Usar [Expo](https://expo.dev) que simplifica build/publish.
3. Reimplementar el cliente de API (el backend no cambia).
4. Implementar un esquema de sincronización offline (WatermelonDB, SQLite local
   con sync).

---

## Checklist de validación mobile

Una vez deployada la app en producción (PWA o Capacitor), corré esta lista:

- [ ] El técnico puede abrir la URL en el celular y ver la pantalla de login
- [ ] Puede hacer "Agregar a inicio de pantalla" / instalar la app
- [ ] La app instalada abre sin barra de navegador
- [ ] Puede loguearse y ver el dashboard
- [ ] Puede navegar a Equipo y abrir el modal de QR
- [ ] Puede escanear un QR con la cámara del celular (de otro equipo) y que lo
      redirija al wizard de carga
- [ ] Puede completar un relevamiento y adjuntar una foto sacada en el momento
- [ ] La foto queda guardada y visible después
- [ ] Si tiene señal floja (3G), la app sigue funcionando al menos para login y
      cargar registros (PWA con service worker, o Capacitor con `server.url`
      permite degradar gracefully)

---

## Resumen de tiempos y costos

| Opción | Tiempo de setup | Costo monetario | Apps en stores |
|---|---|---|---|
| PWA | 1–2 días | USD 0 | No |
| Capacitor + stores | 2–3 semanas | USD 25 Google + USD 99/año Apple | Sí |
| React Native | 1–3 meses | USD 5k–20k dev + stores | Sí |

**Mi sugerencia:** empezá con PWA, validá el modelo de uso real con 3–5 técnicos
durante un mes, y decidí si necesitás pasar a Capacitor. En la mayoría de casos
de relevamiento en campo, PWA es suficiente.

---

## Próximo paso

Una vez validada la app en producción, leer `Recomendaciones.md` para ver las
próximas medidas de endurecimiento, monitoreo, backups y cumplimiento normativo
que conviene tener en cuenta.
