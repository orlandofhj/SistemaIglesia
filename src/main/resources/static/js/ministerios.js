// --- Lógica Dinámica para Gestión de Ministerios ---

let ministriesData = {}; 
let staffDB = []; 
let currentEditingId = null; 
let currentMembers = []; 

// ⚡ VARIABLES DE PAGINACIÓN: CUADRÍCULA PRINCIPAL
let currentPageGrid = 1;
const itemsPerPageGrid = 6;

// ⚡ VARIABLES DE PAGINACIÓN: HISTORIAL GLOBAL
let historyData = [];
let currentHistoryPage = 1;
const historyItemsPerPage = 10;

// ⚡ VARIABLES DE PAGINACIÓN: HISTORIAL DE EQUIPO
let teamHistoryData = [];
let currentTeamHistoryPage = 1;
const teamHistoryItemsPerPage = 10;

window.addEventListener('DOMContentLoaded', () => {
    fetchMinisterios();
    fetchStaffGlobal(); 
});

async function fetchMinisterios() {
    try {
        const response = await fetch('http://localhost:8080/api/ministerios/todos');
        if (response.ok) {
            const data = await response.json();
            ministriesData = {};
            data.forEach(min => {
                ministriesData[`min-${min.id}`] = {
                    id: min.id,
                    name: min.nombre,
                    activo: min.activo !== false, 
                    responsable: min.responsable || "Sin asignar", 
                    members: min.integrantes || [],
                    historialEstados: min.historialEstados || []
                };
            });
            renderAllMinistries();
        }
    } catch (error) { console.error("Error cargando ministerios:", error); }
}

async function fetchStaffGlobal() {
    try {
        const response = await fetch('http://localhost:8080/api/usuarios/todos');
        if (response.ok) staffDB = await response.json();
    } catch (error) { console.error("Error cargando personal:", error); }
}

// --- ⚡ LÓGICA DE HISTORIAL DE ESTADOS (GLOBAL) CON PAGINACIÓN ⚡ ---

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr || dateTimeStr === 'N/A') return '<span class="text-slate-400 italic">--</span>';
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('es-VE', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    } catch (e) { return '--'; }
}

function openHistoryModal() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    let allHistory = [];
    Object.keys(ministriesData).forEach(key => {
        const min = ministriesData[key];
        if (min.historialEstados) {
            min.historialEstados.forEach(h => {
                allHistory.push({
                    name: min.name,
                    accion: h.accion,
                    fechaHora: h.fechaHora
                });
            });
        }
    });

    historyData = allHistory.sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
    currentHistoryPage = 1;
    
    renderHistoryTable();
    toggleModal('modal-historial');
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const pagContainer = document.getElementById('history-pagination');
    tbody.innerHTML = '';
    if (pagContainer) pagContainer.innerHTML = '';

    if (historyData.length === 0) {
         tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">No hay movimientos registrados.</td></tr>`;
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
        if (reg.accion.includes("Creado") || reg.accion.includes("Activado")) {
            badgeStyle = "bg-green-100 text-green-700 dark:bg-green-900/30";
        } else if (reg.accion.includes("Inactivado")) {
            badgeStyle = "bg-red-100 text-red-700 dark:bg-red-900/30";
        } else {
            badgeStyle = "bg-blue-100 text-primary dark:bg-blue-900/30";
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <span class="material-icons-round text-sm">history</span>
                    </div>
                    <span class="font-bold text-slate-900 dark:text-white uppercase text-xs">${reg.name}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm ${badgeStyle}">${reg.accion}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 font-mono">
                ${formatDateTime(reg.fechaHora)}
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalPages > 1 && pagContainer) {
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

// --- ⚡ LÓGICA DE HISTORIAL DEL EQUIPO (CON PAGINACIÓN) ⚡ ---

async function openTeamHistoryModal(minId, minName) {
    document.getElementById('team-history-title').innerText = `Historial: ${minName}`;
    const tbody = document.getElementById('team-history-body');
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">Cargando historial...</td></tr>`;
    
    toggleModal('modal-historial-equipo');

    try {
        const response = await fetch(`http://localhost:8080/api/ministerios/${minId}/historial`);
        if (response.ok) {
            teamHistoryData = await response.json();
            currentTeamHistoryPage = 1;
            renderTeamHistoryTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Error al cargar el historial.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Falla de conexión con el servidor.</td></tr>`;
    }
}

function renderTeamHistoryTable() {
    const tbody = document.getElementById('team-history-body');
    const pagContainer = document.getElementById('team-history-pagination');
    tbody.innerHTML = '';
    if (pagContainer) pagContainer.innerHTML = '';
    
    if (teamHistoryData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">No hay movimientos registrados en este equipo.</td></tr>`;
        return;
    }

    const totalPages = Math.ceil(teamHistoryData.length / teamHistoryItemsPerPage);
    if (currentTeamHistoryPage > totalPages && totalPages > 0) currentTeamHistoryPage = totalPages;

    const startIndex = (currentTeamHistoryPage - 1) * teamHistoryItemsPerPage;
    const endIndex = startIndex + teamHistoryItemsPerPage;
    const paginatedTeamHistory = teamHistoryData.slice(startIndex, endIndex);

    paginatedTeamHistory.forEach(reg => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors";
        
        let badgeEstado = '';
        if (reg.estado.includes("Descartado")) {
            badgeEstado = `<span class="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 rounded-lg text-[10px] font-bold shadow-sm">${reg.estado}</span>`;
        } else {
            badgeEstado = `<span class="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 rounded-lg text-[10px] font-bold shadow-sm">${reg.estado}</span>`;
        }
        
        const isMinor = reg.cedula === 'MENOR' || reg.cedula === '0';
        const cedulaDisplay = isMinor ? 
            `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 rounded-lg text-[10px] font-bold">N/C</span>` : 
            `<span class="font-mono">${reg.cedula}</span>`;

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white uppercase">${reg.nombre}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">${cedulaDisplay}</td>
            <td class="px-6 py-4 whitespace-nowrap">${badgeEstado}</td>
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 font-mono">${formatDateTime(reg.fechaHora)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (totalPages > 1 && pagContainer) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_left</span>';
        prevBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentTeamHistoryPage === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        prevBtn.disabled = currentTeamHistoryPage === 1;
        prevBtn.onclick = () => { if(currentTeamHistoryPage > 1) { currentTeamHistoryPage--; renderTeamHistoryTable(); } };
        pagContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            pageBtn.className = `w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${currentTeamHistoryPage === i ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
            pageBtn.onclick = () => { currentTeamHistoryPage = i; renderTeamHistoryTable(); };
            pagContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_right</span>';
        nextBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentTeamHistoryPage === totalPages ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        nextBtn.disabled = currentTeamHistoryPage === totalPages;
        nextBtn.onclick = () => { if(currentTeamHistoryPage < totalPages) { currentTeamHistoryPage++; renderTeamHistoryTable(); } };
        pagContainer.appendChild(nextBtn);
    }
}


// --- ⚡ LÓGICA DEL MODAL Y FORMULARIO ⚡ ---

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        hideError();
    } else {
        modal.classList.add('hidden');
    }
}

function showError(msg) {
    const errorDiv = document.getElementById('error-msg');
    const errorText = document.getElementById('error-text');
    if (errorDiv && errorText) {
        errorText.innerText = msg;
        errorDiv.classList.remove('hidden');
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-msg');
    if (errorDiv) errorDiv.classList.add('hidden');
}

function resetMinistryForm() {
    document.getElementById('form-ministerio').reset();
    currentEditingId = null;
    currentMembers = [];
    desbloquearLiderazgo('responsable');
    
    const minorCheck = document.getElementById('add-member-minor');
    minorCheck.checked = false;
    minorCheck.disabled = false;
    toggleMinorMode();
    toggleCedulaMode();
    renderMembersTable();
    hideError();
}

function openCreateModal() {
    resetMinistryForm();
    document.getElementById('modal-title').innerText = "Nuevo Ministerio";
    toggleModal('modal-ministerio');
}

async function openEditModal(cardKey) {
    const min = ministriesData[cardKey];
    if (!min) return;
    
    resetMinistryForm();
    currentEditingId = min.id;
    document.getElementById('modal-title').innerText = `Editar: ${min.name}`;
    document.getElementById('min-nombre').value = min.name;

    currentMembers = min.members.map(m => ({
        nombre: m.nombre,
        cedula: m.cedula === 'MENOR' ? '0' : m.cedula,
        nac: 'V' 
    }));
    renderMembersTable();

    if(min.responsable && min.responsable !== "Sin asignar") {
        const encontrado = staffDB.find(e => (e.nombre + " " + e.apellido).toUpperCase() === min.responsable.toUpperCase());
        if(encontrado) seleccionarLiderazgo(encontrado, 'responsable');
    }

    toggleModal('modal-ministerio');
}

function desbloquearLiderazgo(role) {
    const prefix = 'res';
    const inputNombre = document.getElementById(`min-${prefix}-nombre`);
    const selectNac = document.getElementById(`min-${prefix}-nac`);
    const inputCedula = document.getElementById(`min-${prefix}-cedula`);

    if(inputNombre) {
        inputNombre.readOnly = false;
        inputNombre.classList.remove('bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed');
        inputNombre.value = '';
    }
    if(selectNac) selectNac.disabled = false;
    if(inputCedula) inputCedula.value = '';
}

function buscarLiderazgo(role) {
    const prefix = 'res';
    const inputCedula = document.getElementById(`min-${prefix}-cedula`);
    
    let val = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = val;

    if (val.length === 0) {
        desbloquearLiderazgo(role);
    }

    const suggBox = document.getElementById(`sugg-${role}`);
    suggBox.innerHTML = '';

    if (val.length < 1) { suggBox.classList.add('hidden'); return; }

    const resultados = staffDB.filter(e => e.estado !== 'Sin Registro' && e.cedula && e.cedula.toString().startsWith(val));
    mostrarSugerenciasLider(resultados, role, suggBox);
}

function buscarLiderazgoNombre(role) {
    const prefix = 'res';
    const inputNombre = document.getElementById(`min-${prefix}-nombre`);
    if(inputNombre.readOnly) return; 

    formatNombreInput(inputNombre); 
    const query = inputNombre.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const suggBox = document.getElementById(`sugg-${role}`);
    suggBox.innerHTML = '';
    if (query.length < 1) { suggBox.classList.add('hidden'); return; }

    const resultados = staffDB.filter(e => {
        if(e.estado === 'Sin Registro') return false;
        const nombreNorm = (e.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const apellidoNorm = (e.apellido || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return nombreNorm.startsWith(query) || apellidoNorm.startsWith(query);
    });

    mostrarSugerenciasLider(resultados, role, suggBox);
}

function mostrarSugerenciasLider(resultados, role, suggBox) {
    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            div.innerHTML = `<span class="font-bold text-primary dark:text-blue-400">${est.nacionalidad || 'V'}-${est.cedula}</span> <span class="text-xs text-slate-500 font-bold uppercase">${est.nombre} ${est.apellido}</span>`;
            div.onclick = () => seleccionarLiderazgo(est, role);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else {
        suggBox.classList.add('hidden');
    }
}

function seleccionarLiderazgo(est, role) {
    const prefix = 'res';
    document.getElementById(`min-${prefix}-cedula`).value = est.cedula; 
    document.getElementById(`min-${prefix}-nac`).value = est.nacionalidad || 'V';
    
    const inputNombre = document.getElementById(`min-${prefix}-nombre`);
    inputNombre.value = `${est.nombre} ${est.apellido}`;
    
    inputNombre.readOnly = true;
    document.getElementById(`min-${prefix}-nac`).disabled = true;
    inputNombre.classList.add('bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed');
    
    document.getElementById(`sugg-${role}`).classList.add('hidden');
}

function buscarIntegranteNombre() {
    const inputNombre = document.getElementById('add-member-name');
    formatNombreInput(inputNombre);
    const query = inputNombre.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const suggBox = document.getElementById('sugg-integrante');
    suggBox.innerHTML = '';

    if (query.length < 1) { suggBox.classList.add('hidden'); return; }

    const resultados = staffDB.filter(e => {
        const nombreNorm = (e.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const apellidoNorm = (e.apellido || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return nombreNorm.startsWith(query) || apellidoNorm.startsWith(query);
    });

    mostrarSugerenciasIntegrante(resultados, suggBox);
}

function buscarIntegranteCedula() {
    const inputCedula = document.getElementById('add-member-cedula');
    let val = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = val;
    
    toggleCedulaMode(); 

    const suggBox = document.getElementById('sugg-integrante-ced');
    if (!suggBox) return;
    suggBox.innerHTML = '';
    
    if (val.length < 1) { suggBox.classList.add('hidden'); return; }

    const resultados = staffDB.filter(e => e.cedula && e.cedula.toString().startsWith(val));
    mostrarSugerenciasIntegrante(resultados, suggBox);
}

function mostrarSugerenciasIntegrante(resultados, suggBox) {
    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            const colorClass = est.estado === 'Sin Registro' ? 'text-green-500' : 'text-primary';
            div.innerHTML = `<span class="font-bold ${colorClass}">${est.nacionalidad || 'V'}-${est.cedula || 'N/C'}</span> <span class="text-xs text-slate-500 font-bold uppercase">${est.nombre} ${est.apellido}</span>`;
            div.onclick = () => {
                document.getElementById('add-member-name').value = `${est.nombre} ${est.apellido}`;
                document.getElementById('add-member-cedula').value = est.cedula || '';
                toggleCedulaMode();
                suggBox.classList.add('hidden');
                
                document.getElementById('sugg-integrante').classList.add('hidden');
                if(document.getElementById('sugg-integrante-ced')) document.getElementById('sugg-integrante-ced').classList.add('hidden');
            };
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { suggBox.classList.add('hidden'); }
}

function toggleCedulaMode() {
    const cedulaInput = document.getElementById('add-member-cedula');
    const minorCheck = document.getElementById('add-member-minor');
    const label = document.getElementById('add-member-minor-label');
    
    cedulaInput.value = cedulaInput.value.replace(/\D/g, '').substring(0, 8);

    if (cedulaInput.value.length > 0) {
        minorCheck.checked = false;
        minorCheck.disabled = true;
        label.classList.add('opacity-50');
    } else {
        minorCheck.disabled = false;
        label.classList.remove('opacity-50');
    }
}

function toggleMinorMode() {
    const isMinor = document.getElementById('add-member-minor').checked;
    const cedulaInput = document.getElementById('add-member-cedula');
    if (isMinor) {
        cedulaInput.value = '';
        cedulaInput.disabled = true;
        cedulaInput.classList.add('bg-slate-100', 'dark:bg-slate-700/50', 'cursor-not-allowed');
        cedulaInput.placeholder = "No requerida";
    } else {
        cedulaInput.disabled = false;
        cedulaInput.classList.remove('bg-slate-100', 'dark:bg-slate-700/50', 'cursor-not-allowed');
        cedulaInput.placeholder = "Cédula (Opc)";
    }
}

function addMemberToList() {
    hideError();
    const nameInput = document.getElementById('add-member-name');
    const cedulaInput = document.getElementById('add-member-cedula');
    const isMinor = document.getElementById('add-member-minor').checked;
    const resCedula = document.getElementById('min-res-cedula').value.trim();

    const nombre = nameInput.value.trim();
    const cedula = cedulaInput.value.trim();

    if (!nombre) { showError("El nombre del integrante es obligatorio."); return; }
    if (!isMinor && !cedula) { showError("Ingresa una cédula o marca 'No Cedulado'."); return; }

    if (!isMinor && cedula === resCedula && resCedula !== "") {
        showError("El Responsable no puede ser agregado también como integrante del equipo.");
        return;
    }

    const exists = currentMembers.some(m => m.cedula !== '0' && m.cedula === cedula);
    if(exists) { showError("Esta persona ya está en la lista de integrantes."); return; }

    currentMembers.push({ nombre: nombre, cedula: isMinor ? "0" : cedula, nac: "V" });

    nameInput.value = '';
    cedulaInput.value = '';
    document.getElementById('add-member-minor').checked = false;
    toggleMinorMode();
    toggleCedulaMode();
    renderMembersTable();
    nameInput.focus();
}

function removeMember(index) {
    currentMembers.splice(index, 1);
    renderMembersTable();
}

function renderMembersTable() {
    const tbody = document.getElementById('member-list-body');
    tbody.innerHTML = '';
    if (currentMembers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-sm text-slate-500">No hay integrantes agregados aún.</td></tr>`;
        return;
    }
    currentMembers.forEach((m, index) => {
        const isMinor = m.cedula === '0' || parseInt(m.cedula) < 0;
        const cedulaDisplay = isMinor ? 
            `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 rounded-lg text-[10px] font-bold">NO CEDULADO</span>` : 
            `<span class="font-mono text-slate-600 dark:text-slate-300 text-xs">${m.nac}-${m.cedula}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white uppercase">${m.nombre}</td>
            <td class="px-4 py-2 whitespace-nowrap">${cedulaDisplay}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right">
                <button type="button" onclick="removeMember(${index})" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors">
                    <span class="material-icons-round text-sm">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function saveMinistry() {
    hideError();
    const nombre = document.getElementById('min-nombre').value.trim();
    const resCedula = document.getElementById('min-res-cedula').value.trim();

    if (!nombre) { showError("La denominación es obligatoria."); return; }
    if (!resCedula) { showError("Debes asignar un Responsable con cuenta."); return; }

    const isResponsableInMembers = currentMembers.some(m => m.cedula === resCedula);
    if (isResponsableInMembers) {
        showError("El Responsable no puede estar en la lista de integrantes. Por favor elimínalo de la tabla.");
        return;
    }

    const payload = {
        id: currentEditingId,
        nombre: nombre,
        id_responsable: resCedula,
        integrantes: currentMembers
    };

    try {
        const response = await fetch('http://localhost:8080/api/ministerios/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            toggleModal('modal-ministerio');
            fetchMinisterios(); 
        } else {
            showError(await response.text());
        }
    } catch (error) { showError("Error de conexión con el servidor."); }
}

// --- 🖥️ RENDERIZADO DE LA CUADRÍCULA CON PAGINACIÓN (6 TARJETAS) 🖥️ ---
function renderAllMinistries() {
    const grid = document.getElementById('ministry-grid');
    grid.innerHTML = '';
    
    let paginationContainer = document.getElementById('grid-pagination-controls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'grid-pagination-controls';
        paginationContainer.className = 'max-w-7xl mx-auto mt-8 mb-10 flex justify-center items-center gap-2';
        grid.after(paginationContainer);
    } else {
        paginationContainer.innerHTML = '';
    }

    const session = JSON.parse(localStorage.getItem('iglesia_session')) || {};
    const rolUsuario = session.rol || session.privilegio || '';
    const esPastor = rolUsuario === 3 || rolUsuario === 'Pastor';

    const sortedKeys = Object.keys(ministriesData).sort((a, b) => ministriesData[a].id - ministriesData[b].id);

    const totalPages = Math.ceil(sortedKeys.length / itemsPerPageGrid);
    if (currentPageGrid > totalPages && totalPages > 0) currentPageGrid = totalPages;

    const startIndex = (currentPageGrid - 1) * itemsPerPageGrid;
    const endIndex = startIndex + itemsPerPageGrid;
    const paginatedKeys = sortedKeys.slice(startIndex, endIndex);

    paginatedKeys.forEach(key => {
        const min = ministriesData[key];
        const memberCount = min.members.length;
        
        let membersHTML = '';
        if(memberCount === 0) {
            membersHTML = `<span class="text-xs text-slate-400 italic">Sin integrantes</span>`;
        } else {
            const top2 = min.members.slice(0, 2);
            membersHTML = top2.map(m => `<span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-600 truncate max-w-[120px]">${m.nombre}</span>`).join('');
            if (memberCount > 2) {
                const safeMembers = encodeURIComponent(JSON.stringify(min.members));
                membersHTML += `<button onclick="showMemberDetails('${min.name}', '${safeMembers}')" class="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-blue-400 text-xs font-bold rounded-full border border-primary/20 transition-colors cursor-pointer">+${memberCount - 2} más</button>`;
            }
        }

        const opacityClass = min.activo ? "" : "opacity-60 grayscale-[0.6] border-red-300 dark:border-red-900";
        const statusBadge = min.activo 
            ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 rounded-full text-[10px] font-bold shadow-sm">ACTIVO</span>'
            : '<span class="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 rounded-full text-[10px] font-bold shadow-sm">INACTIVO</span>';

        const btnHistorialEquipoHTML = esPastor ? `
            <button onclick="openTeamHistoryModal('${min.id}', '${min.name}'); toggleCardMenu('menu-${key}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                <span class="material-icons-round text-slate-400 text-lg">manage_search</span> Historial del Equipo
            </button>
        ` : '';

        const card = document.createElement('article');
        card.className = `bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 relative group transition-all hover:border-primary/30 ${opacityClass}`;
        card.innerHTML = `
            <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button class="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-primary rounded-xl transition-colors" onclick="toggleCardMenu('menu-${key}')">
                    <span class="material-icons-round text-sm">more_vert</span>
                </button>
                <div class="hidden absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 card-menu z-30 overflow-hidden" id="menu-${key}">
                    <div class="py-1">
                        <button onclick="toggleMinistryStatus(${min.id}, ${min.activo}); toggleCardMenu('menu-${key}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                            <span class="material-icons-round text-slate-400 text-lg">${min.activo ? 'pause_circle' : 'play_circle'}</span> ${min.activo ? 'Inactivar' : 'Activar'}
                        </button>
                        <button onclick="openEditModal('${key}'); toggleCardMenu('menu-${key}')" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left">
                            <span class="material-icons-round text-slate-400 text-lg">edit</span> Editar Ministerio
                        </button>
                        ${btnHistorialEquipoHTML}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4 mb-6 relative">
                <div class="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary shrink-0 relative">
                    <span class="material-icons-round text-2xl">diversity_3</span>
                    <div class="absolute -bottom-2 -right-4 z-10">${statusBadge}</div>
                </div>
                <div>
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white leading-tight">${min.name}</h3>
                    <p class="text-xs text-slate-500">${memberCount} Integrantes</p>
                </div>
            </div>
            <div class="space-y-4">
                <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Directiva</p>
                    <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <span class="material-icons-round text-xs text-primary">shield</span>
                        <span class="font-medium">Responsable: <span class="font-normal text-slate-500 dark:text-slate-400">${min.responsable}</span></span>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-2">Equipo</p>
                    <div class="flex flex-wrap gap-2 items-center">${membersHTML}</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_left</span>';
        prevBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        prevBtn.disabled = currentPageGrid === 1;
        prevBtn.onclick = () => { if(currentPageGrid > 1) { currentPageGrid--; renderAllMinistries(); } };
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            pageBtn.className = `w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${currentPageGrid === i ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
            pageBtn.onclick = () => { currentPageGrid = i; renderAllMinistries(); };
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_right</span>';
        nextBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === totalPages ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        nextBtn.disabled = currentPageGrid === totalPages;
        nextBtn.onclick = () => { if(currentPageGrid < totalPages) { currentPageGrid++; renderAllMinistries(); } };
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

function showMemberDetails(ministryName, encodedMembers) {
    const members = JSON.parse(decodeURIComponent(encodedMembers));
    document.getElementById('detail-ministry-name').innerText = ministryName;
    const container = document.getElementById('detail-members-list');
    container.innerHTML = '';
    members.forEach(m => {
        const isMinor = m.cedula === 'MENOR' || m.cedula === '0';
        const cedulaDisplay = isMinor ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 rounded-lg text-[10px] font-bold">NO CEDULADO</span>` : m.cedula;
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700 last:border-0";
        div.innerHTML = `<div><p class="text-sm font-bold uppercase text-slate-900 dark:text-white">${m.nombre}</p><p class="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">${cedulaDisplay}</p></div><span class="material-icons-round text-slate-300 dark:text-slate-600">person</span>`;
        container.appendChild(div);
    });
    toggleModal('modal-detalles-integrantes');
}

function formatNombreInput(input) {
    let val = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.replace(/\b\w/g, l => l.toUpperCase());
    input.value = val;
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('form') && !e.target.closest('.card-menu') && !e.target.closest('button')) {
        document.querySelectorAll('[id^="sugg-"]').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.card-menu').forEach(el => el.classList.add('hidden'));
    }
});

async function toggleMinistryStatus(id, currentStatus) {
    try {
        const response = await fetch(`http://localhost:8080/api/ministerios/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: !currentStatus })
        });
        if (response.ok) fetchMinisterios();
    } catch (error) { console.error("Error al cambiar estado:", error); }
}