// --- Lógica Dinámica para Gestión de Ministerios ---

let ministriesData = {}; 
let staffDB = []; 
let currentEditingId = null; 
let currentMembers = []; // Arreglo temporal para la tabla del modal

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
                    activo: min.activo !== false, // ⚡ Se agrega el estado
                    responsable: min.responsable || "Sin asignar", 
                    members: min.integrantes || []
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
    
    // Reset Integrantes
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

// --- ⚡ BÚSQUEDA DE RESPONSABLE (SOLO CON CUENTA) ⚡ ---

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

// --- ⚡ GESTIÓN DE INTEGRANTES (SUGERENCIAS Y VALIDACIONES) ⚡ ---

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
    
    toggleCedulaMode(); // Bloquea el checkbox de "No Cedulado"

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
                
                // Por seguridad ocultamos ambas cajas de sugerencia de integrantes
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

    // ⚡ SEGURIDAD: El Responsable no puede ser Integrante
    if (!isMinor && cedula === resCedula && resCedula !== "") {
        showError("El Responsable no puede ser agregado también como integrante del equipo.");
        return;
    }

    const exists = currentMembers.some(m => m.cedula !== '0' && m.cedula === cedula);
    if(exists) { showError("Esta persona ya está en la lista de integrantes."); return; }

    currentMembers.push({ nombre: nombre, cedula: isMinor ? "0" : cedula, nac: "V" });

    // Resetear campos
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

// --- ⚡ GUARDAR Y ENVIAR AL SERVIDOR ⚡ ---

async function saveMinistry() {
    hideError();
    const nombre = document.getElementById('min-nombre').value.trim();
    const resCedula = document.getElementById('min-res-cedula').value.trim();

    if (!nombre) { showError("La denominación es obligatoria."); return; }
    if (!resCedula) { showError("Debes asignar un Responsable con cuenta."); return; }

    // ⚡ SEGURIDAD EXTRA: Por si agregaron al integrante antes de seleccionar al responsable
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

// --- 🖥️ RENDERIZADO VISUAL 🖥️ ---

function renderAllMinistries() {
    const container = document.getElementById('ministry-grid');
    container.innerHTML = '';

    Object.keys(ministriesData).forEach(key => {
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

        // ⚡ LÓGICA VISUAL DE INACTIVO
        const opacityClass = min.activo ? "" : "opacity-60 grayscale-[0.6] border-red-300 dark:border-red-900";
        const statusBadge = min.activo 
            ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 rounded-full text-[10px] font-bold shadow-sm">ACTIVO</span>'
            : '<span class="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 rounded-full text-[10px] font-bold shadow-sm">INACTIVO</span>';

        const card = document.createElement('article');
        card.className = `bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 relative group transition-all hover:border-primary/30 ${opacityClass}`;
        card.innerHTML = `
            <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onclick="toggleMinistryStatus(${min.id}, ${min.activo})" class="p-2 ${min.activo ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} rounded-xl transition-colors" title="${min.activo ? 'Inactivar' : 'Activar'}">
                    <span class="material-icons-round text-sm">${min.activo ? 'pause_circle' : 'play_circle'}</span>
                </button>
                <button onclick="openEditModal('${key}')" class="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-primary rounded-xl transition-colors">
                    <span class="material-icons-round text-sm">edit</span>
                </button>
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
        container.appendChild(card);
    });
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

// Ocultar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('form')) {
        document.querySelectorAll('[id^="sugg-"]').forEach(el => el.classList.add('hidden'));
    }
});

// ⚡ NUEVA FUNCIÓN PARA CAMBIAR ESTADO
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