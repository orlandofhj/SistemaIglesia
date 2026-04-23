// --- Lógica Dinámica para Gestión de Servicios Dominicales ---

let servicesData = {}; 
let staffDB = []; 
let currentEditingPostId = null; 

// --- 🌐 CONEXIÓN CON EL BACKEND (fetch, GET) 🌐 ---
window.addEventListener('DOMContentLoaded', () => {
    fetchServicios();
    fetchStaffGlobal(); 
});

function formatDateToES(isoDate) {
    if(!isoDate) return 'S/F';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

async function fetchServicios() {
    try {
        const response = await fetch('api/servicios/todos');
        if (response.ok) {
            const data = await response.json();
            servicesData = {};
            data.forEach(srv => {
                servicesData[`card-${srv.idPost}`] = {
                    id: srv.idPost,
                    state: srv.estado, 
                    hidden: srv.oculto,
                    title: srv.titulo,
                    date: srv.fecha, 
                    time: srv.hora,  
                    teacherName: srv.maestro,
                    directorName: srv.director,
                    leaderName: srv.lider,
                    preacherName: srv.predicador,
                    guest: srv.invitado,
                    attendees: srv.asistentes || 0,
                    observations: srv.observaciones || '',
                    news: srv.novedades || '',
                    image: srv.fotoUrl || null
                };
            });
            renderAllServices();
        }
    } catch (error) {
        console.error("Error cargando servicios:", error);
    }
}

async function fetchStaffGlobal() {
    try {
        const response = await fetch('/api/usuarios/todos');
        if (response.ok) staffDB = await response.json();
    } catch (error) { console.error("Error staff:", error); }
}

// --- ✏️ LÓGICA DE AGREGAR / MODIFICAR ✏️ ---

function parseTimeToModal(timeStr) {
    if (!timeStr) return { hour: '12', minute: '00', ampm: 'PM' };
    if (timeStr.includes(' ')) {
        const [time, ampm] = timeStr.split(' ');
        const [hour, minute] = time.split(':');
        return { hour, minute, ampm };
    }
    const [hour24, minute] = timeStr.split(':');
    let hour = parseInt(hour24);
    let ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; 
    return { hour: hour.toString().padStart(2, '0'), minute, ampm };
}

function resetStaffInputs() {
    const roles = ['teacher', 'director', 'leader', 'preacher'];
    roles.forEach(role => {
        document.getElementById(`new-service-${role}-cedula`).value = '';
        document.getElementById(`new-service-${role}-nombre`).value = '';
        desbloquearStaff(role); // Liberamos todo
    });
}



function openCreateModal() {
    currentEditingPostId = null;
    document.getElementById('form-nuevo-servicio').reset();
    document.getElementById('modal-title-new').innerText = "Agregar Nuevo Servicio Dominical";
    
    document.getElementById('btn-save-service').classList.remove('hidden');
    document.getElementById('btn-edit-service').classList.add('hidden');
    
    resetStaffInputs();
    hideServiceError();
    toggleModal('modal-nuevo-servicio');
}

async function openEditModal(cardKey) {
    const srv = servicesData[cardKey];
    if (!srv) return;
    currentEditingPostId = srv.id; 
    hideServiceError();
    resetStaffInputs();
    
    document.getElementById('modal-title-new').innerText = `Editar Servicio: ${srv.title}`;
    
    document.getElementById('btn-save-service').classList.add('hidden');
    document.getElementById('btn-edit-service').classList.remove('hidden');

    document.getElementById('new-service-title').value = srv.title;
    document.getElementById('new-service-date').value = srv.date; 
    
    const timeObj = parseTimeToModal(srv.time);
    document.getElementById('new-service-hour').value = timeObj.hour;
    document.getElementById('new-service-minute').value = timeObj.minute;
    document.getElementById('new-service-ampm').value = timeObj.ampm;
    document.getElementById('new-service-guest').value = srv.guest || '';

    try {
        const response = await fetch(`/api/servicios/${srv.id}/cedulas`);
        if (response.ok) {
            const cedulas = await response.json();
            
            // ⚡ NUEVA LÓGICA: Busca en la BD local y simula la selección para bloquear el campo
            function fillStaff(role, cedula) {
                if (cedula) {
                    const est = staffDB.find(e => e.cedula && e.cedula.toString() === cedula.toString());
                    if (est) {
                        seleccionarStaff(est, role); // Llena el nombre y bloquea el input automáticamente
                    } else {
                        document.getElementById(`new-service-${role}-cedula`).value = cedula;
                    }
                }
            }
            
            fillStaff('teacher', cedulas.maestro);
            fillStaff('director', cedulas.director);
            fillStaff('leader', cedulas.lider);
            fillStaff('preacher', cedulas.predicador);
        }
    } catch (e) { console.error("Error cedulas:", e); }

    toggleModal('modal-nuevo-servicio');
}

function getServicePayload() {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const title = document.getElementById('new-service-title').value.trim();
    const date = document.getElementById('new-service-date').value;
    const hourStr = document.getElementById('new-service-hour').value;
    const minuteStr = document.getElementById('new-service-minute').value;
    const ampm = document.getElementById('new-service-ampm').value;
    const guest = document.getElementById('new-service-guest').value.trim();

    // ⚡ AQUÍ ESTÁ LA CORRECCIÓN: Ahora sí capturamos el Género
    const getPersonaData = (role) => {
        const ced = document.getElementById(`new-service-${role}-cedula`).value.trim();
        if (!ced) return null;
        return {
            nac: document.getElementById(`new-service-${role}-nac`).value,
            cedula: ced,
            nombre: document.getElementById(`new-service-${role}-nombre`).value.trim(),
            genero: document.getElementById(`new-service-${role}-genero`).value // ⚡ ESTO FALTABA
        };
    };

    if (!title || !date || !hourStr || !minuteStr || !ampm) {
        showServiceError('El título, la fecha y la hora son obligatorios.'); 
        return null;
    }

    let hour = parseInt(hourStr);
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const time24h = `${hour.toString().padStart(2, '0')}:${minuteStr}`;

    return {
        solicitante: session.username,
        titulo: title,
        fecha: date,         
        hora: time24h,       
        maestro: getPersonaData('teacher'),
        director: getPersonaData('director'),
        lider: getPersonaData('leader'),
        predicador: getPersonaData('preacher'),
        invitado: guest
    };
}

async function saveService() {
    hideServiceError();
    const payload = getServicePayload();
    if(!payload) return;

    const roles = ['maestro', 'director', 'lider', 'predicador'];
    for (let r of roles) {
        const p = payload[r];
        if (!p) continue;
        const existe = staffDB.find(x => x.cedula && x.cedula.toString() === p.cedula.toString());
        if (existe) {
            const nombreIngresado = p.nombre.toLowerCase().trim();
            const nombreReal = `${existe.nombre} ${existe.apellido}`.toLowerCase().trim();
            if (nombreIngresado !== nombreReal) {
                showServiceError(`La cédula ${p.cedula} ya pertenece a ${existe.nombre} ${existe.apellido}.`);
                return;
            }
        }
    }

    try {
        const response = await fetch('/api/servicios/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) { toggleModal('modal-nuevo-servicio'); fetchServicios(); }
        else { showServiceError(await response.text()); }
    } catch (error) { showServiceError("Error de conexión."); }
}

async function updateService() {
    if (!currentEditingPostId) return;
    hideServiceError();
    const payload = getServicePayload();
    if(!payload) return;

    const roles = ['maestro', 'director', 'lider', 'predicador'];
    for (let r of roles) {
        const p = payload[r];
        if (!p) continue;
        const existe = staffDB.find(x => x.cedula && x.cedula.toString() === p.cedula.toString());
        if (existe) {
            const nombreIngresado = p.nombre.toLowerCase().trim();
            const nombreReal = `${existe.nombre} ${existe.apellido}`.toLowerCase().trim();
            if (nombreIngresado !== nombreReal) {
                showServiceError(`La cédula ${p.cedula} ya pertenece a ${existe.nombre} ${existe.apellido}.`);
                return;
            }
        }
    }
    
    try {
        const response = await fetch(`/api/servicios/modificar/${currentEditingPostId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) { toggleModal('modal-nuevo-servicio'); fetchServicios(); }
        else { showServiceError(await response.text()); }
    } catch (e) { showServiceError("Error de conexión."); }
}

async function toggleVisibility(cardKey) {
    const srv = servicesData[cardKey];
    if (!srv) return;
    
    const nuevoOculto = !srv.hidden;
    
    try {
        const response = await fetch(`/api/servicios/${srv.id}/visibilidad`, {
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oculto: nuevoOculto })
        });

        if (response.ok) {
            srv.hidden = nuevoOculto; 
            renderAllServices(); 
        }
    } catch (e) { console.error("Error visibilidad:", e); }
}

function openMarkRealizadaModal(cardKey) {
    const srv = servicesData[cardKey];
    if (!srv) return;
    currentEditingPostId = srv.id;
    
    document.getElementById('form-realizada').reset();
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
    
    hideRealizadaError(); // ⚡ Limpia errores viejos
    
    toggleModal('modal-realizada');
}

// ⚡ FUNCIONES AUXILIARES DE ERROR ⚡
function showRealizadaError(msg) {
    const errorDiv = document.getElementById('realizada-error-msg');
    const errorText = document.getElementById('realizada-error-text');
    if (errorDiv && errorText) {
        errorText.innerText = msg;
        errorDiv.classList.remove('hidden');
    }
}

function hideRealizadaError() {
    const errorDiv = document.getElementById('realizada-error-msg');
    if (errorDiv) errorDiv.classList.add('hidden');
}

async function submitRealizada(event) {
    event.preventDefault();
    if (!currentEditingPostId) return;
    
    hideRealizadaError(); // Limpiamos errores previos al intentar de nuevo
    
    const asistentes = document.getElementById('attendees').value.trim();
    
    // Validación 1: Asistentes
    if (!asistentes || parseInt(asistentes) < 1) {
        showRealizadaError("Debes ingresar una cantidad de participantes válida.");
        return;
    }

    // Validación 2: Foto
    const photoInput = document.getElementById('photo-upload');
    if (!photoInput.files || photoInput.files.length === 0) {
        showRealizadaError("La foto del servicio es obligatoria. Por favor, sube una imagen.");
        return;
    }

    const formData = new FormData();
    formData.append('asistentes', asistentes);
    formData.append('observaciones', document.getElementById('observations').value);
    formData.append('novedades', document.getElementById('news').value);
    formData.append('foto', photoInput.files[0]); 

    try {
        const response = await fetch(`/api/servicios/completar/${currentEditingPostId}`, {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            toggleModal('modal-realizada');
            fetchServicios();
        } else {
            const err = await response.text();
            showRealizadaError(err || "Error al finalizar el servicio.");
        }
    } catch (e) { 
        showRealizadaError("Error de conexión con el servidor."); 
    }
}

// --- 🖥️ RENDERIZADO VISUAL ACTUALIZADO 🖥️ ---
// --- 🖥️ RENDERIZADO VISUAL ACTUALIZADO 🖥️ ---
function renderAllServices() {
    const grid = document.querySelector('#services-grid'); 
    grid.innerHTML = '';
    
    // ⚡ LEEMOS LA SESIÓN UNA SOLA VEZ
    const session = JSON.parse(localStorage.getItem('iglesia_session')) || {};
    const rolUsuario = session.rol || session.privilegio || '';
    const esPastor = rolUsuario === 3 || rolUsuario === 'Pastor';

    // ⚡ SOLUCIÓN: Ordenamos siempre por ID descendente.
    // Los nuevos (ID mayor) salen arriba. Al editar, el ID no cambia, así que no se mueven.
    const sortedKeys = Object.keys(servicesData).sort((a, b) => {
        return servicesData[b].id - servicesData[a].id;
    });

    sortedKeys.forEach(key => {
        const srv = servicesData[key];
        
        const fechaMostrar = formatDateToES(srv.date);

        const badgeClass = srv.state === 'Realizada' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
            
        const hiddenBadge = srv.hidden 
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ml-2" title="No visible en Noticias"><span class="material-icons-round text-[10px] mr-1">visibility_off</span>Oculta</span>` 
            : '';
            
        const cardStyle = srv.hidden ? 'opacity-70 grayscale-[0.6] border-red-300 dark:border-red-800' : '';

        let footerHTML = '';
        if (srv.state === 'Realizada') {
            footerHTML = `
                <div class="flex items-center gap-2">
                    <span class="material-icons-round text-slate-400 text-lg">groups</span>
                    <span class="font-semibold text-slate-900 dark:text-white">${srv.attendees}</span>
                    <span class="text-xs text-slate-500">asistentes</span>
                </div>
                <button class="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1" onclick="showDetails('${key}')">
                    Ver observaciones <span class="material-icons-round text-sm">arrow_forward</span>
                </button>`;
        }

        let imageHTML = srv.image 
            ? `<img src="${srv.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Servicio">`
            : `<span class="material-icons-round text-6xl text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform duration-300">church</span>`;

        const guestHTML = srv.guest ? `
            <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span class="material-icons-round text-primary text-base mt-0.5">group_add</span>
                <span class="font-medium">Invitado: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.guest}</span></span>
            </div>` : '';

        // ⚡ BOTÓN DE MODIFICAR CONDICIONAL
        const btnModificarHTML = esPastor ? `
            <button onclick="openEditModal('${key}'); toggleCardMenu('menu-${key}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                <span class="material-icons-round text-slate-400 text-lg">edit</span> Modificar
            </button>
        ` : '';

        const newCard = document.createElement('article');
        newCard.className = `bg-white dark:bg-slate-800 rounded-3xl overflow-hidden ios-shadow border border-slate-100 dark:border-slate-700 flex flex-col group hover:border-primary/30 transition-all duration-300 relative ${cardStyle}`;
        newCard.id = key;

        newCard.innerHTML = `
            <div class="absolute top-3 left-3 z-20 flex items-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                    ${srv.state}
                </span>
                ${hiddenBadge}
            </div>
            <div class="absolute top-3 right-3 z-20">
                <button class="p-1 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-600 backdrop-blur-sm transition-colors dark:bg-slate-800/50 dark:text-slate-200" onclick="toggleCardMenu('menu-${key}')">
                    <span class="material-icons-round text-lg leading-none">more_vert</span>
                </button>
                <div class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 card-menu z-30 overflow-hidden" id="menu-${key}">
                    <div class="py-1">
                        ${btnModificarHTML}
                        <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left" onclick="toggleVisibility('${key}'); toggleCardMenu('menu-${key}')">
                            <span class="material-icons-round text-slate-400 text-lg">${srv.hidden ? 'visibility' : 'visibility_off'}</span> ${srv.hidden ? 'Mostrar en Noticias' : 'Ocultar en Noticias'}
                        </button>
                        
                        <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left" onclick="openMarkRealizadaModal('${key}'); toggleCardMenu('menu-${key}')">
                            <span class="material-icons-round text-slate-400 text-lg">check_circle</span> Marcar Realizada
                        </button>
                    </div>
                </div>
            </div>
            <div class="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors">
                ${imageHTML}
            </div>
            <div class="p-5 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-2 pr-2">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">${srv.title}</h3>
                </div>
                <div class="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span class="flex items-center gap-1 font-semibold">
                        <span class="material-icons-round text-sm text-primary">calendar_today</span> ${fechaMostrar}
                    </span>
                    <span class="flex items-center gap-1">
                        <span class="material-icons-round text-sm">schedule</span> ${srv.time}
                    </span>
                </div>
                <div class="space-y-2 mb-4">
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">school</span>
                        <span class="font-medium">Maestro: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.teacherName}</span></span>
                    </div>
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">person</span>
                        <span class="font-medium">Director: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.directorName}</span></span>
                    </div>
                    ${guestHTML}
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">supervisor_account</span>
                        <span class="font-medium">Líder: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.leaderName}</span></span>
                    </div>
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">campaign</span>
                        <span class="font-medium">Predicador: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.preacherName}</span></span>
                    </div>
                </div>
                <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between card-footer min-h-[53px]">
                    ${footerHTML}
                </div>
            </div>
        `;
        grid.appendChild(newCard);
    });
}

function toggleCardMenu(menuId) {
    const menu = document.getElementById(menuId);
    document.querySelectorAll('.card-menu').forEach(el => {
        if (el.id !== menuId && !el.classList.contains('hidden')) el.classList.add('hidden');
    });
    if (menu) menu.classList.toggle('hidden');
}

function showDetails(cardId) {
    const srv = servicesData[cardId];
    if (!srv) return;
    document.getElementById('detail-attendees').textContent = srv.attendees;
    document.getElementById('detail-observations').textContent = srv.observations || 'Sin observaciones registradas.';
    document.getElementById('detail-news').textContent = srv.news || 'Sin novedades registradas.';
    document.getElementById('detail-title').textContent = `${srv.title} (${srv.state})`;
    toggleModal('modal-detalles');
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        if (modalId === 'modal-nuevo-servicio') hideServiceError(); 
    } else {
        modal.classList.add('hidden');
    }
}

function showServiceError(msg) {
    const errorDiv = document.getElementById('service-error-msg');
    const errorText = document.getElementById('service-error-text');
    if (errorDiv && errorText) {
        errorText.innerText = msg;
        errorDiv.classList.remove('hidden');
    }
}

function hideServiceError() {
    const errorDiv = document.getElementById('service-error-msg');
    if (errorDiv) errorDiv.classList.add('hidden');
}

// --- ⚡ LÓGICA DE AUTOCOMPLETADO Y VALIDACIÓN DE PERSONAL ⚡ ---

document.addEventListener('click', function(event) {
    if (!event.target.closest('form')) {
        ocultarTodasSugerencias();
    }
});

function quitarAcentos(cadena) {
    return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ⚡ FORMATEO DE NOMBRE: Solo letras, un solo espacio y Formato Nombre Apellido
function formatNombreInput(inputElement) {
    let val = inputElement.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.trimStart().replace(/\s{2,}/g, ' '); 
    
    let partes = val.split(' ');
    if (partes.length > 2) val = partes[0] + ' ' + partes[1]; 
    
    inputElement.value = val.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    if (val.endsWith(' ') && partes.length === 1) inputElement.value += " ";
}



// Haz EXACTAMENTE la misma modificación visual de "colorClass" en buscarStaffPorNombre()





function buscarStaffPorNombre(role) {
    const inputNombre = document.getElementById(`new-service-${role}-nombre`);
    if(inputNombre.readOnly) return; 

    formatNombreInput(inputNombre); 
    const query = quitarAcentos(inputNombre.value.toLowerCase().trim());
    
    const suggBox = document.getElementById(`sugg-${role}-nombre`);
    suggBox.innerHTML = '';
    ocultarTodasSugerencias(suggBox.id);

    if (query.length < 1) {
        suggBox.classList.add('hidden');
        return;
    }

    const resultados = staffDB.filter(e => {
        const nombreNorm = quitarAcentos((e.nombre || '').toLowerCase());
        const apellidoNorm = quitarAcentos((e.apellido || '').toLowerCase());
        return nombreNorm.startsWith(query) || apellidoNorm.startsWith(query);
    });

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            
            // ⚡ AZUL para usuarios registrados, VERDE para los "Sin Registro"
            const colorClass = est.estado === 'Sin Registro' ? 'text-green-600 dark:text-green-500' : 'text-primary dark:text-blue-400';
            
            div.innerHTML = `
                <span class="font-bold uppercase">${est.nombre} ${est.apellido}</span> 
                <span class="text-[10px] ${colorClass} font-bold">(${est.nacionalidad || 'V'}-${est.cedula || 'S/N'})</span>
            `;
            div.onclick = () => seleccionarStaff(est, role);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else {
        suggBox.classList.add('hidden');
    }
}



function ocultarTodasSugerencias(excepcionId = '') {
    document.querySelectorAll('[id^="sugg-"]').forEach(box => {
        if(box.id !== excepcionId) box.classList.add('hidden');
    });
}

// --- ⚡ LÓGICA DE PREVISUALIZACIÓN Y VALIDACIÓN DE IMAGEN ⚡ ---
function previewImage(event) {
    hideRealizadaError();
    const file = event.target.files[0];
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('upload-placeholder');
    
    if (!file) {
        preview.src = '';
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showRealizadaError("El archivo seleccionado no es una imagen válida.");
        event.target.value = ''; // Limpia el input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Validar que la foto tenga proporciones normales (evitar iconos muy pequeños)
            if (this.width < 300 || this.height < 300) {
                showRealizadaError("La imagen es muy pequeña. Por favor, sube una fotografía estándar tomada con celular o cámara.");
                event.target.value = ''; 
                preview.classList.add('hidden');
                placeholder.classList.remove('hidden');
                return;
            }
            
            // Mostrar la imagen
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ⚡ 1. REEMPLAZO DEFINITIVO PARA BUSCAR POR CÉDULA
function buscarStaffPorCedula(role) {
    const inputCedula = document.getElementById(`new-service-${role}-cedula`);
    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query;

    // Si borra toda la cédula, limpia el nombre, nacionalidad y género
    if (query === "") {
        document.getElementById(`new-service-${role}-nombre`).value = ''; 
        document.getElementById(`new-service-${role}-nac`).value = 'V';
        document.getElementById(`new-service-${role}-genero`).value = 'M';
        desbloquearStaff(role); 
        ocultarTodasSugerencias();
        return;
    }

    const suggBox = document.getElementById(`sugg-${role}-cedula`);
    suggBox.innerHTML = '';
    const resultados = staffDB.filter(e => e.cedula && e.cedula.toString().startsWith(query));

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            const colorClass = est.estado === 'Sin Registro' ? 'text-green-600 dark:text-green-500' : 'text-primary dark:text-blue-400';
            div.innerHTML = `<span class="font-bold ${colorClass}">${est.nacionalidad || 'V'}-${est.cedula}</span> <span class="text-xs text-slate-500 font-bold uppercase">${est.nombre} ${est.apellido}</span>`;
            div.onclick = () => seleccionarStaff(est, role);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { suggBox.classList.add('hidden'); }
}

// ⚡ 2. REEMPLAZO DEFINITIVO PARA SELECCIONAR DESDE SUGERENCIAS
function seleccionarStaff(est, role) {
    document.getElementById(`new-service-${role}-nac`).value = est.nacionalidad || 'V';
    document.getElementById(`new-service-${role}-cedula`).value = est.cedula || ''; 
    document.getElementById(`new-service-${role}-nombre`).value = `${est.nombre} ${est.apellido}`;
    document.getElementById(`new-service-${role}-genero`).value = est.genero || 'M';
    
    // BLOQUEO DE ATRIBUTOS (Incluyendo Género y Nacionalidad)
    document.getElementById(`new-service-${role}-nombre`).readOnly = true;
    document.getElementById(`new-service-${role}-nac`).disabled = true;
    document.getElementById(`new-service-${role}-genero`).disabled = true;
    
    // APLICAR CLASES VISUALES DE BLOQUEO A LOS 3 CAMPOS
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    document.getElementById(`new-service-${role}-nombre`).classList.add(...clasesBloqueo);
    document.getElementById(`new-service-${role}-nac`).classList.add(...clasesBloqueo);
    document.getElementById(`new-service-${role}-genero`).classList.add(...clasesBloqueo);
    
    ocultarTodasSugerencias();
}

// ⚡ 3. REEMPLAZO DEFINITIVO PARA DESBLOQUEAR
function desbloquearStaff(role) {
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    
    const elNombre = document.getElementById(`new-service-${role}-nombre`);
    const elNac = document.getElementById(`new-service-${role}-nac`);
    const elGenero = document.getElementById(`new-service-${role}-genero`);
    
    // Liberar atributos
    elNombre.readOnly = false;
    elNac.disabled = false;
    elGenero.disabled = false;
    
    // Quitar color gris
    elNombre.classList.remove(...clasesBloqueo);
    elNac.classList.remove(...clasesBloqueo);
    elGenero.classList.remove(...clasesBloqueo);
}
