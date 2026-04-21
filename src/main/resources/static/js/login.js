// =========================================================
// ⚡ LÓGICA PRINCIPAL DE LOGIN ⚡
// =========================================================

window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('iglesia_session');
    if (session) {
        window.location.href = '/'; 
    }
});

async function procesarLogin(event) {
    event.preventDefault(); 

    const usuario = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Iniciando...`;

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuario, password: password })
        });

        if (response.ok) {
            const data = await response.json();
            
            // ⚡ SE ELIMINÓ EL REBOTE. Ahora simplemente guardamos la sesión y entramos.
            // El archivo main.js se encargará de leer que el estado es "Bloqueado" y armar la interfaz restringida.
            localStorage.setItem('iglesia_session', JSON.stringify(data));
            window.location.href = '/'; 
            
        } else {
            const errorText = await response.text();
            showLoginError(errorText); 
        }
    } catch (error) {
        showLoginError("Error de conexión con el servidor.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
}

function togglePassword() {
    const input = document.getElementById('password');
    const icon = document.getElementById('eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

function showLoginError(mensaje) {
    document.getElementById('login-error-message').innerText = mensaje;
    document.getElementById('modal-login-error').classList.remove('hidden');
}

function closeErrorModal() {
    document.getElementById('modal-login-error').classList.add('hidden');
}

// =========================================================
// ⚡ WIZARD DE RECUPERACIÓN DE CREDENCIALES ⚡
// =========================================================

let recupTipo = '';
let recupCedula = '';
let recupTimerInterval;
let isRecupPasswordValid = true;

function abrirModalRecuperar() {
    document.querySelectorAll('input[name="tipo_recup"]').forEach(r => r.checked = false);
    document.getElementById('modal-recup-tipo').classList.remove('hidden');
}

function irARecupCedula() {
    const seleccion = document.querySelector('input[name="tipo_recup"]:checked');
    if(!seleccion) {
        alert('Por favor, selecciona qué deseas recuperar.');
        return;
    }
    
    recupTipo = seleccion.value;
    document.getElementById('modal-recup-tipo').classList.add('hidden');
    document.getElementById('recup-cedula').value = '';
    document.getElementById('recup-cedula-error').classList.add('hidden');
    document.getElementById('modal-recup-cedula').classList.remove('hidden');
}

async function enviarCodigoRecup() {
    const cedula = document.getElementById('recup-cedula').value.trim();
    const errorTag = document.getElementById('recup-cedula-error');

    errorTag.classList.add('hidden');

    if(cedula.length < 7 || cedula.length > 8) {
        errorTag.innerText = "La cédula debe tener entre 7 y 8 dígitos numéricos.";
        errorTag.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('btn-recup-enviar');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Buscando...`;

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/recuperar/iniciar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula: cedula }) 
        });

        if (response.ok) {
            const data = await response.json();
            recupCedula = cedula;
            
            document.getElementById('modal-recup-cedula').classList.add('hidden');
            
            // Si esto falla es porque el Modal de código no existe, pero ya lo pusimos en el HTML
            document.getElementById('recup-correo-display').innerText = data.maskedEmail; 
            document.getElementById('recup-codigo').value = '';
            document.getElementById('recup-codigo').disabled = false;
            document.getElementById('modal-recup-codigo').classList.remove('hidden');
            
            iniciarCronometroRecuperacion(300); 
            
        } else {
            let error = await response.text();
            try {
                const jsonObj = JSON.parse(error);
                error = jsonObj.message || jsonObj.error || error;
            } catch(e) {}
            
            errorTag.innerText = error;
            errorTag.classList.remove('hidden');
        }
    } catch (e) {
        errorTag.innerText = 'Error de conexión con el servidor.';
        errorTag.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function iniciarCronometroRecuperacion(segundos) {
    let tiempoRestante = segundos;
    const display = document.getElementById('recup-timer');
    display.classList.remove('text-red-500');
    display.classList.add('text-primary');
    
    clearInterval(recupTimerInterval);
    recupTimerInterval = setInterval(() => {
        let m = Math.floor(tiempoRestante / 60);
        let s = tiempoRestante % 60;
        s = s < 10 ? '0' + s : s;
        
        display.innerHTML = `Expira en: <span class="font-bold text-lg">${m}:${s}</span>`;
        
        if (--tiempoRestante < 0) {
            clearInterval(recupTimerInterval);
            display.innerHTML = "El código ha expirado.";
            display.classList.replace('text-primary', 'text-red-500');
            document.getElementById('recup-codigo').disabled = true;
        }
    }, 1000);
}

function validarPasswordRecup() {
    if (recupTipo !== 'password') {
        isRecupPasswordValid = true; 
        return;
    }

    const pass = document.getElementById('recup-nuevo-input').value;
    const reqLength = document.getElementById('req-length-recup');
    const reqUpper = document.getElementById('req-upper-recup');
    const reqNumber = document.getElementById('req-number-recup');
    const reqSymbol = document.getElementById('req-symbol-recup');

    const hasLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    updateReqUIRecup(reqLength, hasLength);
    updateReqUIRecup(reqUpper, hasUpper);
    updateReqUIRecup(reqNumber, hasNumber);
    updateReqUIRecup(reqSymbol, hasSymbol);

    isRecupPasswordValid = hasLength && hasUpper && hasNumber && hasSymbol;
}

function updateReqUIRecup(element, isValid) {
    if (!element) return;
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

function togglePasswordRecup() {
    const input = document.getElementById('recup-nuevo-input');
    const icon = document.getElementById('eye-icon-recup');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

function irARecupNuevo() {
    const codigo = document.getElementById('recup-codigo').value.trim();
    if(codigo.length !== 6) {
        alert('El código debe tener 6 dígitos numéricos.');
        return;
    }

    const titulo = document.getElementById('recup-nuevo-titulo');
    const label = document.getElementById('recup-nuevo-label');
    const input = document.getElementById('recup-nuevo-input');
    const reqBox = document.getElementById('recup-password-reqs');
    const spacer = document.getElementById('recup-spacer');
    const btnEye = document.getElementById('btn-eye-recup');
    const errorTag = document.getElementById('recup-nuevo-error');

    input.value = '';
    errorTag.classList.add('hidden');
    
    if (recupTipo === 'usuario') {
        titulo.innerText = 'Nuevo Usuario';
        label.innerText = 'Escribe tu nuevo Nombre de Usuario';
        input.type = 'text';
        input.placeholder = 'Ej. carlos99';
        reqBox.classList.add('hidden');
        spacer.classList.remove('hidden');
        btnEye.classList.add('hidden');
        isRecupPasswordValid = true; 
    } else {
        titulo.innerText = 'Nueva Contraseña';
        label.innerText = 'Escribe tu nueva Contraseña';
        input.type = 'password';
        input.placeholder = '••••••••';
        reqBox.classList.remove('hidden');
        spacer.classList.add('hidden');
        btnEye.classList.remove('hidden');
        validarPasswordRecup(); 
    }

    document.getElementById('modal-recup-codigo').classList.add('hidden');
    document.getElementById('modal-recup-nuevo').classList.remove('hidden');
}

async function finalizarRecuperacion() {
    const nuevoValor = document.getElementById('recup-nuevo-input').value.trim();
    const errorTag = document.getElementById('recup-nuevo-error');

    if(!nuevoValor) {
        errorTag.innerText = "No puedes dejar el campo vacío.";
        errorTag.classList.remove('hidden');
        return;
    }
    
    if (recupTipo === 'password' && !isRecupPasswordValid) {
        errorTag.innerText = "La contraseña no cumple con los requisitos mínimos de seguridad.";
        errorTag.classList.remove('hidden');
        return;
    }
    
    const codigo = document.getElementById('recup-codigo').value.trim();
    const btn = document.getElementById('btn-recup-finalizar');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Guardando...`;

    try {
        const response = await fetch('http://localhost:8080/api/usuarios/recuperar/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula: recupCedula,
                codigo: codigo,
                tipo: recupTipo,
                nuevoValor: nuevoValor
            })
        });

        if (response.ok) {
            // 🛡️ SEGURIDAD ESTRICTA: Ya NO guardamos nada en localStorage aquí.
            clearInterval(recupTimerInterval);
            document.getElementById('modal-recup-nuevo').classList.add('hidden');
            
            const msj = recupTipo === 'usuario' ? 'Tu nombre de usuario' : 'Tu contraseña';
            
            // Actualizamos el mensaje para informar al usuario que debe loguearse
            document.getElementById('recup-exito-msj').innerText = `${msj} ha sido cambiado con éxito. Por seguridad del sistema académico, ahora debes iniciar sesión manualmente con tus nuevas credenciales.`;
            document.getElementById('modal-recup-exito').classList.remove('hidden');
        } else {
            const error = await response.text();
            if (error.includes("código")) {
                alert(error); 
                document.getElementById('modal-recup-nuevo').classList.add('hidden');
                document.getElementById('modal-recup-codigo').classList.remove('hidden');
            } else {
                errorTag.innerText = error;
                errorTag.classList.remove('hidden');
            }
        }
    } catch (e) {
        errorTag.innerText = 'Error de conexión con el servidor.';
        errorTag.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function cerrarRecuperacion() {
    clearInterval(recupTimerInterval);
    ['tipo', 'cedula', 'codigo', 'nuevo'].forEach(id => {
        document.getElementById(`modal-recup-${id}`).classList.add('hidden');
    });
}

// 🛡️ FUNCIÓN DE ÉXITO: Recarga la página para asegurar un estado de Login limpio.
function cerrarRecuperacionExito() {
    document.getElementById('modal-recup-exito').classList.add('hidden');
    window.location.href = '/login'; // ⚡ Redirige explícitamente a la pantalla de login
}