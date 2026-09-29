# Especificación: formulario de levantamiento con Supabase

Sep 28, 2026 · @Henry

Documento pensado para dar contexto a Claude Code: qué construir, con qué reglas y en qué orden.

## 1. Objetivo, supuestos y alcance

Se construye un formulario web en HTML, con Supabase como base de datos y login por número de
teléfono, donde cada rol responde solo las preguntas de la guía de entrevista que le corresponden.

Supuestos (a confirmar en la sección 8):

- El formulario es la versión digital de la guía de entrevista: cada persona lo llena por su cuenta.
- Responden cuatro roles: Jefe de Tienda, Asesor de Tienda, Jefe de Bodega y Gerencia (visión
  general de la operación, con su propio cuestionario). Un quinto rol, Administrador (tú), ve
  todas las respuestas.
- Los usuarios son pocos y conocidos: el administrador carga antes su teléfono y su rol. Nadie se
  registra solo ni elige su rol.
- Se usa sobre todo desde el celular.

Dentro del MVP: login con teléfono + contraseña temporal (sin SMS), formulario por rol con guardado automático, envío final y
vista de administrador con exportación a CSV.

Fuera del MVP: notificaciones, edición de preguntas desde la interfaz, gráficos, y los roles de
facturación y externos (se siguen entrevistando aparte).

## 2. Roles y permisos

Cada usuario ve solo sus preguntas y sus propias respuestas; solo el administrador ve todo. Estos
permisos se aplican en la base de datos (RLS), no solo en la pantalla.

| Acción | Jefe de Tienda | Asesor de Tienda | Jefe de Bodega | Gerencia | Administrador |
|---|---|---|---|---|---|
| Iniciar sesión con su teléfono | Sí | Sí | Sí | Sí | Sí |
| Ver preguntas de su rol | Sí | Sí | Sí | Sí | Todas |
| Guardar borrador de sus respuestas | Sí | Sí | Sí | Sí | No aplica |
| Enviar el formulario (queda bloqueado) | Sí | Sí | Sí | Sí | No aplica |
| Ver respuestas de otros | No | No | No | No | Sí |
| Ver lista de usuarios y avance | No | No | No | No | Sí |
| Agregar usuarios (teléfono y rol) | No | No | No | No | Sí |
| Reabrir un formulario enviado | No | No | No | No | Sí |
| Exportar respuestas a CSV | No | No | No | No | Sí |

Qué preguntas ve cada rol (de la guía de entrevista):

| Rol | Bloques de la guía |
|---|---|
| Jefe de Tienda | Apertura, tienda (general + autorización/alcance), tienda (orden de consulta), gestión de tienda, logística y facturación, y cierre |
| Asesor de Tienda | Apertura, tienda (general + equipo/rotación), tienda (orden de consulta), y cierre |
| Jefe de Bodega | Apertura, bodega (general + solicitudes), seguimiento (orden en que le preguntan), logística y facturación, y cierre |
| Gerencia | Pedidos y distribución, estructura general, visibilidad de los datos, y gente y cierre — un cuestionario propio, sin apertura/cierre compartido con los demás roles |

## 3. Autenticación por número de teléfono

El usuario entra con su teléfono y una contraseña temporal única que el administrador le asigna de
antemano. Por dentro se usa el sistema de **email + contraseña** nativo de Supabase Auth (no el
proveedor Phone): así no depende de Twilio ni de ningún proveedor externo de SMS, y no hay que
activar ni configurar nada adicional en el panel de Authentication. El usuario nunca ve ni escribe
un correo — solo su teléfono, igual que si fuera login por teléfono de verdad.

Cómo funciona por dentro: cada cuenta se crea con un correo falso
`"<teléfono-sin-el-+>@EMAIL_DOMAIN"` (ver `EMAIL_DOMAIN` en `js/config.js`, usa el dominio reservado
`.invalid` que nunca se resuelve ni recibe correo real), y `email_confirm: true` para que Supabase
no intente confirmar nada. `js/auth.js` arma y usa ese correo internamente; en la pantalla de login
solo hay un campo de teléfono y uno de contraseña.

Reglas de implementación:

- Teléfono en formato internacional (E.164), por ejemplo +504..., con el código de país fijo por
  defecto para no equivocarse.
- El rol nunca viene del navegador: sale de la tabla `allowed_users` y se copia a `profiles` con un
  trigger al crear el usuario en `auth.users` (el trigger extrae el teléfono del correo falso).
- El administrador primero carga el teléfono en `allowed_users` (`supabase/seed/allowed_users_real.sql`)
  y luego crea la cuenta de acceso con contraseña usando `supabase/scripts/create_users.sh`, que llama
  a la Admin API de Supabase (no dispara ningún correo ni SMS real).
- Si alguien intenta entrar con un teléfono sin cuenta creada, o con la contraseña equivocada, ve
  "Teléfono o contraseña incorrectos."
- La sesión dura varios días para que no tengan que volver a escribir la contraseña cada vez.
- Las contraseñas son temporales: el administrador se las comunica manualmente (por ejemplo, por el
  mismo grupo de WhatsApp) y puede regenerarlas corriendo de nuevo `create_users.sh` para una persona.

## 4. Modelo de datos y políticas RLS

Seis tablas: `locations`, `allowed_users`, `profiles`, `questions`, `submissions`, `answers`.
Roles permitidos: `jefe_tienda`, `asesor_tienda`, `jefe_bodega`, `admin`. Tipos de respuesta:
`text`, `number`, `choice`.

Ver `supabase/migrations/001_schema.sql`, `002_functions_triggers.sql` y `003_rls.sql` para el
esquema completo, las funciones, el trigger `handle_new_user` y las políticas RLS.

Regla más importante: un usuario nunca debe poder leer respuestas ajenas ni editar un formulario ya
enviado, aunque manipule las llamadas desde el navegador.

## 5. Formulario y pantallas por rol

Cinco pantallas en un solo HTML, pensadas para el celular: Login, Inicio, Formulario, Confirmación,
Administración (solo admin).

- Guardado automático como borrador al salir de cada campo.
- Al enviar, `submissions.status` pasa a `submitted` y las respuestas se bloquean por RLS.
- Las preguntas se leen de la tabla `questions` filtradas por rol; el HTML no las trae escritas.

## 6. Estructura del proyecto y stack

Sitio estático sin build: HTML, CSS y JavaScript simple, con `supabase-js` cargado por CDN.

```
levantamiento-bodegas/
├── CLAUDE.md
├── SPEC.md
├── index.html
├── css/styles.css
├── js/{config,supabase,auth,form,admin,router}.js
├── supabase/migrations/{001_schema,002_functions_triggers,003_rls}.sql
├── supabase/seed/{locations,allowed_users,questions}.sql
└── tests/rls.md
```

Reglas de seguridad:

- Solo se usa la clave `anon` en el navegador; la `service_role` nunca se escribe en el código.
- Toda la seguridad depende de RLS; esconder botones en pantalla no cuenta como control de acceso.
- Ningún dato personal real (teléfonos) se sube a `seed/`.
- Todo texto que viene de la base de datos se inserta con `textContent`, no con `innerHTML`.

## 7. Plan de implementación por fases

Fase 0 (manual, en Supabase): crear proyecto y copiar URL y clave anon. No hace falta activar
ningún proveedor adicional (el login usa email+contraseña, que viene activado por defecto).

Fase 1: migraciones (esquema, funciones, trigger, RLS).
Fase 2: seed de preguntas desde la guía de entrevista.
Fase 3: login por teléfono + contraseña temporal (sin OTP).
Fase 4: formulario con autoguardado y envío.
Fase 5: administración (usuarios, avance, detalle, reabrir, CSV).
Fase 6: pruebas de RLS y publicación.

## 8. Criterios de aceptación y preguntas abiertas

Ver `tests/rls.md` para los 9 casos de prueba.

Preguntas abiertas pendientes de confirmar con el usuario: quién es admin,
si se puede editar tras enviar, si las respuestas son nominales o anónimas, si Asesor de Tienda
responde lo mismo que Jefe de Tienda, dónde se publica, cuántos usuarios hay en total.
