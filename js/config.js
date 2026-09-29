// config.js
// Estas dos claves son PUBLICAS a propósito: la clave "anon" está diseñada
// para vivir en el navegador y su seguridad depende de RLS, no de ocultarla.
// NUNCA pongas aquí la clave "service_role".

window.APP_CONFIG = {
  SUPABASE_URL: 'https://zqmsaakhpoyjowmiitwq.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxbXNhYWtocG95am93bWlpdHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDcwMTcsImV4cCI6MjEwNjIyMzAxN30.42aeC-rNULhn8gM_-pjBdp8YgtecEFdgtVEZP1CjHCY',

  // Código de país por defecto para no equivocarse al escribir el teléfono.
  // El usuario solo escribe el número local; esto arma el E.164 (+504...).
  DEFAULT_COUNTRY_CODE: '+504',

  // El login usa el sistema de email+contraseña de Supabase (no requiere
  // ningún proveedor externo como Twilio). El usuario nunca ve ni escribe un
  // correo: internamente convertimos su teléfono en "<digitos>@EMAIL_DOMAIN".
  // ".invalid" es un dominio reservado (RFC 2606) que nunca se resuelve ni
  // recibe correo real.
  EMAIL_DOMAIN: 'levantamiento.invalid',
};
