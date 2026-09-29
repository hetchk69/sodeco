// auth.js
// Login por teléfono + contraseña temporal, usando el sistema de
// email+contraseña de Supabase Auth (no el proveedor Phone: así no depende
// de Twilio ni de ningún proveedor externo). El usuario nunca ve ni escribe
// un correo: aquí convertimos su teléfono en un correo falso que solo sirve
// como identificador interno. Las cuentas y sus contraseñas las crea el
// administrador de antemano con supabase/scripts/create_users.sh.

const Auth = (() => {
  function toPhoneDigits(localNumber) {
    const countryDigits = window.APP_CONFIG.DEFAULT_COUNTRY_CODE.replace(/\D/g, '');
    const localDigits = localNumber.replace(/\D/g, '');
    return `${countryDigits}${localDigits}`;
  }

  function toFakeEmail(localNumber) {
    return `${toPhoneDigits(localNumber)}@${window.APP_CONFIG.EMAIL_DOMAIN}`;
  }

  async function signIn(localNumber, password) {
    const email = toFakeEmail(localNumber);
    const { data, error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function getSession() {
    const { data } = await window.db.auth.getSession();
    return data.session;
  }

  async function getProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await window.db
      .from('profiles')
      .select('id, phone, full_name, role, location_id')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await window.db.auth.signOut();
  }

  function onAuthStateChange(callback) {
    window.db.auth.onAuthStateChange((_event, session) => callback(session));
  }

  return { signIn, getSession, getProfile, signOut, onAuthStateChange };
})();

window.Auth = Auth;
