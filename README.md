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
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Clave publishable (`sb_publishable_…`), para iniciar sesión desde el navegador. |
| `SUPABASE_SECRET_KEY` | Sí | Clave secreta (`sb_secret_…`), solo servidor. Nunca con prefijo `NEXT_PUBLIC_`. |
| `CENTINELA_PASSWORD_INICIAL` | No | Contraseña inicial compartida; si se define, no se permite reutilizarla al cambiarla. |
| `CENTINELA_MODEL` | No | Modelo de Claude a usar (por defecto `claude-opus-5-5`). |

En Vercel: Project Settings → Environment Variables. Tras agregarlas hay que redeployar.

La base de datos se prepara con `supabase/01_schema.sql` (perfiles, roles, invitaciones y reglas RLS). La lista de personas y la creación de cuentas contienen datos reales y no viven en el repo.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El acceso lo controla `proxy.ts` (el equivalente de `middleware.ts` en Next.js 16) con la sesión de Supabase.

## Formatos de entrada aceptados

PDF, Word (`.docx`), Excel/Sheets (`.xlsx`, `.csv`), texto pegado, o un link directo a un Google Doc/Sheet compartido como "cualquiera con el link puede ver". Los `.doc` (Word 97-2003) no se pueden leer automáticamente aquí — hay que convertirlos a `.docx`/PDF o pegar el texto.

## Roles y vistas

Cada persona inicia sesión con su correo y contraseña (Supabase Auth). Su perfil (`public.profiles`) trae una lista de roles: `autora`, `revisora_nucleo`, `administradora`. Quien tiene varios alterna entre sus vistas desde el selector de la cabecera.

- **Autora**: sube sus documentos y recibe el reporte simplificado (el Eje B sin justificaciones ni citas).
- **Revisora de núcleo**: corre cualquier documento y ve el reporte completo.
- **Administradora**: ve la lista del equipo y sus accesos, y corre documentos con el reporte completo.

Los permisos se verifican en el servidor contra el perfil real, nunca por lo que mande el navegador. En el primer ingreso se obliga a cambiar la contraseña inicial.

## Despliegue

Conectado a Vercel vía el repo de GitHub `loretoconsultora/centinela-app`: cada push a `main` dispara un deploy de producción. Configura las variables de entorno en Vercel antes del primer ingreso: sin las de Supabase la app responde con un aviso claro, y sin `ANTHROPIC_API_KEY` el análisis falla con un mensaje claro.
