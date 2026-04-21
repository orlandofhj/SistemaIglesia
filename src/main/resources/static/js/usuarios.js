// --- Lógica Específica para Gestión de Usuarios ---

let usersDatabase = [];
let currentEditingUser = null;

const sessionData = JSON.parse(localStorage.getItem('iglesia_session'));

// Variables para gestionar el modal de confirmación
let pendingActionType = null;
let pendingActionData = null;

// --- 🌐 CONEXIÓN CON EL BACKEND (SPRING BOOT) 🌐 ---

async function fetchUsuarios() {
    try {
        // ⚡ Le pasamos el nombre del usuario conectado a Java para que lo excluya ⚡
        const usernameQuery = sessionData && sessionData.username ? `?currentUser=${sessionData.username}` : '';
        
        const response = await fetch(`http://localhost:8080/api/usuarios/todos${usernameQuery}`, { 
            cache: 'no-store',
            headers: { 'Pragma': 'no-cache' }
        });
        
        if(response.ok) {
            const data = await response.json();
            
            usersDatabase = data.map(user => ({
                id: user.idPersona,
                name: user.nombre,
                surname: user.apellido,
                nationality: user.nacionalidad || "V",
                cedula: user.cedula ? user.cedula.toString() : "S/N",
                genero: user.genero || "", 
                status: user.estado,
                privilege: user.rol, 
                foto: user.foto || null
            }));
            
            renderUsers(); 
        }
    } catch (error) {
        console.error("Error al conectar con la BD:", error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    fetchUsuarios(); 
});

// --- ⚡ SISTEMA DE MODALES DE CONFIRMACIÓN Y ÉXITO ⚡ ---

function showConfirmModal(message, type, data) {
    document.getElementById('confirm-message').innerText = message;
    pendingActionType = type;
    pendingActionData = data;
    document.getElementById('modal-global-confirm').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('modal-global-confirm').classList.add('hidden');
}

function executeConfirmAction() {
    const actionType = pendingActionType;
    const actionData = pendingActionData;
    
    closeConfirmModal();
    
    if (actionType === 'toggleStatus') {
        proceedToggleStatus(actionData.id, actionData.currentState);
    } else if (actionType === 'saveUser') {
        proceedSaveUser(actionData);
    }
    
    pendingActionType = null;
    pendingActionData = null;
}

function showSuccessModal(message) {
    document.getElementById('success-message').innerText = message;
    document.getElementById('modal-global-success').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('modal-global-success').classList.add('hidden');
}

// --- ⚡ ACCIONES DE USUARIO ⚡ ---

// 1. Bloquear / Activar
function toggleUserStatus(userId, currentState) {
    const actionText = currentState === 'Activo' ? 'bloquear' : 'activar';
    showConfirmModal(`¿Estás seguro de que deseas ${actionText} a este usuario?`, 'toggleStatus', { id: userId, currentState: currentState });
}

async function proceedToggleStatus(userId, currentState) {
    const nuevoEstado = currentState === 'Activo' ? 'Bloqueado' : 'Activo';
    try {
        const response = await fetch(`http://localhost:8080/api/usuarios/${userId}/cambiar-estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                estado: nuevoEstado,
                solicitante: sessionData.username // ⚡ Se envía quién hace la petición
            })
        });

        if(response.ok) {
            await fetchUsuarios(); 
            showSuccessModal(`Usuario ${nuevoEstado.toLowerCase()} exitosamente.`);
        } else {
            const err = await response.text();
            alert(err);
        }
    } catch (error) { console.error("Error:", error); }
}

// 2. Formulario: Validar y Preparar Guardado
function validateAndSaveUser() {
    hideErrorAlert();
    
    // ⚡ Formatear a Primera Letra Mayúscula y resto minúscula
    const formatNameStr = (str) => str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const name = formatNameStr(document.getElementById('user-name').value.trim());
    const surname = formatNameStr(document.getElementById('user-surname').value.trim());
    const nationality = document.getElementById('user-prefix').value;
    const cedula = document.getElementById('user-id').value.trim();
    const privilegeSelect = document.getElementById('user-privilege');
    const gender = document.getElementById('user-gender').value;

    // Si el select está bloqueado, forzamos el valor a "1" (Congregante)
    const privilege = privilegeSelect.disabled ? "1" : privilegeSelect.value;

    if (!name || !surname || !cedula || !privilege) {
        showErrorAlert("Por favor completa todos los campos obligatorios.");
        return;
    }

    const cedulaRegex = /^\d{7,8}$/;
    if (!cedulaRegex.test(cedula)) {
        showErrorAlert("La cédula debe tener entre 7 y 8 dígitos numéricos.");
        return;
    }

    const letrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!letrasRegex.test(name) || !letrasRegex.test(surname)) {
        showErrorAlert("Los nombres y apellidos solo pueden contener letras.");
        return;
    }

    let rolTexto = "Congregante";
    if (privilege === "3") rolTexto = "Pastor";
    if (privilege === "2") rolTexto = "Líder";

    const payload = {
        id: currentEditingUser,
        nombre: name,
        apellido: surname,
        nacionalidad: nationality,
        cedula: cedula,
        genero: gender,
        rol: rolTexto,
        solicitante: sessionData.username // ⚡ Se envía quién hace la petición
    };

    showConfirmModal(`¿Está seguro de que desea guardar los datos de este miembro?`, 'saveUser', payload);
}

// 3. Ejecutar Modificación o Creación en Java
async function proceedSaveUser(payload) {
    if (payload.id) {
        // ES UNA EDICIÓN
        try {
            const response = await fetch(`http://localhost:8080/api/usuarios/admin/modificar/${payload.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(response.ok) {
                await fetchUsuarios();
                document.getElementById('modal-nuevo-usuario').classList.add('hidden');
                showSuccessModal("Datos del miembro actualizados correctamente.");
            } else {
                const errorText = await response.text();
                showErrorAlert(errorText);
                document.getElementById('modal-nuevo-usuario').classList.remove('hidden'); 
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        // ES UNA CREACIÓN NUEVA
        try {
            const response = await fetch(`http://localhost:8080/api/usuarios/admin/crear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(response.ok) {
                await fetchUsuarios();
                document.getElementById('modal-nuevo-usuario').classList.add('hidden');
                showSuccessModal("Persona registrada exitosamente en la iglesia.");
            } else {
                const errorText = await response.text();
                showErrorAlert(errorText); 
                document.getElementById('modal-nuevo-usuario').classList.remove('hidden'); 
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
}

// 4. Abrir Modal para Editar
function editUser(id) {
    hideErrorAlert();
    const user = usersDatabase.find(u => u.id == id);
    if (!user) return;

    currentEditingUser = user.id;
    
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-surname').value = user.surname;
    document.getElementById('user-prefix').value = user.nationality || "V";
    document.getElementById('user-id').value = user.cedula;
    document.getElementById('user-gender').value = user.genero || "M";
    
    let valPriv = "1";
    if(user.privilege === "Pastor") valPriv = "3";
    if(user.privilege === "Líder") valPriv = "2";
    
    const privilegeSelect = document.getElementById('user-privilege');
    privilegeSelect.value = valPriv;
    
    // ⚡ Bloquear combobox si el usuario logueado es Líder
    if (sessionData && sessionData.rol === 2) {
        privilegeSelect.disabled = true;
    } else {
        privilegeSelect.disabled = false;
    }
    
    document.getElementById('modal-title-new').textContent = 'Editar Miembro';
    
    const dropdowns = document.querySelectorAll('.user-options-menu');
    dropdowns.forEach(menu => menu.classList.add('hidden'));

    document.getElementById('modal-nuevo-usuario').classList.remove('hidden');
}

// --- Interfaz y Formularios ---
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        resetForm();
    }
}

function resetForm() {
    document.getElementById('form-nuevo-usuario').reset();
    document.getElementById('user-prefix').value = 'V';
    currentEditingUser = null;
    document.getElementById('modal-title-new').textContent = 'Nuevo Miembro';
    hideErrorAlert();
    
    // ⚡ Bloquear combobox si el usuario logueado es Líder
    const privilegeSelect = document.getElementById('user-privilege');
    if (sessionData && sessionData.rol === 2) {
        privilegeSelect.value = "1";
        privilegeSelect.disabled = true;
    } else {
        privilegeSelect.disabled = false;
    }
}

function showErrorAlert(message) {
    const alertBox = document.getElementById('validation-alert');
    const errorList = document.getElementById('error-list');
    errorList.innerHTML = `<li>${message}</li>`;
    alertBox.classList.remove('hidden');
}

function hideErrorAlert() {
    document.getElementById('validation-alert').classList.add('hidden');
}

function openUserOptions(button) {
    const dropdowns = document.querySelectorAll('.user-options-menu');
    dropdowns.forEach(menu => menu.classList.add('hidden'));

    const container = button.closest('.relative');
    const menu = container.querySelector('.user-options-menu');
    if (menu) menu.classList.toggle('hidden');
}

document.addEventListener('click', (event) => {
    if (!event.target.closest('.user-options-container')) {
        const dropdowns = document.querySelectorAll('.user-options-menu');
        dropdowns.forEach(menu => menu.classList.add('hidden'));
    }
});

// --- Filtrado y Renderizado ---
function filterUsers() { renderUsers(); }

function renderUsers() {
    const grid = document.getElementById('users-grid');
    grid.innerHTML = '';

    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterNationality = document.getElementById('filter-nationality').value;
    const filterStatus = document.getElementById('filter-status').value;
    const filterPrivilege = document.getElementById('filter-privilege').value;

    const filteredUsers = usersDatabase.filter(user => {
        const nombreCompleto = `${user.name.toLowerCase()} ${user.surname.toLowerCase()}`;
        
        const matchesSearch = user.name.toLowerCase().startsWith(searchTerm) || 
                              user.surname.toLowerCase().startsWith(searchTerm) || 
                              nombreCompleto.startsWith(searchTerm) ||
                              user.cedula.startsWith(searchTerm);
                              
        const matchesNationality = filterNationality === 'Todos' || user.nationality === filterNationality;
        const matchesStatus = filterStatus === 'Todos' || user.status === filterStatus;
        const matchesPrivilege = filterPrivilege === 'Todos' || user.privilege === filterPrivilege;

        return matchesSearch && matchesNationality && matchesStatus && matchesPrivilege;
    });

    if (filteredUsers.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center">
                <div class="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <span class="material-icons-round text-3xl text-slate-400">search_off</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">No se encontraron miembros</h3>
                <p class="text-slate-500 dark:text-slate-400">Prueba ajustando los filtros o el término de búsqueda</p>
            </div>
        `;
        return;
    }

    filteredUsers.forEach(user => {
        let statusClass = '';
        let dotColor = '';
        if (user.status === 'Activo') {
            statusClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            dotColor = 'bg-green-500';
        } else if (user.status === 'Bloqueado') {
            statusClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
            dotColor = 'bg-red-500';
        } else {
            statusClass = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
            dotColor = 'bg-slate-400';
        }
            
        const avatarHtml = user.foto 
            ? `<img src="${user.foto}" class="w-full h-full object-cover rounded-full" />`
            : `<span class="material-icons-round text-2xl">person</span>`;

        let btnBloquearHtml = '';
        if (user.status !== 'Sin Registro') {
            btnBloquearHtml = `
                <button onclick="toggleUserStatus(${user.id}, '${user.status}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                    <span class="material-icons-round text-slate-400 text-lg">block</span> ${user.status === 'Activo' ? 'Bloquear' : 'Activar'}
                </button>
            `;
        }

        // ⚡ LÓGICA DE OCULTAR MENÚ PARA LÍDERES ⚡
        let menuHTML = '';
        if (sessionData.rol === 3 || (sessionData.rol === 2 && user.privilege === 'Congregante')) {
            menuHTML = `
                <button onclick="openUserOptions(this)" class="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                    <span class="material-icons-round">more_vert</span>
                </button>
                
                <div class="user-options-menu absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 hidden z-10 overflow-hidden">
                    <div class="py-1">
                        <button onclick="editUser(${user.id})" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                            <span class="material-icons-round text-slate-400 text-lg">edit</span> Editar
                        </button>
                        ${btnBloquearHtml}
                    </div>
                </div>
            `;
        } else {
            // Se muestra el candadito en lugar del botón de menú
            menuHTML = `<span class="material-icons-round text-slate-300 mr-2" title="Usuario Protegido">lock</span>`;
        }

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between ios-shadow border border-slate-100 dark:border-slate-700 transition-all hover:border-slate-200 dark:hover:border-slate-600";
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0 relative">
                     ${avatarHtml}
                     <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${dotColor}"></div>
                </div>
                <div class="min-w-0">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">${user.name} ${user.surname}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">${user.nationality}-${user.cedula}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-400">
                            ${user.privilege}
                        </span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}">
                            ${user.status}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="relative user-options-container flex items-center">
                ${menuHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

function formatNameInputRealTime(input) {
    let val = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    input.value = val.toLowerCase().replace(/\b\w/g, letra => letra.toUpperCase());
}

// Función para poner la fecha correcta de Caracas al abrir el modal
async function prellenarFechaExacta(idInput) {
    const inputFecha = document.getElementById(idInput);
    if (!inputFecha) return;

    try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/America/Caracas');
        const data = await res.json();
        // Extraemos solo la parte de la fecha (YYYY-MM-DD)
        const fechaCaracas = data.datetime.split('T')[0];
        inputFecha.value = fechaCaracas;
    } catch (e) {
        // Si falla el internet, ponemos la del sistema como respaldo
        inputFecha.value = new Date().toISOString().split('T')[0];
    }
}

// Ejemplo de uso al abrir el modal de nuevo evento:
function openCreateModal() {
    toggleModal('modal-nuevo-evento');
    prellenarFechaExacta('new-event-date'); // El ID de tu input tipo date
}