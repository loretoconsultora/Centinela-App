# Centinela

Herramienta de revisión de alineación curricular para el proyecto educativo **Venezuela Tierra de Gracia (VTG)**. Sube un documento (plan de área, núcleo curricular, programa) y Centinela lo califica contra la rúbrica oficial v3:

- **Eje A — Alineación con VTG** (8 criterios ponderados).
- **Eje B — Distancia crítica de los modelos educativos anteriores** (CNB 2007 y CBN 1997, lógica invertida).
- **Criterios eliminatorios (E1, E2, E3)**: si cualquiera sale en rojo, el documento queda automáticamente **Bloqueado**, sin importar el promedio general.

La lógica completa de la rúbrica está en `lib/rubric.ts`. El detalle narrativo (qué evalúa cada criterio, señales de alerta, anclas de puntaje) está en el documento "Centinela — Rúbrica de Revisión de Contenidos (v3, final)".

## Configuración

Copia `.env.example` a `.env.local` y completa:

| Variable | Requerida | Para qué |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Sí | Llamar a la API de Claude para calificar el documento. |
| `CENTINELA_PASSWORD` | Sí | Contraseña única del equipo para esta fase del MVP (sin usuarios individuales todavía). |
| `CENTINELA_AUTH_SECRET` | No | Secreto para firmar la cookie de sesión. Si se omite, se deriva de `CENTINELA_PASSWORD`. |
| `CENTINELA_MODEL` | No | Modelo de Claude a usar (por defecto `claude-opus-5-5`). |

En Vercel: Project Settings → Environment Variables, y agrega las mismas claves para Production (y Preview si se usa).

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Te pedirá la contraseña del equipo (`CENTINELA_PASSWORD`) antes de dejarte entrar — eso lo controla `proxy.ts` (el equivalente de `middleware.ts` en Next.js 16).

## Formatos de entrada aceptados

PDF, Word (`.docx`), Excel/Sheets (`.xlsx`, `.csv`), texto pegado, o un link directo a un Google Doc/Sheet compartido como "cualquiera con el link puede ver". Los `.doc` (Word 97-2003) no se pueden leer automáticamente aquí — hay que convertirlos a `.docx`/PDF o pegar el texto.

## Roles (fase MVP)

Por ahora no hay usuarios individuales ni RBAC completo (eso llega con Supabase Auth en una fase posterior — ver "Centinela — Cómo Funciona"). El selector de rol en la pantalla principal (Autora / Revisora de núcleo-Administradora) solo decide si el reporte muestra el detalle completo del Eje B (justificaciones y citas político-ideológicas) o la versión simplificada para Autoras.

## Despliegue

Conectado a Vercel vía el repo de GitHub `loretoconsultora/centinela-app`: cada push a `main` dispara un deploy de producción. Recuerda configurar las variables de entorno en Vercel antes del primer deploy real (sin `ANTHROPIC_API_KEY` el análisis falla con un mensaje claro; sin `CENTINELA_PASSWORD` nadie puede pasar el login).
