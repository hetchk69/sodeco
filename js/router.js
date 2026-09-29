// router.js
// Decide qué pantalla mostrar según si hay sesión y cuál es el rol del perfil.

const Router = (() => {
  const SCREENS = ['login', 'home', 'form', 'confirm', 'admin'];
  let currentProfile = null;

  function showScreen(name) {
    for (const s of SCREENS) {
      document.getElementById(`screen-${s}`).classList.toggle('hidden', s !== name);
    }
  }

  async function start() {
    wireLogin();
    wireHome();
    wireForm();
    wireAdmin();

    Auth.onAuthStateChange(async (session) => {
      if (!session) {
        showScreen('login');
        return;
      }
      await enterApp();
    });

    const session = await Auth.getSession();
    if (session) {
      await enterApp();
    } else {
      showScreen('login');
    }
  }

  async function enterApp() {
    try {
      const profile = await Auth.getProfile();
      if (!profile) {
        document.getElementById('login-error').textContent =
          'Tu número no está autorizado, habla con el administrador.';
        await Auth.signOut();
        showScreen('login');
        return;
      }
      currentProfile = profile;

      if (profile.role === 'admin') {
        showScreen('admin');
        await AdminScreen.load();
      } else {
        showScreen('home');
        document.getElementById('home-name').textContent = profile.full_name;
        document.getElementById('home-avatar').textContent = (profile.full_name || '?').trim().charAt(0).toUpperCase();
        document.getElementById('home-role').textContent = roleLabel(profile.role);
        document.getElementById('home-description').textContent = roleDescription(profile.role);
        showQuestionCount();
      }
    } catch (err) {
      console.error(err);
      showScreen('login');
      document.getElementById('login-error').textContent = 'Ocurrió un error. Intenta de nuevo.';
    }
  }

  function roleLabel(role) {
    return (
      {
        jefe_tienda: 'Jefe de Tienda',
        asesor_tienda: 'Asesor de Tienda',
        jefe_bodega: 'Jefe de Bodega',
        gerencia: 'Gerencia',
        admin: 'Administrador',
      }[role] || role
    );
  }

  function roleDescription(role) {
    return (
      {
        jefe_tienda:
          'Vamos a preguntarte sobre cómo abres y cierras la tienda, cómo consultas el inventario de otras tiendas y bodegas, y quién autoriza los traslados.',
        asesor_tienda:
          'Vamos a preguntarte sobre cómo abres y cierras la tienda, y cómo consultas el inventario en tu día a día.',
        jefe_bodega:
          'Vamos a preguntarte sobre cómo abres y cierras la bodega, cómo llevas el control de existencias, y qué tiendas te consultan más.',
        gerencia:
          'Vamos a preguntarte sobre cómo ves la estructura general de la operación: pedidos, distribución entre tiendas y bodegas, y visibilidad de los datos.',
      }[role] || 'Vamos a hacerte algunas preguntas sobre tu día a día.'
    );
  }

  async function showQuestionCount() {
    const countEl = document.getElementById('home-count');
    countEl.textContent = '';
    const { count, error } = await window.db
      .from('questions')
      .select('id', { count: 'exact', head: true });
    if (!error && typeof count === 'number') {
      countEl.textContent = `Son alrededor de ${count} preguntas y puedes contestarlas a tu ritmo: se guardan solas.`;
    }
  }

  function wireLogin() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    document.getElementById('login-phone-prefix').textContent = window.APP_CONFIG.DEFAULT_COUNTRY_CODE;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      const phone = document.getElementById('login-phone-input').value;
      const password = document.getElementById('login-password-input').value;
      try {
        await Auth.signIn(phone, password);
        // onAuthStateChange se encarga de entrar a la app.
      } catch (err) {
        errorEl.textContent = 'Teléfono o contraseña incorrectos.';
      }
    });
  }

  function wireHome() {
    document.getElementById('home-continue').addEventListener('click', async () => {
      showScreen('form');
      const result = await FormScreen.load(currentProfile);
      showScreen(result);
    });
    document.getElementById('home-logout').addEventListener('click', () => Auth.signOut());
  }

  function wireForm() {
    document.getElementById('form-submit').addEventListener('click', () => FormScreen.submit());
    document.getElementById('confirm-logout').addEventListener('click', () => Auth.signOut());
  }

  function wireAdmin() {
    document.getElementById('admin-logout').addEventListener('click', () => Auth.signOut());
    document.getElementById('admin-filter-role').addEventListener('change', () => AdminScreen.render());
    document.getElementById('admin-filter-location').addEventListener('change', () => AdminScreen.render());
    document.getElementById('admin-export-csv').addEventListener('click', () => AdminScreen.exportCsv());

    document.getElementById('admin-add-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = await AdminScreen.addUser({
        full_name: document.getElementById('admin-add-name').value,
        phone: document.getElementById('admin-add-phone').value,
        role: document.getElementById('admin-add-role').value,
        location_id: document.getElementById('admin-add-location').value,
      });
      if (ok) e.target.reset();
    });
  }

  return { start, showScreen };
})();

window.Router = Router;
document.addEventListener('DOMContentLoaded', () => Router.start());
