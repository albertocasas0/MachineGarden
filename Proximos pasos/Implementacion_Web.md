# Implementación Web — App Jardín Ground

Guía paso a paso para pasar la app de "funciona en localhost" a "funciona en internet
con dominio propio, HTTPS, y lista para técnicos en campo".

Este documento cubre los pasos 1 (auditoría), 2 (hosting) y 3 (dominio/HTTPS/DNS) de la
guía de producción. La parte mobile (PWA / Capacitor / stores) está en `Migracion_App_Mobile.md`.

---

## Paso 1 — Auditoría del código antes de publicar

Hay 5 cambios que son **obligatorios** antes del primer deploy. Hoy la app está bien
para desarrollo, pero si la subís tal cual, vas a tener problemas serios.

### 1.1 Cambiar `JWT_SECRET` por un valor aleatorio fuerte

**Archivo:** `backend/.env`

**Por qué:** hoy es un literal (`jardin-ground-dev-secret-cambiar-en-produccion`) que
está visible en el repositorio. Si alguien lo ve, puede firmar tokens válidos para
cualquier usuario, incluyendo el admin.

**Cómo:** generá un valor aleatorio seguro. En PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Pegá el resultado en `backend/.env` reemplazando la línea:

```
JWT_SECRET="<pegar-acá-el-valor-generado>"
```

En producción **no commitees** el `.env`. Cada proveedor de hosting (Railway, Vercel,
Render) tiene su propia UI de "Environment Variables" — usá esa.

### 1.2 Cambiar `APP_BASE_URL` al dominio público

**Archivo:** `backend/.env`

**Por qué:** la URL que se codifica dentro de cada QR se construye con este valor
(en `backend/src/controllers/qrController.js:16`). Si queda `http://localhost:5173`,
el QR que imprimas y pegues en una máquina **no va a funcionar en campo** porque
el celular del técnico no resuelve `localhost`.

**Cómo:** cambiá la línea a tu dominio público, por ejemplo:

```
APP_BASE_URL="https://app.jardinground.com"
```

Si todavía no compraste el dominio, podés dejar el de Railway/Vercel temporario
(algo como `https://jardin-backend.up.railway.app`) y cambiarlo cuando tengas
el dominio propio. **No te olvides de volver a regenerar los QR** después de
cambiar esta variable, porque los impresos antes van a quedar con la URL vieja.

### 1.3 Cambiar SQLite por PostgreSQL

**Archivo:** `backend/prisma/schema.prisma` (línea 11), más la variable `DATABASE_URL`

**Por qué:** SQLite no soporta múltiples conexiones concurrentes. En producción con
varios técnicos cargando relevamientos a la vez, la base se va a trabar o corromper.
El schema ya tiene un comentario explícito diciendo esto:

```
// v1 usa SQLite para ejecución local sin infraestructura. Migrar a Postgres
// cambiando el `provider` a "postgresql" y ajustando tipos si hace falta.
```

**Cómo:**

1. En el archivo `schema.prisma`, cambiá la línea del datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Generá una nueva `DATABASE_URL` con el connection string de tu Postgres de
   producción (te lo da Neon, Supabase o el servicio que elijas en el paso 2). Formato típico:
   ```
   DATABASE_URL="postgresql://usuario:password@host:5432/jardin_ground?schema=public"
   ```

3. Regenerá el cliente Prisma y corré la migración inicial:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev --name prod_init
   node prisma/seed.js
   ```

4. Verificá que el seed cargó los 6 tipos de máquina, los 6 formularios, los 24
   equipos, los técnicos de prueba y el admin `alberto-casas` con contraseña `celestial`.
   **Cambiá esa contraseña apenas entres** a la app por primera vez (si decidís
   exponer el endpoint de cambio de contraseña; si no, regenerala directo en la DB).

> **Tipos a revisar:** Prisma en SQLite trata `DateTime` de forma laxa. Al migrar a
> Postgres, asegurate de que los campos `fechaHora` (Registro), `fechaCreacion` (Personal)
> y similares se importen correctamente. Si fallan, ajustalos a `@db.Timestamp(3)`.

### 1.4 Subir los archivos (imágenes) a un storage persistente

**Archivo:** `backend/.env` + rethink del directorio `uploads`

**Por qué:** hoy las fotos se guardan en `./uploads` del backend. Si el contenedor
del backend se reinicia o se redeploya, **se pierden todas las imágenes**. Esto es
crítico porque los registros de relevamiento llevan foto.

**Cómo (corto plazo, gratuito):** configurar un volumen persistente en Railway/Render
que mapee a `UPLOAD_DIR` para que el directorio sobreviva redeploys. Es un parche,
no una solución real.

**Cómo (bien hecho):** migrar a Cloudflare R2 o AWS S3.

- **Cloudflare R2**: 10 GB gratis, sin cargo por egress (tráfico de salida), ideal
  para apps chicas. Te dan un endpoint tipo `https://<account>.r2.cloudflarestorage.com`.
- Pasos:
  1. Crear bucket en R2.
  2. Generar Access Key y Secret.
  3. Instalar SDK: `npm i @aws-sdk/client-s3` (R2 es compatible con la API de S3).
  4. Reemplazar `multer.diskStorage` en `backend/src/controllers/registroController.js`
     por `multer-s3` o equivalente.
  5. Cambiar la URL pública que devuelve el endpoint `/api/uploads` para que apunte
     al CDN público de R2 (no al backend).

### 1.5 Subir el `bcrypt cost` de 10 a 12

**Archivos:**
- `backend/prisma/seed.js:17` → `bcrypt.hashSync('celestial', 12)`
- `backend/src/controllers/personalController.js:44` y `:80` → `bcrypt.hashSync(password, 12)`

**Por qué:** `cost = 10` es rápido pero insuficiente para 2026. `cost = 12` cuadruplica
el tiempo de cómputo por hash, lo cual hace que un ataque de fuerza bruta sea mucho
más caro para un atacante. El login pasa de ~50ms a ~200ms, imperceptible para el usuario.

**Cuándo hacerlo:** el día del deploy. No urge.

---

## Paso 2 — Elegir hosting y deployar

### 2.1 Opciones de hosting

Tu app tiene 3 piezas: **base de datos**, **backend Node**, **frontend React**,
más el **storage de imágenes**. Hay tres formas de combinarlas:

#### Opción A — Mínima fricción (recomendada para arrancar)
Costo estimado: **USD 0–25/mes**.

- **Base de datos**: [Neon](https://neon.tech) Postgres (free tier) o
  [Supabase](https://supabase.com) Postgres (free tier). Ambos con backups.
- **Backend (Node)**: [Render](https://render.com) o [Railway](https://railway.app)
  plan hobby (USD 5–7/mes). El free tier de Render duerme el servicio después de
  15 min sin tráfico, lo que **molesta para producción real** porque la primera
  request tarda 30–60 segundos en despertar.
- **Frontend (Vite/React)**: [Vercel](https://vercel.com) o [Netlify](https://netlify.com).
  Free tier generoso, deploy automático desde Git.
- **Storage**: disco del backend el primer mes, después migrar a Cloudflare R2
  (10 GB gratis, sin cargo de egress).

**Tiempo de setup estimado:** 1 día entero la primera vez, ~10 min por cambio
después.

#### Opción B — Todo en un solo lugar
Costo estimado: **USD 25–50/mes**.

- **Railway** o **Fly.io**: deployás backend + Postgres + volumen persistente
  para uploads, todo en la misma plataforma. Menos piezas que coordinar.
  Frontend en Vercel aparte.

#### Opción C — VPS propio
Costo estimado: **USD 10–20/mes** pero más laburo.

- Un VPS (DigitalOcean, Hetzner) con Docker. Vos manejás backups, SSL con Caddy,
  monitoreo. Más control, más responsabilidad. **No lo recomiendo salvo que ya
  tengas experiencia sysadmin.**

**Recomendación: arrancar con Opción A (Railway + Vercel + Neon).** Cuando el
volumen de técnicos crezca y los free tiers queden chicos, migrás sin reescribir nada.

### 2.2 Deploy del backend (Railway como ejemplo)

1. Crear cuenta en Railway.app y conectar el repositorio de GitHub donde está el código.
2. Crear un nuevo proyecto desde el repo, apuntando a la carpeta `backend/`.
3. Railway detecta que es Node. Configurar el comando de start: `npm start`.
4. En la pestaña "Variables", agregar todas las del `.env` actualizadas:
   - `DATABASE_URL` (la de Neon/Supabase)
   - `JWT_SECRET` (el nuevo valor aleatorio)
   - `APP_BASE_URL` (dominio público o temporal de Railway)
   - `PORT=4000`
   - `UPLOAD_DIR=./uploads`
   - `NODE_ENV=production`
5. Configurar el dominio público en "Settings → Networking → Custom Domain".
6. **Antes del primer deploy, correr la migración y el seed manualmente** (o agregar
   al Procfile/start command):
   ```bash
   npx prisma migrate deploy
   node prisma/seed.js
   ```
7. Verificar que la app responda: `curl https://api.jardinground.com/api/health`
   (o el endpoint que tengas).

### 2.3 Deploy del frontend (Vercel como ejemplo)

1. Crear cuenta en Vercel.com y conectar el repo.
2. "New Project" → seleccionar el repo → configurar:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. En "Environment Variables" del proyecto en Vercel, agregar:
   - `VITE_API_URL=https://api.jardinground.com` (si no usás proxy de Vite)
4. Deploy. Vercel te da una URL temporal tipo `jardin-ground.vercel.app`.
5. Configurar dominio custom en "Settings → Domains".

### 2.4 Si usás proxy de Vite (recomendado para dev)

Tu `vite.config.js` ya tiene configurado un proxy:

```js
server: {
  port: 5173,
  proxy: {
    '/api':         { target: 'http://localhost:4000', changeOrigin: true },
    '/uploads':     { target: 'http://localhost:4000', changeOrigin: true },
  },
}
```

Esto **solo aplica en desarrollo**. En producción el build estático de Vite no
incluye este proxy. Tenés dos opciones:

- **A) Configurar CORS en el backend** y apuntar el frontend directo a la URL del
  backend (`https://api.jardinground.com`). Es lo más estándar.
- **B) Configurar redirects en Vercel/Netlify** para que `/api/*` y `/uploads/*`
  vayan al backend. Más complejo, pero evita exponer la URL del backend.

Para empezar, **opción A** es suficiente.

### 2.5 Configurar CORS

**Archivo:** `backend/src/app.js` o donde esté el `app.use(cors())`

Hoy está abierto a cualquier origen. En producción, **limitá a tu dominio de
frontend nada más**:

```js
app.use(cors({
  origin: 'https://app.jardinground.com',
  credentials: true,
}));
```

Si después necesitás que el frontend en Vercel (`*.vercel.app`) siga funcionando
antes de configurar el dominio custom, agregá una lista de orígenes permitidos.

---

## Paso 3 — Dominio, HTTPS y DNS

### 3.1 Comprar el dominio

Recomendación: **Cloudflare Registrar** (https://cloudflare.com/products/registrar).
Es el más barato del mercado (precio mayorista, sin markup) y viene con DNS
incluido que ya usás para otras cosas. Un `.com` o `.com.ar` ronda los USD 10/año.

### 3.2 Configurar los subdominios

Necesitás dos subdominios:

| Subdominio | Apunta a | Para qué |
|---|---|---|
| `app.jardinground.com` | Vercel (frontend) | La app que ven los técnicos |
| `api.jardinground.com` | Railway (backend) | API que consume el frontend |

**Pasos:**

1. En Cloudflare DNS, agregar dos registros CNAME:
   - `app` → `cname.vercel-dns.com` (te lo da Vercel en Settings → Domains)
   - `api` → `<tu-app>.up.railway.app` (te lo da Railway en Settings → Networking)

2. En Vercel, agregar `app.jardinground.com` como dominio del proyecto.
3. En Railway, agregar `api.jardinground.com` como dominio del servicio.

### 3.3 HTTPS automático

Vercel y Railway configuran **HTTPS con Let's Encrypt automáticamente**. No
tenés que hacer nada. Los certificados se renuevan solos cada 90 días.

**Importante en iOS:** Safari **no habilita la cámara en sitios sin HTTPS**.
Si querés que los técnicos puedan escanear QR desde el celular, HTTPS es
obligatorio. Vercel/Railway te lo dan gratis, no hay excusa.

### 3.4 Validación end-to-end post-deploy

Una vez deployado, corré esta lista de verificación:

- [ ] Abrir `https://app.jardinground.com` en el browser → carga la pantalla de login
- [ ] Login con `alberto-casas` / `celestial` → entra al dashboard
- [ ] Crear un equipo nuevo desde la página Equipo
- [ ] Click en el ícono de QR → se abre el modal con el QR visible
- [ ] Click en "Descargar" → baja un PNG de 512×512
- [ ] **Escanear el PNG con el celular** (con la app de cámara nativa) → debe
      abrir `https://app.jardinground.com/relevar/<token>`
- [ ] Esa URL debe llevar al login con `?next=<token>` y, después de loguearse,
      al wizard de carga de relevamiento
- [ ] Crear un registro de prueba con una foto adjunta
- [ ] Verificar que la foto sea visible entrando a Reportes
- [ ] Probar desde un celular real (no emulador): abrir la URL, hacer login,
      escanear otro QR impreso, cargar un registro

Si todos los puntos pasan, **la app está en producción y funcional**.

---

## Resumen de costos (Opción A, mes 1)

| Servicio | Plan | Costo mensual |
|---|---|---|
| Neon Postgres | Free tier (0.5 GB) | USD 0 |
| Railway backend | Hobby | USD 5–7 |
| Vercel frontend | Free tier | USD 0 |
| Cloudflare R2 | Free tier (10 GB) | USD 0 |
| Dominio `.com` | Anual, prorrateado | ~USD 1/mes |
| **Total** | | **USD 6–8/mes** |

Cuando el volumen de técnicos crezca o la base supere los 500 MB, el costo puede
subir a USD 25–50/mes migrando a planes pagos. Pero para arrancar y validar el
producto, este presupuesto es suficiente.

---

## Próximo paso

Una vez validada la app web en producción, seguir con `Migracion_App_Mobile.md`
para convertir la web en PWA o app nativa para Android/iOS.
