# Recomendaciones de producción — App Jardín Ground

Documento de referencia con las medidas de **endurecimiento, monitoreo, backups,
seguridad y cumplimiento normativo** que conviene implementar una vez que la app
está en producción (después de seguir `Implementacion_Web.md` y, eventualmente,
`Migracion_App_Mobile.md`).

Este documento cubre el **paso 5** de la guía de producción. Las recomendaciones
están ordenadas por prioridad. Las críticas (rojas) deberías hacerlas el primer
mes. Las importantes (amarillas) en los primeros 3 meses. Las opcionales (verdes)
cuando el sistema lo justifique.

---

## 🔴 Críticas — Primer mes

### 1. Cambiar la contraseña del admin semilla

**Por qué:** el usuario `alberto-casas` con contraseña `celestial` está en el
seed de Prisma (`backend/prisma/seed.js:17`). Si la app se publica y esa cuenta
queda accesible, **cualquiera puede entrar como administrador**.

**Cómo:** hoy la app no tiene pantalla de "cambiar mi contraseña" (verificar
en `frontend/src/pages/PersonalPage.jsx`). Mientras tanto:

```bash
# Conectate a la DB de producción y generá un hash nuevo
node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_NUEVO', 12))"
```

Y en la DB:

```sql
UPDATE "Personal" SET "contrasenaHash" = '<hash-generado>' WHERE username = 'alberto-casas';
```

### 2. Backups automáticos de la base de datos

**Por qué:** la DB tiene **toda la información de negocio**: usuarios, equipos,
registros de relevamiento, fotos (referencias). Si se pierde, perdés todo.

**Cómo:**

- **Si usás Neon**: los backups automáticos están incluidos en su plan pago.
  Free tier tiene solo 7 días de history, **insuficiente**. Pasá al plan Launch
  (USD 19/mes) que te da 30 días.
- **Si usás Supabase**: idem, plan Pro (USD 25/mes) tiene backups diarios
  con point-in-time recovery.
- **Si querés backups propios**: configurá un cron job que corra `pg_dump` y
  suba el archivo a S3/R2 con retención de 30 días. Hay doc en cada proveedor
  de Postgres.

**Verificación mensual:** una vez por mes, **restaurá un backup en una DB de
pruebas y verificá que la app funcione**. Un backup que nunca probaste no es
un backup, es una esperanza.

### 3. HTTPS obligatorio

**Por qué:** ya quedó configurado en el paso 3 de `Implementacion_Web.md`
(Vercel + Railway lo dan gratis). Pero **verificá**:

- [ ] La app carga solo con `https://`, no con `http://`
- [ ] Las redirecciones 301 de `http://` a `https://` funcionan
- [ ] El certificado está vigente (no vence en los próximos 30 días)
- [ ] HSTS está habilitado en Vercel (lo activan por default)

**Particular en iOS:** sin HTTPS, Safari no habilita la cámara. Si los técnicos
tienen iPhone, esto es **bloqueante**.

### 4. Variables de entorno fuera del repositorio

**Por qué:** el archivo `backend/.env` tiene el `JWT_SECRET`, la `DATABASE_URL`
y `APP_BASE_URL`. **No debe commitearse al repo**. Verificá:

- [ ] `backend/.env` está en `.gitignore` (debería estarlo)
- [ ] Las credenciales están en las "Environment Variables" de Railway/Render
- [ ] Nadie commiteó un `.env` con credenciales reales en el pasado (revisá
  con `git log -p | grep -i jwt_secret` o similar)

Si alguna vez commiteaste credenciales por accidente: **rotalas inmediatamente**.
Asumí que están comprometidas. No alcanza con borrarlas en un commit futuro,
porque siguen en el historial de Git.

---

## 🟡 Importantes — Primeros 3 meses

### 5. Logs centralizados

**Por qué:** cuando algo falla en producción, necesitás ver qué pasó. Los logs
de Railway/Render se rotan y se pierden después de N días. Para auditoría a
mediano plazo, centralizás.

**Opciones gratuitas o muy baratas:**
- **Papertrail** (papertrailapp.com): free tier 50 MB/mes, 7 días de retención.
- **Logtail** (logtail.com): free tier 1 GB/mes, 30 días de retención.
- **CloudWatch** de AWS: si ya estás en AWS, integrable.

**Cómo:** en `backend/src/app.js` o en el entrypoint, agregar un transport de
winston o pino al servicio elegido. Railway te da un puerto de syslog, así
que Papertrail se configura en 5 minutos.

### 6. Monitoreo de uptime

**Por qué:** si el backend se cae a las 3 AM, querés enterarte antes que el
primer técnico del lunes a las 7 AM.

**Herramientas gratuitas:**
- **UptimeRobot** (uptimerobot.com): free tier, 50 monitores, chequea cada
  5 minutos. Te manda email/Slack si algo no responde.
- **BetterStack** (betterstack.com): alternativa moderna.
- **Cronitor**: igual, con UI más linda.

**Configurar:**
- 1 monitor HTTP en `https://api.jardinground.com/api/health` (o crear el
  endpoint si no existe)
- 1 monitor HTTP en `https://app.jardinground.com/`
- Alertas a un canal de Slack/Discord/email del equipo

### 7. Rate limiting

**Por qué:** hoy cualquier persona puede hacer miles de requests a `/api/auth/login`
intentando adivinar contraseñas. **Brute force básico**.

**Cómo:** instalar `express-rate-limit`:

```bash
cd backend
npm install express-rate-limit
```

En `backend/src/app.js`:

```js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutos
  max: 10,                      // 10 intentos por IP
  message: { error: 'Demasiados intentos. Probá en 15 minutos.' },
});
app.use('/api/auth/login', loginLimiter);
```

Para el resto de la API, un límite global de 100 requests por minuto por IP es
razonable. Ajustar según uso real.

### 8. Política de privacidad y cumplimiento legal

**Por qué:** la app almacena **datos personales** (nombre, apellido de
técnicos y, potencialmente, datos del cliente que releva). En Argentina
aplica la **Ley 25.326 de Protección de Datos Personales** y su decreto
reglamentario. Si la app se usa también en otros países, aplican GDPR y
otras.

**Acciones concretas:**

- [ ] Redactar una **Política de Privacidad** que explique qué datos se
  recolectan, con qué fin, quién los accede, cómo se almacenan, cómo se
  eliminan, y cómo el usuario puede ejercer sus derechos (acceso,
  rectificación, supresión).
- [ ] Hospedar esa política en una URL pública (ej. `https://jardinground.com/privacidad`)
  y linkearla desde la app.
- [ ] **Registro como base de datos** ante la Agencia de Acceso a la
  Información Pública (AAIP), si aplica según el tamaño y alcance.
- [ ] Si las fotos tomadas en los relevamientos pueden incluir personas o
  información sensible, documentar el consentimiento.

**No es un nice-to-have, es un requisito legal.** Consultá con un abogado
si tenés dudas. Un modelo genérico de política de privacidad no aplica, tiene
que reflejar lo que **tu** app hace.

### 9. Auditoría: ¿quién hizo qué?

**Por qué:** si mañana un registro fue cargado con datos falsos o se eliminó
un usuario importante, necesitás saber quién y cuándo.

**Cómo:** hoy el modelo `Registro` ya tiene `personalId` (quién lo creó)
y `fechaHora` (cuándo). Eso es bueno. Lo que falta:

- [ ] Un log de **eliminaciones** (no solo de creaciones). Hoy si un supervisor
  borra un registro, no queda traza.
- [ ] Un log de **cambios de configuración** (crear/editar formularios, equipos).
- [ ] Un endpoint o vista en la pantalla de Reportes que muestre "registros
  eliminados en los últimos 30 días" (baja lógica, sección 7.7).

Es laburo de 1 semana. No urge el día 1, pero urge en el mes 3.

### 10. Manejo de errores en el frontend

**Por qué:** hoy si el backend se cae, el frontend muestra "Credenciales
inválidas" (en `LoginPage.jsx:38`) o un toast genérico. Eso confunde al
usuario y no te ayuda a vos a diagnosticar.

**Acciones concretas:**

- [ ] Distinguir **errores de red** (backend caído) de **errores 4xx** (input
  inválido) y mostrar mensajes distintos.
- [ ] Un **Error Boundary** global en `App.jsx` que muestre una pantalla de
  "Algo salió mal" en vez de dejar la app en blanco.
- [ ] Logs de errores del frontend a un servicio tipo **Sentry** (sentry.io,
  free tier generoso).

---

## 🟢 Opcionales — Cuando el sistema lo justifique

### 11. Migrar uploads a Cloudflare R2 o S3

**Por qué:** hoy las fotos se guardan en el disco del backend. Si el contenedor
se reinicia, se pierden. Si el disco se llena, la app falla.

**Cuándo hacerlo:** cuando notes que el disco del backend está creciendo
rápido o cuando tengas >5 GB de fotos. Antes, no urge.

**Cómo:** ya está explicado en `Implementacion_Web.md` sección 1.4.

### 12. CI/CD automático

**Por qué:** hoy deployás manualmente o con auto-deploy de Railway/Vercel.
Está bien para arrancar. Cuando el equipo crezca o haya múltiples personas
tocando el código, conviene tener:

- **Lint** (eslint) en cada PR
- **Tests** automáticos (no tenés hoy, vale la pena agregar al menos smoke tests)
- **Build** de producción en cada PR para detectar errores antes del deploy
- **Preview deploys** automáticos por PR (Vercel y Railway los dan gratis)

**Herramientas:** GitHub Actions, GitLab CI, CircleCI. Cualquiera anda.

### 13. Auditoría de seguridad externa

**Por qué:** antes de que la app maneje datos sensibles de verdad, conviene
que un profesional de seguridad le pegue un repaso. Cosas que revisan:

- Inyección SQL (Prisma lo mitiga, pero vale chequear)
- XSS en campos de texto (React lo mitiga, pero si usás `dangerouslySetInnerHTML`
  en algún lado, ojo)
- CSRF en formularios (no aplica si usás JWT en headers, como parece ser tu caso)
- Dependencias desactualizadas con vulnerabilidades (`npm audit` lo detecta)
- Configuración de CORS
- Permisos de archivos subidos

**Cuándo:** una vez por año, o antes de un release importante.

### 14. Soporte multiidioma

**Por qué:** hoy toda la UI está en español argentino. Si la app se usa en
otros países, va a hacer falta.

**Cuándo:** cuando tengas usuarios en otro país o por requerimiento contractual.
Antes, no urge.

**Cómo:** usar `react-i18next` o `react-intl`. Es laburo de 1–2 semanas para
extraer todos los strings a archivos de traducción.

### 15. Modo offline real

**Por qué:** los técnicos en campo pueden estar en zonas sin señal. Hoy si no
hay internet, no pueden cargar registros. La app debería:

- Guardar el registro localmente (en IndexedDB o SQLite local)
- Sincronizar cuando vuelva la conexión
- Mostrar un indicador visual de "pendiente de sincronizar"

**Cuándo:** cuando varios técnicos se quejen de "no pude cargar porque no
tenía señal".

**Cómo:** pasar a **Opción 3** (React Native + sync) o usar **PouchDB/CouchDB**
si te querés quedar en web. Es un proyecto entero, no es para hacer en un
fin de semana.

### 16. Notificaciones push

**Por qué:** hoy la app no avisa nada. Si querés notificar a supervisores
cuando se carga un relevamiento, o a técnicos cuando se les asigna una tarea,
necesitás push.

**Cuándo:** cuando el flujo de trabajo lo justifique.

**Cómo:**
- **Web**: usar la API de Push del browser + service worker (limitado en iOS).
- **Mobile con Capacitor**: `@capacitor/push-notifications` + Firebase Cloud
  Messaging (FCM).
- **Mobile con React Native**: `notifee` o `@react-native-firebase/messaging`.

### 17. Versión de la app y changelog

**Por qué:** cuando los técnicos reporten "la app no anda", necesitás saber
qué versión están corriendo. Hoy no hay forma.

**Acciones concretas:**

- [ ] Mostrar la versión en el pie de la app (ej. "v1.2.3") desde una variable
  de build de Vite (`import.meta.env.VITE_APP_VERSION`)
- [ ] En el package.json, mantener un campo `version` que se incremente con cada
  release
- [ ] Un CHANGELOG.md en la raíz del repo con qué cambió en cada versión
- [ ] En el caso mobile, forzar update si la versión del backend no es
  compatible (header `X-Min-Client-Version` que el frontend respeta)

---

## Resumen de prioridades

| Cuándo | Qué |
|---|---|
| **Día 1** | Cambiar password del admin, verificar HTTPS, verificar `.env` no commiteado |
| **Semana 1** | Backups automáticos, rate limiting, monitoreo de uptime |
| **Mes 1** | Política de privacidad publicada, logs centralizados |
| **Mes 3** | Auditoría de "quién hizo qué" (logs de cambios/eliminaciones), Error Boundary en frontend |
| **Año 1** | Auditoría de seguridad externa, plan de disaster recovery documentado |
| **Cuando duela** | Migrar uploads a S3/R2, soporte multiidioma, modo offline real, push |

---

## Documentos relacionados

- `Implementacion_Web.md` — paso a paso para deployar la app en la web
- `Migracion_App_Mobile.md` — paso a paso para convertir la web en PWA o app nativa
- `Especificacion_Tecnica_App_Jardin_Ground.docx` — especificación funcional original
  (fuente de verdad para las reglas de negocio)
