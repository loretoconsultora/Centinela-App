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

La base de datos se prepara en orden con `supabase/01_schema.sql` (perfiles, roles, invitaciones y reglas RLS) y `supabase/02_gestion_documentos.sql` (historial de documentos y notificaciones). La lista de personas y la creación de cuentas contienen datos reales y no viven en el repo.

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

- **Autora**: sube sus documentos y ve el reporte completo de los suyos (puntaje, justificación y cita de cada criterio de ambos ejes, más la recomendación). Solo puede abrir sus propios documentos.
- **Revisora de núcleo**: corre cualquier documento (puede subirlo a nombre de una autora) y ve todos los documentos del equipo.
- **Administradora**: lo mismo que la revisora, más la lista del equipo y sus accesos.

Los permisos se verifican en el servidor contra el perfil real, nunca por lo que mande el navegador. En el primer ingreso se obliga a cambiar la contraseña inicial.

## Gestión de documentos, campanita y PDF

- Cada revisión queda registrada (`public.documentos`) con el nombre del documento, la autora dueña, la fecha y el dictamen. Cada archivo, link o texto pegado es una entrada aparte, con el nombre que escribe la persona.
- La sección **Gestión de documentos** muestra un tablero por estado (Bloqueado / Aprobado con observaciones / Aprobado) y debajo el listado completo.
- La **campanita** de la barra avisa a la autora y a las revisoras de núcleo cuando un documento queda Bloqueado o Aprobado con observaciones (`public.notificaciones`). Todo dentro de la app; no se envían correos.
- **Comentarios**: en el detalle de cada documento hay un hilo tipo foro. Solo lo escriben revisoras de núcleo y administradoras; las autoras lo leen y reciben un aviso en la campanita (`public.comentarios`, SQL `supabase/03_comentarios_equipo.sql`).
- **Gestión del equipo** (solo vistas de revisora y administradora): tabla por autora con documentos subidos, aprobados, con observaciones y bloqueados, más la fila de total. Con más de 3 bloqueados aparece 🚨 "Revisar personalmente" y se avisa por la campanita a las revisoras. Ahí también está el panel de equipo y accesos de la administradora.
- Mientras corre un análisis se muestra una barra de carga con el tiempo transcurrido; al terminar aparece el aviso **Ver reporte**, que abre el dictamen (con descarga de PDF) y se cierra con la tachita.
- Cada reporte se descarga en PDF como `Resultado Revisión - <nombre del documento>.pdf`.
- Las tablas tienen RLS sin políticas a propósito: solo se leen y escriben desde el servidor, con la clave secreta, después de verificar el rol.

## Dictamen

Un eliminatorio en rojo, o un Eje (A o B) en rojo, deja el documento **Bloqueado**; si no, un Eje en amarillo lo deja **Aprobado con observaciones**; con ambos en verde queda **Aprobado**. Los puntajes los calcula el servidor, no el modelo.

## Despliegue

Conectado a Vercel vía el repo de GitHub `loretoconsultora/centinela-app`: cada push a `main` dispara un deploy de producción. Configura las variables de entorno en Vercel antes del primer ingreso: sin las de Supabase la app responde con un aviso claro, y sin `ANTHROPIC_API_KEY` el análisis falla con un mensaje claro.
