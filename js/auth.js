/* ==========================================================================
   BITSZONE — Autenticación y Gestión de Sesión (Vanilla JS)
   Flujo fiel al Bitszone original (Google OAuth / Código OTP / Acceso Admin)
   ========================================================================== */
(function (window) {
  'use strict';

  var STORAGE_SESSION = 'bz_vanilla_session_v1';
  var STORAGE_EMAILS = 'bz_admin_emails';
  var STORAGE_RECORDS = 'bz_admin_records';
  var SUPERADMIN_EMAIL = 'bitszone.app@gmail.com';

  var DEFAULT_ADMIN_EMAILS = [
    'bitszone.app@gmail.com',
    'admin@bitszone.app',
    'jaratuctojeffry@outlook.com'
  ];

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
      id: user.id || 'usr_' + Date.now(),
      email: (user.email || '').trim().toLowerCase(),
      name: user.name || (user.email ? user.email.split('@')[0] : 'Oyente'),
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

  function getAdminEmails() {
    try {
      var raw = localStorage.getItem(STORAGE_EMAILS);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    try {
      localStorage.setItem(STORAGE_EMAILS, JSON.stringify(DEFAULT_ADMIN_EMAILS));
    } catch (e) {}
    return DEFAULT_ADMIN_EMAILS.slice();
  }

  function isAdmin(session) {
    var s = session || getSession();
    if (!s) return false;
    if (s.role === 'admin' || s.role === 'superadmin') return true;
    var email = (s.email || '').toLowerCase().trim();
    if (email === SUPERADMIN_EMAIL) return true;
    var adminList = getAdminEmails();
    return adminList.indexOf(email) !== -1;
  }

  function isSuperAdmin(session) {
    var s = session || getSession();
    if (!s) return false;
    var email = (s.email || '').toLowerCase().trim();
    return s.role === 'superadmin' || email === SUPERADMIN_EMAIL;
  }

  function updateProfile(patch) {
    var current = getSession();
    if (!current) return null;
    var updated = Object.assign({}, current, patch);
    return saveSession(updated);
  }

  // =========================================================================
  // CONTROLADOR DEL FORMULARIO DE LOGIN (login.html)
  // =========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    var stepChoose = document.getElementById('stepChoose');
    if (!stepChoose) return; // Solo se ejecuta si estamos en login.html

    var stepGoogle = document.getElementById('stepGoogle');
    var stepCode = document.getElementById('stepCode');
    var stepPassword = document.getElementById('stepPassword');
    var stepDone = document.getElementById('stepDone');

    var cornerBackBtnWrap = document.getElementById('cornerBackBtnWrap');
    var cornerAdminBtnWrap = document.getElementById('cornerAdminBtnWrap');
    var btnAuthBack = document.getElementById('btnAuthBack');
    var btnToggleAdminMode = document.getElementById('btnToggleAdminMode');
    var toggleAdminIcon = document.getElementById('toggleAdminIcon');
    var toggleAdminLabel = document.getElementById('toggleAdminLabel');

    var rightSubtitle = document.getElementById('rightSubtitle');
    var authStepperList = document.getElementById('authStepperList');

    var btnGoogleLogin = document.getElementById('btnGoogleLogin');
    var formEmailChoose = document.getElementById('formEmailChoose');
    var userEmailInput = document.getElementById('userEmailInput');
    var emailErrorMsg = document.getElementById('emailErrorMsg');
    var btnSendCode = document.getElementById('btnSendCode');

    var codeTargetEmail = document.getElementById('codeTargetEmail');
    var otpInputs = Array.from(document.querySelectorAll('.bz-otp-input'));
    var codeErrorMsg = document.getElementById('codeErrorMsg');
    var btnVerifyCode = document.getElementById('btnVerifyCode');
    var btnChangeEmail = document.getElementById('btnChangeEmail');
    var resendTimerText = document.getElementById('resendTimerText');
    var btnResendCode = document.getElementById('btnResendCode');

    var formAdminPassword = document.getElementById('formAdminPassword');
    var adminEmailInput = document.getElementById('adminEmailInput');
    var adminEmailErrorMsg = document.getElementById('adminEmailErrorMsg');
    var adminPassInput = document.getElementById('adminPassInput');
    var adminPassErrorMsg = document.getElementById('adminPassErrorMsg');
    var btnToggleAdminPass = document.getElementById('btnToggleAdminPass');
    var btnAdminSubmit = document.getElementById('btnAdminSubmit');

    // Estado del flujo
    var currentStep = 'choose'; // 'choose' | 'google' | 'code' | 'password' | 'done'
    var currentMethod = 'email'; // 'email' | 'google' | 'admin'
    var currentEmail = '';
    var resendTimerInterval = null;
    var resendSeconds = 30;

    var STEPS_CONFIG = {
      email: [
        { title: 'Elige cómo entrar', text: 'Con Google o con tu correo.' },
        { title: 'Confirma que eres tú', text: 'Un código de 8 dígitos o un enlace.' },
        { title: 'Listo, a escuchar', text: 'Sin contraseñas que recordar.' }
      ],
      google: [
        { title: 'Elige cómo entrar', text: 'Con Google o con tu correo.' },
        { title: 'Autoriza con Google', text: 'Eliges tu cuenta y compartimos solo tu nombre, correo y foto.' },
        { title: 'Listo, a escuchar', text: 'Entras directo con tu perfil de Google.' }
      ],
      admin: [
        { title: 'Acceso Administrador', text: 'Credenciales del sistema.' },
        { title: 'Verificación segura', text: 'Autenticación con contraseña.' },
        { title: 'Panel de Control', text: 'Acceso completo al Dashboard.' }
      ]
    };

    var SUBTITLE_CONFIG = {
      email: 'Tu música, sin contraseñas que recordar.',
      google: 'Entra con tu cuenta de Google, sin crear nada nuevo.',
      admin: 'Acceso administrativo seguro para gestionar Bitszone.'
    };

    var STEP_INDEX_CONFIG = {
      email: { choose: 0, google: 0, code: 1, password: 1, done: 2 },
      google: { choose: 0, google: 1, code: 1, password: 1, done: 2 },
      admin: { choose: 0, google: 0, code: 1, password: 0, done: 2 }
    };

    function renderStepper() {
      if (!authStepperList) return;
      var steps = STEPS_CONFIG[currentMethod] || STEPS_CONFIG.email;
      var activeIdx = (STEP_INDEX_CONFIG[currentMethod] && STEP_INDEX_CONFIG[currentMethod][currentStep] !== undefined)
        ? STEP_INDEX_CONFIG[currentMethod][currentStep]
        : 0;

      if (rightSubtitle) {
        rightSubtitle.textContent = SUBTITLE_CONFIG[currentMethod] || SUBTITLE_CONFIG.email;
      }

      authStepperList.innerHTML = '';
      steps.forEach(function (s, i) {
        var isDone = i < activeIdx || currentStep === 'done';
        var isCurrent = i === activeIdx && currentStep !== 'done';

        var li = document.createElement('li');
        li.className = 'bz-stepper-item ' + (isCurrent ? 'active' : '') + ' ' + (isDone ? 'done' : '');

        var badge = document.createElement('span');
        badge.className = 'bz-stepper-badge';
        if (isDone) {
          badge.innerHTML = '<i class="bi bi-check-lg" style="font-weight: 700;"></i>';
        } else {
          badge.textContent = String(i + 1);
        }

        var textWrap = document.createElement('div');
        textWrap.className = 'text-start';
        textWrap.innerHTML = '<div class="fw-semibold text-white leading-tight">' + s.title + '</div>' +
                             '<div class="small text-white-50 leading-tight">' + s.text + '</div>';

        li.appendChild(badge);
        li.appendChild(textWrap);
        authStepperList.appendChild(li);
      });
    }

    function setStep(newStep) {
      currentStep = newStep;

      // Ocultar todos los paneles
      [stepChoose, stepGoogle, stepCode, stepPassword, stepDone].forEach(function (el) {
        if (el) el.classList.add('d-none');
      });

      // Mostrar el panel activo
      if (newStep === 'choose' && stepChoose) stepChoose.classList.remove('d-none');
      if (newStep === 'google' && stepGoogle) stepGoogle.classList.remove('d-none');
      if (newStep === 'code' && stepCode) stepCode.classList.remove('d-none');
      if (newStep === 'password' && stepPassword) stepPassword.classList.remove('d-none');
      if (newStep === 'done' && stepDone) stepDone.classList.remove('d-none');

      // Botones de esquina: visibles solo en choose y password
      var cornersVisible = (newStep === 'choose' || newStep === 'password');
      if (cornerBackBtnWrap) cornerBackBtnWrap.classList.toggle('d-none', !cornersVisible);
      if (cornerAdminBtnWrap) cornerAdminBtnWrap.classList.toggle('d-none', !cornersVisible);

      // Actualizar etiqueta e icono del botón toggle admin
      if (btnToggleAdminMode) {
        if (newStep === 'password') {
          if (toggleAdminIcon) toggleAdminIcon.className = 'bi bi-person';
          if (toggleAdminLabel) toggleAdminLabel.textContent = 'Usuario';
          btnToggleAdminMode.setAttribute('aria-label', 'Volver al inicio de sesión normal');
          btnToggleAdminMode.setAttribute('title', 'Volver al inicio de sesión normal');
          btnToggleAdminMode.classList.remove('bz-glass-pill-btn--admin');
          btnToggleAdminMode.classList.add('bz-glass-pill-btn--user');
        } else {
          if (toggleAdminIcon) toggleAdminIcon.className = 'bi bi-person-gear';
          if (toggleAdminLabel) toggleAdminLabel.textContent = 'Admin';
          btnToggleAdminMode.setAttribute('aria-label', 'Acceso para administrador');
          btnToggleAdminMode.setAttribute('title', 'Acceso para administrador');
          btnToggleAdminMode.classList.remove('bz-glass-pill-btn--user');
          btnToggleAdminMode.classList.add('bz-glass-pill-btn--admin');
        }
      }

      renderStepper();
    }

    // Botón Volver (Atrás)
    if (btnAuthBack) {
      btnAuthBack.addEventListener('click', function () {
        if (window.history.length > 1 && document.referrer.indexOf(window.location.host) !== -1) {
          window.history.back();
        } else {
          window.location.href = './index.html';
        }
      });
    }

    // Botón Toggle Modo Administrador / Modo Usuario
    if (btnToggleAdminMode) {
      btnToggleAdminMode.addEventListener('click', function () {
        if (currentStep === 'password') {
          // Cambiar a modo usuario normal
          currentMethod = 'email';
          if (adminPassErrorMsg) adminPassErrorMsg.classList.add('d-none');
          if (adminEmailErrorMsg) adminEmailErrorMsg.classList.add('d-none');
          setStep('choose');
        } else {
          // Cambiar a modo Administrador
          currentMethod = 'admin';
          if (emailErrorMsg) emailErrorMsg.classList.add('d-none');
          if (adminEmailInput) {
            adminEmailInput.value = currentEmail.trim() || SUPERADMIN_EMAIL;
          }
          if (adminPassInput) {
            adminPassInput.value = '';
          }
          setStep('password');
          setTimeout(function () {
            if (adminPassInput) adminPassInput.focus();
          }, 80);
        }
      });
    }

    // Continuar con Google
    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener('click', function () {
        currentMethod = 'google';
        setStep('google');
        setTimeout(function () {
          var googleUser = {
            id: 'usr_google_' + Date.now(),
            email: 'usuario.google@gmail.com',
            name: 'Usuario Google',
            role: 'user',
            avatarUrl: ''
          };
          saveSession(googleUser);
          setStep('done');
          setTimeout(function () {
            window.location.href = './player.html';
          }, 1200);
        }, 1100);
      });
    }

    // Enviar Código con Correo
    if (formEmailChoose) {
      formEmailChoose.addEventListener('submit', function (e) {
        e.preventDefault();
        if (emailErrorMsg) emailErrorMsg.classList.add('d-none');

        var val = (userEmailInput ? userEmailInput.value : '').trim();
        if (!/^\S+@\S+\.\S+$/.test(val)) {
          if (emailErrorMsg) {
            emailErrorMsg.textContent = 'Escribe un correo electrónico válido.';
            emailErrorMsg.classList.remove('d-none');
          }
          return;
        }

        currentEmail = val;
        currentMethod = 'email';

        // Spinner sutil
        var label = btnSendCode.querySelector('.bz-btn-label');
        var spinner = btnSendCode.querySelector('.bz-btn-spinner');
        if (label) label.classList.add('d-none');
        if (spinner) spinner.classList.remove('d-none');

        setTimeout(function () {
          if (label) label.classList.remove('d-none');
          if (spinner) spinner.classList.add('d-none');

          if (codeTargetEmail) codeTargetEmail.textContent = currentEmail;

          // Limpiar inputs OTP y enfocar el primero
          otpInputs.forEach(function (inp) {
            inp.value = '';
            inp.classList.remove('has-value', 'has-error');
          });

          startResendCountdown();
          setStep('code');

          setTimeout(function () {
            if (otpInputs[0]) otpInputs[0].focus();
          }, 100);
        }, 400);
      });
    }

    // Countdown para reenviar código
    function startResendCountdown() {
      if (resendTimerInterval) clearInterval(resendTimerInterval);
      resendSeconds = 30;
      if (resendTimerText) {
        resendTimerText.textContent = 'Reenviar en 0:30';
        resendTimerText.classList.remove('d-none');
      }
      if (btnResendCode) btnResendCode.classList.add('d-none');

      resendTimerInterval = setInterval(function () {
        resendSeconds--;
        if (resendSeconds <= 0) {
          clearInterval(resendTimerInterval);
          if (resendTimerText) resendTimerText.classList.add('d-none');
          if (btnResendCode) btnResendCode.classList.remove('d-none');
        } else {
          if (resendTimerText) {
            resendTimerText.textContent = 'Reenviar en 0:' + (resendSeconds < 10 ? '0' : '') + resendSeconds;
          }
        }
      }, 1000);
    }

    if (btnResendCode) {
      btnResendCode.addEventListener('click', function () {
        otpInputs.forEach(function (inp) {
          inp.value = '';
          inp.classList.remove('has-value', 'has-error');
        });
        if (codeErrorMsg) codeErrorMsg.classList.add('d-none');
        startResendCountdown();
        if (otpInputs[0]) otpInputs[0].focus();
      });
    }

    if (btnChangeEmail) {
      btnChangeEmail.addEventListener('click', function () {
        if (resendTimerInterval) clearInterval(resendTimerInterval);
        setStep('choose');
      });
    }

    // Manejo de inputs OTP de 8 dígitos
    otpInputs.forEach(function (inp, idx) {
      inp.addEventListener('input', function (e) {
        var clean = inp.value.replace(/\D/g, '');
        inp.value = clean.slice(0, 1);
        inp.classList.toggle('has-value', Boolean(inp.value));
        if (codeErrorMsg) codeErrorMsg.classList.add('d-none');

        if (inp.value && idx < otpInputs.length - 1) {
          otpInputs[idx + 1].focus();
        }

        // Si todos los dígitos están completos, verificar automáticamente
        var fullCode = otpInputs.map(function (i) { return i.value; }).join('');
        if (fullCode.length === otpInputs.length) {
          verifyOtpCode(fullCode);
        }
      });

      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && idx > 0) {
          otpInputs[idx - 1].focus();
        } else if (e.key === 'ArrowLeft' && idx > 0) {
          otpInputs[idx - 1].focus();
        } else if (e.key === 'ArrowRight' && idx < otpInputs.length - 1) {
          otpInputs[idx + 1].focus();
        } else if (e.key === 'Enter') {
          verifyOtpCode();
        }
      });

      inp.addEventListener('paste', function (e) {
        e.preventDefault();
        var pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
        var clean = pasteData.replace(/\D/g, '').slice(0, otpInputs.length);
        if (!clean) return;

        clean.split('').forEach(function (digit, k) {
          if (idx + k < otpInputs.length) {
            otpInputs[idx + k].value = digit;
            otpInputs[idx + k].classList.add('has-value');
          }
        });

        var nextFocus = Math.min(idx + clean.length, otpInputs.length - 1);
        otpInputs[nextFocus].focus();

        var fullCode = otpInputs.map(function (i) { return i.value; }).join('');
        if (fullCode.length === otpInputs.length) {
          verifyOtpCode(fullCode);
        }
      });
    });

    function verifyOtpCode(overrideCode) {
      var code = overrideCode || otpInputs.map(function (i) { return i.value; }).join('');
      if (code.length < 4) {
        if (codeErrorMsg) {
          codeErrorMsg.textContent = 'Escribe los 8 dígitos recibidos.';
          codeErrorMsg.classList.remove('d-none');
        }
        return;
      }

      var label = btnVerifyCode.querySelector('.bz-btn-label');
      var spinner = btnVerifyCode.querySelector('.bz-btn-spinner');
      if (label) label.classList.add('d-none');
      if (spinner) spinner.classList.remove('d-none');

      setTimeout(function () {
        if (label) label.classList.remove('d-none');
        if (spinner) spinner.classList.add('d-none');

        // Guardar sesión de usuario oyente
        var user = {
          id: 'usr_' + Date.now(),
          email: currentEmail,
          name: currentEmail.split('@')[0],
          role: 'user',
          avatarUrl: ''
        };
        saveSession(user);

        setStep('done');
        setTimeout(function () {
          window.location.href = './player.html';
        }, 1200);
      }, 500);
    }

    if (btnVerifyCode) {
      btnVerifyCode.addEventListener('click', function () {
        verifyOtpCode();
      });
    }

    // Toggle Ver / Ocultar Contraseña Admin
    if (btnToggleAdminPass && adminPassInput) {
      btnToggleAdminPass.addEventListener('click', function () {
        var isPass = adminPassInput.type === 'password';
        adminPassInput.type = isPass ? 'text' : 'password';
        var icon = btnToggleAdminPass.querySelector('i');
        if (icon) {
          icon.className = isPass ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
      });
    }

    // Submit Formulario Administrador
    if (formAdminPassword) {
      formAdminPassword.addEventListener('submit', function (e) {
        e.preventDefault();
        if (adminEmailErrorMsg) adminEmailErrorMsg.classList.add('d-none');
        if (adminPassErrorMsg) adminPassErrorMsg.classList.add('d-none');

        var emailVal = (adminEmailInput ? adminEmailInput.value : '').trim().toLowerCase();
        var passVal = (adminPassInput ? adminPassInput.value : '').trim();

        if (!/^\S+@\S+\.\S+$/.test(emailVal)) {
          if (adminEmailErrorMsg) {
            adminEmailErrorMsg.textContent = 'Escribe un correo electrónico válido.';
            adminEmailErrorMsg.classList.remove('d-none');
          }
          return;
        }

        if (!passVal) {
          if (adminPassErrorMsg) {
            adminPassErrorMsg.textContent = 'Escribe tu contraseña.';
            adminPassErrorMsg.classList.remove('d-none');
          }
          return;
        }

        // Validación de permisos de Administrador
        var isSuper = (emailVal === SUPERADMIN_EMAIL);
        var adminEmails = getAdminEmails();
        var isAuthAdmin = isSuper || (adminEmails.indexOf(emailVal) !== -1);

        // Si es el correo oficial de Bitszone o un admin autorizado, o si usa contraseña admin
        if (!isAuthAdmin && passVal !== 'admin123' && passVal !== 'admin') {
          if (adminPassErrorMsg) {
            adminPassErrorMsg.textContent = 'Correo o contraseña incorrectos.';
            adminPassErrorMsg.classList.remove('d-none');
          }
          return;
        }

        // Spinner en botón
        var label = btnAdminSubmit.querySelector('.bz-btn-label');
        var spinner = btnAdminSubmit.querySelector('.bz-btn-spinner');
        if (label) label.classList.add('d-none');
        if (spinner) spinner.classList.remove('d-none');

        setTimeout(function () {
          if (label) label.classList.remove('d-none');
          if (spinner) spinner.classList.add('d-none');

          var adminUser = {
            id: isSuper ? 'admin-owner' : 'admin_' + Date.now(),
            email: emailVal,
            name: 'Admin',
            role: isSuper ? 'superadmin' : 'admin',
            avatarUrl: ''
          };
          saveSession(adminUser);

          // Asegurar guardado en listas locales de admin
          try {
            var currentList = getAdminEmails();
            if (currentList.indexOf(emailVal) === -1) {
              currentList.push(emailVal);
              localStorage.setItem(STORAGE_EMAILS, JSON.stringify(currentList));
            }
            var currentRecords = JSON.parse(localStorage.getItem(STORAGE_RECORDS) || '[]');
            if (!currentRecords.some(function (r) { return r.email === emailVal; })) {
              currentRecords.push({
                email: emailVal,
                username: isSuper ? 'owner' : emailVal.split('@')[0],
                role: isSuper ? 'superadmin' : 'admin',
                addedAt: new Date().toLocaleDateString('es-ES')
              });
              localStorage.setItem(STORAGE_RECORDS, JSON.stringify(currentRecords));
            }
          } catch (err) {}

          setStep('done');
          setTimeout(function () {
            window.location.href = './player.html';
          }, 1200);
        }, 450);
      });
    }

    // Inicializar estado inicial
    setStep('choose');
  });

  window.BitszoneAuth = {
    getSession: getSession,
    saveSession: saveSession,
    signOut: signOut,
    isAdmin: isAdmin,
    isSuperAdmin: isSuperAdmin,
    updateProfile: updateProfile,
    getAdminEmails: getAdminEmails
  };
})(window);
