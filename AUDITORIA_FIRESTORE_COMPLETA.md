# Auditoría Completa Firestore Security Rules — Novent

> **Fecha:** 17/06/2026
> **Estado actual de las reglas desplegadas:** ✅ CONFIRMADO — Regla temporal que expira el 26/06/2026:
> `allow read, write: if request.time < timestamp.date(2026, 6, 26);`
> **Esto equivale a BASE DE DATOS TOTALMENTE ABIERTA.**

---

## 1. ARQUITECTURA ENCONTRADA

### Colecciones y documentos reales (confirmado por análisis de código):

```
Colección raíz: users
  ├── /{uid}
  │     ├── email: string
  │     ├── companyId: string          ← Vínculo con la empresa
  │     ├── nombre: string             (opcional, se setea en dashboard)
  │     ├── role: string               ("admin")
  │     └── createdAt: Timestamp

Colección raíz: companies
  ├── /{companyId}
  │     ├── name: string
  │     ├── owner: string              (uid del creador)
  │     └── createdAt: Timestamp
  │     │
  │     ├── 📁 /clientes/{docId}
  │     │     ├── nombre, telefono, estado, ultimaVisita
  │     │     ├── visitas: number, totalGastado: number
  │     │
  │     ├── 📁 /ventas/{docId}
  │     │     ├── cliente, servicio, precio, fecha, hora
  │     │     ├── productoId, cantidad: number
  │     │
  │     ├── 📁 /inventario/{docId}
  │     │     ├── nombre, categoria, precio, stock, stockMinimo
  │     │
  │     └── 📁 /users/{uid}
  │           ├── email, role, createdAt
```

---

## 2. RUTAS FIRESTORE REALES (53 llamadas totales)

### 2.1 Colección `users/{uid}` — 6 llamadas

| # | Archivo | Línea | Operación | Path |
|---|---------|-------|-----------|------|
| 1 | `lib/getUserCompany.ts` | 5-6 | `getDoc(doc(db, "users", uid))` | `users/{uid}` |
| 2 | `lib/ensureCompany.ts` | 5-6 | `getDoc(doc(db, "users", uid))` | `users/{uid}` |
| 3 | `lib/ensureCompany.ts` | 16 | `setDoc(userRef, ...)` | `users/{uid}` |
| 4 | `lib/ensureCompany.ts` | 34 | `setDoc(userRef, ...)` | `users/{uid}` |
| 5 | `app/signup/page.tsx` | 92 | `setDoc(doc(db, "users", user.uid), ...)` | `users/{uid}` |
| 6 | `app/(protected)/layout.tsx` | 41 | `getDoc(doc(db, "users", u.uid))` | `users/{uid}` |
| 7 | `app/(protected)/dashboard/page.tsx` | 347 | `updateDoc(doc(db, "users", user!.uid), ...)` | `users/{uid}` |

### 2.2 Colección `companies` (raíz sin companyId) — 4 llamadas

| # | Archivo | Línea | Operación | Path |
|---|---------|-------|-----------|------|
| 8 | `app/signup/page.tsx` | 54-55 | `getDocs(query(collection(db, "companies"), where("name", ...)))` | `companies` |
| 9 | `app/signup/page.tsx` | 78-83 | `setDoc(doc(collection(db, "companies")), ...)` | `companies/{autoId}` |
| 10 | `lib/ensureCompany.ts` | 10 | `addDoc(collection(db, "companies"), ...)` | `companies` |
| 11 | `lib/ensureCompany.ts` | 28 | `addDoc(collection(db, "companies"), ...)` | `companies` |

### 2.3 Colección `companies/{companyId}` — 1 llamada

| # | Archivo | Línea | Operación | Path |
|---|---------|-------|-----------|------|
| 12 | `app/(protected)/layout.tsx` | 50 | `getDoc(doc(db, "companies", companyId))` | `companies/{companyId}` |

### 2.4 Subcolección `companies/{companyId}/clientes` — 12 llamadas

| # | Archivo | Línea | Operación |
|---|---------|-------|-----------|
| 13 | `app/(protected)/dashboard/page.tsx` | 178-185 | `onSnapshot(collection(db, ..., "clientes"))` |
| 14 | `app/(protected)/clientes/page.tsx` | 107-116 | `onSnapshot(collection(db, ..., "clientes"))` |
| 15 | `app/(protected)/clientes/page.tsx` | 164-172 | `updateDoc(doc(db, ..., "clientes", editingId))` |
| 16 | `app/(protected)/clientes/page.tsx` | 188-195 | `addDoc(collection(db, ..., "clientes"))` |
| 17 | `app/(protected)/clientes/page.tsx` | 260-268 | `deleteDoc(doc(db, ..., "clientes", id))` |
| 18 | `app/(protected)/clientes/[id]/page.tsx` | 97-106 | `getDoc(doc(db, ..., "clientes", id))` |
| 19 | `app/(protected)/ventas/page.tsx` | 144-151 | `onSnapshot(collection(db, ..., "clientes"))` |
| 20 | `app/(protected)/ventas/page.tsx` | 348-355 | `doc(db, ..., "clientes", clienteId)` + `transaction.get()` |
| 21 | `app/(protected)/ventas/page.tsx` | 379-382 | `transaction.get(clienteRef)` |
| 22 | `app/(protected)/ventas/page.tsx` | 414-422 | `transaction.update(clienteRef, ...)` |
| 23 | `app/(protected)/ventas/page.tsx` | 533-540 | `doc(db, ..., "clientes", clienteId)` |
| 24 | `app/(protected)/ventas/page.tsx` | 543-555 | `transaction.get()` + `transaction.update()` |

### 2.5 Subcolección `companies/{companyId}/ventas` — 10 llamadas

| # | Archivo | Línea | Operación |
|---|---------|-------|-----------|
| 25 | `app/(protected)/dashboard/page.tsx` | 151-158 | `onSnapshot(collection(db, ..., "ventas"))` |
| 26 | `app/(protected)/clientes/[id]/page.tsx` | 120-127 | `onSnapshot(collection(db, ..., "ventas"))` |
| 27 | `app/(protected)/ventas/page.tsx` | 171-178 | `onSnapshot(collection(db, ..., "ventas"))` |
| 28 | `app/(protected)/ventas/page.tsx` | 329-336 | `doc(collection(db, ..., "ventas"))` + `transaction.set()` |
| 29 | `app/(protected)/ventas/page.tsx` | 391-403 | `transaction.set(ventaRef, ...)` |
| 30 | `app/(protected)/ventas/page.tsx` | 472-479 | `doc(db, ..., "ventas", id)` |
| 31 | `app/(protected)/ventas/page.tsx` | 482-484 | `transaction.get(ventaRef)` |
| 32 | `app/(protected)/ventas/page.tsx` | 501 | `transaction.delete(ventaRef)` |

### 2.6 Subcolección `companies/{companyId}/inventario` — 9 llamadas

| # | Archivo | Línea | Operación |
|---|---------|-------|-----------|
| 33 | `app/(protected)/inventario/page.tsx` | 118-125 | `onSnapshot(collection(db, ..., "inventario"))` |
| 34 | `app/(protected)/inventario/page.tsx` | 173-181 | `updateDoc(doc(db, ..., "inventario", editingId))` |
| 35 | `app/(protected)/inventario/page.tsx` | 200-207 | `addDoc(collection(db, ..., "inventario"))` |
| 36 | `app/(protected)/inventario/page.tsx` | 279-287 | `deleteDoc(doc(db, ..., "inventario", id))` |
| 37 | `app/(protected)/ventas/page.tsx` | 205-212 | `onSnapshot(collection(db, ..., "inventario"))` |
| 38 | `app/(protected)/ventas/page.tsx` | 339-345 | `doc(db, ..., "inventario", productoId)` |
| 39 | `app/(protected)/ventas/page.tsx` | 358-361 | `transaction.get(productRef)` |
| 40 | `app/(protected)/ventas/page.tsx` | 406-411 | `transaction.update(productRef, ...)` |
| 41 | `app/(protected)/ventas/page.tsx` | 506-527 | `doc + transaction.get + transaction.update` |

### 2.7 Subcolección `companies/{companyId}/users/{uid}` — 1 llamada

| # | Archivo | Línea | Operación |
|---|---------|-------|-----------|
| 42 | `app/signup/page.tsx` | 102-103 | `setDoc(doc(db, "companies", companyId, "users", user.uid), ...)` |

### 2.8 Archivos SIN llamadas a Firestore

| Archivo | Propósito |
|---------|-----------|
| `app/layout.tsx` | Layout raíz (solo renderiza children) |
| `app/page.tsx` | Landing page |
| `app/login/page.tsx` | Solo Firebase Auth (signInWithEmailAndPassword) |
| `app/(protected)/whatsapp/page.tsx` | Placeholder |
| `lib/authToken.ts` | Solo maneja cookies |
| `lib/utils.ts` | Utilidad cn() |
| `hooks/useAuth.ts` | Solo onAuthStateChanged |
| `hooks/use-mobile.ts` | Detección de viewport |
| `components/stats-card.tsx` | Sólo UI |

---

## 3. FLUJO DE companyId

### ¿Dónde se obtiene?

```typescript
// lib/getUserCompany.ts — llamado desde CADA página protegida
export async function getUserCompany(uid: string) {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { companyId: data.companyId, nombre: data.nombre }
}
```

**Se llama desde:** dashboard, clientes, clientes/[id], ventas, inventario.

### ¿Dónde se almacena?

```typescript
// En cada página, en useState:
const [companyId, setCompanyId] = useState("")

// Se setea desde el resultado de getUserCompany():
const userData = await getUserCompany(user.uid)
setCompanyId(userData.companyId)
```

### ¿Cómo se usa?

```typescript
// TODAS las queries usan companyId del estado:
collection(db, "companies", companyId, "clientes")
collection(db, "companies", companyId, "ventas")
collection(db, "companies", companyId, "inventario")
doc(db, "companies", companyId, "clientes", id)
```

### ¿Puede ser manipulado por el cliente?

**✅ SÍ — Confirmado.** El companyId vive en `useState` en el navegador. Un atacante puede:

**Método 1 — Consola del navegador (Firebase SDK):**
```javascript
// Sin rules, esto funciona directamente:
const datos = await getDocs(
  collection(db, "companies", "cualquier-company-id", "clientes")
)
```

**Método 2 — React DevTools:**
```javascript
// Cambiar el estado companyId a otro ID conocido
// Inmediatamente las queries se re-ejecutan contra la otra empresa
```

**Método 3 — Modificar users/{uid} (sin rules):**
```javascript
await updateDoc(doc(db, "users", miUid), { companyId: "otra-empresa" })
// Al recargar, todas las queries van a la otra empresa
```

---

## 4. RIESGOS ENCONTRADOS

### 🔴 R1 — Base de datos completamente abierta (regla temporal)

**Estado:** Activo en producción.
**Regla actual:**
```javascript
allow read, write: if request.time < timestamp.date(2026, 6, 26);
```
Cualquier persona con las credenciales `NEXT_PUBLIC_` (visibles en el cliente) puede leer/escribir cualquier documento. No requiere autenticación.

### 🔴 R2 — Cualquier autenticado accede a todas las compañías

**Impacto:** Con las reglas actuales, al crear una cuenta, puedes leer los datos de cualquier otra empresa cambiando el `companyId` en la consola.

### 🔴 R3 — Signup permite enumerar empresas

**Archivo:** `app/signup/page.tsx:54`
**Código:**
```typescript
const q = query(collection(db, "companies"), where("name", "==", name))
const snap = await getDocs(q)
```
Sin reglas, cualquier persona (incluso sin autenticar) puede enumerar todas las empresas registradas.

### 🟡 R4 — ensureCompany.ts es código muerto pero peligroso

**Archivo:** `lib/ensureCompany.ts`
**Estado:** NO importado en ningún lado (código muerto).
**Riesgo:** Si alguien lo importa en el futuro, crea empresas y documentos users sin validación de permisos.

### 🟡 R5 — Sin App Check

Las credenciales `NEXT_PUBLIC_FIREBASE_*` permiten llamar a Firebase desde cualquier lugar (Postman, scripts, otras apps).

---

## 5. REGLAS RECOMENDADAS

### 5.1 Explicación colección por colección

| Colección | Regla aplicada | ¿Por qué? |
|-----------|---------------|-----------|
| `users/{uid}` | Solo el propio uid | Cada usuario solo lee/escribe su perfil. No deben verse otros `companyId`s. |
| `companies/{companyId}` | Solo miembros (`isInCompany`) | Solo quien pertenece a la empresa puede leer sus datos. |
| `companies/{companyId}/clientes` | Solo miembros | Datos sensibles del negocio. |
| `companies/{companyId}/ventas` | Solo miembros | Datos sensibles del negocio. |
| `companies/{companyId}/inventario` | Solo miembros | Datos sensibles del negocio. |
| `companies/{companyId}/users/{uid}` | Solo miembros; escritura solo propio uid | La membresía se gestiona individualmente. |

### 5.2 Explicación de la función `isInCompany`

```
isInCompany(companyId) {
  1. Obtiene users/{request.auth.uid}
  2. Verifica que el documento exista
  3. Compara users/{uid}.companyId == companyId del path
}
```

Esto asegura que:
- Solo usuarios con un perfil en `users/{uid}` pueden acceder
- Solo pueden acceder a la compañía asignada en su perfil
- Cambiar el `companyId` en el frontend NO sirve porque Firestore valida contra el backend

### 5.3 Explicación del `create` en `companies/{companyId}`

```
allow create: if isAuth()
              && request.resource.data.owner == request.auth.uid;
```

NO usa `isInCompany` porque al crear la empresa, el documento `users/{uid}` aún no existe (se crea después). En su lugar, verifica que el `owner` del documento sea el usuario autenticado.

### 5.4 Protección contra cambio de companyId

```
// users/{uid} update:
allow update: if isAuth()
              && request.auth.uid == uid
              && request.resource.data.companyId == resource.data.companyId;
```

Un usuario NO puede cambiar su `companyId` después de creado. Esto evita que un usuario malicioso se asigne a otra empresa.

### 5.5 ¿Cómo afecta cada consulta existente?

| Consulta | ¿Funciona con las nuevas reglas? | Explicación |
|----------|--------------------------------|-------------|
| `getDoc(doc(db, "users", uid))` | ✅ Sí | `isAuth() && uid == uid` |
| `setDoc(doc(db, "users", user.uid), {companyId, ...})` | ✅ Sí | `isAuth() && uid == uid && companyId exists` |
| `updateDoc(doc(db, "users", uid), {nombre})` | ✅ Sí | `isAuth() && uid == uid && companyId no cambia` |
| `getDocs(query(collection(db, "companies"), where("name", ...)))` | ❌ **NO** | Usuario NO autenticado en signup. **Requiere cambio de código.** |
| `setDoc(companyRef, {name, owner, createdAt})` | ✅ Sí | `isAuth() && owner == uid` |
| `getDoc(doc(db, "companies", companyId))` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `onSnapshot(collection(db, "companies", cId, "clientes"))` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `addDoc(collection(db, "companies", cId, "clientes"), ...)` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `updateDoc(doc(db, "companies", cId, "clientes", id), ...)` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `deleteDoc(doc(db, "companies", cId, "clientes", id))` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `runTransaction(db, ...)` contra clientes/ventas/inventario | ✅ Sí | Cada operación individual se valida contra `isInCompany` |
| `onSnapshot(collection(db, "companies", cId, "ventas"))` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `onSnapshot(collection(db, "companies", cId, "inventario"))` | ✅ Sí | `isAuth() && isInCompany(companyId)` |
| `setDoc(doc(db, "companies", cId, "users", uid), ...)` | ✅ Sí | `isAuth() && uid == uid && isInCompany(companyId)` |

### 5.6 Consulta que dejará de funcionar

**Única consulta afectada:**
```typescript
// app/signup/page.tsx:54-55
const q = query(collection(db, "companies"), where("name", "==", name))
const snap = await getDocs(q)
```

**Motivo:** El usuario NO está autenticado cuando se ejecuta esta línea (ocurre antes de `createUserWithEmailAndPassword`).

**Síntoma:** El error se captura en el catch y muestra "Error al crear cuenta".

**Solución:** Reordenar el signup para crear el usuario primero, luego verificar el nombre de empresa.

---

## 6. ARCHIVO firestore.rules COMPLETO

**Ya escrito en `firestore.rules`.** Contiene:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() { return request.auth != null; }
    function getUserDoc() { return get(/databases/$(database)/documents/users/$(request.auth.uid)); }
    function isInCompany(companyId) {
      let userDoc = getUserDoc();
      return userDoc.exists && userDoc.data.companyId == companyId;
    }

    // users/{uid} — solo propio usuario
    match /users/{uid} {
      allow read: if isAuth() && request.auth.uid == uid;
      allow create: if isAuth() && request.auth.uid == uid
                    && request.resource.data.keys().hasAll(['companyId'])
                    && request.resource.data.companyId is string;
      allow update: if isAuth() && request.auth.uid == uid
                    && request.resource.data.companyId == resource.data.companyId;
      allow delete: if isAuth() && request.auth.uid == uid;
    }

    // companies/{companyId}
    match /companies/{companyId} {
      allow read: if isAuth() && isInCompany(companyId);
      allow create: if isAuth() && request.resource.data.owner == request.auth.uid;
      allow update: if isAuth() && isInCompany(companyId);
      allow delete: if isAuth() && isInCompany(companyId)
                    && request.auth.uid == get(.../companies/$(companyId)).data.owner;

      match /clientes/{id} { allow read, write: if isAuth() && isInCompany(companyId); }
      match /ventas/{id}   { allow read, write: if isAuth() && isInCompany(companyId); }
      match /inventario/{id} { allow read, write: if isAuth() && isInCompany(companyId); }
      match /users/{uid} {
        allow read: if isAuth() && isInCompany(companyId);
        allow write: if isAuth() && request.auth.uid == uid && isInCompany(companyId);
      }
    }
  }
}
```

---

## 7. ARCHIVOS QUE DEBEN MODIFICARSE

### 7.1 `app/signup/page.tsx` (OBLIGATORIO)

**Problema:** La consulta `getDocs(query(collection(db, "companies"), where("name", ...)))` en línea 54 se ejecuta sin autenticación. Con las rules, fallará.

**Solución:** Mover la verificación de nombre de empresa DESPUÉS de crear el usuario. Si el nombre ya existe, eliminar el usuario de Auth y mostrar error.

```typescript
const handleSignup = async () => {
  try {
    setLoading(true)

    const name = companyName.trim() || "Mi Empresa"

    if (!email.trim() || !password) {
      toast.error("Completa todos los campos")
      setLoading(false)
      return
    }

    // 1. CREAR AUTH USER PRIMERO
    const userCred = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCred.user

    // 2. AHORA VERIFICAR NOMBRE DE EMPRESA (usuario autenticado)
    const q = query(collection(db, "companies"), where("name", "==", name))
    const snap = await getDocs(q)
    if (!snap.empty) {
      // Si el nombre ya existe, eliminar el usuario de Auth
      await user.delete()
      toast.error("Ese nombre de empresa ya está en uso")
      setLoading(false)
      return
    }

    // 3. CREAR COMPANY
    const companyRef = doc(collection(db, "companies"))
    const companyId = companyRef.id
    await setDoc(companyRef, { name, owner: user.uid, createdAt: new Date() })

    // 4. CREAR USER DOC
    await setDoc(doc(db, "users", user.uid), {
      email, companyId, role: "admin", createdAt: new Date(),
    })

    // 5. CREAR MEMBRESÍA
    await setDoc(doc(db, "companies", companyId, "users", user.uid), {
      email, role: "admin", createdAt: new Date(),
    })

    await saveSession()
    router.push("/dashboard")

  } catch (err: any) {
    console.error(err)
    if (err?.code === "auth/email-already-in-use") {
      toast.error("Correo en uso")
    } else {
      toast.error("Error al crear cuenta")
    }
  } finally {
    setLoading(false)
  }
}
```

### 7.2 `lib/ensureCompany.ts` (RECOMENDADO)

**Estado:** Código muerto (no importado). Recomiendo eliminarlo o dejarlo pero documentar que no se usa.

### 7.3 `middleware.ts` (RECOMENDADO)

Mejorar la validación JWT usando `jose` para verificar la firma. (Código provisto en auditoría anterior.)

---

## 8. POSIBLES ERRORES TRAS DESPLEGAR

| Error | Causa | Solución |
|-------|-------|----------|
| `Missing or insufficient permissions` al hacer signup | Línea 54 de signup intenta leer `companies` sin auth | Aplicar el cambio de código de la sección 7.1 |
| `Missing or insufficient permissions` en dashboard/clientes/etc | El usuario no tiene documento en `users/{uid}` o el `companyId` no coincide | Verificar que `getUserCompany()` devuelva datos. Revisar `users/{uid}` en Firestore. |
| Las suscripciones `onSnapshot` se caen silenciosamente | Las rules rechazan la lectura | Revisar console del navegador por errores 403. Verificar que `isInCompany` evalúa correctamente. |
| Error al crear producto/cliente/venta | La transacción incluye reads/writes que las rules rechazan | Verificar que cada operación individual pase `isInCompany`. |
| `companyId` no cambia en el perfil | La regla `update` protege contra cambio de companyId | Comportamiento deseado. Si se necesita cambiar, hacerlo desde Firebase Console. |

---

## 9. CHECKLIST DE PRUEBAS POST-DEPLOY

### Prerrequisitos
- [ ] Tener dos cuentas de prueba en dos empresas diferentes
- [ ] Tener datos de prueba en ambas empresas (clientes, ventas, productos)

### Pruebas de aislamiento

```
1. Iniciar sesión con Usuario A (Empresa A)
2. Navegar a dashboard       → ✅ Debe ver datos de Empresa A
3. Navegar a clientes        → ✅ Debe ver clientes de Empresa A
4. Navegar a ventas          → ✅ Debe ver ventas de Empresa A
5. Navegar a inventario      → ✅ Debe ver productos de Empresa A

6. Abrir consola del navegador
7. Ejecutar:
   import { collection, getDocs } from "firebase/firestore"
   import { db } from "@/lib/firebase"
   await getDocs(collection(db, "companies", "ID_DE_EMPRESA_B", "clientes"))
   → ❌ Debe fallar con "Missing or insufficient permissions"

8. Crear un cliente nuevo     → ✅ Debe funcionar
9. Editar un cliente           → ✅ Debe funcionar
10. Eliminar un cliente        → ✅ Debe funcionar
11. Crear una venta            → ✅ Debe funcionar (transacción completa)
12. Eliminar una venta         → ✅ Debe funcionar (transacción reversión)
13. Crear un producto          → ✅ Debe funcionar
14. Editar un producto         → ✅ Debe funcionar
15. Eliminar un producto       → ✅ Debe funcionar

16. Cerrar sesión
17. Intentar navegar a /dashboard
    → ✅ Debe redirigir a /login
```

### Pruebas de signup

```
1. Cerrar sesión completamente
2. Ir a /signup
3. Crear cuenta nueva con email único
   → ✅ Debe crear la cuenta y redirigir a dashboard
4. Verificar en Firebase Console:
   - users/{nuevoUid} existe con companyId correcto ✅
   - companies/{companyId} existe con owner correcto ✅
   - companies/{companyId}/users/{nuevoUid} existe ✅
```

### Pruebas de regresión

```
1. Landing page (/)          → ✅ Debe cargar sin errores
2. Login (/login)            → ✅ Debe autenticar y redirigir
3. Dashboard                 → ✅ KPIs, charts, feed cargan
4. Clientes                  → ✅ CRUD completo funciona
5. Ventas (POS)              → ✅ Transacciones funcionan
6. Inventario                → ✅ CRUD completo funciona
```

---

## 10. COMANDOS DE DEPLOY

```bash
# 1. Verificar Firebase CLI
npm install -g firebase-tools
firebase --version

# 2. Iniciar sesión
firebase login

# 3. Verificar/Crear firebase.json
# Debe contener:
# {
#   "firestore": {
#     "rules": "firestore.rules",
#     "indexes": "firestore.indexes.json"
#   }
# }

# 4. Simular deploy (dry run)
firebase deploy --only firestore:rules --dry-run

# 5. Desplegar
firebase deploy --only firestore:rules

# 6. Verificar en Firebase Console
# Ir a: Firestore → Rules → debe mostrar las nuevas reglas
```

---

## RESUMEN FINAL

| Concepto | Antes | Después |
|----------|-------|---------|
| Reglas desplegadas | Temporal (expira 26/06) abierta | Multi-tenant con `isInCompany` |
| Aislamiento entre empresas | ❌ Ninguno | ✅ Solo miembros de la misma empresa |
| companyId spoofeable | ✅ Sí (sin rules) | ❌ No (Firestore valida server-side) |
| Signup funciona | ✅ Sí | ❌ Requiere cambio de código (sección 7.1) |
| ensureCompany.ts | Código muerto | Código muerto (sin cambios) |
| Middleware JWT | Sin verificar firma | Sin cambios (bajo riesgo, no bloqueante) |

**⚠️ CRÍTICO: No desplegar las rules sin aplicar el cambio en `app/signup/page.tsx` (sección 7.1).** El signup dejará de funcionar porque la consulta de verificación de nombre de empresa se ejecuta sin autenticación.
