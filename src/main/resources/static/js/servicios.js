// --- Lógica Dinámica para Gestión de Servicios Dominicales ---

let servicesData = {}; 
let staffDB = []; 
let currentEditingPostId = null; 
let serviceToRevertId = null;
let currentGuests = []; // ⚡ NUEVO: Arreglo de invitados

// ⚡ VARIABLES DE PAGINACIÓN: CUADRÍCULA PRINCIPAL
let currentPageGrid = 1;
const itemsPerPageGrid = 6;

// ⚡ VARIABLES DE PAGINACIÓN: MODAL DE HISTORIAL
let historyData = [];
let currentHistoryPage = 1;
const historyItemsPerPage = 10;

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
        const response = await fetch('http://localhost:8080/api/servicios/todos');
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
                    guests: srv.invitados || [], // ⚡ AHORA ES UN ARREGLO
                    attendees: srv.asistentes || 0,
                    observations: srv.observations || '',
                    news: srv.novedades || '',
                    image: srv.fotoUrl || null,
                    flyer: srv.flyerUrl || null 
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

function resetStaffInputs() {
    const roles = ['teacher', 'director', 'leader', 'preacher', 'guest'];
    roles.forEach(role => {
        const elCed = document.getElementById(`new-service-${role}-cedula`);
        const elNom = document.getElementById(`new-service-${role}-nombre`);
        const elGen = document.getElementById(`new-service-${role}-genero`);
        
        if (elCed) elCed.value = '';
        if (elNom) elNom.value = '';
        if (elGen) elGen.value = 'M';
        desbloquearStaff(role); 
    });
    
    // ⚡ Limpiar campos específicos de congregación del invitado
    const cong = document.getElementById('new-service-guest-congregacion');
    const ubi = document.getElementById('new-service-guest-ubicacion');
    if (cong) cong.value = '';
    if (ubi) ubi.value = '';

    const flyerInput = document.getElementById('new-service-flyer');
    if (flyerInput) flyerInput.value = '';
    const previewContainer = document.getElementById('flyer-preview-container');
    if (previewContainer) {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
    }

    currentGuests = [];
    renderTablaInvitados();
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

    // ⚡ Llenar la lista dinámica de invitados
    currentGuests = [];
    if (srv.guests && srv.guests.length > 0) {
        srv.guests.forEach(g => {
            currentGuests.push({
                nac: g.nacionalidad || 'V',
                cedula: g.cedula || '',
                nombre: `${g.nombre || ''} ${g.apellido || ''}`.trim(),
                genero: g.genero || 'M',
                congregacion: g.congregacion || '',
                ubicacion: g.ubicacion || ''
            });
        });
    }
    renderTablaInvitados();

    const previewContainer = document.getElementById('flyer-preview-container');
    if (srv.flyer) {
        previewContainer.classList.remove('hidden');
        if (srv.flyer.match(/\.(mp4|webm|ogg)$/i)) { 
            previewContainer.innerHTML = `<video src="${srv.flyer}" class="w-full h-full object-cover bg-black" controls playsinline></video>`;
        } else {
            previewContainer.innerHTML = `<img src="${srv.flyer}" class="w-full h-full object-contain" alt="Flyer">`;
        }
    }

    try {
        const response = await fetch(`http://localhost:8080/api/servicios/${srv.id}/cedulas`);
        if (response.ok) {
            const cedulas = await response.json();
            function fillStaff(role, cedula) {
                if (cedula) {
                    const est = staffDB.find(e => e.cedula && e.cedula.toString() === cedula.toString());
                    if (est) {
                        seleccionarStaff(est, role); 
                    } else {
                        const inputCedula = document.getElementById(`new-service-${role}-cedula`);
                        if (inputCedula) inputCedula.value = cedula;
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

// ⚡ LÓGICA DE INVITADOS DINÁMICOS ⚡
function agregarInvitadoTabla() {
    const nac = document.getElementById('new-service-guest-nac').value;
    const cedula = document.getElementById('new-service-guest-cedula').value.trim();
    const nombre = document.getElementById('new-service-guest-nombre').value.trim();
    const genero = document.getElementById('new-service-guest-genero').value;
    const congregacion = document.getElementById('new-service-guest-congregacion').value.trim();
    const ubicacion = document.getElementById('new-service-guest-ubicacion').value.trim();

    if (!nombre) {
        showServiceError("El nombre o grupo del invitado es obligatorio para añadirlo.");
        return;
    }

    if (cedula && currentGuests.some(g => g.cedula === cedula)) {
        showServiceError("Este invitado ya fue agregado a la lista.");
        return;
    }

    currentGuests.push({ nac, cedula, nombre, genero, congregacion, ubicacion });

    document.getElementById('new-service-guest-cedula').value = '';
    document.getElementById('new-service-guest-nombre').value = '';
    document.getElementById('new-service-guest-congregacion').value = '';
    document.getElementById('new-service-guest-ubicacion').value = '';
    desbloquearStaff('guest');

    renderTablaInvitados();
    hideServiceError();
}

function quitarInvitado(index) {
    currentGuests.splice(index, 1);
    renderTablaInvitados();
}

function renderTablaInvitados() {
    const tbody = document.getElementById('tabla-guest-body');
    tbody.innerHTML = '';

    if (currentGuests.length === 0) {
        tbody.innerHTML = `<tr id="row-empty-guests"><td colspan="3" class="px-3 py-4 text-center text-xs text-slate-400 italic">No hay invitados agregados.</td></tr>`;
        return;
    }

    currentGuests.forEach((inv, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors';
        tr.innerHTML = `
            <td class="px-3 py-2 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white uppercase">${inv.nombre} ${inv.cedula ? `<span class="text-[10px] text-slate-400 font-normal ml-1">(${inv.nac}-${inv.cedula})</span>` : ''}</td>
            <td class="px-3 py-2 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">${inv.congregacion || '-'}</td>
            <td class="px-3 py-2 whitespace-nowrap text-right">
                <button type="button" onclick="quitarInvitado(${index})" class="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                    <span class="material-icons-round text-sm">close</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getServicePayload() {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const title = document.getElementById('new-service-title').value.trim();
    const date = document.getElementById('new-service-date').value;
    const hourStr = document.getElementById('new-service-hour').value;
    const minuteStr = document.getElementById('new-service-minute').value;
    const ampm = document.getElementById('new-service-ampm').value;

    const getPersonaData = (role) => {
        const ced = document.getElementById(`new-service-${role}-cedula`)?.value.trim() || '';
        const nombre = document.getElementById(`new-service-${role}-nombre`)?.value.trim() || '';

        return {
            nac: document.getElementById(`new-service-${role}-nac`)?.value || 'V',
            cedula: ced,
            nombre: nombre,
            genero: document.getElementById(`new-service-${role}-genero`)?.value || 'M'
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
        invitados: currentGuests // ⚡ Enviamos el arreglo completo
    };
}

async function saveService() {
    hideServiceError();
    const payload = getServicePayload();
    if(!payload) return;

    const roles = ['maestro', 'director', 'lider', 'predicador'];
    for (let r of roles) {
        const p = payload[r];
        if (!p || !p.cedula) continue;
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

    const formData = new FormData();
    formData.append('datos', JSON.stringify(payload)); 
    
    const flyerInput = document.getElementById('new-service-flyer');
    if (flyerInput.files && flyerInput.files.length > 0) {
        formData.append('flyer', flyerInput.files[0]);
    }

    try {
        const response = await fetch('http://localhost:8080/api/servicios/crear', {
            method: 'POST',
            body: formData 
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
        if (!p || !p.cedula) continue;
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
    
    const formData = new FormData();
    formData.append('datos', JSON.stringify(payload));
    
    const flyerInput = document.getElementById('new-service-flyer');
    if (flyerInput.files && flyerInput.files.length > 0) {
        formData.append('flyer', flyerInput.files[0]);
    }
    
    try {
        const response = await fetch(`http://localhost:8080/api/servicios/modificar/${currentEditingPostId}`, {
            method: 'PUT',
            body: formData
        });
        if (response.ok) { toggleModal('modal-nuevo-servicio'); fetchServicios(); }
        else { showServiceError(await response.text()); }
    } catch (e) { showServiceError("Error de conexión."); }
}

function previewFlyer(event) {
    hideServiceError();
    const file = event.target.files[0];
    const container = document.getElementById('flyer-preview-container');
    container.innerHTML = ''; 

    if (!file) {
        container.classList.add('hidden');
        return;
    }

    if (file.size > 31457280) { 
        showServiceError("El archivo es demasiado pesado. El límite máximo es de 30MB.");
        event.target.value = ''; 
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    const url = URL.createObjectURL(file);

    if (file.type.startsWith('video/')) {
        container.innerHTML = `<video src="${url}" class="w-full h-full object-cover bg-black" controls playsinline></video>`;
    } else if (file.type.startsWith('image/')) {
        container.innerHTML = `<img src="${url}" class="w-full h-full object-contain" alt="Flyer preview">`;
    } else {
        showServiceError("Formato no soportado. Sube una imagen o un video.");
        event.target.value = ''; 
        container.classList.add('hidden');
    }
}

async function toggleVisibility(cardKey) {
    const srv = servicesData[cardKey];
    if (!srv) return;
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const nuevoOculto = !srv.hidden;
    try {
        const response = await fetch(`http://localhost:8080/api/servicios/${srv.id}/visibilidad`, {
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oculto: nuevoOculto, solicitante: session.username })
        });
        if (response.ok) {
            srv.hidden = nuevoOculto; 
            renderAllServices(); 
        }
    } catch (e) { console.error("Error visibilidad:", e); }
}

// ⚡ LÓGICA DE FILTRADO EN TIEMPO REAL ⚡
function filterServices() {
    currentPageGrid = 1;
    renderAllServices();
}

function limpiarFiltrosServices() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-state').value = 'Todos';
    document.getElementById('filter-visibility').value = 'Todos';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    filterServices();
}

// --- 🖥️ RENDERIZADO VISUAL ACTUALIZADO ---
function renderAllServices() {
    const grid = document.querySelector('#services-grid'); 
    grid.innerHTML = '';
    
    let paginationContainer = document.getElementById('grid-pagination-controls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'grid-pagination-controls';
        paginationContainer.className = 'max-w-7xl mx-auto mt-8 mb-10 flex justify-center items-center gap-2 col-span-full';
        grid.after(paginationContainer);
    } else {
        paginationContainer.innerHTML = '';
    }

    const session = JSON.parse(localStorage.getItem('iglesia_session')) || {};
    const rolUsuario = session.rol || session.privilegio || '';
    const esPastor = rolUsuario === 3 || rolUsuario === 'Pastor';

    const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const filterState = document.getElementById('filter-state')?.value || 'Todos';
    const filterVisibility = document.getElementById('filter-visibility')?.value || 'Todos';
    const filterDateFrom = document.getElementById('filter-date-from')?.value || '';
    const filterDateTo = document.getElementById('filter-date-to')?.value || '';

    let filteredKeys = Object.keys(servicesData).filter(key => {
        const srv = servicesData[key];
        
        let guestsText = '';
        if (srv.guests && srv.guests.length > 0) {
            guestsText = srv.guests.map(g => `${g.nombre} ${g.apellido} ${g.congregacion}`).join(' ');
        }

        if (searchTerm) {
            const searchString = `${srv.title} ${srv.teacherName} ${srv.directorName} ${srv.leaderName} ${srv.preacherName} ${guestsText}`.toLowerCase();
            if (!searchString.includes(searchTerm)) return false;
        }
        
        if (filterState !== 'Todos') {
            const isRealizada = srv.state === 'Realizada' || srv.state === 'Realizado';
            if (filterState === 'Pendiente' && isRealizada) return false;
            if (filterState === 'Realizado' && !isRealizada) return false;
        }
        
        if (filterVisibility !== 'Todos') {
            if (filterVisibility === 'Visible' && srv.hidden) return false;
            if (filterVisibility === 'Oculto' && !srv.hidden) return false;
        }
        
        if (filterDateFrom || filterDateTo) {
            const serviceDate = new Date(srv.date + 'T00:00:00');
            if (filterDateFrom) {
                const fromDate = new Date(filterDateFrom + 'T00:00:00');
                if (serviceDate < fromDate) return false;
            }
            if (filterDateTo) {
                const toDate = new Date(filterDateTo + 'T00:00:00');
                if (serviceDate > toDate) return false;
            }
        }
        
        return true;
    });

    const sortedKeys = filteredKeys.sort((a, b) => {
        return servicesData[b].id - servicesData[a].id;
    });

    if (sortedKeys.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 ios-shadow">
                <div class="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                    <span class="material-icons-round text-3xl text-slate-400">search_off</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">No se encontraron servicios</h3>
                <p class="text-slate-500 dark:text-slate-400">Prueba ajustando los filtros o el término de búsqueda.</p>
            </div>
        `;
        return;
    }

    const totalPages = Math.ceil(sortedKeys.length / itemsPerPageGrid);
    if (currentPageGrid > totalPages && totalPages > 0) currentPageGrid = totalPages;

    const startIndex = (currentPageGrid - 1) * itemsPerPageGrid;
    const endIndex = startIndex + itemsPerPageGrid;
    const paginatedKeys = sortedKeys.slice(startIndex, endIndex);

    paginatedKeys.forEach(key => {
        const srv = servicesData[key];
        const fechaMostrar = formatDateToES(srv.date);
        const isRealizada = srv.state === 'Realizada' || srv.state === 'Realizado';

        const badgeClass = isRealizada 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
            
        const hiddenBadge = srv.hidden 
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ml-2" title="No visible en Noticias"><span class="material-icons-round text-[10px] mr-1">visibility_off</span>Oculta</span>` 
            : '';
            
        const cardStyle = srv.hidden ? 'opacity-70 grayscale-[0.6] border-red-300 dark:border-red-800' : '';

        let footerHTML = '';
        if (isRealizada) {
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

        let displayMedia = srv.image ? srv.image : srv.flyer; 
        let imageHTML = '';

        if (displayMedia) {
            if (displayMedia.match(/\.(mp4|webm|ogg)$/i)) { 
                imageHTML = `
                    <div class="relative w-full h-full cursor-pointer group-hover:scale-105 transition-transform duration-500" onclick="openMediaModal('${displayMedia}', 'video')">
                        <video src="${displayMedia}" class="w-full h-full object-cover bg-black" playsinline preload="metadata"></video>
                        <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors z-10">
                            <span class="material-icons-round text-white text-5xl drop-shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">play_circle</span>
                        </div>
                    </div>`;
            } else {
                imageHTML = `<img src="${displayMedia}" class="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500" alt="Servicio" onclick="openMediaModal('${displayMedia}', 'image')">`;
            }
        } else {
            imageHTML = `<span class="material-icons-round text-6xl text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform duration-300">church</span>`;
        }

        // ⚡ RENDERIZADO DE INVITADOS MÚLTIPLES ⚡
        let guestHTML = '';
        if (srv.guests && srv.guests.length > 0) {
            const names = srv.guests.map(g => {
                let name = `${g.nombre || ''} ${g.apellido || ''}`.trim();
                if (g.congregacion) name += ` (${g.congregacion})`;
                return name;
            }).join(', ');
            
            guestHTML = `
            <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span class="material-icons-round text-primary text-base mt-0.5">stars</span>
                <span class="font-medium">Invitados: <span class="font-normal text-slate-500 dark:text-slate-400 line-clamp-2" title="${names}">${names}</span></span>
            </div>`;
        }

        let btnModificarHTML = '';
        let btnAccionEstadoHTML = '';

        if (isRealizada) {
            btnModificarHTML = esPastor ? `
                <button onclick="openMarkRealizadaModal('${key}'); toggleCardMenu('menu-${key}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                    <span class="material-icons-round text-slate-400 text-lg">edit</span> Modificar
                </button>
            ` : '';
            btnAccionEstadoHTML = `
                <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left" onclick="revertToPendiente('${key}'); toggleCardMenu('menu-${key}')">
                    <span class="material-icons-round text-slate-400 text-lg">restore</span> Marcar como Pendiente
                </button>
            `;
        } else {
            btnModificarHTML = esPastor ? `
                <button onclick="openEditModal('${key}'); toggleCardMenu('menu-${key}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                    <span class="material-icons-round text-slate-400 text-lg">edit</span> Modificar
                </button>
            ` : '';
            btnAccionEstadoHTML = `
                <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left" onclick="openMarkRealizadaModal('${key}'); toggleCardMenu('menu-${key}')">
                    <span class="material-icons-round text-slate-400 text-lg">check_circle</span> Marcar Realizada
                </button>
            `;
        }

        const newCard = document.createElement('article');
        newCard.className = `bg-white dark:bg-slate-800 rounded-3xl overflow-hidden ios-shadow border border-slate-100 dark:border-slate-700 flex flex-col group hover:border-primary/30 transition-all duration-300 relative ${cardStyle}`;
        newCard.id = key;

        newCard.innerHTML = `
            <div class="absolute top-3 left-3 z-20 flex items-center pointer-events-none">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass} shadow-sm">
                    ${srv.state}
                </span>
                ${hiddenBadge}
            </div>
            <div class="absolute top-3 right-3 z-20">
                <button class="p-1 rounded-full bg-slate-200/80 hover:bg-slate-200 text-slate-700 backdrop-blur-sm transition-colors dark:bg-slate-800/80 dark:text-slate-200 shadow-sm" onclick="toggleCardMenu('menu-${key}')">
                    <span class="material-icons-round text-lg leading-none">more_vert</span>
                </button>
                <div class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 card-menu z-30 overflow-hidden" id="menu-${key}">
                    <div class="py-1">
                        ${btnModificarHTML}
                        <button class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left" onclick="toggleVisibility('${key}'); toggleCardMenu('menu-${key}')">
                            <span class="material-icons-round text-slate-400 text-lg">${srv.hidden ? 'visibility' : 'visibility_off'}</span> ${srv.hidden ? 'Mostrar en Noticias' : 'Ocultar en Noticias'}
                        </button>
                        ${btnAccionEstadoHTML}
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
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">supervisor_account</span>
                        <span class="font-medium">Líder: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.leaderName}</span></span>
                    </div>
                    <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-icons-round text-primary text-base mt-0.5">campaign</span>
                        <span class="font-medium">Predicador: <span class="font-normal text-slate-500 dark:text-slate-400">${srv.preacherName}</span></span>
                    </div>
                    ${guestHTML}
                </div>
                <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between card-footer min-h-[53px]">
                    ${footerHTML}
                </div>
            </div>
        `;
        grid.appendChild(newCard);
    });

    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_left</span>';
        prevBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        prevBtn.disabled = currentPageGrid === 1;
        prevBtn.onclick = () => { if(currentPageGrid > 1) { currentPageGrid--; renderAllServices(); } };
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            pageBtn.className = `w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${currentPageGrid === i ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
            pageBtn.onclick = () => { currentPageGrid = i; renderAllServices(); };
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_right</span>';
        nextBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === totalPages ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        nextBtn.disabled = currentPageGrid === totalPages;
        nextBtn.onclick = () => { if(currentPageGrid < totalPages) { currentPageGrid++; renderAllServices(); } };
        paginationContainer.appendChild(nextBtn);
    }
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

// --- ⚡ LÓGICA DE HISTORIAL DE AUDITORÍA (10 POR PÁGINA) ⚡ ---
function formatDateTimeFull(dateTimeStr) {
    if (!dateTimeStr || dateTimeStr === 'N/A') return '<span class="text-slate-400 italic">--</span>';
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('es-VE', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    } catch (e) { return '--'; }
}

async function openHistoryModal() {
    toggleModal('modal-historial-servicios');
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">Cargando historial...</td></tr>`;
    
    try {
        const response = await fetch(`http://localhost:8080/api/servicios/historial`);
        if (response.ok) {
            historyData = await response.json();
            currentHistoryPage = 1; // Reiniciar a pag 1 al abrir
            renderHistoryTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error al cargar el historial.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Falla de conexión con el servidor.</td></tr>`;
    }
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const pagContainer = document.getElementById('history-pagination');
    tbody.innerHTML = '';
    pagContainer.innerHTML = '';

    if (historyData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No hay acciones registradas.</td></tr>`;
        return;
    }

    const totalPages = Math.ceil(historyData.length / historyItemsPerPage);
    if (currentHistoryPage > totalPages && totalPages > 0) currentHistoryPage = totalPages;

    const startIndex = (currentHistoryPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    const paginatedHistory = historyData.slice(startIndex, endIndex);

    paginatedHistory.forEach(reg => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
        
        let badgeStyle = '';
        if (reg.accion.includes("Creado") || reg.accion.includes("Público")) {
            badgeStyle = "bg-green-100 text-green-700 dark:bg-green-900/30";
        } else if (reg.accion.includes("Realizada")) {
            badgeStyle = "bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-400";
        } else if (reg.accion.includes("Ocultado") || reg.accion.includes("Pendiente")) {
            badgeStyle = "bg-amber-100 text-amber-700 dark:bg-amber-900/30";
        } else {
            badgeStyle = "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300";
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white uppercase">${reg.servicioTitulo}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">${reg.estado}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">${reg.visibilidad}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-[10px] font-bold shadow-sm inline-block px-2 py-0.5 rounded-lg ${badgeStyle} mb-1">${reg.accion}</div>
                <div class="text-xs font-bold text-slate-900 dark:text-white uppercase">${reg.solicitanteNombre}</div>
                <div class="text-[10px] text-slate-500 font-mono">C.I: ${reg.solicitanteCedula}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 font-mono">
                ${formatDateTimeFull(reg.fechaHora)}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Construcción de botones de paginación de historial
    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_left</span>';
        prevBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentHistoryPage === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        prevBtn.disabled = currentHistoryPage === 1;
        prevBtn.onclick = () => { if(currentHistoryPage > 1) { currentHistoryPage--; renderHistoryTable(); } };
        pagContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            pageBtn.className = `w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${currentHistoryPage === i ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
            pageBtn.onclick = () => { currentHistoryPage = i; renderHistoryTable(); };
            pagContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_right</span>';
        nextBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentHistoryPage === totalPages ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        nextBtn.disabled = currentHistoryPage === totalPages;
        nextBtn.onclick = () => { if(currentHistoryPage < totalPages) { currentHistoryPage++; renderHistoryTable(); } };
        pagContainer.appendChild(nextBtn);
    }
}

function openMediaModal(url, type) {
    const container = document.getElementById('media-modal-content');
    container.innerHTML = '';
    
    if (type === 'video' || url.match(/\.(mp4|webm|ogg)$/i)) {
        container.innerHTML = `<video src="${url}" class="max-w-full max-h-[85vh] rounded-xl shadow-2xl outline-none bg-black" controls autoplay playsinline></video>`;
    } else {
        container.innerHTML = `<img src="${url}" class="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-black/50" alt="Vista ampliada">`;
    }
    
    document.getElementById('modal-media').classList.remove('hidden');
}

function closeMediaModal() {
    document.getElementById('modal-media').classList.add('hidden');
    document.getElementById('media-modal-content').innerHTML = '';
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

document.addEventListener('click', function(event) {
    if (!event.target.closest('form')) {
        ocultarTodasSugerencias();
    }
});

function quitarAcentos(cadena) {
    return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatNombreInput(inputElement) {
    let val = inputElement.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.trimStart().replace(/\s{2,}/g, ' '); 
    
    let partes = val.split(' ');
    if (partes.length > 2) val = partes[0] + ' ' + partes[1]; 
    
    inputElement.value = val.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    if (val.endsWith(' ') && partes.length === 1) inputElement.value += " ";
}

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

function buscarStaffPorCedula(role) {
    const inputCedula = document.getElementById(`new-service-${role}-cedula`);
    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query;

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

function seleccionarStaff(est, role) {
    document.getElementById(`new-service-${role}-nac`).value = est.nacionalidad || 'V';
    document.getElementById(`new-service-${role}-cedula`).value = est.cedula || ''; 
    document.getElementById(`new-service-${role}-nombre`).value = `${est.nombre} ${est.apellido}`;
    document.getElementById(`new-service-${role}-genero`).value = est.genero || 'M';
    
    document.getElementById(`new-service-${role}-nombre`).readOnly = true;
    document.getElementById(`new-service-${role}-nac`).disabled = true;
    document.getElementById(`new-service-${role}-genero`).disabled = true;
    
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    document.getElementById(`new-service-${role}-nombre`).classList.add(...clasesBloqueo);
    document.getElementById(`new-service-${role}-nac`).classList.add(...clasesBloqueo);
    document.getElementById(`new-service-${role}-genero`).classList.add(...clasesBloqueo);
    
    ocultarTodasSugerencias();
}

function desbloquearStaff(role) {
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    
    const elNombre = document.getElementById(`new-service-${role}-nombre`);
    const elNac = document.getElementById(`new-service-${role}-nac`);
    const elGenero = document.getElementById(`new-service-${role}-genero`);
    
    elNombre.readOnly = false;
    elNac.disabled = false;
    elGenero.disabled = false;
    
    elNombre.classList.remove(...clasesBloqueo);
    elNac.classList.remove(...clasesBloqueo);
    elGenero.classList.remove(...clasesBloqueo);
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

function openMarkRealizadaModal(cardKey) {
    const srv = servicesData[cardKey];
    if (!srv) return;
    currentEditingPostId = srv.id;
    
    document.getElementById('form-realizada').reset();
    
    const previewElement = document.getElementById('photo-preview-element');
    if (previewElement) previewElement.remove();
    
    const placeholder = document.getElementById('upload-placeholder');
    placeholder.classList.remove('hidden');
    
    const modalTitle = document.getElementById('modal-title-realizada');
    const modalDesc = document.getElementById('modal-desc-realizada');
    const submitBtn = document.getElementById('btn-submit-realizada');
    
    if (srv.state === 'Realizada') {
        modalTitle.innerText = "Modificar Datos";
        modalDesc.innerText = "Actualiza los datos y la evidencia del servicio realizado.";
        submitBtn.innerHTML = `<span class="material-icons-round text-sm">save</span> Guardar Cambios`;
        
        document.getElementById('attendees').value = srv.attendees || '';
        document.getElementById('observations').value = srv.observations || '';
        document.getElementById('news').value = srv.news || '';
        
        if (srv.image) {
            placeholder.classList.add('hidden');
            const container = document.getElementById('realizada-media-container');
            if (srv.image.match(/\.(mp4|webm|ogg)$/i)) {
                container.insertAdjacentHTML('beforeend', `<video id="photo-preview-element" src="${srv.image}" class="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md mx-auto bg-black" controls playsinline></video>`);
            } else {
                container.insertAdjacentHTML('beforeend', `<img id="photo-preview-element" src="${srv.image}" class="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md mx-auto" alt="Vista previa">`);
            }
        }
    } else {
        modalTitle.innerText = "Marcar como Realizada";
        modalDesc.innerText = "Ingresa los detalles finales de la ejecución del servicio.";
        submitBtn.innerHTML = `<span class="material-icons-round text-sm">check_circle</span> Finalizar y Publicar`;
    }
    
    hideRealizadaError(); 
    toggleModal('modal-realizada');
}

function previewImage(event) {
    hideRealizadaError();
    const file = event.target.files[0];
    const placeholder = document.getElementById('upload-placeholder');
    const container = document.getElementById('realizada-media-container');
    
    let previewElement = document.getElementById('photo-preview-element');

    if (!file) {
        return; 
    }

    if (file.size > 31457280) { 
        showRealizadaError("El archivo es demasiado pesado. El límite máximo es de 30MB.");
        event.target.value = ''; 
        if(previewElement) previewElement.remove();
        placeholder.classList.remove('hidden');
        return;
    }

    const url = URL.createObjectURL(file);
    placeholder.classList.add('hidden');
    
    if(previewElement) previewElement.remove();

    if (file.type.startsWith('video/')) {
        container.insertAdjacentHTML('beforeend', `<video id="photo-preview-element" src="${url}" class="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md mx-auto bg-black" controls playsinline></video>`);
    } else if (file.type.startsWith('image/')) {
        container.insertAdjacentHTML('beforeend', `<img id="photo-preview-element" src="${url}" class="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md mx-auto" alt="Vista previa">`);
    } else {
        showRealizadaError("Formato no soportado. Sube una imagen o un video.");
        event.target.value = ''; 
        placeholder.classList.remove('hidden');
    }
}

function revertToPendiente(cardKey) {
    const srv = servicesData[cardKey];
    if (!srv) return;
    
    serviceToRevertId = srv.id;
    toggleModal('modal-confirm-revert');
}

async function confirmRevertToPendiente() {
    if (!serviceToRevertId) return;

    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    try {
        const response = await fetch(`http://localhost:8080/api/servicios/pendiente/${serviceToRevertId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solicitante: session.username })
        });
        
        if (response.ok) {
            toggleModal('modal-confirm-revert');
            serviceToRevertId = null; 
            fetchServicios(); 
        } else {
            const err = await response.text();
            alert(err || "Error al cambiar de estado.");
            toggleModal('modal-confirm-revert');
        }
    } catch (e) { 
        alert("Error de conexión con el servidor."); 
        toggleModal('modal-confirm-revert');
    }
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

    const srv = servicesData[`card-${currentEditingPostId}`];
    const photoInput = document.getElementById('photo-upload');

    if ((!srv || !srv.image) && (!photoInput.files || photoInput.files.length === 0)) {
        showRealizadaError("La evidencia del servicio es obligatoria. Por favor, sube una imagen o video.");
        return;
    }

    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const formData = new FormData();
    formData.append('asistentes', asistentes);
    formData.append('observaciones', document.getElementById('observations').value);
    formData.append('novedades', document.getElementById('news').value);
    formData.append('solicitante', session.username);
    
    if (photoInput.files && photoInput.files.length > 0) {
        formData.append('foto', photoInput.files[0]); 
    }

    try {
        const response = await fetch(`http://localhost:8080/api/servicios/completar/${currentEditingPostId}`, {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            toggleModal('modal-realizada');
            fetchServicios();
        } else {
            const err = await response.text();
            showRealizadaError(err || "Error al actualizar el servicio.");
        }
    } catch (e) { 
        showRealizadaError("Error de conexión con el servidor."); 
    }
}