// --- Lógica Dinámica para Gestión de Eventos ---

let eventsData = {}; 
let staffDB = []; 
let currentEditingPostId = null; 

window.addEventListener('DOMContentLoaded', () => {
    fetchEventos();
    fetchStaffGlobal(); 
});

function formatDateToES(isoDate) {
    if(!isoDate) return 'S/F';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

async function fetchEventos() {
    try {
        const response = await fetch('http://localhost:8080/api/eventos/todos');
        if (response.ok) {
            const data = await response.json();
            eventsData = {};
            data.forEach(ev => {
                eventsData[`card-${ev.idPost}`] = {
                    id: ev.idPost,
                    state: ev.estado, 
                    hidden: ev.oculto,
                    title: ev.titulo,
                    location: ev.lugar,
                    date: ev.fecha, 
                    time: ev.hora,  
                    directorName: ev.director,
                    preacherName: ev.predicador,
                    guest: ev.invitado,
                    attendees: ev.asistentes || 0,
                    observations: ev.observaciones || '',
                    news: ev.novedades || '',
                    image: ev.fotoUrl || null
                };
            });
            renderAllEvents();
        }
    } catch (error) { console.error("Error cargando eventos:", error); }
}

async function fetchStaffGlobal() {
    try {
        const response = await fetch('http://localhost:8080/api/usuarios/todos');
        if (response.ok) staffDB = await response.json();
    } catch (error) { console.error("Error staff:", error); }
}

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

// ⚡ 2. REEMPLAZA RESETEAR (Añade el género)
function resetStaffInputs() {
    const roles = ['director', 'preacher'];
    roles.forEach(role => {
        document.getElementById(`new-event-${role}-cedula`).value = '';
        document.getElementById(`new-event-${role}-nombre`).value = '';
        document.getElementById(`new-event-${role}-genero`).value = 'M';
        desbloquearStaff(role);
    });
}

function desbloquearStaff(role) {
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    
    const elNombre = document.getElementById(`new-event-${role}-nombre`);
    const elNac = document.getElementById(`new-event-${role}-nac`);
    const elGenero = document.getElementById(`new-event-${role}-genero`);
    
    elNombre.readOnly = false;
    elNac.disabled = false;
    elGenero.disabled = false;
    
    elNombre.classList.remove(...clasesBloqueo);
    elNac.classList.remove(...clasesBloqueo);
    elGenero.classList.remove(...clasesBloqueo);
}

function openCreateModal() {
    currentEditingPostId = null;
    document.getElementById('form-nuevo-evento').reset();
    document.getElementById('modal-title-new').innerText = "Agregar Nuevo Evento";
    
    document.getElementById('btn-save-event').classList.remove('hidden');
    document.getElementById('btn-edit-event').classList.add('hidden');
    
    resetStaffInputs();
    hideEventError();
    toggleModal('modal-nuevo-evento');
}

async function openEditModal(cardKey) {
    const ev = eventsData[cardKey];
    if (!ev) return;
    currentEditingPostId = ev.id; 
    hideEventError();
    resetStaffInputs();
    
    document.getElementById('modal-title-new').innerText = `Editar Evento: ${ev.title}`;
    
    document.getElementById('btn-save-event').classList.add('hidden');
    document.getElementById('btn-edit-event').classList.remove('hidden');

    document.getElementById('new-event-title').value = ev.title;
    document.getElementById('new-event-location').value = ev.location;
    document.getElementById('new-event-date').value = ev.date; 
    
    const timeObj = parseTimeToModal(ev.time);
    document.getElementById('new-event-hour').value = timeObj.hour;
    document.getElementById('new-event-minute').value = timeObj.minute;
    document.getElementById('new-event-ampm').value = timeObj.ampm;
    document.getElementById('new-event-guest').value = ev.guest || '';

    try {
        const response = await fetch(`http://localhost:8080/api/eventos/${ev.id}/cedulas`);
        if (response.ok) {
            const cedulas = await response.json();
            function fillStaff(role, cedula) {
                if (cedula) {
                    const est = staffDB.find(e => e.cedula && e.cedula.toString() === cedula.toString());
                    if (est) seleccionarStaff(est, role); 
                    else document.getElementById(`new-event-${role}-cedula`).value = cedula;
                }
            }
            fillStaff('director', cedulas.director);
            fillStaff('preacher', cedulas.predicador);
        }
    } catch (e) { console.error("Error cedulas:", e); }

    toggleModal('modal-nuevo-evento');
}

// ⚡ 3. REEMPLAZA LA RECOLECCIÓN DE DATOS (Para capturar el Género)
function getEventPayload() {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const title = document.getElementById('new-event-title').value.trim();
    const location = document.getElementById('new-event-location').value.trim();
    const date = document.getElementById('new-event-date').value;
    const hourStr = document.getElementById('new-event-hour').value;
    const minuteStr = document.getElementById('new-event-minute').value;
    const ampm = document.getElementById('new-event-ampm').value;
    const guest = document.getElementById('new-event-guest').value.trim();

    const getPersonaData = (role) => {
        const ced = document.getElementById(`new-event-${role}-cedula`).value.trim();
        if (!ced) return null;
        return {
            nac: document.getElementById(`new-event-${role}-nac`).value,
            cedula: ced,
            nombre: document.getElementById(`new-event-${role}-nombre`).value.trim(),
            genero: document.getElementById(`new-event-${role}-genero`).value
        };
    };

    if (!title || !location || !date || !hourStr || !minuteStr || !ampm) {
        showEventError('El título, el lugar, la fecha y la hora son obligatorios.'); 
        return null;
    }

    let hour = parseInt(hourStr);
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const time24h = `${hour.toString().padStart(2, '0')}:${minuteStr}`;

    return {
        solicitante: session.username,
        titulo: title,
        lugar: location,
        fecha: date,         
        hora: time24h,       
        director: getPersonaData('director'),
        predicador: getPersonaData('preacher'),
        invitado: guest
    };
}

// ⚡ 4. REEMPLAZA GUARDAR Y ACTUALIZAR (Anti-Duplicados)
async function saveEvent() {
    hideEventError();
    const payload = getEventPayload();
    if(!payload) return;

    // Validación Anti-Duplicados
    const roles = ['director', 'predicador'];
    for (let r of roles) {
        const p = payload[r];
        if (!p) continue;
        const existe = staffDB.find(x => x.cedula && x.cedula.toString() === p.cedula.toString());
        if (existe) {
            const nombreIngresado = p.nombre.toLowerCase().trim();
            const nombreReal = `${existe.nombre} ${existe.apellido}`.toLowerCase().trim();
            if (nombreIngresado !== nombreReal) {
                showEventError(`La cédula ${p.cedula} ya pertenece a ${existe.nombre} ${existe.apellido}.`);
                return;
            }
        }
    }

    try {
        const response = await fetch('http://localhost:8080/api/eventos/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) { toggleModal('modal-nuevo-evento'); fetchEventos(); } 
        else { showEventError(await response.text()); }
    } catch (error) { showEventError("Error de conexión."); }
}

async function updateEvent() {
    if (!currentEditingPostId) return;
    hideEventError();
    const payload = getEventPayload();
    if(!payload) return;
    
    // Validación Anti-Duplicados
    const roles = ['director', 'predicador'];
    for (let r of roles) {
        const p = payload[r];
        if (!p) continue;
        const existe = staffDB.find(x => x.cedula && x.cedula.toString() === p.cedula.toString());
        if (existe) {
            const nombreIngresado = p.nombre.toLowerCase().trim();
            const nombreReal = `${existe.nombre} ${existe.apellido}`.toLowerCase().trim();
            if (nombreIngresado !== nombreReal) {
                showEventError(`La cédula ${p.cedula} ya pertenece a ${existe.nombre} ${existe.apellido}.`);
                return;
            }
        }
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/eventos/modificar/${currentEditingPostId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) { toggleModal('modal-nuevo-evento'); fetchEventos(); } 
        else { showEventError(await response.text()); }
    } catch (e) { showEventError("Error de conexión."); }
}

async function toggleVisibility(cardKey) {
    const ev = eventsData[cardKey];
    if (!ev) return;
    const nuevoOculto = !ev.hidden;
    try {
        const response = await fetch(`http://localhost:8080/api/eventos/${ev.id}/visibilidad`, {
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oculto: nuevoOculto })
        });
        if (response.ok) {
            ev.hidden = nuevoOculto; 
            renderAllEvents(); 
        }
    } catch (e) { console.error("Error visibilidad:", e); }
}

function openMarkRealizadaModal(cardKey) {
    const ev = eventsData[cardKey];
    if (!ev) return;
    currentEditingPostId = ev.id;
    
    document.getElementById('form-realizada').reset();
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
    hideRealizadaError(); 
    toggleModal('modal-realizada');
}

function showEventError(msg) {
    const errorDiv = document.getElementById('event-error-msg');
    const errorText = document.getElementById('event-error-text');
    if (errorDiv && errorText) {
        errorText.innerText = msg;
        errorDiv.classList.remove('hidden');
    }
}
function hideEventError() {
    const errorDiv = document.getElementById('event-error-msg');
    if (errorDiv) errorDiv.classList.add('hidden');
}

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
    
    hideRealizadaError(); 
    const asistentes = document.getElementById('attendees').value.trim();
    
    if (!asistentes || parseInt(asistentes) < 1) {
        showRealizadaError("Debes ingresar una cantidad de participantes válida.");
        return;
    }

    const photoInput = document.getElementById('photo-upload');
    if (!photoInput.files || photoInput.files.length === 0) {
        showRealizadaError("La foto del evento es obligatoria. Por favor, sube una imagen.");
        return;
    }

    const formData = new FormData();
    formData.append('asistentes', asistentes);
    formData.append('observaciones', document.getElementById('observations').value);
    formData.append('novedades', document.getElementById('news').value);
    formData.append('foto', photoInput.files[0]); 

    try {
        const response = await fetch(`http://localhost:8080/api/eventos/completar/${currentEditingPostId}`, {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            toggleModal('modal-realizada');
            fetchEventos();
        } else {
            const err = await response.text();
            showRealizadaError(err || "Error al finalizar el evento.");
        }
    } catch (e) { showRealizadaError("Error de conexión con el servidor."); }
}

// --- RENDERIZADO VISUAL ---
function renderAllEvents() {
    const grid = document.querySelector('#events-grid'); 
    grid.innerHTML = '';
    
    // ⚡ LEEMOS LA SESIÓN UNA SOLA VEZ
    const session = JSON.parse(localStorage.getItem('iglesia_session')) || {};
    // Verificamos por 'rol' o 'privilegio' dependiendo de cómo lo guardes en el login
    const rolUsuario = session.rol || session.privilegio || '';
    const esPastor = rolUsuario === 3 || rolUsuario === 'Pastor';

    Object.keys(eventsData).forEach(key => {
        const ev = eventsData[key];
        const fechaMostrar = formatDateToES(ev.date);

        const badgeClass = ev.state === 'Realizado' || ev.state === 'Realizada'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
            
        const hiddenBadge = ev.hidden 
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ml-2" title="No visible en Noticias"><span class="material-icons-round text-[10px] mr-1">visibility_off</span>Oculto</span>` 
            : '';
            
        const cardStyle = ev.hidden ? 'opacity-70 grayscale-[0.6] border-red-300 dark:border-red-800' : '';

        let footerHTML = '';
        if (ev.state === 'Realizado' || ev.state === 'Realizada') {
            footerHTML = `
                <div class="flex items-center gap-2">
                    <span class="material-icons-round text-slate-400 text-lg">groups</span>
                    <span class="font-semibold text-slate-900 dark:text-white">${ev.attendees}</span>
                    <span class="text-xs text-slate-500">asistentes</span>
                </div>
                <button class="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1" onclick="showDetails('${key}')">
                    Ver observaciones <span class="material-icons-round text-sm">arrow_forward</span>
                </button>`;
        }

        let imageHTML = ev.image 
            ? `<img src="http://localhost:8080${encodeURI(ev.image)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Evento">`
            : `<span class="material-icons-round text-6xl text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform duration-300">festival</span>`;

        const guestHTML = ev.guest ? `
            <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span class="material-icons-round text-primary text-base mt-0.5">star</span>
                <span class="font-medium">Participación: <span class="font-normal text-slate-500 dark:text-slate-400">${ev.guest}</span></span>
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
                    ${ev.state}
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
                            <span class="material-icons-round text-slate-400 text-lg">${ev.hidden ? 'visibility' : 'visibility_off'}</span> ${ev.hidden ? 'Mostrar en Noticias' : 'Ocultar en Noticias'}
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
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">${ev.title}</h3>
                </div>
                <div class="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span class="flex items-center gap-1 font-semibold">
                        <span class="material-icons-round text-sm text-primary">calendar_today</span> ${fechaMostrar}
                    </span>
                    <span class="flex items-center gap-1">
                        <span class="material-icons-round text-sm">schedule</span> ${ev.time}
                    </span>
                </div>
                <div class="space-y-2 mb-4">
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">place</span>
                        <span class="font-medium">Lugar: <span class="font-normal text-slate-500 dark:text-slate-400">${ev.location}</span></span>
                    </div>
                    ${guestHTML}
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">person</span>
                        <span class="font-medium">Director: <span class="font-normal text-slate-500 dark:text-slate-400">${ev.directorName}</span></span>
                    </div>
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">campaign</span>
                        <span class="font-medium">Predicador: <span class="font-normal text-slate-500 dark:text-slate-400">${ev.preacherName}</span></span>
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
    const ev = eventsData[cardId];
    if (!ev) return;
    document.getElementById('detail-attendees').textContent = ev.attendees;
    document.getElementById('detail-observations').textContent = ev.observations || 'Sin observaciones registradas.';
    document.getElementById('detail-news').textContent = ev.news || 'Sin novedades registradas.';
    document.getElementById('detail-title').textContent = `${ev.title} (${ev.state})`;
    toggleModal('modal-detalles');
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        if (modalId === 'modal-nuevo-evento') hideEventError(); 
    } else {
        modal.classList.add('hidden');
    }
}

// --- ⚡ AUTOCOMPLETADO ---
document.addEventListener('click', function(event) {
    if (!event.target.closest('form')) ocultarTodasSugerencias();
});

function quitarAcentos(cadena) { return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

// ⚡ 1. REEMPLAZA EL FORMATO DE NOMBRE (Estricto)
function formatNombreInput(inputElement) {
    let val = inputElement.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.trimStart().replace(/\s{2,}/g, ' '); 
    let partes = val.split(' ');
    if (partes.length > 2) val = partes[0] + ' ' + partes[1]; 
    inputElement.value = val.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    if (val.endsWith(' ') && partes.length === 1) inputElement.value += " ";
}

// ⚡ 5. REEMPLAZA LAS FUNCIONES DEL FINAL DEL ARCHIVO (Bloqueos)
function buscarStaffPorCedula(role) {
    const inputCedula = document.getElementById(`new-event-${role}-cedula`);
    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query; 

    if (query === "") {
        document.getElementById(`new-event-${role}-nombre`).value = ''; 
        document.getElementById(`new-event-${role}-nac`).value = 'V';
        document.getElementById(`new-event-${role}-genero`).value = 'M';
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

function buscarStaffPorNombre(role) {
    const inputNombre = document.getElementById(`new-event-${role}-nombre`);
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
            const colorClass = est.estado === 'Sin Registro' ? 'text-green-600 dark:text-green-500' : 'text-primary dark:text-blue-400';
            div.innerHTML = `<span class="font-bold uppercase">${est.nombre} ${est.apellido}</span> <span class="text-[10px] ${colorClass} font-bold">(${est.nacionalidad || 'V'}-${est.cedula || 'S/N'})</span>`;
            div.onclick = () => seleccionarStaff(est, role);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { suggBox.classList.add('hidden'); }
}

function seleccionarStaff(est, role) {
    document.getElementById(`new-event-${role}-nac`).value = est.nacionalidad || 'V';
    document.getElementById(`new-event-${role}-cedula`).value = est.cedula || ''; 
    document.getElementById(`new-event-${role}-nombre`).value = `${est.nombre} ${est.apellido}`;
    document.getElementById(`new-event-${role}-genero`).value = est.genero || 'M';
    
    // Bloqueo total
    document.getElementById(`new-event-${role}-nombre`).readOnly = true;
    document.getElementById(`new-event-${role}-nac`).disabled = true;
    document.getElementById(`new-event-${role}-genero`).disabled = true;
    
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    document.getElementById(`new-event-${role}-nombre`).classList.add(...clasesBloqueo);
    document.getElementById(`new-event-${role}-nac`).classList.add(...clasesBloqueo);
    document.getElementById(`new-event-${role}-genero`).classList.add(...clasesBloqueo);
    
    ocultarTodasSugerencias();
}

function ocultarTodasSugerencias(excepcionId = '') {
    document.querySelectorAll('[id^="sugg-"]').forEach(box => {
        if(box.id !== excepcionId) box.classList.add('hidden');
    });
}

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
        showRealizadaError("El archivo no es una imagen válida.");
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            if (this.width < 300 || this.height < 300) {
                showRealizadaError("Imagen muy pequeña. Sube una fotografía estándar.");
                event.target.value = ''; 
                preview.classList.add('hidden');
                placeholder.classList.remove('hidden');
                return;
            }
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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