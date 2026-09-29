#!/usr/bin/env bash
# create_users.sh
#
# PLANTILLA de ejemplo (sin datos reales, seguro de subir a un repositorio).
# Para usar con datos reales: copia este archivo a create_users_real.sh
# (ya está en .gitignore, nunca se sube), reemplaza el arreglo USERS con tu
# lista real y corre esa copia en su lugar. create_users.bat ya prefiere
# create_users_real.sh automáticamente si existe.
#
# Crea las cuentas de Supabase Auth (teléfono + contraseña temporal) para las
# personas que ya cargaste en `allowed_users` con allowed_users_real.sql.
#
# El login usa email+contraseña (el sistema nativo de Supabase, sin ningún
# proveedor externo como Twilio): a cada persona se le crea una cuenta con
# email "<telefono-sin-mas>@EMAIL_DOMAIN" (debe ser el mismo EMAIL_DOMAIN de
# js/config.js) y `email_confirm: true`, así que no se manda ningún correo
# real. El usuario solo escribe su teléfono en la página; auth.js arma ese
# correo falso por dentro.
#
# CORRE ESTO DESPUÉS de haber corrido allowed_users_real.sql, porque el
# trigger handle_new_user rechaza cualquier teléfono que no esté ya en
# allowed_users.
#
# SEGURIDAD: este script necesita tu clave `service_role` (Project Settings →
# API → service_role). Esa clave nunca debe pegarse en el chat, ni guardarse
# en ningún archivo del proyecto, ni subirse a un repositorio.
#
# Uso: haz doble clic (o corre `bash create_users.sh` desde una terminal) y
# te va a preguntar la URL y la clave por pantalla. La ventana se queda
# abierta al final aunque haya errores, para que puedas leer el resultado.

# Nota: a propósito NO usamos "set -e" aquí. Es normal y esperado que las
# personas que ya tenían cuenta (de una corrida anterior) den un error de
# "ya registrado" — el script debe seguir con las demás, no detenerse ahí.
set -uo pipefail

cerrar() {
  echo
  read -rp "Presiona Enter para cerrar esta ventana..." _ || true
}
trap cerrar EXIT

DEFAULT_SUPABASE_URL="https://zqmsaakhpoyjowmiitwq.supabase.co"
EMAIL_DOMAIN="levantamiento.invalid" # debe ser igual a EMAIL_DOMAIN en js/config.js

if [[ -z "${SUPABASE_URL:-}" ]]; then
  read -rp "URL de Supabase [${DEFAULT_SUPABASE_URL}]: " SUPABASE_URL
  SUPABASE_URL="${SUPABASE_URL:-$DEFAULT_SUPABASE_URL}"
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  read -rsp "Clave service_role (Project Settings > API > service_role): " SUPABASE_SERVICE_ROLE_KEY
  echo
fi

# Limpia \r y espacios invisibles que a veces quedan al pegar en Windows,
# y quita una barra final de la URL si la traía.
SUPABASE_URL="${SUPABASE_URL//$'\r'/}"
SUPABASE_URL="${SUPABASE_URL%/}"
SUPABASE_URL="$(echo -n "$SUPABASE_URL" | xargs)"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY//$'\r'/}"
SUPABASE_SERVICE_ROLE_KEY="$(echo -n "$SUPABASE_SERVICE_ROLE_KEY" | xargs)"

echo "URL a usar: ${SUPABASE_URL}"
echo "Clave leída (${#SUPABASE_SERVICE_ROLE_KEY} caracteres, empieza con: ${SUPABASE_SERVICE_ROLE_KEY:0:6}...)"
echo

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "No escribiste ninguna clave. Cancelando." >&2
  exit 1
fi

# name|phone (mismo listado que supabase/seed/allowed_users.sql). Reemplaza
# esto con tu lista real en tu propia copia create_users_real.sh.
USERS=(
  "Nombre Ejemplo|+50400000001"
  "Otro Nombre|+50400000002"
)

gen_password() {
  # el "|| true" evita que el script muera por SIGPIPE: head corta la
  # salida a los 8 caracteres y cierra el pipe mientras tr todavía está
  # escribiendo, lo que bajo `pipefail` se ve como una falla.
  tr -dc 'A-Z0-9' < /dev/urandom | head -c 8 || true
}

echo
echo "nombre,telefono,contraseña_temporal"

resp_file="$(mktemp)"

for entry in "${USERS[@]}"; do
  name="${entry%%|*}"
  phone="${entry##*|}"
  digits="${phone#+}"
  email="${digits}@${EMAIL_DOMAIN}"
  password="$(gen_password)"

  response=$(curl -s -o "$resp_file" -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${email}\", \"password\": \"${password}\", \"email_confirm\": true}")
  curl_exit=$?
  body="$(cat "$resp_file" 2>/dev/null)"

  if [[ "$response" == "200" || "$response" == "201" ]]; then
    echo "${name},${phone},${password}"
  elif [[ $curl_exit -ne 0 ]]; then
    echo "${name},${phone},ERROR: curl no pudo conectar (código curl ${curl_exit}). Revisa tu internet o la URL." >&2
  elif [[ -z "$body" ]]; then
    echo "${name},${phone},ERROR (HTTP ${response}, sin cuerpo de respuesta — revisa que la clave sea la service_role completa)" >&2
  else
    echo "${name},${phone},ERROR (HTTP ${response}): ${body}" >&2
  fi
done

rm -f "$resp_file"
echo
echo "Listo. Copia las contraseñas de arriba antes de cerrar esta ventana."
