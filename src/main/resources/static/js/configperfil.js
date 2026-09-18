// --- Lógica Específica para Configuración de Perfil ---

const session = JSON.parse(localStorage.getItem('iglesia_session'));
let currentAction = null; 
let pendingNewEmail = "";
let countdownInterval;

window.addEventListener('DOMContentLoaded', async () => {
    if (!session) { window.location.href = '/login'; return; }
    
    document.getElementById('display-username').textContent = session.username;

    try {
        const response = await fetch(`http://localhost:8080/api/usuarios/perfil/${session.username}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('display-email').textContent = data.correo;
            renderAvatars(data.foto); 
            
            if(data.correoVerificado === 'S') {
                const badge = document.getElementById('badge-verificado');
                if(badge) {
                    badge.textContent = 'Verificado';
                    badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                    badge.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        console.error("Error cargando el perfil:", error);
    }
});

// --- RENDERIZAR AVATARES ---
function renderAvatars(fotoUrl) {
    const mainContainer = document.getElementById('main-avatar-container');
    const headerAvatarEl = document.getElementById('header-avatar');
    const headerContainer = headerAvatarEl ? headerAvatarEl.parentElement : null;
    
    let htmlContent = '';
    
    if (fotoUrl && fotoUrl.trim() !== "") {
        htmlContent = `<img id="avatar-preview" src="${fotoUrl}" class="w-full h-full object-cover transition-opacity group-hover:opacity-50" />`;
    } else {
        const initial = session.nombre.charAt(0).toUpperCase();
        htmlContent = `<div id="avatar-preview" class="w-full h-full bg-primary text-white flex items-center justify-center text-4xl font-bold transition-opacity group-hover:opacity-50">${initial}</div>`;
    }
    
    if (mainContainer) {
        mainContainer.innerHTML = htmlContent + `
            <label for="avatar-upload" class="absolute inset-0 hidden group-hover:flex items-center justify-center cursor-pointer transition-all bg-black/40 backdrop-blur-sm z-10">
                <span class="material-icons-round text-white text-2xl">photo_camera</span>
            </label>
        `;
    }

    if (headerContainer) {
        if (fotoUrl && fotoUrl.trim() !== "") {
            headerContainer.innerHTML = `<img id="header-avatar" src="${fotoUrl}" class="w-full h-full object-cover" />`;
        } else {
            const initial = session.nombre.charAt(0).toUpperCase();
            headerContainer.innerHTML = `<div id="header-avatar" class="w-full h-full bg-primary text-white flex items-center justify-center text-xl font-bold">${initial}</div>`;
        }
    }
}

// --- SUBIR FOTO AL SERVIDOR ---
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', session.username);

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/upload-avatar', {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            const data = await response.json();
            session.foto = data.url; 
            localStorage.setItem('iglesia_session', JSON.stringify(session));
            
            renderAvatars(data.url);
            showSuccessModal("Foto de perfil actualizada correctamente.");
            
            if(typeof aplicarPermisos === 'function') aplicarPermisos(); 
        } else {
            alert("Error al subir la imagen");
        }
    } catch (e) { console.error(e); }
}

// --- FLUJO DE MODALES ---
function askConfirm(action) {
    if(action === 'username') {
        const v1 = document.getElementById('mod-user-1').value.trim();
        const v2 = document.getElementById('mod-user-2').value.trim();
        if(!v1 || v1 !== v2) return showError('modal-username', 'Los usuarios no coinciden o están vacíos.');
    }
    if(action === 'email') {
        const v1 = document.getElementById('mod-email-1').value.trim();
        const v2 = document.getElementById('mod-email-2').value.trim();
        if(!v1 || v1 !== v2) return showError('modal-email', 'Los correos no coinciden o están vacíos.');
    }
    if(action === 'password') {
        const v1 = document.getElementById('mod-pass-1').value;
        const v2 = document.getElementById('mod-pass-2').value;
        if(!v1 || v1 !== v2 || !validatePasswordConfig()) return showError('modal-password', 'Las contraseñas no coinciden o no cumplen los requisitos.');
    }

    currentAction = action;
    document.getElementById('modal-global-confirm').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('modal-global-confirm').classList.add('hidden');
}

function executeAction() {
    const actionToExecute = currentAction; 
    
    // ⚡ Ya NO cerramos el modal aquí, esperamos a que termine de cargar
    if(actionToExecute === 'username') saveUsername();
    if(actionToExecute === 'email') saveEmail();
    if(actionToExecute === 'password') savePassword();
    
    currentAction = null;
}

function showSuccessModal(msg) {
    document.getElementById('success-message').innerText = msg;
    document.getElementById('modal-global-success').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('modal-global-success').classList.add('hidden');
    if(currentAction === 'username') window.location.reload(); 
    currentAction = null;
}

// --- GUARDAR USUARIO ---
async function saveUsername() {
    const val1 = document.getElementById('mod-user-1').value.trim();
    
    // Mostramos estado de carga
    const btnConfirm = document.getElementById('btn-confirm-yes');
    const originalText = btnConfirm ? btnConfirm.innerHTML : '';
    if(btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Guardando...`;
    }

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/actualizar-datos', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldUsername: session.username, newUsername: val1 })
        });
        
        closeConfirmModal(); // Cerramos al terminar
        
        if (response.ok) {
            session.username = val1;
            localStorage.setItem('iglesia_session', JSON.stringify(session));
            toggleModal('modal-username');
            showSuccessModal("El nombre de usuario ha sido modificado.");
            document.getElementById('display-username').textContent = val1;
            if(typeof aplicarPermisos === 'function') aplicarPermisos();
        } else { 
            const err = await response.text();
            showError('modal-username', err || 'Error al guardar en el servidor.'); 
        }
    } catch (e) { 
        closeConfirmModal();
        showError('modal-username', 'Error de conexión'); 
    } finally {
        if(btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = originalText;
        }
    }
}

// --- ⚡ LÓGICA DE CORREO Y CRONÓMETRO (CON SPINNER DE CARGA) ⚡ ---
async function saveEmail() {
    const val1 = document.getElementById('mod-email-1').value.trim();
    pendingNewEmail = val1;
    
    // ⚡ ESTADO DE CARGA ELEGANTE EN EL BOTÓN DE CONFIRMAR ⚡
    const btnConfirm = document.getElementById('btn-confirm-yes');
    const originalText = btnConfirm ? btnConfirm.innerHTML : '';
    if(btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Enviando...`;
    }
    
    try {
        const response = await fetch('http://localhost:8080/api/usuarios/enviar-codigo-actualizacion', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: session.username, correoNuevo: val1 })
        });
        
        if (response.ok) {
            closeConfirmModal(); // Cerramos el modal de confirmación
            toggleModal('modal-email'); // Cerramos el formulario de edición
            
            document.getElementById('verify-email-display').innerText = val1;
            document.getElementById('verification-code').value = '';
            document.getElementById('verification-code').disabled = false;
            document.getElementById('verify-error-msg').classList.add('hidden');
            
            document.getElementById('modal-verificacion-correo').classList.remove('hidden');
            
            iniciarCronometro(300); // 300 segundos = 5 minutos
        } else { 
            closeConfirmModal();
            // Mostrará "Este ya es tu correo" o "Ese correo ya está ocupado"
            const errorText = await response.text();
            showError('modal-email', errorText); 
        }
    } catch (e) { 
        closeConfirmModal();
        showError('modal-email', 'Error de conexión con el servidor de correos.'); 
    } finally {
        if(btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = originalText;
        }
    }
}

function iniciarCronometro(duracionSegundos) {
    let tiempoRestante = duracionSegundos;
    const display = document.getElementById('verify-error-msg');
    
    display.classList.remove('hidden', 'text-red-500');
    display.classList.add('text-primary');
    
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        let minutos = Math.floor(tiempoRestante / 60);
        let segundos = tiempoRestante % 60;
        segundos = segundos < 10 ? '0' + segundos : segundos;
        
        display.innerHTML = `El código expira en: <span class="font-bold text-lg">${minutos}:${segundos}</span>`;
        
        if (--tiempoRestante < 0) {
            clearInterval(countdownInterval);
            display.innerHTML = "El código ha expirado. Por favor, cancela y solicita uno nuevo.";
            display.classList.replace('text-primary', 'text-red-500');
            document.getElementById('verification-code').disabled = true;
        }
    }, 1000);
}

async function confirmarCodigoCorreo() {
    const codigo = document.getElementById('verification-code').value.trim();
    const errorMsg = document.getElementById('verify-error-msg');
    
    if(codigo.length !== 6) {
        errorMsg.innerText = "El código debe tener exactamente 6 dígitos.";
        errorMsg.classList.remove('hidden', 'text-primary');
        errorMsg.classList.add('text-red-500');
        return;
    }

    const btnVerificar = document.querySelector('#modal-verificacion-correo button:last-child');
    const originalText = btnVerificar ? btnVerificar.innerHTML : '';
    if(btnVerificar) {
        btnVerificar.disabled = true;
        btnVerificar.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Verificando...`;
    }

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/actualizar-correo-verificado', {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                oldUsername: session.username, 
                newCorreo: pendingNewEmail,
                codigo: codigo 
            })
        });
        
        if (response.ok) {
            clearInterval(countdownInterval); 
            document.getElementById('modal-verificacion-correo').classList.add('hidden');
            
            document.getElementById('display-email').textContent = pendingNewEmail;
            
            const badge = document.getElementById('badge-verificado');
            if(badge) {
                badge.textContent = 'Verificado';
                badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                badge.classList.remove('hidden');
            }
            
            session.correo = pendingNewEmail;
            localStorage.setItem('iglesia_session', JSON.stringify(session));

            showSuccessModal("¡Tu correo electrónico ha sido verificado y actualizado con éxito!");
        } else { 
            const errorText = await response.text();
            errorMsg.innerText = errorText;
            errorMsg.classList.remove('hidden', 'text-primary');
            errorMsg.classList.add('text-red-500');
        }
    } catch (e) { 
        errorMsg.innerText = 'Error de conexión.';
        errorMsg.classList.remove('hidden', 'text-primary');
        errorMsg.classList.add('text-red-500');
    } finally {
        if(btnVerificar) {
            btnVerificar.disabled = false;
            btnVerificar.innerHTML = originalText;
        }
    }
}

function cancelarVerificacion() {
    clearInterval(countdownInterval);
    document.getElementById('modal-verificacion-correo').classList.add('hidden');
    pendingNewEmail = "";
}

// --- GUARDAR CLAVE ---
async function savePassword() {
    const val1 = document.getElementById('mod-pass-1').value;
    
    // Mostramos estado de carga
    const btnConfirm = document.getElementById('btn-confirm-yes');
    const originalText = btnConfirm ? btnConfirm.innerHTML : '';
    if(btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Guardando...`;
    }

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/actualizar-password', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: session.username, newPassword: val1 })
        });
        
        closeConfirmModal();

        if (response.ok) {
            toggleModal('modal-password');
            showSuccessModal("La contraseña se actualizó con éxito.");
        } else { 
            showError('modal-password', 'Error al guardar en el servidor.'); 
        }
    } catch (e) { 
        closeConfirmModal();
        console.error(e); 
        showError('modal-password', 'Error de conexión'); 
    } finally {
        if(btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = originalText;
        }
    }
}

// --- UTILIDADES GLOBALES ---
function showError(modalId, message) {
    const errorEl = document.querySelector(`#${modalId} .error-msg`);
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function clearModalInputs(modalId) {
    const modal = document.getElementById(modalId);
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    const errorMsg = modal.querySelector('.error-msg');
    if(errorMsg) { errorMsg.classList.add('hidden'); errorMsg.textContent = ''; }
    if(modalId === 'modal-password') validatePasswordConfig();
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        clearModalInputs(modalId);
    } else {
        modal.classList.add('hidden');
    }
}

function toggleModalPassword(inputId, iconId) {
    const passInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
    } else {
        passInput.type = 'password';
        eyeIcon.textContent = 'visibility';
    }
}

function validatePasswordConfig() {
    const pass = document.getElementById('mod-pass-1').value;
    const reqLength = document.getElementById('req-length');
    const reqUpper = document.getElementById('req-upper');
    const reqNumber = document.getElementById('req-number');
    const reqSymbol = document.getElementById('req-symbol');

    const hasLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    updateReqUI(reqLength, hasLength);
    updateReqUI(reqUpper, hasUpper);
    updateReqUI(reqNumber, hasNumber);
    updateReqUI(reqSymbol, hasSymbol);

    return hasLength && hasUpper && hasNumber && hasSymbol;
}

function updateReqUI(element, isValid) {
    const icon = element.querySelector('.material-icons-round');
    if (isValid) {
        element.classList.remove('text-slate-500', 'dark:text-slate-400');
        element.classList.add('text-green-600', 'dark:text-green-400');
        icon.textContent = 'check_circle';
    } else {
        element.classList.add('text-slate-500', 'dark:text-slate-400');
        element.classList.remove('text-green-600', 'dark:text-green-400');
        icon.textContent = 'radio_button_unchecked';
    }
}