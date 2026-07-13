# Auditoría de Seguridad Firestore — Novent App

> **Fecha:** 17/06/2026
> **Auditor:** Revisión de código automatizada
> **Versión del análisis:** Basada en el código fuente del repositorio

---

## 1. ESTRUCTURA REAL DE FIRESTORE

### Colecciones y documentos identificados en el código:

```
📁 users/{uid}
    ├── email: string
    ├── companyId: string        → Referencia a companies/{companyId}
    ├── nombre: string           (opcional)
    ├── role: string             ("admin")
    └── createdAt: Timestamp

📁 companies/{companyId}
    ├── name: string
    ├── owner: string            (uid del creador)
    └── createdAt: Timestamp
    │
    ├── 📁 clientes/{id}
    │     ├── nombre: string
    │     ├── telefono: string
    │     ├── estado: string     ("Activo")
    │     ├── ultimaVisita: string
    │     ├── visitas: number
    │     └── totalGastado: number
    │
    ├── 📁 ventas/{id}
    │     ├── cliente: string    → ref clientes/{id}
    │     ├── servicio: string
    │     ├── precio: number
    │     ├── fecha: string      (ISO date)
    │     ├── hora?: string
    │     ├── productoId: string → ref inventario/{id}
    │     └── cantidad: number
    │
    ├── 📁 inventario/{id}
    │     ├── nombre: string
    │     ├── categoria: string
    │     ├── precio: number
    │     └── stock: number
    │
    └── 📁 users/{uid}
          ├── email: string
          ├── role: string       ("admin")
          └── createdAt: Timestamp
```

---

## 2. FLUJO DE AUTENTICACIÓN COMPLETO

### Signup (`app/signup/page.tsx:39-127`)
```
1. validateCompanyName(collection("companies"), where("name", "==", name))
2. createUserWithEmailAndPassword(email, password)
3. setDoc(companies/{newCompanyId}, { name, owner: user.uid, createdAt })
4. setDoc(users/{user.uid}, { email, companyId, role: "admin", createdAt })
5. setDoc(companies/{companyId}/users/{user.uid}, { email, role: "admin", createdAt })
6. saveSession() → obtiene JWT de Firebase, lo guarda como cookie
7. router.push("/dashboard")
```

### Login (`app/login/page.tsx:39-65`)
```
1. signInWithEmailAndPassword(email, password)
2. saveSession() → obtiene JWT, cookie
3. router.push("/dashboard")
```

### Dashboard y páginas protegidas (ej. `app/(protected)/clientes/page.tsx:74-144`)

Cada página protegida sigue el mismo patrón:
```
1. onAuthStateChanged(auth, (user) => { ... })
2. getUserCompany(user.uid)
     → getDoc(users/{uid})
     → return { companyId, nombre }
3. companyId se almacena en useState<string>
4. Todas las queries usan: collection(db, "companies", companyId, "clientes|ventas|inventario")
```

---

## 3. CÓMO SE OBTIENE Y ALMACENA EL companyId

### Obtención (`lib/getUserCompany.ts`)
```typescript
export async function getUserCompany(uid: string) {
  const ref = doc(db, "users", uid)       // ← CLIENT-SIDE
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  if (!data?.companyId) return null
  return { companyId: data.companyId, nombre: data.nombre }
}
```

Se llama desde el CLIENTE. No hay verificación server-side.

### Almacenamiento inicial (`app/signup/page.tsx:78-97`)
```typescript
const companyRef = doc(collection(db, "companies"))  // ← GENERA ID
const companyId = companyRef.id
await setDoc(companyRef, { name, owner: user.uid, createdAt })
await setDoc(doc(db, "users", user.uid), { email, companyId, role: "admin" })
```

---

## 4. RELACIÓN users/{uid} ↔ companies/{companyId}

**Estructura:** users/{uid} contiene `companyId` como campo string.

**Relación en código:**
1. `users/{uid}.companyId` → apunta a `companies/{companyId}`
2. `companies/{companyId}/users/{uid}` → documento de membresía (creado en signup)
3. La función `getUserCompany()` lee `users/{uid}` y extrae `companyId`
4. No hay verificación de que el usuario realmente pertenezca a esa compañía (sin rules)

---

## 5. TODAS LAS CONSULTAS FIRESTORE QUE PUEDEN SALTARSE EL AISLAMIENTO

### 5.1 Lecturas en el cliente

| Ubicación | Query | Riesgo |
|-----------|-------|--------|
| `app/(protected)/dashboard/page.tsx:151-172` | `collection(db, "companies", companyId, "ventas")` | Alto — usa companyId de useState |
| `app/(protected)/dashboard/page.tsx:178-199` | `collection(db, "companies", companyId, "clientes")` | Alto |
| `app/(protected)/clientes/page.tsx:107-129` | `collection(db, "companies", companyId, "clientes")` | Alto |
| `app/(protected)/clientes/[id]/page.tsx:97-106` | `doc(db, "companies", companyId, "clientes", id)` | Alto |
| `app/(protected)/clientes/[id]/page.tsx:120-147` | `collection(db, "companies", companyId, "ventas")` | Alto |
| `app/(protected)/ventas/page.tsx:144-165` | `collection(db, "companies", companyId, "clientes")` | Alto |
| `app/(protected)/ventas/page.tsx:171-199` | `collection(db, "companies", companyId, "ventas")` | Alto |
| `app/(protected)/ventas/page.tsx:205-226` | `collection(db, "companies", companyId, "inventario")` | Alto |
| `app/(protected)/inventario/page.tsx:118-141` | `collection(db, "companies", companyId, "inventario")` | Alto |
| `lib/getUserCompany.ts:5` | `doc(db, "users", uid)` | Bajo — solo propio uid |

### 5.2 Escrituras en el cliente

| Ubicación | Operación | Query |
|-----------|-----------|-------|
| `app/(protected)/clientes/page.tsx:188-205` | addDoc | `collection(db, "companies", companyId, "clientes")` |
| `app/(protected)/clientes/page.tsx:164-178` | updateDoc | `doc(db, "companies", companyId, "clientes", editingId)` |
| `app/(protected)/clientes/page.tsx:260-269` | deleteDoc | `doc(db, "companies", companyId, "clientes", id)` |
| `app/(protected)/ventas/page.tsx:325-424` | runTransaction | `companies/{companyId}/ventas`, `inventario`, `clientes` |
| `app/(protected)/ventas/page.tsx:468-560` | runTransaction | Delete + revert (misma estructura) |
| `app/(protected)/inventario/page.tsx:173-190` | updateDoc | `doc(db, "companies", companyId, "inventario", editingId)` |
| `app/(protected)/inventario/page.tsx:200-217` | addDoc | `collection(db, "companies", companyId, "inventario")` |
| `app/(protected)/inventario/page.tsx:279-289` | deleteDoc | `doc(db, "companies", companyId, "inventario", id)` |
| `app/signup/page.tsx:54` | getDocs | `collection(db, "companies")` con where("name") |

### 5.3 Patrón vulnerable

TODAS las queries usan `companyId` proveniente de `useState`, que se setea desde `getUserCompany()`. Un atacante puede:

1. Abrir DevTools
2. Ejecutar en la consola:
   ```js
   import { collection, getDocs } from "firebase/firestore"
   const ref = collection(db, "companies", "OTRO_COMPANY_ID", "clientes")
   const snap = await getDocs(ref)
   snap.docs.map(d => d.data())
   ```
3. Obtener todos los datos de cualquier compañía

---

## 6. RIESGOS DE SEGURIDAD

### 🔴 R1 — Firestore Security Rules NO desplegadas

**Archivo:** `firestore.rules` (existe local pero NO está deployado)
**Severidad:** 🔴 CRÍTICO
**Impacto:** Firestore usa las reglas por defecto (probablemente permite todo a usuarios autenticados). Cualquier usuario con una cuenta Firebase puede leer/escribir cualquier documento.

### 🔴 R2 — Cualquier usuario autenticado puede leer datos de otras compañías

**Severidad:** 🔴 CRÍTICO
**Ataque posible:**
1. Crear cuenta en novent.app
2. Obtener companyId de otro negocio (adivinando, brute force, o listando companies)
3. Consultar directamente desde la consola del navegador:
   ```js
   await getDocs(collection(db, "companies", companyId_objetivo, "ventas"))
   ```
4. O si manipula el estado de React:
   ```js
   // En la página de clientes, cambiar companyId via React DevTools
   ```

### 🔴 R3 — companyId spoofing desde el frontend

**Severidad:** 🔴 CRÍTICO
**Explicación:** `companyId` se almacena en `useState` y se usa directamente en las queries. No hay validación server-side. Con React DevTools o inyectando código, el atacante cambia el `companyId` y accede a datos de otra compañía.

### 🟡 R4 — Middleware JWT no verifica firma

**Archivo:** `middleware.ts:35-47`
**Severidad:** 🟡 ALTA (pero mitigada)
**Código actual:**
```typescript
function validateToken(token: string): boolean {
  const parts = token.split(".")
  const payload = JSON.parse(atob(parts[1]))
  return Date.now() < payload.exp * 1000
}
```
**Riesgo:** Solo decodifica base64 y verifica `exp`. No verifica la firma criptográfica del JWT. Un atacante podría forjar un token con cualquier payload.

**Mitigación:** Este middleware solo controla routing de UI (redirect a /login si no hay token). Firestore usa Firebase Auth SDK directamente, que SÍ verifica la firma. Sin embargo, un atacante con un token falso podría acceder a rutas protegidas (aunque las queries a Firestore fallarían si las rules estuvieran deployadas).

### 🟡 R5 — Colección "companies" expuesta para listar nombres

**Archivo:** `app/signup/page.tsx:54`
**Severidad:** 🟡 ALTA
**Código:**
```typescript
const q = query(collection(db, "companies"), where("name", "==", name))
const snap = await getDocs(q)
```
Si no hay rules, cualquier autenticado puede enumerar todas las companies y obtener todos los `companyId`.

### 🟡 R6 — No hay App Check

**Severidad:** 🟡 ALTA
**Riesgo:** Cualquier script externo (no desde la app) puede llamar a Firebase API directamente usando las credenciales `NEXT_PUBLIC_`.

### 🟡 R7 — `.env.local` con credenciales LIVE (commiteado)

**Severidad:** 🟡 ALTA
**Riesgo:** Las API keys NEXT_PUBLIC_ son públicas por diseño para Firebase, pero un atacante con acceso al repo tiene el proyecto exacto al que atacar.

### 🟢 R8 — No hay verificación de email

**Severidad:** 🟢 MEDIO
**Riesgo:** Cualquiera puede crear cuentas con emails falsos.

### 🟢 R9 — No hay rate limiting en auth

**Severidad:** 🟢 MEDIO
**Riesgo:** Ataques de fuerza bruta a cuentas de usuario.

---

## 7. NIVEL DE CRITICIDAD POR RIESGO

| # | Riesgo | Criticidad | ¿Ocurre hoy? | Solución |
|---|--------|-----------|-------------|----------|
| R1 | Rules no desplegadas | 🔴 CRÍTICO | ✅ SÍ | Deployar firestore.rules AHORA |
| R2 | Acceso cross-company | 🔴 CRÍTICO | ✅ SÍ | Rules + validación server-side |
| R3 | companyId spoofing | 🔴 CRÍTICO | ✅ SÍ | Rules + no confiar en input cliente |
| R4 | JWT sin firma | 🟡 ALTO | ✅ SÍ | Usar Firebase Admin SDK en middleware |
| R5 | companies enumerable | 🟡 ALTO | ✅ SÍ | Rules restrictivas |
| R6 | Sin App Check | 🟡 ALTO | ✅ SÍ | Agregar Firebase App Check |
| R7 | .env.local commiteado | 🟡 ALTO | ✅ SÍ | Rotar keys + git rm |
| R8 | Sin verify email | 🟢 MEDIO | ✅ SÍ | sendEmailVerification() |
| R9 | Sin rate limiting | 🟢 MEDIO | ✅ SÍ | Firebase Auth blocking functions |

---

## 8. ANÁLISIS DEL ARCHIVO firestore.rules ACTUAL

### ¿Qué permite HOY? (si estuviera desplegado, que NO lo está)

El archivo `firestore.rules` actual define:

```
function isInCompany(companyId) {
  let userDoc = getUserDoc();
  return userDoc.exists && userDoc.data.companyId == companyId;
}
```

**Lo correcto:** Requiere que el usuario autenticado tenga un documento en `users/{uid}` con el mismo `companyId` del path.

**Lo incorrecto:** La regla para `companies/{companyId}` CREATE permite:
```
allow create: if isAuth()
              && request.resource.data.owner == request.auth.uid;
```
Esto es OK para creación, pero no valida `isInCompany` (porque al crear, el user doc aún no existe).

**Problemas del archivo actual:**
1. **NO está desplegado** — no importa qué diga, no se aplica
2. `users/{uid}` CREATE no valida que `companyId` sea string o tenga formato válido
3. `users/{uid}` UPDATE no evita que un usuario cambie su propio `companyId` (podría moverse a otra compañía!)
4. No hay regla de `allow delete` para `companies/{companyId}`
5. El wildcard `/{document=**}` no se usa correctamente (las subcolecciones están listadas individualmente, lo cual está bien)

---

## 9. NUEVAS REGLAS — firestore.rules (YA ESCRITO EN EL REPO)

El archivo `firestore.rules` ya fue actualizado en el repositorio. Las reglas nuevas:

### Línea por línea:

```javascript
rules_version = '2';                                           // 1. Usa sintaxis v2 (permite funciones)
service cloud.firestore {                                       // 2. Define el servicio
  match /databases/{database}/documents {                       // 3. Match sobre todas las bases de datos

    // FUNCIONES HELPER
    function isAuth() { ... }                                   // 4-8: Verifica request.auth != null
    function getUserDoc() { ... }                               // 9-11: Lee users/{uid} del usuario actual
    function isInCompany(companyId) { ... }                     // 12-16: Verifica que exista users/{uid}
                                                                //         y que su companyId coincida
    // users/{uid} — GLOBAL
    allow read: if isAuth() && request.auth.uid == uid;        // 24: Solo el usuario lee su perfil
    allow create: if isAuth() && request.auth.uid == uid ...;   // 27-29: Solo crea su propio perfil,
                                                                //         requiere campo companyId
    allow update: if isAuth() && request.auth.uid == uid        // 33: Solo modifica su perfil
                  && (no cambia companyId);                     // 36: Protege contra cambio de compañía

    // companies/{companyId} — NIVEL EMPRESA
    allow read: if isInCompany(companyId);                      // 48: Solo miembros leen la empresa
    allow create: if isAuth() && owner == uid;                  // 51-52: Solo el owner crea
    allow update: if isInCompany(companyId);                    // 55: Solo miembros modifican
    allow delete: if isOwner(companyId);                        // 58: Solo el owner elimina

    // /clientes, /ventas, /inventario
    allow read, write: if isInCompany(companyId);               // 74, 84, 93: Solo miembros acceden

    // /users dentro de company
    allow read: if isInCompany(companyId);                      // 107: Miembros ven quién pertenece
    allow write: if es el propio uid y está en la compañía;    // 110-126: Cada usuario gestiona su membresía
  }
}
```

### Protecciones clave de las nuevas reglas:
1. **`isInCompany(companyId)`** — Corazón del multi-tenancy. Verifica que `users/{request.auth.uid}.companyId == companyId` del path.
2. **Protección contra spoofing de companyId en update** — Un usuario no puede cambiar su `companyId` después de creado (línea 36 del rules).
3. **Default deny** — Cualquier colección no listada queda bloqueada.
4. **`isOwner()`** — Solo el owner de la compañía puede eliminar la empresa.

---

## 10. VERIFICACIÓN DEL MIDDLEWARE JWT

### Análisis de `middleware.ts:35-47`

```typescript
function validateToken(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    return Date.now() < payload.exp * 1000
  } catch {
    return false
  }
}
```

**¿Valida la firma?** ❌ NO. Solo decodifica base64 (parte 2 del JWT) y verifica `exp`.

**¿Riesgo de spoofing?** Sí, un atacante puede crear un JWT falso con cualquier payload y cualquier `exp` futura.

**¿Impacto real?** BAJO. Porque:
- Firebase Auth SDK en el cliente maneja la autenticación real con verificación de firma
- El middleware solo controla redirecciones de UI
- Si las Firestore Rules están deployadas, las queries de Firestore requieren un token Firebase real (verificado por Firebase)

**Riesgo residual:** Un atacante con token falso podría:
1. Evitar el redirect a /login (ver páginas protegidas)
2. Las páginas intentarían `onAuthStateChanged` que no devolvería usuario
3. Las queries a Firestore fallarían (sin auth)
4. Vería pantallas de "Cargando..." o "Sin empresa asignada"

---

## 11. RIESGO DE SPOOFING DE companyId

### ¿Se puede modificar manualmente desde el navegador?

**✅ SÍ, totalmente posible.**

Método 1 — Consola de Firebase (Firestore directo):
```js
// Esto funciona MIENTRAS NO HAYA RULES DEPLOYADAS
const ventas = await getDocs(collection(db, "companies", "OTRO_ID", "ventas"))
```

Método 2 — React DevTools:
```js
// Cambiar el estado companyId en cualquier página protegida
// Las queries se re-ejecutarán con el nuevo companyId
```

Método 3 — Modificar users/{uid} directamente:
```js
// Si no hay rules, cambiar companyId en users/{uid}
await updateDoc(doc(db, "users", myUid), { companyId: "OTRO_ID" })
// Luego refrescar la página y todas las queries usarán el nuevo companyId
```

### ¿Por qué pasa?

Porque la arquitectura es **100% client-side**. No hay un API server que valide:
- Que el `companyId` pertenezca al usuario autenticado
- Que el usuario sea miembro de esa compañía

**La ÚNICA defensa son las Firestore Security Rules**, que verifican `isInCompany()` en cada operación, independientemente de lo que el cliente envíe.

---

## 12. SOLUCIÓN RECOMENDADA

### Inmediata (hoy)

| # | Acción | Comando |
|---|--------|---------|
| 1 | **Desplegar Firestore Rules** | `firebase deploy --only firestore:rules` |
| 2 | Rotar API keys Firebase | Firebase Console → Project settings → Regenerate |
| 3 | Remover .env.local del historial git | `git rm --cached .env.local` + squash commits |

### Corto plazo (sprint actual)

| # | Acción | Archivos |
|---|--------|----------|
| 4 | Agregar Firebase App Check | `lib/firebase.ts` + Firebase Console |
| 5 | Agregar verificación de email | `app/signup/page.tsx` |
| 6 | Mejorar middleware JWT con Admin SDK | `middleware.ts` (usar `jose` para verificar firma) |
| 7 | Agregar rate limiting vía CloudFlare o blocking functions | Firebase Console |

### Mediano plazo

| # | Acción |
|---|--------|
| 8 | Migrar a API routes de Next.js (server-side) para operaciones críticas |
| 9 | Implementar auditoría de acciones (logs en Firestore) |
| 10 | Agregar tests de seguridad |

---

## 13. ARCHIVOS QUE DEBEN MODIFICARSE

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `firestore.rules` | ✅ Ya actualizado en el repo | 🔴 Crítica |
| `middleware.ts` | Agregar verificación de firma JWT con biblioteca `jose` | 🟡 Alta |
| `lib/firebase.ts` | Agregar App Check initialization | 🟡 Alta |
| `.gitignore` | ✅ Ya incluye `.env*` | 🔴 Crítica |
| `app/signup/page.tsx` | Agregar verificación de email post-signup | 🟢 Media |

---

## 14. CÓDIGO EXACTO PARA CADA MODIFICACIÓN

### 14.1 Firestore Rules → ya actualizado en `firestore.rules`

### 14.2 Middleware con verificación JWT real

Instalar dependencia:
```bash
npm install jose
```

Nuevo `middleware.ts`:
```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify, createRemoteJWKSet } from "jose"

const COOKIE_NAME = "firebase-auth-token"
const FIREBASE_PROJECT_ID = "novent-app"

const JWKS = createRemoteJWKSet(
  new URL(`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`)
)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublic = path === "/" || path === "/login" || path === "/signup"

  const tokenCookie = request.cookies.get(COOKIE_NAME)

  if (!tokenCookie && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (tokenCookie) {
    const isValid = await validateToken(tokenCookie.value)
    if (!isValid && !isPublic) {
      const res = NextResponse.redirect(new URL("/login", request.url))
      res.cookies.delete(COOKIE_NAME)
      return res
    }
    if (isValid && isPublic) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

async function validateToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    })
    return true
  } catch {
    return false
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/ventas/:path*",
    "/inventario/:path*",
    "/whatsapp/:path*",
  ],
}
```

### 14.3 Firebase App Check

En `lib/firebase.ts`, agregar:
```typescript
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check"

// Solo en producción
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6Le..._key_aqui"),
    isTokenAutoRefreshEnabled: true,
  })
}
```

### 14.4 Verificación de email en signup

Agregar en `app/signup/page.tsx` después de crear el usuario (antes de `saveSession()`):
```typescript
import { sendEmailVerification } from "firebase/auth"

await sendEmailVerification(user)
toast.success("Verifica tu correo antes de continuar")
```

---

## 15. COMANDOS EXACTOS PARA DESPLEGAR LAS REGLAS

### Requisito: Firebase CLI instalada

```bash
# 1. Verificar que Firebase CLI está instalada
npm install -g firebase-tools

# 2. Iniciar sesión en Firebase (abre navegador)
firebase login

# 3. Inicializar Firestore en el proyecto (si no se ha hecho)
firebase init firestore

# 4. Desplegar SOLO las reglas de Firestore
firebase deploy --only firestore:rules

# 5. Verificar el despliegue
firebase deploy --only firestore:rules --dry-run
```

**Nota:** Si no tienes un `firebase.json`, créalo:
```bash
firebase init
# Seleccionar solo "Firestore" cuando pregunte
```

Y asegúrate de que `firebase.json` contenga:
```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

---

## RESUMEN EJECUTIVO

| Concepto | Estado |
|----------|--------|
| ¿Hay aislamiento entre compañías HOY? | ❌ **NO** — Cualquier usuario autenticado accede a todos los datos |
| ¿Están las Firestore Rules deployadas? | ❌ **NO** — El archivo existe pero no está activo |
| ¿El middleware valida firma JWT? | ❌ **NO** — Solo verifica exp |
| ¿Se puede spoofear companyId? | ✅ **SÍ** — Desde la consola del navegador |
| ¿Hay App Check? | ❌ **NO** |
| ¿Se requiere email verification? | ❌ **NO** |

**Riesgo actual:** 🔴 CRÍTICO. La aplicación es funcional pero multi-tenancy NO existe en la práctica. Cualquier usuario autenticado puede leer y modificar datos de cualquier compañía.

**Solución:** Desplegar las reglas de Firestore que ya están escritas en `firestore.rules` es el paso #1 y más crítico.
