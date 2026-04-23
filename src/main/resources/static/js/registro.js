// --- ⚡ VALIDACIONES EN TIEMPO REAL ⚡ ---

let cedulaOk = false, correoOk = false, usuarioOk = false;

window.addEventListener('DOMContentLoaded', () => {
    const inputCedula = document.getElementById('reg-cedula');
    const inputCorreo = document.getElementById('reg-correo');
    const inputUsuario = document.getElementById('new-username');

    if(inputCedula && inputCorreo && inputUsuario) {
        // Validar contra la BD al salir del campo (perder el foco)
        inputCedula.addEventListener('blur', () => validarCampoEnTiempoReal(inputCedula, 'cedula', inputCedula.value));
        inputCorreo.addEventListener('blur', () => validarCampoEnTiempoReal(inputCorreo, 'correo', inputCorreo.value));
        inputUsuario.addEventListener('blur', () => validarCampoEnTiempoReal(inputUsuario, 'usuario', inputUsuario.value));

        // ⚡ NUEVO: Limpiar el error visual inmediatamente al teclear/borrar ⚡
        inputCedula.addEventListener('input', () => limpiarErrorVisual(inputCedula, 'cedula'));
        inputCorreo.addEventListener('input', () => limpiarErrorVisual(inputCorreo, 'correo'));
        inputUsuario.addEventListener('input', () => limpiarErrorVisual(inputUsuario, 'usuario'));
    }
});

function limpiarErrorVisual(inputElement, tipo) {
    // Quitamos los bordes rojos
    inputElement.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
    
    // Ocultamos el mensaje de error
    const errorTag = document.getElementById(`error-${tipo}`);
    if(errorTag) errorTag.classList.add('hidden');
    
    // Restauramos el texto de ayuda si es la cédula
    if (tipo === 'cedula') {
        const hint = document.getElementById('hint-cedula');
        if(hint) hint.classList.remove('hidden');
        cedulaOk = false; // Requiere volver a validarse
    }
    if (tipo === 'correo') correoOk = false;
    if (tipo === 'usuario') usuarioOk = false;

    actualizarBotonSubmit();
}

function actualizarBotonSubmit() {
    const btnSubmit = document.querySelector('#form-registro button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = !(cedulaOk && correoOk && usuarioOk);
        btnSubmit.classList.toggle('opacity-50', btnSubmit.disabled);
        btnSubmit.classList.toggle('cursor-not-allowed', btnSubmit.disabled);
    }
}

async function validarCampoEnTiempoReal(inputElement, tipo, valor) {
    if (!valor.trim()) return; 

    const errorTag = document.getElementById(`error-${tipo}`);
    
    try {
        const response = await fetch(`/api/usuarios/check-${tipo}?${tipo}=${valor}`);
        
        // ⚡ PROTECCIÓN: Ignoramos errores 404 o 500 del servidor para que no actúen como "True"
        if (!response.ok) {
            console.error(`Endpoint de validación no encontrado o error en servidor para ${tipo}`);
            return; 
        }

        const existe = await response.json(); 

        // ⚡ Exigimos que sea exactamente true (booleano)
        if (existe === true) {
            inputElement.classList.add('ring-2', 'ring-red-500', 'border-red-500');
            errorTag.classList.remove('hidden');
            
            if(tipo === 'cedula') {
                errorTag.innerText = "Esta cédula ya tiene una cuenta registrada.";
                document.getElementById('hint-cedula').classList.add('hidden');
                cedulaOk = false;
            }
            if(tipo === 'correo') {
                errorTag.innerText = "Este correo ya está en uso por otra persona.";
                correoOk = false;
            }
            if(tipo === 'usuario') {
                errorTag.innerText = "Este nombre de usuario no está disponible.";
                usuarioOk = false;
            }
        } else {
            inputElement.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
            errorTag.classList.add('hidden');
            
            if(tipo === 'cedula') { 
                cedulaOk = true; 
                document.getElementById('hint-cedula').classList.remove('hidden'); 
            }
            if(tipo === 'correo') correoOk = true;
            if(tipo === 'usuario') usuarioOk = true;
        }

        actualizarBotonSubmit();

    } catch (error) {
        console.error("Error validando en tiempo real:", error);
    }
}

// --- Lógica de Interfaz ---

function togglePassword() {
    const passInput = document.getElementById('new-password');
    const eyeIcon = document.getElementById('eye-icon-reg');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
    } else {
        passInput.type = 'password';
        eyeIcon.textContent = 'visibility';
    }
}

function validatePassword() {
    const pass = document.getElementById('new-password').value;
    
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

// --- ⚡ LÓGICA DE VERIFICACIÓN DE REGISTRO ⚡ ---

let pendingRegData = {};
let countdownInterval;

// 1. Primer Paso: Pedir enviar el código
async function procesarRegistro(event) {
    event.preventDefault(); 
    
    if(!(cedulaOk && correoOk && usuarioOk)) return;

    const msjDiv = document.getElementById('mensaje-respuesta');
    const btnSubmit = document.querySelector('#form-registro button[type="submit"]'); 

    pendingRegData = {
        cedula: document.getElementById('reg-cedula').value,
        correo: document.getElementById('reg-correo').value,
        usuario: document.getElementById('new-username').value,
        password: document.getElementById('new-password').value
    };

    // ⚡ ESTADO DE CARGA ELEGANTE ⚡
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Enviando código...`;
    }

    try {
        const response = await fetch('/api/usuarios/enviar-codigo-registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: pendingRegData.correo })
        });

        if (response.ok) {
            if(msjDiv) msjDiv.classList.add('hidden');
            
            document.getElementById('verify-email-display').innerText = pendingRegData.correo;
            document.getElementById('verification-code').value = '';
            document.getElementById('verification-code').disabled = false;
            document.getElementById('verify-error-msg').classList.add('hidden');
            document.getElementById('modal-verificacion-correo').classList.remove('hidden');
            
            iniciarCronometro(300); // 5 minutos
        } else {
            const data = await response.text();
            if(msjDiv) {
                msjDiv.classList.remove('hidden');
                msjDiv.innerHTML = `<span style='color: red;'>${data}</span>`;
            } else {
                alert(data);
            }
        }
    } catch (error) {
        if(msjDiv) {
            msjDiv.classList.remove('hidden');
            msjDiv.innerHTML = "<span style='color: red;'>Error al conectar con el servidor.</span>";
        }
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `Registrar Cuenta`;
        }
    }
}

// 2. Segundo Paso: Validar el código y crear la cuenta real
async function confirmarCodigoRegistro() {
    const codigo = document.getElementById('verification-code').value.trim();
    const errorMsg = document.getElementById('verify-error-msg');
    const msjDiv = document.getElementById('mensaje-respuesta');
    
    if(codigo.length !== 6) {
        errorMsg.innerText = "El código debe tener exactamente 6 dígitos.";
        errorMsg.classList.remove('hidden', 'text-primary');
        errorMsg.classList.add('text-red-500');
        return;
    }

    // ⚡ ESTADO DE CARGA ELEGANTE ⚡
    const btnVerificar = document.querySelector('#modal-verificacion-correo button:last-child');
    const originalText = btnVerificar ? btnVerificar.innerHTML : '';
    if (btnVerificar) {
        btnVerificar.disabled = true;
        btnVerificar.innerHTML = `<span class="material-icons-round animate-spin text-lg mr-2">autorenew</span> Verificando...`;
    }

    try {
        const response = await fetch('/api/usuarios/registro-web-verificado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cedula: pendingRegData.cedula,
                correo: pendingRegData.correo,
                usuario: pendingRegData.usuario,
                password: pendingRegData.password,
                codigo: codigo
            })
        });

        if (response.ok) {
            clearInterval(countdownInterval);
            document.getElementById('modal-verificacion-correo').classList.add('hidden');
            
            document.getElementById('form-registro').reset();
            ['req-length', 'req-upper', 'req-number', 'req-symbol'].forEach(id => {
                const el = document.getElementById(id);
                if(el) updateReqUI(el, false);
            });
            
            document.getElementById('modal-success').classList.remove('hidden');
            
        } else {
            const errorText = await response.text();
            
            if (errorText.includes("código de verificación")) {
                errorMsg.innerText = errorText;
                errorMsg.classList.remove('hidden', 'text-primary');
                errorMsg.classList.add('text-red-500');
            } else {
                document.getElementById('modal-verificacion-correo').classList.add('hidden');
                if(msjDiv) {
                    msjDiv.classList.remove('hidden');
                    msjDiv.innerHTML = `<span style='color: red;'>Error del Sistema: ${errorText}</span>`;
                } else {
                    alert(errorText);
                }
            }
        }
    } catch (error) {
        errorMsg.innerText = 'Error de conexión.';
        errorMsg.classList.remove('hidden', 'text-primary');
        errorMsg.classList.add('text-red-500');
    } finally {
        if (btnVerificar) {
            btnVerificar.disabled = false;
            btnVerificar.innerHTML = originalText;
        }
    }
}

// 3. Funciones de apoyo
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

function cancelarVerificacion() {
    clearInterval(countdownInterval);
    document.getElementById('modal-verificacion-correo').classList.add('hidden');
    pendingRegData = {};
}

function redirectToLogin() {
    window.location.href = '/login';
}
