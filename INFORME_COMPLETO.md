# INFORME COMPLETO — Novent App (MVP)

> **Fecha:** 12/06/2026
> **Propósito:** Handover técnico completo para desarrollo y mantenimiento
> **Estado general:** ~40% del MVP — Funcional pero con bugs críticos

---

## TABLA DE CONTENIDOS

1. [RESUMEN EJECUTIVO](#1-resumen-ejecutivo)
2. [STACK TECNOLÓGICO](#2-stack-tecnológico)
3. [ESTRUCTURA COMPLETA DEL PROYECTO](#3-estructura-completa-del-proyecto)
4. [ANÁLISIS DE CÓDIGO FUENTE](#4-análisis-de-código-fuente)
5. [ARQUITECTURA DE DATOS (FIRESTORE)](#5-arquitectura-de-datos-firestore)
6. [AUTENTICACIÓN Y SEGURIDAD](#6-autenticación-y-seguridad)
7. [DEPENDENCIAS](#7-dependencias)
8. [CONFIGURACIÓN DEL ENTORNO](#8-configuración-del-entorno)
9. [BUGS CRÍTICOS (MVP BLOCKERS)](#9-bugs-críticos-mvp-blockers)
10. [MEJORAS PRIORITARIAS](#10-mejoras-prioritarias)
11. [DEUDA TÉCNICA Y OBSERVACIONES](#11-deuda-técnica-y-observaciones)
12. [GUÍA DE INICIO RÁPIDO](#12-guía-de-inicio-rápido)

---

## 1. RESUMEN EJECUTIVO

Novent es una plataforma SaaS multi-tenant (multiempresa) para pequeños negocios (barberías, salones). Cubre:

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| CRM (Clientes) | ✅ Funcional | CRUD completo con buscador, historial de ventas, KPIs |
| POS (Ventas) | ✅ Funcional | Punto de venta: seleccionar cliente → producto → registrar venta, descuenta stock |
| Inventario | ✅ Funcional | CRUD de productos, alertas de stock bajo, KPIs |
| Dashboard | ✅ Funcional | KPIs (4 cards), gráfico de barras (7 días), gráfico circular (servicios), feed en vivo |
| Landing | ✅ Funcional | Hero, features, pricing (3 planes) |
| Login / Signup | ✅ Funcional | Auth con Firebase Email/Password |
| WhatsApp | ❌ Placeholder | Solo `<h1>whatsapp</h1>` |
| Notificaciones | ❌ Mock | Datos estáticos, sin motor de notificaciones real |

**Backend:** Firebase Auth + Firestore (100% client-side, sin API server propia)

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | **Next.js** (App Router) | `16.2.6` |
| Lenguaje | **TypeScript** | `^5` (strict) |
| UI | **React** | `19.2.4` |
| Estilos | **Tailwind CSS v4** | `^4` |
| Componentes | **shadcn/ui** (Radix Nova) | `^4.8.1` |
| Backend | **Firebase** (Auth + Firestore) | `12.13.0` |
| Charts | **Recharts** | `3.8.1` |
| Iconos | **Lucide React** | `1.16.0` |
| Toasts | **Sonner** | `2.0.7` |
| Tema | **next-themes** | `0.4.6` |
| Animaciones CSS | **tw-animate-css** | `1.4.0` |
| Build | **Turbopack** (Next.js built-in) | — |
| Linter | **ESLint v9** + `eslint-config-next` | `16.2.6` |
| Package Manager | **npm** | lockfile v3 |

⚠️ **IMPORTANTE:** Esta versión de Next.js (16.2.6) tiene breaking changes. Antes de escribir cualquier código, leer la guía en `node_modules/next/dist/docs/`.

---

## 3. ESTRUCTURA COMPLETA DEL PROYECTO

```
novent-app/
│
├── 📄 .env.example                  # Template de variables de entorno
├── 📄 .env.local                    # ⚠️ LIVE Firebase credentials (COMMITTED!)
├── 📄 .gitignore
├── 📄 AGENTS.md                     # Instrucciones para IA (Next.js breaking changes)
├── 📄 CLAUDE.md                     # Redirige a AGENTS.md
├── 📄 Auditoria_CTO_Novent_MVP.docx # Auditoría generada automáticamente
├── 📄 Auditoria_CTO_Novent_MVP.html # Versión HTML de la auditoría
├── 📄 README.md                     # README default de Next.js
├── 📄 components.json               # Config de shadcn/ui
├── 📄 eslint.config.mjs             # ESLint flat config
├── 📄 firestore.rules               # ⚠️ Reglas de seguridad Firestore (NO desplegadas)
├── 📄 middleware.ts                 # Auth middleware (protección de rutas)
├── 📄 next.config.ts                # Config de Next.js (vacía)
├── 📄 package.json
├── 📄 postcss.config.mjs            # PostCSS + tailwindcss
├── 📄 tsconfig.json                 # TypeScript strict config
│
├── 📁 app/                          # RUTAS / PÁGINAS
│   ├── 📄 layout.tsx                # Layout raíz: sidebar + topbar + auth state
│   ├── 📄 page.tsx                  # Landing page (hero, features, pricing)
│   ├── 📄 globals.css               # Tailwind v4 + variables de tema (dark mode)
│   ├── 📄 notifiactions.tsx         # ⚠️ Typo: "notifiactions" vs "notifications"
│   │
│   ├── 📁 clientes/
│   │   ├── 📄 page.tsx              # CRM: listar, buscar, crear/editar/eliminar clientes
│   │   └── 📁 [id]/
│   │       └── 📄 page.tsx          # Detalle de cliente + historial de ventas
│   │
│   ├── 📁 dashboard/
│   │   ├── 📄 DashboardLayout.tsx   # 💀 CÓDIGO MUERTO (no importado en ningún lado)
│   │   └── 📄 page.tsx              # Dashboard con KPIs, charts, feed en vivo
│   │
│   ├── 📁 inventario/
│   │   └── 📄 page.tsx              # CRUD de productos + alertas de stock
│   │
│   ├── 📁 login/
│   │   └── 📄 page.tsx              # Login email/password + session cookie
│   │
│   ├── 📁 signup/
│   │   └── 📄 page.tsx              # Registro + creación de compañía
│   │
│   ├── 📁 ventas/
│   │   └── 📄 page.tsx              # POS: seleccionar cliente → producto → registrar
│   │
│   └── 📁 whatsapp/
│       └── 📄 page.tsx              # ❌ Placeholder vacío
│
├── 📁 components/
│   ├── 📄 stats-card.tsx            # KPI card reutilizable con gradiente
│   └── 📁 ui/                       # shadcn/ui components (12 archivos)
│       ├── 📄 button.tsx            # CVA button (6 variantes, 5 tamaños)
│       ├── 📄 card.tsx              # Card con header/title/content/footer
│       ├── 📄 dialog.tsx            # Modal dialog (Radix)
│       ├── 📄 dropdown-menu.tsx     # Dropdown completo (Radix)
│       ├── 📄 input.tsx             # Input con estilos
│       ├── 📄 separator.tsx         # Separador horizontal/vertical (Radix)
│       ├── 📄 sheet.tsx             # Panel deslizable (Radix Dialog)
│       ├── 📄 sidebar.tsx           # Sidebar completo con contexto (702 líneas)
│       ├── 📄 skeleton.tsx          # Loading skeleton
│       ├── 📄 sonner.tsx            # Wrapper de Sonner Toaster
│       ├── 📄 table.tsx             # Componente de tabla
│       └── 📄 tooltip.tsx           # Tooltip (Radix)
│
├── 📁 hooks/
│   ├── 📄 use-mobile.ts             # Detección de mobile (< 768px)
│   └── 📄 useAuth.ts                # Hook de Firebase Auth state
│
├── 📁 lib/
│   ├── 📄 authToken.ts              # Guardar JWT de Firebase como cookie
│   ├── 📄 ensureCompany.ts          # Utilidad legacy (auto-crear compañía)
│   ├── 📄 firebase.ts               # Inicialización de Firebase + validación de env vars
│   ├── 📄 getUserCompany.ts         # Obtener companyId del usuario desde Firestore
│   └── 📄 utils.ts                  # cn(): clsx + tailwind-merge
│
├── 📁 public/                       # Assets estáticos (SVGs)
│   ├── 📄 file.svg
│   ├── 📄 globe.svg
│   ├── 📄 next.svg
│   ├── 📄 vercel.svg
│   └── 📄 window.svg
│
├── 📁 scripts/
│   └── 📄 generate-report.mjs       # Genera Auditoria_CTO_Novent_MVP.docx
│
└── 📁 .next/                        # Build artifacts (gitignored)
```

---

## 4. ANÁLISIS DE CÓDIGO FUENTE

### 4.1 Rutas y Páginas

| Ruta | Archivo | Estado | Funcionalidad |
|------|---------|--------|--------------|
| `/` | `app/page.tsx` | ✅ | Landing page con hero, features grid (tarjetas animadas), pricing (3 planes: Básico/Pro/Enterprise), botones CTA |
| `/login` | `app/login/page.tsx` | ✅ | Formulario de login (email + password), llama a Firebase `signInWithEmailAndPassword`, guarda cookie JWT, redirige a `/dashboard`. Links a `/signup` |
| `/signup` | `app/signup/page.tsx` | ✅ | Formulario de registro con nombre, email, password, nombre de negocio. Crea Firebase Auth user + documento en `users/{uid}` + `companies/{companyId}` + `companies/{companyId}/users/{uid}` |
| `/dashboard` | `app/dashboard/page.tsx` | ✅ | 4 KPI cards (ingresos hoy, esta semana, clientes nuevos, ventas hoy), gráfico de barras (7 días), gráfico circular (por servicio), feed de actividad reciente, dialog de bienvenida |
| `/clientes` | `app/clientes/page.tsx` | ✅ | Lista con buscador en tiempo real, KPI cards (total, activos, nuevos, gasto promedio), CRUD en dialog modal, client cards con visitas/gasto total |
| `/clientes/[id]` | `app/clientes/[id]/page.tsx` | ✅ | Detalle: total gastado (con icono), visitas totales, última visita, tabla de historial de ventas |
| `/ventas` | `app/ventas/page.tsx` | ✅ | POS: 3 pasos — (1) buscar/seleccionar cliente, (2) buscar/seleccionar producto con precio, (3) cantidad → registrar venta. Descuenta stock vía Firestore transaction |
| `/inventario` | `app/inventario/page.tsx` | ✅ | CRUD: listar, buscar, crear/editar/eliminar. KPI cards (total productos, stock bajo, valor total, producto top). Alertas visuales para stock bajo |
| `/whatsapp` | `app/whatsapp/page.tsx` | ❌ | Placeholder — solo `<h1>whatsapp</h1>` |
| `/notifiactions` | `app/notifiactions.tsx` | ❌ | **No es una ruta real** (no está dentro de una carpeta). Typo en nombre del archivo. Datos mock |

### 4.2 Componentes Compartidos

| Componente | Archivo | Líneas | Props | Descripción |
|-----------|---------|--------|-------|-------------|
| `StatsCard` | `components/stats-card.tsx` | ~60 | `title, value, icon, gradient` | Card con gradiente de fondo, icono Lucide, glow effect, tipografía mono para números |
| `Button` | `components/ui/button.tsx` | ~60 | `variant, size, asChild` | 6 variantes: default, secondary, destructive, outline, ghost, link. 5 tamaños: default, sm, lg, xs, icon |
| `Card` | `components/ui/card.tsx` | ~40 | `asChild` | Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter |
| `Dialog` | `components/ui/dialog.tsx` | ~50 | — | Modal basado en Radix Dialog con overlay, close button animado |
| `DropdownMenu` | `components/ui/dropdown-menu.tsx` | ~150 | — | Sistema completo con trigger, content, item, checkbox, radio, separator, sub, group |
| `Sidebar` | `components/ui/sidebar.tsx` | ~702 | `collapsible, side, variant` | Sistema de sidebar colapsable con contexto React, atajos de teclado, soporte mobile, animaciones |
| `Table` | `components/ui/table.tsx` | ~50 | — | Table + Header + Body + Footer + Row + Head + Cell + Caption |
| `Toaster` | `components/ui/sonner.tsx` | ~10 | — | Wrapper de Sonner con theme support |
| `Skeleton` | `components/ui/skeleton.tsx` | ~10 | — | Loading placeholder animado |
| `Tooltip` | `components/ui/tooltip.tsx` | ~30 | — | Radix Tooltip con provider |
| `Sheet` | `components/ui/sheet.tsx` | ~120 | `side` | Slide-out panel (basado en Radix Dialog) |
| `Separator` | `components/ui/separator.tsx` | ~20 | `orientation, decorative` | Radix Separator |
| `Input` | `components/ui/input.tsx` | ~30 | — | Input estilizado con focus ring |

### 4.3 Layout Principal (`app/layout.tsx`)

- **Tipo:** Cliente (`"use client"`)
- **Estructura:** `<SidebarProvider>` → `<AppSidebar />` + `<main>` → Topbar (logo notificaciones + user dropdown con logout) → `{children}` → `<Toaster />`
- **Auth:** Importa `useAuth()` para mostrar el sidebar solo si hay usuario autenticado
- **Manejo de estado:** Usuario null → sidebar no se renderiza; usuario existe → sidebar completo

### 4.4 Hooks Personalizados

**`hooks/useAuth.ts`:**
```typescript
// Retorna { user: User | null, loading: boolean }
// Se suscribe a Firebase onAuthStateChanged
// cleanup: unsubscribe on unmount
// Uso: const { user, loading } = useAuth()
```

**`hooks/use-mobile.ts`:**
```typescript
// Retorna booleano: true si el viewport es < 768px
// Usa matchMedia, se actualiza en resize
```

### 4.5 Servicios / Librerías

| Archivo | Exporta | Descripción |
|---------|---------|-------------|
| `lib/firebase.ts` | `auth, db` | Inicializa Firebase con 6 env vars. Valida que TODAS existan (throws si falta alguna). Usa `getApp()` para singleton |
| `lib/authToken.ts` | `saveSession(user)` | Obtiene ID token de Firebase, lo guarda como cookie `firebase-auth-token` con expiración de 7 días. Usa `document.cookie` |
| `lib/getUserCompany.ts` | `getUserCompany(uid)` | Lee `users/{uid}` de Firestore, retorna `{ companyId, nombre }` |
| `lib/ensureCompany.ts` | `ensureCompany(uid, email)` | Legacy: verifica si existe `users/{uid}`, si no, crea company + user docs. **Cuidado: función legacy que podría interferir** |
| `lib/utils.ts` | `cn()` | `clsx` + `tailwind-merge` para merge de clases condicionales |

### 4.6 Middleware (`middleware.ts`)

```typescript
// Protege las rutas: /dashboard, /clientes, /ventas, /inventario, /whatsapp
// Lee cookie "firebase-auth-token"
// Decodifica el JWT (base64), verifica exp
// Si token inválido/expirado → redirect a /login
// Si token válido → next()
// Rutas públicas: /, /login, /signup
```

⚠️ El middleware actual decodifica el JWT manualmente (base64). No verifica la firma del token (no tiene la clave pública de Firebase). Solo verifica `exp`. Esto es suficiente para UI redirect pero NO es seguridad real.

---

## 5. ARQUITECTURA DE DATOS (FIRESTORE)

### 5.1 Colecciones y Documentos

```
📁 users/{uid}
    ├── email: string
    ├── companyId: string (ref → companies/{companyId})
    ├── nombre: string (opcional)
    ├── role: string ("admin")
    └── createdAt: Timestamp

📁 companies/{companyId}
    ├── name: string
    ├── owner: string (uid)
    └── createdAt: Timestamp
    │
    ├── 📁 clientes/{id}
    │   ├── nombre: string
    │   ├── telefono: string
    │   ├── estado: string ("Activo")
    │   ├── ultimaVisita: string (fecha ISO)
    │   ├── visitas: number
    │   └── totalGastado: number
    │
    ├── 📁 ventas/{id}
    │   ├── cliente: string (ref → clientes/{id})
    │   ├── servicio: string (nombre del producto al momento de la venta)
    │   ├── precio: number
    │   ├── fecha: string (ISO date)
    │   ├── hora: string (opcional, ISO time)
    │   ├── productoId: string (ref → inventario/{id})
    │   └── cantidad: number
    │
    ├── 📁 inventario/{id}
    │   ├── nombre: string
    │   ├── categoria: string
    │   ├── precio: number
    │   └── stock: number
    │
    └── 📁 users/{uid}
        ├── email: string
        ├── role: string ("admin")
        └── createdAt: Timestamp
```

### 5.2 Reglas de Seguridad (`firestore.rules`)

El archivo existe en el repo pero **NO está desplegado**. Define:

```
rules_version = '2';

function isInCompany(companyId) {
    return request.auth != null
        && exists(/databases/$(database)/documents/companies/$(companyId)/users/$(request.auth.uid));
}

// Solo lectura/escritura si el usuario pertenece a la compañía
match /companies/{companyId}/{document=**} {
    allow read, write: if isInCompany(companyId);
}

// Cada usuario solo puede leer/escribir su propio documento
match /users/{uid} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

⚠️ **SIN ESTAS REGLAS, cualquier usuario autenticado puede leer/escribir datos de cualquier compañía. Esto es crítico.**

### 5.3 Patrones de Acceso a Datos

Todas las consultas se hacen desde el cliente vía Firebase SDK:

```typescript
// Lectura en tiempo real (onSnapshot)
useEffect(() => {
    const unsub = onSnapshot(
        query(collection(db, "companies", companyId, "clientes"), orderBy("nombre")),
        (snapshot) => { ... }
    );
    return () => unsub();
}, [companyId]);

// Escritura
await addDoc(collection(db, "companies", companyId, "inventario"), { nombre, categoria, precio, stock });

// Transacciones (en ventas)
await runTransaction(db, async (transaction) => {
    // 1. Leer producto y cliente
    // 2. Verificar stock suficiente
    // 3. Crear venta
    // 4. Descontar stock
    // 5. Actualizar cliente (visitas++, totalGastado, ultimaVisita)
});
```

⚠️ **No hay paginación** — todas las consultas traen TODOS los documentos. Con muchos datos (>1000), esto romperá.

---

## 6. AUTENTICACIÓN Y SEGURIDAD

### 6.1 Flujo de Autenticación

```
Signup:
  1. Firebase Auth: createUserWithEmailAndPassword(email, password)
  2. Firestore: create company doc → create user doc → create company-membership doc
  3. saveSession(user) → guarda cookie "firebase-auth-token" con JWT

Login:
  1. Firebase Auth: signInWithEmailAndPassword(email, password)
  2. saveSession(user) → guarda cookie

Middleware (cada request):
  1. Lee cookie "firebase-auth-token"
  2. Decodifica JWT (base64)
  3. Verifica exp > Date.now()/1000
  4. Si inválido → redirect a /login
```

### 6.2 Problemas de Seguridad Conocidos

| # | Problema | Severidad | Acción Requerida |
|---|---------|-----------|------------------|
| 1 | `.env.local` con credenciales LIVE commiteado al repo | 🔴 CRÍTICO | Borrar del historial de git, añadir a `.gitignore`, rotar las keys de Firebase |
| 2 | Firestore Security Rules NO desplegadas | 🔴 CRÍTICO | Desplegar YA via `firebase deploy --only firestore:rules` |
| 3 | Middleware no verifica firma del JWT | 🟡 ALTO | Implementar verificación con Firebase Admin SDK en edge runtime |
| 4 | No hay Firebase App Check | 🟡 ALTO | Implementar App Check para prevenir abuse de Firebase desde fuera de la app |
| 5 | No hay verificación de email | 🟡 MEDIO | Usar `sendEmailVerification()` y chequear `user.emailVerified` |
| 6 | No hay rate limiting en auth | 🟡 MEDIO | Implementar Firebase Auth blocking functions o CloudFlare |
| 7 | No hay CAPTCHA en signup | 🟡 MEDIO | Agregar Firebase Auth con Proveedor de reCAPTCHA |
| 8 | No hay auditoría de acciones | 🟢 BAJO | Implementar log de acciones en Firestore para trazabilidad |

---

## 7. DEPENDENCIAS

### Producción (16 paquetes)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `next` | `16.2.6` | Framework React con SSR/App Router |
| `react` | `19.2.4` | UI library |
| `react-dom` | `19.2.4` | React DOM renderer |
| `firebase` | `12.13.0` | Firebase Auth + Firestore SDK |
| `class-variance-authority` | `^0.7.1` | Variantes de componentes |
| `clsx` | `^2.1.1` | Clases condicionales |
| `lucide-react` | `^1.16.0` | Iconos SVG |
| `next-themes` | `^0.4.6` | Modo dark/light |
| `radix-ui` | `^1.4.3` | Componentes headless accesibles |
| `recharts` | `^3.8.1` | Gráficos (barra, circular) |
| `shadcn` | `^4.8.1` | CLI de shadcn/ui |
| `sonner` | `^2.0.7` | Toast notifications |
| `tailwind-merge` | `^3.6.0` | Merge inteligente de clases Tailwind |
| `tw-animate-css` | `^1.4.0` | Utilidades de animación para Tailwind |

### Dev (7 paquetes)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@tailwindcss/postcss` | `^4` | Plugin PostCSS para Tailwind v4 |
| `@types/node` | `^20` | Tipos de Node.js |
| `@types/react` | `^19` | Tipos de React |
| `@types/react-dom` | `^19` | Tipos de ReactDOM |
| `docx` | `^9.7.1` | Generación de documentos .docx (para scripts de auditoría) |
| `eslint` | `^9` | Linter |
| `eslint-config-next` | `16.2.6` | Config ESLint de Next.js |
| `tailwindcss` | `^4` | Tailwind CSS |
| `typescript` | `^5` | Compilador TS |

### Scripts Disponibles

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint ."
}
```

---

## 8. CONFIGURACIÓN DEL ENTORNO

### 8.1 Variables de Entorno Requeridas

Todas con prefijo `NEXT_PUBLIC_` (expuestas al cliente):

| Variable | Valor (actual en `.env.local`) |
|----------|-------------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyAKdFZ7WcnO-nJ8ZXKEVFnmy-kNrrzOtxE` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `novent-app.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `novent-app` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `novent-app.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `129747686980` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:129747686980:web:4d439e4c5905c275d98e11` |

⚠️ **`.env.local` está commiteado.** Los valores `NEXT_PUBLIC_` son visibles en el cliente de todas formas (Firebase lo requiere), pero el riesgo es que alguien clonando el repo tenga acceso directo al proyecto de Firebase.

### 8.2 Archivos de Configuración

| Archivo | Detalles |
|---------|----------|
| `tsconfig.json` | Strict mode, `@/*` → root, bundler module resolution, ES2017 target, JSX react-jsx |
| `next.config.ts` | **VACÍO** — sin configuración personalizada |
| `postcss.config.mjs` | Solo `@tailwindcss/postcss` |
| `eslint.config.mjs` | Flat config: `core-web-vitals` + `typescript` rules |
| `components.json` | shadcn/ui: Radix Nova style, RSC enabled, lucide icons, neutral base, CSS variables |
| `firestore.rules` | Reglas de seguridad multi-tenant (NO desplegadas) |
| `middleware.ts` | Protege rutas con cookie JWT |

### 8.3 Proyecto Firebase

- **Project ID:** `novent-app`
- **Auth:** Email/Password (habilitado)
- **Firestore:** En modo nativo, sin reglas desplegadas
- **Storage:** Bucket creado pero no usado
- **Console:** https://console.firebase.google.com/project/novent-app/

---

## 9. BUGS CRÍTICOS (MVP BLOCKERS)

### 🔴 P1 — Firestore Security Rules sin desplegar

**Archivo:** `firestore.rules` (existe en local)
**Impacto:** Cualquier usuario autenticado puede leer/escribir datos de cualquier compañía. **Riesgo de fuga de datos masiva.**
**Solución:**
```bash
# Instalar Firebase CLI si no está
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 🔴 P2 — `.env.local` commiteado en git

**Archivo:** `.env.local`
**Impacto:** Credenciales de Firebase expuestas en el historial de git.
**Solución:**
```bash
# 1. Añadir a .gitignore (ya está, pero el archivo ya fue commiteado)
# 2. Remover del tracking
git rm --cached .env.local
# 3. Rotar las API keys en Firebase Console (proyecto novent-app)
# 4. Hacer squash de commits si es posible
```

### 🟡 P3 — Sin paginación en consultas Firestore

**Archivos:** Todos los pages (`clientes`, `ventas`, `inventario`)
**Impacto:** Con >1000 documentos, la app consumirá memoria excesiva y será lenta.
**Solución:** Implementar `limit()`, `startAfter()`, y paginación virtual o infinite scroll.

### 🟡 P4 — Tipos duplicados (no DRY)

**Archivos:** `app/clientes/page.tsx`, `app/clientes/[id]/page.tsx`, `app/ventas/page.tsx`, `app/inventario/page.tsx`, `app/dashboard/page.tsx`
**Problema:** Los tipos `Cliente`, `Venta`, `Producto` están definidos manualmente en 4+ archivos. Si cambia la estructura, hay que actualizar en todos lados.
**Solución:** Crear `types/index.ts` con tipos compartidos e importarlos.

### 🟡 P5 — Sin loading states ni error boundaries

**Archivos faltantes:** `loading.tsx`, `error.tsx`, `not-found.tsx`
**Impacto:** Experiencia de usuario pobre: pantallas en blanco mientras cargan datos, sin manejo de errores.
**Solución:** Crear archivos de loading/error por segmento de ruta.

---

## 10. MEJORAS PRIORITARIAS

### Inmediatas (Sprint Actual)

| # | Tarea | Archivos | Esfuerzo |
|---|-------|----------|----------|
| 1 | Desplegar Firestore Security Rules | `firestore.rules` | 30 min |
| 2 | Remover `.env.local` de git | `.gitignore`, git rm | 15 min |
| 3 | Crear `types/index.ts` con tipos compartidos | Nuevo archivo + refactor de 4 pages | 2-4 horas |
| 4 | Añadir `loading.tsx` en `/dashboard`, `/clientes`, `/ventas`, `/inventario` | Nuevos archivos | 2 horas |
| 5 | Añadir `error.tsx` en segmentos principales | Nuevos archivos | 1 hora |

### Corto Plazo (Siguientes 2 Sprints)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 6 | Implementar paginación en Firestore (limit + startAfter) | Alta |
| 7 | Implementar verificación de email | Alta |
| 8 | Remover `DashboardLayout.tsx` (dead code) | Media |
| 9 | Renombrar `notifiactions.tsx` → `notifications/` | Baja |
| 10 | Implementar módulo de WhatsApp (Twilio / WAPI) | Alta |
| 11 | Implementar sistema de notificaciones real | Alta |
| 12 | Agregar meta tags `<title>` en todas las páginas | Media |
| 13 | Implementar `metadata` exports para SEO | Media |
| 14 | Agregar Firebase App Check | Alta |
| 15 | Implementar dynamic imports para Recharts | Media |

### Mediano Plazo

| # | Tarea | Prioridad |
|---|-------|-----------|
| 16 | Configurar Firebase Admin SDK + API routes de Next.js | Media |
| 17 | Agregar i18n (UI en español, soporte multi-idioma preparado) | Baja |
| 18 | Implementar tests (Jest + React Testing Library + Playwright) | Media |
| 19 | Agregar service worker + PWA (offline support) | Baja |
| 20 | Configurar CI/CD (GitHub Actions → Vercel/Firebase) | Media |
| 21 | Implementar auditoría de acciones (logs en Firestore) | Baja |
| 22 | Agregar pages de pricing real (con Stripe integration) | Media |

---

## 11. DEUDA TÉCNICA Y OBSERVACIONES

### Código Muerto

- **`app/dashboard/DashboardLayout.tsx`** — No importado en ningún lado. Eliminar.

### Convenciones y Estilo

| Aspecto | Observación |
|---------|-------------|
| **Idioma** | UI en español, código en inglés (consistente) |
| **Naming** | PascalCase (components), camelCase (variables/funciones), kebab-case (files) ✅ |
| **Imports** | Path alias `@/` ✅ |
| **Tipado** | TypeScript strict mode ✅ (pero tipos duplicados ❌) |
| **Comentarios** | Pocos comentarios, código autoexplicativo en su mayoría ✅ |
| **Componentes** | shadcn/ui pattern con CVA variants ✅ |
| **CSS** | Tailwind utility classes, dark theme por defecto ✅ |
| **Estado** | Solo `useState`/`useEffect` local (sin Redux/Zustand) — adecuado para el tamaño actual |

### Archivos con Problemas

| Archivo | Problema |
|---------|----------|
| `app/notifiactions.tsx` | **Typo** en el nombre del archivo (`notifiactions` en vez de `notifications`). Además es un page que no está dentro de una carpeta con el mismo nombre, lo que rompe el routing de Next.js App Router. |
| `.env.local` | Commiteado con credenciales reales |
| `middleware.ts` | Decodifica JWT manualmente sin verificar firma |
| `lib/ensureCompany.ts` | Función legacy que podría causar duplicación de datos si se ejecuta junto con el flujo de signup actual |
| `app/layout.tsx` | `html lang="en"` pero todo el contenido está en español |

### Métricas de Calidad

| Métrica | Valor |
|---------|-------|
| Archivos .ts/.tsx totales | ~30 |
| Líneas de código totales | ~5000-7000 |
| Componentes shadcn/ui | 12 |
| Tests | **0** (cero) |
| Cobertura de tipos | Parcial (tipos duplicados) |
| Accesibilidad | Básica (Radix UI provee ARIA por defecto, pero sin verificación) |
| Bundle size | Desconocido (no auditado) |
| Lighthouse score | No medido |

---

## 12. GUÍA DE INICIO RÁPIDO

### Requisitos

- Node.js 18+ (recomendado 22)
- npm 9+
- Firebase CLI (para deploy de rules)

### Instalación

```bash
# 1. Clonar
git clone <repo-url>
cd novent-app

# 2. Instalar dependencias
npm install

# 3. Verificar variables de entorno
# Asegurarse de que .env.local existe con las 6 variables Firebase
# (están commiteadas por ahora, pero no es lo ideal)

# 4. Iniciar desarrollo
npm run dev
# → Abrir http://localhost:3000
```

### Comandos Útiles

```bash
npm run dev        # Desarrollo con Turbopack
npm run build      # Build de producción
npm run start      # Servir build de producción
npm run lint       # Linting (ESLint)
```

### Deploy de Firestore Rules

```bash
# Primera vez
npm install -g firebase-tools
firebase login
firebase init firestore  # Si no está inicializado

# Deploy
firebase deploy --only firestore:rules
```

### Flujo de Trabajo Recomendado

1. **Sprint 0 — Seguridad:** Desplegar Firestore Rules + rotar keys + App Check
2. **Sprint 1 — Estabilización:** Paginación, shared types, loading states, error boundaries
3. **Sprint 2 — Features core:** WhatsApp integration, notificaciones reales
4. **Sprint 3 — Infraestructura:** Tests, CI/CD, SEO, PWA

---

## APÉNDICE: REFERENCIA RÁPIDA

### Estructura de Componentes shadcn/ui

Todos los componentes de UI siguen el patrón de Radix Nova:
- Uso de `data-slot` attributes para estilizado
- `cn()` para merge de clases
- `forwardRef` para ref forwarding
- Variants via `cva()` de class-variance-authority
- `Slot` de Radix para `asChild` pattern

### Reglas de Negocio Implementadas

1. **Creación de venta:** Descuenta stock automáticamente (Firestore transaction)
2. **Stock bajo:** Alerta cuando stock ≤ 5 unidades
3. **Cliente recurrente:** Al registrar venta, actualiza `visitas++`, `totalGastado += precio`, `ultimaVisita = today`
4. **Dashboard:** Datos de los últimos 7 días, clientes nuevos vs totales
5. **Multi-tenancy:** Todos los datos se almacenan bajo `companies/{companyId}/`

### Firebase Console

- **URL:** https://console.firebase.google.com/project/novent-app/
- **Auth:** Email/Password
- **Firestore:** Sin reglas desplegadas
- **Project Owner:** Verificar en Firebase Console

---

*Documento generado el 12/06/2026. Para preguntas o actualizaciones, actualizar este archivo.*
