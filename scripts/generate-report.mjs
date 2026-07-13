import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
  TableLayoutType, PageBreak, convertInchesToTwip
} from "docx";
import * as fs from "fs";

const COLORS = {
  bg: "1a1a2e",
  card: "16213e",
  accent: "0f3460",
  red: "e94560",
  green: "22c55e",
  yellow: "eab308",
  blue: "3b82f6",
  text: "ffffff",
  muted: "a0a0b0",
};

const LINE = new Paragraph({ spacing: { after: 120, before: 120 }, children: [new TextRun({ text: "─".repeat(95), color: COLORS.muted, size: 16 })] });

function heading(level, text) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 200 },
    children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 48 : level === HeadingLevel.HEADING_2 ? 36 : 28, color: COLORS.text })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120 },
    children: [new TextRun({ text, color: opts.color ?? COLORS.text, size: opts.size ?? 22, ...(opts.bold ? { bold: true } : {}) })],
  });
}

function bullet(text, color = COLORS.text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 400 },
    children: [new TextRun({ text: "•  ", color: COLORS.accent, size: 22, bold: true }), new TextRun({ text, color, size: 22 })],
  });
}

function tableHeader(text) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: COLORS.accent },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: COLORS.text, size: 20 })] })],
  });
}

function tableCell(text, color = COLORS.text) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: COLORS.card },
    children: [new Paragraph({ children: [new TextRun({ text, color, size: 18 })] })],
  });
}

function priorityCell(priority) {
  const colorMap = {
    "CRÍTICO": "e94560",
    "ALTA": "f97316",
    "MEDIA": "eab308",
    "BAJA": "3b82f6",
    "FUTURO": "a0a0b0",
  };
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: COLORS.card },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: priority, bold: true, color: colorMap[priority] ?? COLORS.text, size: 18 })] })],
  });
}

async function main() {
  const doc = new Document({
    title: "Auditoría CTO - Novent MVP",
    description: "Análisis completo del proyecto Novent para determinar readiness de MVP comercial",
    styles: { default: { document: { run: { font: "Calibri" }, paragraph: { spacing: { after: 80 } } } } },
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1), right: convertInchesToTwip(1) } } },
      children: [
        // ===== PORTADA =====
        new Paragraph({ spacing: { before: 4800 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NOVENT", bold: true, size: 72, color: COLORS.text })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Auditoría de MVP — CTO Assessment", size: 36, color: COLORS.muted })] }),
        new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "¿Está Novent listo para producción?", size: 28, color: COLORS.yellow, italics: true })] }),
        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha: Junio 2026", size: 24, color: COLORS.muted })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SaaS Multiempresa para pequeños negocios", size: 22, color: COLORS.muted })] }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== RESUMEN =====
        heading(HeadingLevel.HEADING_1, "Resumen Ejecutivo"),
        para("Novent es un SaaS multiempresa construido con Next.js 16 + Firebase. Tiene una interfaz visual atractiva, estructura de datos sólida (companies/{id}/clientes, ventas, inventario), y los módulos core de CRM, POS e inventario están esbozados funcionalmente."),
        para("Sin embargo, NO es un MVP comercializable. Existen bugs críticos que rompen el flujo de autenticación, navegación y registro. La seguridad es inexistente (sin Firestore Security Rules). Y hay funcionalidades clave incompletas (servicios hardcodeados, stock no integrado con ventas).", { color: COLORS.red }),
        para("Puntaje de readiness: 40% — con 3 semanas de trabajo enfocado sería piloteable."),

        LINE,
        heading(HeadingLevel.HEADING_1, "1. Bugs Críticos"),
        para("Estos bugs IMPIDEN el uso en producción. Deben resolverse antes de cualquier otro trabajo.", { color: COLORS.red, bold: true }),
        para(""),
        para("[C1] Cookie name mismatch", { color: COLORS.red, bold: true, size: 24 }),
        para("saveSession() escribe la cookie como 'firebase-auth-token' pero el middleware lee 'token'. El guard de rutas protegidas NUNCA funciona — cualquiera puede acceder a /dashboard, /clientes, etc. sin autenticación."),
        para("Archivo: lib/authToken.ts:11 vs middleware.ts:23"),
        para("Tiempo: 15 min"),
        para(""),
        para("[C2] pge.tsx en vez de page.tsx", { color: COLORS.red, bold: true, size: 24 }),
        para("Next.js requiere page.tsx para rutas dinámicas. El archivo app/clientes/[id]/pge.tsx no resuelve — el detalle de cliente produce 404."),
        para("Archivo: app/clientes/[id]/pge.tsx"),
        para("Tiempo: 5 min"),
        para(""),
        para("[C3] Link roto login → signup", { color: COLORS.red, bold: true, size: 24 }),
        para("login/page.tsx navega a '/signup' pero el archivo está en app/singup/page.tsx → sirve en '/singup'. Error 404 al intentar registrarse."),
        para("Archivo: app/login/page.tsx:116 (router.push('/signup')) vs app/singup/"),
        para("Tiempo: 5 min"),
        para(""),
        para("[C4] Sin Firestore Security Rules", { color: COLORS.red, bold: true, size: 24 }),
        para("Cualquier usuario autenticado puede leer y escribir TODOS los datos de TODAS las empresas. No existe el concepto de aislamiento multiempresa."),
        para("Tiempo: 4 h"),
        para(""),
        para("[C5] Password sin type='password' en signup", { color: COLORS.red, bold: true, size: 24 }),
        para("El input de contraseña en el formulario de registro muestra la contraseña en texto plano."),
        para("Archivo: app/singup/page.tsx:128-132"),
        para("Tiempo: 2 min"),
        para(""),
        para("[C6] Firebase config hardcodeada", { color: COLORS.red, bold: true, size: 24 }),
        para("API key, authDomain, projectId están hardcodeados en el bundle cliente. Sin .env ni variables de entorno."),
        para("Archivo: lib/firebase.ts:5-12"),
        para("Tiempo: 30 min"),

        LINE,
        heading(HeadingLevel.HEADING_1, "2. Bugs Importantes"),
        bullet("[B1] Servicios hardcodeados en ventas — no configurables para ferretería u otros negocios"),
        bullet("[B2] Sin archivo .env para configuración de entorno"),
        bullet("[B3] notifiactions.tsx con typo y fuera de ruta — no funciona"),
        bullet("[B4] dashboard/DashboardLayout.tsx existe pero nunca se importa — código muerto"),
        bullet("[B5] DashboardLayout.tsx referencia /dashboard/clientes que no existe"),
        bullet("[B6] Eliminar venta no revierte totalGastado ni visitas del cliente — datos inconsistentes"),
        bullet("[B7] Sin validación de email ni contraseña en signup"),
        bullet("[B8] Map de pricing sin key estable (usa índice i)"),

        LINE,
        heading(HeadingLevel.HEADING_1, "3. Mejoras de UX"),
        bullet("[UX1] Sin indicador de carga en botones de formularios"),
        bullet("[UX2] Sin confirmación antes de eliminar (cliente, venta, producto)"),
        bullet("[UX3] Selects nativos sin estilo — no usan shadcn/ui"),
        bullet("[UX4] Sin feedback cuando búsqueda no encuentra resultados"),
        bullet("[UX5] Inputs sin etiquetas accesibles (aria-labels, labels)"),
        bullet("[UX6] html lang='en' pero toda la app está en español"),
        bullet("[UX7] Links #features, #pricing en landing no llevan a ningún lado"),
        bullet("[UX8] No hay botón de cerrar sesión en el layout principal"),

        LINE,
        heading(HeadingLevel.HEADING_1, "4. Mejoras de Rendimiento"),
        bullet("[R1] onSnapshot se suscribe aunque usuario no tenga company"),
        bullet("[R2] Firebase init en bundle principal aunque no se esté autenticado"),
        bullet("[R3] Recharts renderizado sin dynamic import"),
        bullet("[R4] Sin paginación Firestore — problema con miles de registros"),

        LINE,
        heading(HeadingLevel.HEADING_1, "5. Mejoras de Seguridad"),
        bullet("[S1] Crear Firestore Security Rules con validación por companyId"),
        bullet("[S2] Usar variables de entorno (.env.local) para Firebase"),
        bullet("[S3] Implementar Firebase App Check para rate limiting"),
        bullet("[S4] Verificación de email obligatoria"),
        bullet("[S5] Sistema de roles (admin / staff)"),
        bullet("[S6] Registro de auditoría (login, IP, dispositivo)"),

        LINE,
        heading(HeadingLevel.HEADING_1, "6. Funcionalidades Incompletas"),
        bullet("[F1] WhatsApp — placeholder de 1 línea. Sin integración real."),
        bullet("[F2] Inventario ↔ Ventas — no hay integración. Vender no descuenta stock."),
        bullet("[F3] Notificaciones — data estática. No hay sistema real."),
        bullet("[F4] Clientes — sin email, dirección, notas, etiquetas."),
        bullet("[F5] Ventas — sin descuentos, pagos parciales, métodos de pago, factura."),
        bullet("[F6] Dashboard — sin selector de fechas, exportación, comparativas."),
        bullet("[F7] Perfil de usuario — no existe. Nombre 'Samuel' hardcodeado."),

        LINE,
        heading(HeadingLevel.HEADING_1, "7. Funcionalidades Terminadas"),
        bullet("[T1] Login con email/password + cookie de sesión"),
        bullet("[T2] Signup con creación de empresa + user"),
        bullet("[T3] CRUD de clientes en tiempo real con KPIs"),
        bullet("[T4] POS básico: seleccionar cliente → servicio → registrar venta"),
        bullet("[T5] CRUD de inventario con alerta de stock bajo"),
        bullet("[T6] Dashboard con KPIs, gráficas (barras + pie) y feed en vivo"),
        bullet("[T7] Detalle de cliente con historial de ventas"),
        bullet("[T8] Middleware de autenticación (conceptualmente correcto)"),
        bullet("[T9] Landing page atractiva con pricing y CTAs"),
        bullet("[T10] Arquitectura multiempresa en Firestore"),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== TABLA PRIORIZADA =====
        heading(HeadingLevel.HEADING_1, "Tabla Priorizada de Acciones"),
        para(""),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: "Prioridad - Módulo - Problema - Impacto - Tiempo estimado", bold: true, size: 22, color: COLORS.text })],
        }),

        new Table({
          rows: [
            new TableRow({ children: [tableHeader("Prioridad"), tableHeader("Módulo"), tableHeader("Problema"), tableHeader("Impacto"), tableHeader("Tiempo")] }),
            ...[
              ["CRÍTICO", "Auth", "Cookie name mismatch — middleware nunca protege", "Seguridad 0", "15 min"],
              ["CRÍTICO", "Seguridad", "Sin Firestore Security Rules", "Datos expuestos", "4 h"],
              ["CRÍTICO", "Clientes", "pge.tsx en vez de page.tsx — ruta muerta", "Funcionalidad rota", "5 min"],
              ["CRÍTICO", "Signup", "Link /signup apunta a ruta /singup", "No puede registrarse", "5 min"],
              ["CRÍTICO", "Signup", "Password sin type=password", "Exposición credenciales", "2 min"],
              ["ALTA", "Ventas", "Servicios hardcodeados", "No personalizable", "4 h"],
              ["ALTA", "Infra", "Firebase config hardcodeada", "Riesgo seguridad", "30 min"],
              ["ALTA", "Auth", "Sin .env para entorno", "Mala práctica", "15 min"],
              ["MEDIA", "Inventario", "Stock no se descuenta al vender", "Inventario inconsistente", "3 h"],
              ["MEDIA", "Ventas", "Eliminar venta no revierte CRM", "Datos inconsistentes", "2 h"],
              ["MEDIA", "UX", "Sin confirmación al eliminar", "Pérdida accidental", "4 h"],
              ["MEDIA", "Notifs", "No hay sistema real de notificaciones", "Feature prometida falta", "8 h"],
              ["MEDIA", "UI", "DashboardLayout.tsx muerto, link roto", "Código basura", "15 min"],
              ["BAJA", "UX", "Sin loading en formularios", "Mala experiencia", "2 h"],
              ["BAJA", "UX", "Sin labels en inputs", "Inaccesible", "1 h"],
              ["BAJA", "Layout", "lang=en en app en español", "Error menor", "2 min"],
              ["BAJA", "Perf", "Sin paginación Firestore", "Problema con 10k+", "4 h"],
              ["FUTURO", "WhatsApp", "Placeholder sin implementar", "No usable", "16 h+"],
              ["FUTURO", "Roles", "Sin sistema de roles/staff", "Limitante multi-usuario", "8 h"],
            ].map(([prio, mod, prob, impact, time]) =>
              new TableRow({
                children: [
                  priorityCell(prio),
                  tableCell(mod),
                  tableCell(prob),
                  tableCell(impact),
                  tableCell(time, time.includes("min") ? COLORS.green : time.includes("h+") ? COLORS.muted : COLORS.yellow),
                ],
              })
            ),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== CONCLUSIONES =====
        heading(HeadingLevel.HEADING_1, "Conclusiones"),

        heading(HeadingLevel.HEADING_2, "¿Novent ya es un MVP?"),
        para("No. No es un MVP usable en producción.", { color: COLORS.red, bold: true }),
        para("Tiene la apariencia de un MVP (UI bonita, landing page, estructura multiempresa), pero tiene bugs críticos que lo rompen completamente:"),
        bullet("El middleware auth no funciona — cualquiera accede a rutas protegidas"),
        bullet("El detalle de cliente no carga — pge.tsx no es page.tsx"),
        bullet("El registro no funciona — link /signup vs ruta /singup"),
        bullet("No hay security rules — base de datos abierta"),
        bullet("No hay integración stock-ventas — vender no descuenta inventario"),
        bullet("Servicios hardcodeados — solo funciona para barbería"),

        heading(HeadingLevel.HEADING_2, "¿Qué falta para uso continuo 30 días?"),
        bullet("Corregir los 6 bugs críticos (innegociable)"),
        bullet("Hacer configurables los servicios/productos"),
        bullet("Integrar inventario con ventas (descuento de stock)"),
        bullet("Agregar confirmaciones antes de eliminar"),
        bullet("Deploy con .env + environment separation"),
        bullet("Firestore Security Rules básicas (companyId scope)"),
        bullet("Logout visible en el layout"),
        bullet("Estabilidad básica para no perder datos"),

        heading(HeadingLevel.HEADING_2, "Top 10 tareas a hacer primero"),
        para(""),
        para("1.  Renombrar pge.tsx → page.tsx (5 min)", { color: COLORS.red, bold: true }),
        para("2.  Renombrar carpeta singup → signup (5 min)", { color: COLORS.red, bold: true }),
        para("3.  Fijar cookie name en middleware o authToken (15 min)", { color: COLORS.red, bold: true }),
        para("4.  Agregar type='password' en signup (2 min)", { color: COLORS.red, bold: true }),
        para("5.  Crear .env.local + mover Firebase config a variables (30 min)", { color: COLORS.red, bold: true }),
        para("6.  Escribir Firestore Security Rules básicas (4 h)", { color: COLORS.yellow, bold: true }),
        para("7.  Hacer servicios configurables desde Firestore (4 h)", { color: COLORS.yellow, bold: true }),
        para("8.  Integrar stock inventario → ventas (descontar al vender) (3 h)", { color: COLORS.yellow, bold: true }),
        para("9.  Agregar confirmación antes de eliminar (2 h)", { color: COLORS.blue, bold: true }),
        para("10. Agregar logout en sidebar del layout principal (30 min)", { color: COLORS.blue, bold: true }),

        heading(HeadingLevel.HEADING_2, "Tareas que NO haría todavía"),
        para(""),
        bullet("WhatsApp real (16 h+) — demasiado complejo para MVP"),
        bullet("Notificaciones push — nice-to-have, no MVP"),
        bullet("Paginación Firestore — no es problema hasta 500+ registros"),
        bullet("Roles multi-usuario — MVP es 1 negocio con 1 dueño"),
        bullet("Facturación electrónica — depende del país y regulación"),
        bullet("Exportación PDF/CSV — no esencial primeros 30 días"),
        bullet("Tema claro/oscuro — ya tiene dark mode"),
        bullet("Tests automatizados — primero que funcione"),

        LINE,
        para(""),
        para("Documento generado el 5 de Junio, 2026", { color: COLORS.muted, size: 18 }),
        para("Auditoría realizada por agente CTO — Análisis completo del código fuente de Novent", { color: COLORS.muted, size: 18 }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("Auditoria_CTO_Novent_MVP.docx", buffer);
  console.log("✅ Documento generado: Auditoria_CTO_Novent_MVP.docx");
}

main().catch(console.error);
