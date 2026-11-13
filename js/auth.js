/* ==========================================================================
   BITSZONE — Autenticación y Gestión de Roles (JavaScript Vanilla + localStorage)
   Soporta roles: 'user', 'admin' y 'superadmin'
   ========================================================================== */
(function (window) {
  'use strict';

  var STORAGE_SESSION = 'bz_vanilla_session_v1';
  var STORAGE_USERS = 'bz_vanilla_users_v1';

  var DEFAULT_USERS = [
    {
      id: 'superadmin-owner',
      email: 'bitszone.app@gmail.com',
      password: 'admin123',
      name: 'SUPERADMIN',
      role: 'superadmin',
      avatarUrl: ''
    },
    {
      id: 'admin-demo',
      email: 'admin@bitszone.app',
      password: 'admin123',
      name: 'Carlos_Ops',
      role: 'admin',
      avatarUrl: ''
    },
    {
      id: 'user-demo',
      email: 'oyente@bitszone.app',
      password: 'bitszone123',
      name: 'Oyente_Demo',
      role: 'user',
      avatarUrl: ''
    }
  ];

  function loadUsers() {
    try {
      var raw = localStorage.getItem(STORAGE_USERS);
      if (!raw) {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS.slice();
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_USERS.slice();
    } catch (e) {
      return DEFAULT_USERS.slice();
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    } catch (e) {}
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(user) {
    var safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      avatarUrl: user.avatarUrl || ''
    };
    try {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(safeUser));
    } catch (e) {}
    return safeUser;
  }

  function signOut() {
    try {
      localStorage.removeItem(STORAGE_SESSION);
    } catch (e) {}
  }

  function isAdmin(session) {
    var s = session || getSession();
    return Boolean(s && (s.role === 'admin' || s.role === 'superadmin'));
  }

  function isSuperAdmin(session) {
    var s = session || getSession();
    return Boolean(s && s.role === 'superadmin');
  }

  function loginWithCredentials(email, password, requiredAdmin) {
    var cleanEmail = String(email || '').trim().toLowerCase();
    var cleanPass = String(password || '');
    if (!cleanEmail || cleanEmail.indexOf('@') === -1) {
      return { ok: false, error: 'Ingresa un correo electrónico válido.' };
    }
    if (!cleanPass || cleanPass.length < 4) {
      return { ok: false, error: 'Ingresa una contraseña de al menos 4 caracteres.' };
    }

    var users = loadUsers();
    var found = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === cleanEmail) {
        found = users[i];
        break;
      }
    }

    if (!found) {
      return { ok: false, error: 'Cuenta no encontrada. Verifica el correo o regístrate.' };
    }
    if (found.password !== cleanPass) {
      return { ok: false, error: 'Contraseña incorrecta.' };
    }
    if (requiredAdmin && found.role !== 'admin' && found.role !== 'superadmin') {
      return { ok: false, error: 'Esta cuenta no tiene permisos de Administrador.' };
    }

    return { ok: true, user: saveSession(found) };
  }

  function registerUser(name, email, password) {
    var cleanName = String(name || '').trim();
    var cleanEmail = String(email || '').trim().toLowerCase();
    var cleanPass = String(password || '');

    if (!/^[a-zA-Z0-9._\s]{3,24}$/.test(cleanName)) {
      return { ok: false, error: 'El nombre debe tener entre 3 y 24 caracteres válidos.' };
    }
    if (!cleanEmail || cleanEmail.indexOf('@') === -1) {
      return { ok: false, error: 'Ingresa un correo electrónico válido.' };
    }
    if (cleanPass.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    var users = loadUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === cleanEmail) {
        return { ok: false, error: 'Ese correo ya está registrado. Inicia sesión.' };
      }
    }

    var newUser = {
      id: 'usr_' + Date.now(),
      email: cleanEmail,
      password: cleanPass,
      name: cleanName,
      role: 'user',
      avatarUrl: ''
    };
    users.push(newUser);
    saveUsers(users);
    return { ok: true, user: saveSession(newUser) };
  }

  function quickDemoLogin(roleType) {
    var users = loadUsers();
    var targetEmail = roleType === 'superadmin'
      ? 'bitszone.app@gmail.com'
      : roleType === 'admin'
        ? 'admin@bitszone.app'
        : 'oyente@bitszone.app';
    var found = users.find(function (u) { return u.email === targetEmail; }) || DEFAULT_USERS[0];
    return saveSession(found);
  }

  function updateProfile(patch) {
    var current = getSession();
    if (!current) return null;
    var updated = Object.assign({}, current, patch);
    saveSession(updated);

    var users = loadUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === updated.id || users[i].email === updated.email) {
        users[i].name = updated.name;
        users[i].avatarUrl = updated.avatarUrl;
        break;
      }
    }
    saveUsers(users);
    return updated;
  }

  // Inicialización automática de eventos en login.html si estamos en esa página
  document.addEventListener('DOMContentLoaded', function () {
    var authRoot = document.getElementById('bzAuthRoot');
    if (!authRoot) return;

    var tabUserBtn = document.getElementById('btnRoleUser');
    var tabAdminBtn = document.getElementById('btnRoleAdmin');
    var paneUser = document.getElementById('paneUserAuth');
    var paneAdmin = document.getElementById('paneAdminAuth');
    var rightSubtitle = document.getElementById('authRightSubtitle');
    var step1Title = document.getElementById('authStep1Title');
    var step1Desc = document.getElementById('authStep1Desc');
    var step2Title = document.getElementById('authStep2Title');
    var step2Desc = document.getElementById('authStep2Desc');
    var step3Title = document.getElementById('authStep3Title');
    var step3Desc = document.getElementById('authStep3Desc');

    var toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
    var userNameWrap = document.getElementById('userNameGroup');
    var userSubmitLabel = document.getElementById('userSubmitLabel');
    var userHeadingTitle = document.getElementById('userHeadingTitle');
    var userHeadingSub = document.getElementById('userHeadingSub');
    var userForm = document.getElementById('formUserAuth');
    var adminForm = document.getElementById('formAdminAuth');
    var userAlert = document.getElementById('userAuthError');
    var adminAlert = document.getElementById('adminAuthError');
    var authFlowContainer = document.getElementById('authFlowContainer');
    var authSuccessState = document.getElementById('authSuccessState');

    var isRegisterMode = false;

    function completeAuthRedirect(user) {
      if (authFlowContainer && authSuccessState) {
        authFlowContainer.classList.add('d-none');
        authSuccessState.classList.remove('d-none');
        var welcomeBadge = document.getElementById('welcomeRoleText');
        if (welcomeBadge) {
          welcomeBadge.textContent = isAdmin(user)
            ? 'Sesión iniciada como ' + user.role.toUpperCase() + ' (' + user.name + ')'
            : 'Entrando como ' + user.name + '…';
        }
      }
      setTimeout(function () {
        window.location.href = './player.html';
      }, 900);
    }

    function switchRoleTab(role) {
      if (role === 'admin') {
        tabAdminBtn.classList.add('active');
        tabUserBtn.classList.remove('active');
        paneAdmin.classList.remove('d-none');
        paneUser.classList.add('d-none');
        if (rightSubtitle) rightSubtitle.textContent = 'Acceso administrativo seguro para gestionar el Dashboard Demo de Bitszone.';
        if (step1Title) step1Title.textContent = 'Acceso Administrador';
        if (step1Desc) step1Desc.textContent = 'Credenciales con rol Admin o Superadmin.';
        if (step2Title) step2Title.textContent = 'Verificación de permisos';
        if (step2Desc) step2Desc.textContent = 'Insignia ADMIN habilitada en tu barra lateral.';
        if (step3Title) step3Title.textContent = 'Panel de Control Demo';
        if (step3Desc) step3Desc.textContent = 'Acceso completo a KPIs, gráficos y gestión.';
      } else {
        tabUserBtn.classList.add('active');
        tabAdminBtn.classList.remove('active');
        paneUser.classList.remove('d-none');
        paneAdmin.classList.add('d-none');
        if (rightSubtitle) rightSubtitle.textContent = 'Tu música favorita con catálogo conectado y biblioteca personal.';
        if (step1Title) step1Title.textContent = 'Elige o crea tu cuenta';
        if (step1Desc) step1Desc.textContent = 'Acceso rápido en segundos.';
        if (step2Title) step2Title.textContent = 'Explora el catálogo';
        if (step2Desc) step2Desc.textContent = 'Escucha álbumes, artistas y arma playlists.';
        if (step3Title) step3Title.textContent = 'Listo, a escuchar';
        if (step3Desc) step3Desc.textContent = 'Guarda favoritos y descargas en tu perfil.';
      }
    }

    if (tabUserBtn && tabAdminBtn) {
      tabUserBtn.addEventListener('click', function () { switchRoleTab('user'); });
      tabAdminBtn.addEventListener('click', function () { switchRoleTab('admin'); });
    }

    if (toggleAuthModeBtn) {
      toggleAuthModeBtn.addEventListener('click', function () {
        isRegisterMode = !isRegisterMode;
        userAlert.classList.add('d-none');
        if (isRegisterMode) {
          userNameWrap.classList.remove('d-none');
          document.getElementById('userNameInput').required = true;
          userHeadingTitle.textContent = 'Crear cuenta';
          userHeadingSub.textContent = 'Regístrate para guardar tus playlists y descargas.';
          userSubmitLabel.textContent = 'Registrarme y entrar';
          toggleAuthModeBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
        } else {
          userNameWrap.classList.add('d-none');
          document.getElementById('userNameInput').required = false;
          userHeadingTitle.textContent = 'Bienvenido';
          userHeadingSub.textContent = 'Inicia sesión para disfrutar de Bitszone.';
          userSubmitLabel.textContent = 'Iniciar sesión';
          toggleAuthModeBtn.textContent = '¿Nuevo en Bitszone? Crea una cuenta gratis';
        }
      });
    }

    if (userForm) {
      userForm.addEventListener('submit', function (e) {
        e.preventDefault();
        userAlert.classList.add('d-none');
        var emailVal = document.getElementById('userEmailInput').value;
        var passVal = document.getElementById('userPassInput').value;
        var nameVal = document.getElementById('userNameInput').value;

        var res = isRegisterMode
          ? registerUser(nameVal, emailVal, passVal)
          : loginWithCredentials(emailVal, passVal, false);

        if (!res.ok) {
          userAlert.textContent = res.error;
          userAlert.classList.remove('d-none');
          return;
        }
        completeAuthRedirect(res.user);
      });
    }

    if (adminForm) {
      adminForm.addEventListener('submit', function (e) {
        e.preventDefault();
        adminAlert.classList.add('d-none');
        var emailVal = document.getElementById('adminEmailInput').value;
        var passVal = document.getElementById('adminPassInput').value;

        var res = loginWithCredentials(emailVal, passVal, true);
        if (!res.ok) {
          adminAlert.textContent = res.error;
          adminAlert.classList.remove('d-none');
          return;
        }
        completeAuthRedirect(res.user);
      });
    }

    // Botones mostrar/ocultar contraseña
    document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-toggle-password');
        var input = document.getElementById(targetId);
        var icon = btn.querySelector('i');
        if (!input) return;
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.className = 'bi bi-eye-slash';
        } else {
          input.type = 'password';
          if (icon) icon.className = 'bi bi-eye';
        }
      });
    });

    // Accesos rápidos Demo para exposición académica
    document.querySelectorAll('[data-demo-login]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var roleType = btn.getAttribute('data-demo-login');
        var u = quickDemoLogin(roleType);
        completeAuthRedirect(u);
      });
    });
  });

  window.BitszoneAuth = {
    getSession: getSession,
    signOut: signOut,
    isAdmin: isAdmin,
    isSuperAdmin: isSuperAdmin,
    updateProfile: updateProfile,
    quickDemoLogin: quickDemoLogin
  };
})(window);
