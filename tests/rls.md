# Pruebas de RLS y aceptación

Corre estos casos en el SQL editor de Supabase (usando `set role` / usuarios reales de prueba con
cada teléfono) y en la app real con un usuario de cada rol antes de dar el MVP por terminado.

| # | Prueba | Resultado esperado | Cómo verificar |
|---|---|---|---|
| 1 | Alguien corre `create_users.sh` para un teléfono que no está en `allowed_users` | Se rechaza con error y no se crea usuario | `handle_new_user` debe lanzar la excepción y `auth.users` no debe tener esa fila |
| 2 | Un Jefe de Bodega inicia sesión | Ve solo las preguntas de su rol | Login con ese usuario, revisar que `screen-form` solo muestre preguntas con `jefe_bodega` en `role_target` |
| 3 | Un Asesor de Tienda pide las respuestas de otro usuario | La base devuelve cero filas | Con la sesión del asesor, `select * from answers where submission_id = '<id de otra persona>'` debe devolver 0 filas |
| 4 | Un usuario cambia su rol desde la consola del navegador | No tiene efecto: el rol sale de `profiles` | Editar `localStorage`/estado en devtools no debe cambiar qué preguntas ve ni qué política aplica, porque `current_app_role()` lee de `profiles` en el servidor |
| 5 | Un usuario intenta editar respuestas después de enviar | La base lo rechaza | Con `submissions.status = 'submitted'`, un `update`/`insert` en `answers` de esa submission debe fallar por RLS |
| 6 | Un usuario cierra la página a mitad del formulario | Al volver, sus respuestas siguen ahí | Guardar 2-3 respuestas, cerrar la pestaña, volver a entrar: deben seguir cargadas |
| 7 | El administrador abre la vista de administración | Ve todos los usuarios, avance y respuestas | Login como admin, `screen-admin` debe listar todos los `profiles` con su `submission.status` |
| 8 | El administrador exporta el CSV | Trae usuario, rol, ubicación, pregunta y respuesta | Descargar el CSV desde `admin-export-csv` y confirmar las columnas |
| 9 | Un usuario no admin abre la ruta de administración | No ve nada y no puede consultar datos ajenos | Con un usuario normal, cualquier `select` directo a `allowed_users` o a `answers` de otra submission debe devolver 0 filas por RLS, aunque manipule el JS del cliente |

## Notas

- Estas pruebas validan la base de datos, no solo la interfaz: usa el SQL editor de Supabase con
  `set local role authenticated; set local request.jwt.claims = '{"sub": "<uuid del usuario>"}';`
  (o el usuario de prueba real vía la app) para simular cada sesión.
- Si el caso 5 falla, revisa la política `answers_update`/`answers_insert` en
  `supabase/migrations/003_rls.sql`: el `where status = 'draft'` es lo que bloquea la edición.
- Si el caso 3 falla, es casi seguro que `answers_select` no está filtrando por
  `submissions.user_id = auth.uid()`.
