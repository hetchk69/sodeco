# CLAUDE.md

Contexto de este proyecto para Claude Code. Lee también [SPEC.md](SPEC.md) antes de tocar
cualquier cosa: ahí está el objetivo, los roles, el modelo de datos y el plan por fases.

## Qué es esto

Formulario de levantamiento de información (guía de entrevista digitalizada) para tres roles
de tienda/bodega, con login por teléfono + contraseña (implementado sobre el email+contraseña
nativo de Supabase Auth, sin Twilio ni ningún proveedor de SMS) y un cuarto rol, administrador,
que ve y gestiona todo. Sitio estático sin build: HTML + CSS + JS plano, `supabase-js` por CDN.

## Reglas de seguridad (no negociables)

- Solo la clave `anon` de Supabase vive en el navegador (`js/config.js`). La clave
  `service_role` nunca se escribe en código ni se sube al repositorio.
- Toda la seguridad de acceso a datos depende de RLS en Postgres, no de esconder botones en
  la interfaz. Si agregas una tabla o columna nueva, agrega también su política RLS en la
  misma migración.
- El rol de un usuario nunca se decide en el cliente: sale de `allowed_users` y se copia a
  `profiles` por el trigger `handle_new_user`. No leas ni confíes en un "rol" que venga del
  formulario o de `localStorage`.
- No subas teléfonos ni nombres reales a ningún archivo que se suba al repositorio: ni a
  `supabase/seed/`, ni a scripts. El patrón es siempre "archivo con datos de ejemplo, que sí se
  sube" + "archivo *_real con datos reales, en `.gitignore`, que nunca se sube" — ver
  `allowed_users.sql`/`allowed_users_real.sql` y `create_users.sh`/`create_users_real.sh`.
- El login es teléfono + contraseña temporal, implementado sobre email+contraseña (nunca sobre el
  proveedor Phone/Twilio): cada cuenta usa un correo falso `"<teléfono>@EMAIL_DOMAIN"` que el
  usuario nunca ve. Las cuentas se crean con `supabase/scripts/create_users_real.sh` (copia local,
  gitignored, del template `create_users.sh`), que necesita la clave `service_role`. Esa clave se
  escribe solo cuando el script la pide en la terminal del usuario, nunca se pide ni se pega en
  el chat, y nunca se guarda en un archivo del proyecto.
- Todo texto que venga de la base de datos (preguntas, nombres, respuestas) se inserta en el
  DOM con `textContent`, nunca con `innerHTML`, para evitar XSS.
- Nunca ejecutes migraciones destructivas (`drop table`, `truncate` fuera de seed) sin que el
  usuario lo pida explícitamente.

## Estructura

```
index.html            shell de las 5 pantallas (login, inicio, formulario, confirmación, admin)
css/styles.css         diseño móvil primero
js/config.js           SUPABASE_URL y SUPABASE_ANON_KEY (públicas, van en el repo)
js/supabase.js         crea el cliente supabase-js
js/auth.js             login teléfono+contraseña (vía email falso), sesión, logout
js/form.js              carga de preguntas por rol, autoguardado, envío
js/admin.js             lista de usuarios, detalle, alta, reabrir, export CSV
js/router.js            decide qué pantalla mostrar según sesión y rol
supabase/migrations/    001_schema, 002_functions_triggers, 003_rls (en ese orden)
supabase/seed/          locations, allowed_users (ejemplo), questions
tests/rls.md            casos de prueba de permisos (sección 8 de SPEC.md)
```

## Orden de trabajo

Sigue las fases de la sección 7 de SPEC.md en orden: esquema → preguntas → login → formulario →
admin → pruebas y publicación. No avances de fase si la anterior no pasa sus pruebas — es más
barato corregir permisos en una tabla que corregirlos con toda la interfaz ya construida encima.

## Preguntas de la guía de entrevista

`supabase/seed/questions.sql` ya tiene las preguntas reales, revisadas y aprobadas por el
usuario en `scripts/build_questions_pdf.py` → `preguntas_por_rol.pdf`. Si la guía cambia otra
vez, actualiza primero ese script de Python (es la fuente de verdad legible), regenera el PDF
para que el usuario la revise, y solo después regenera `questions.sql` completo a partir de
ahí (no lo edites a mano pregunta por pregunta). Respeta siempre: `code` único, `role_target`
(array de `app_role`), `section`, `text`, `purpose` opcional, `answer_type`
(`text`/`number`/`choice`), `position`, y `active = false` para las opcionales.
