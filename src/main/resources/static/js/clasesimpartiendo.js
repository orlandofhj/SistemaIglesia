// ============================================================================
// GESTIÓN DE CLASES IMPARTIENDO
// ============================================================================

let staffDB = []; 
let bloquesDB = []; 
let estudiantesMatriculados = [];
let clasesDB = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchAcademicYear();
    fetchBloques();
    fetchStaffGlobal();
    loadClases(); 
});

// ============================================================================
// SISTEMA DE NOTIFICACIONES
// ============================================================================
function showNotification(title, message, type = 'info') {
    const modal = document.getElementById('notification-modal');
    const titleEl = document.getElementById('notif-title');
    const msgEl = document.getElementById('notif-message');
    const iconEl = document.getElementById('notif-icon');
    const iconContainer = document.getElementById('notif-icon-container');
    const btn = document.getElementById('notif-btn');

    titleEl.innerText = title;
    msgEl.innerText = message;

    iconContainer.className = 'mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-5';
    btn.className = 'w-full py-3.5 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg';

    if (type === 'success') {
        iconEl.innerText = 'check_circle';
        iconContainer.classList.add('bg-green-100', 'dark:bg-green-900/30', 'text-green-600', 'dark:text-green-400');
        btn.classList.add('bg-green-600', 'hover:bg-green-700', 'shadow-green-500/20');
    } else if (type === 'error' || type === 'warning') {
        iconEl.innerText = type === 'error' ? 'error_outline' : 'warning_amber';
        iconContainer.classList.add('bg-red-100', 'dark:bg-red-900/30', 'text-red-600', 'dark:text-red-400');
        btn.classList.add('bg-red-600', 'hover:bg-red-700', 'shadow-red-500/20');
    } else {
        iconEl.innerText = 'info';
        iconContainer.classList.add('bg-blue-100', 'dark:bg-blue-900/30', 'text-blue-600', 'dark:text-blue-400');
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'shadow-blue-500/20');
    }
    modal.classList.remove('hidden');
}

function closeNotification() {
    document.getElementById('notification-modal').classList.add('hidden');
}

// ============================================================================
// CARGA INICIAL
// ============================================================================
async function fetchAcademicYear() {
    const yearDisplay = document.getElementById('current-academic-year');
    if (yearDisplay) {
        const currentYear = new Date().getFullYear(); 
        yearDisplay.textContent = currentYear;
    }
}

async function fetchBloques() {
    try {
        const res = await fetch('/api/bloques/todos'); 
        if (res.ok) {
            bloquesDB = await res.json();
            const select = document.getElementById('class-block');
            select.innerHTML = '<option value="">Seleccione un bloque...</option>';
            bloquesDB.forEach(b => select.innerHTML += `<option value="${b.idBloque}">${b.denominacion}</option>`);
        }
    } catch (e) { console.error("Error bloques:", e); }
}

async function fetchStaffGlobal() {
    try {
        const res = await fetch('/api/usuarios/todos'); 
        if (res.ok) {
            staffDB = await res.json(); 
        }
    } catch (e) { console.error("Error al cargar staff:", e); }
}

// ============================================================================
// UTILIDADES
// ============================================================================
function quitarAcentos(cadena) { return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

function formatNombreInput(inputElement) {
    let val = inputElement.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.trimStart().replace(/\s{2,}/g, ' '); 
    let partes = val.split(' ');
    if (partes.length > 2) val = partes[0] + ' ' + partes[1]; 
    inputElement.value = val.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    if (val.endsWith(' ') && partes.length === 1) inputElement.value += " ";
}

function ocultarTodasSugerencias(excepcionId = '') {
    document.querySelectorAll('[id^="sugg-"]').forEach(box => {
        if(box.id !== excepcionId) box.classList.add('hidden');
    });
}

document.addEventListener('click', function(event) {
    if (!event.target.closest('form')) ocultarTodasSugerencias();
});

// ============================================================================
// AUTOCOMPLETADO: INSTRUCTOR
// ============================================================================
function buscarInstructorPorCedula() {
    const inputCedula = document.getElementById('inst-cedula');
    if (inputCedula.readOnly) return; // Bloquear si el modal está en solo lectura

    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query; 

    if (query === "") {
        document.getElementById('inst-nombre').value = ''; 
        document.getElementById('inst-id').value = '';
        desbloquearInstructor();
        ocultarTodasSugerencias();
        return;
    }

    const suggBox = document.getElementById('sugg-inst-cedula');
    suggBox.innerHTML = '';
    
    const resultados = staffDB.filter(e => 
        e.cedula && 
        e.cedula.toString().startsWith(query) &&
        e.rol === 'Pastor' && 
        e.estado === 'Activo'
    );

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            div.innerHTML = `<span class="font-bold text-emerald-600 dark:text-emerald-400">${est.nacionalidad || 'V'}-${est.cedula}</span> <span class="text-xs text-slate-500 font-bold uppercase">${est.nombre} ${est.apellido}</span>`;
            div.onclick = () => seleccionarInstructor(est);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { 
        suggBox.innerHTML = '<div class="px-4 py-3 text-[11px] text-red-500 text-center font-bold uppercase tracking-wider">No se encontraron Pastores activos.</div>';
        suggBox.classList.remove('hidden');
    }
}

function buscarInstructorPorNombre() {
    const inputNombre = document.getElementById('inst-nombre');
    if(inputNombre.readOnly) return; 

    const query = quitarAcentos(inputNombre.value.toLowerCase().trim());
    const suggBox = document.getElementById('sugg-inst-nombre');
    suggBox.innerHTML = '';
    ocultarTodasSugerencias(suggBox.id);

    if (query.length < 1) { suggBox.classList.add('hidden'); return; }

    const resultados = staffDB.filter(e => {
        if (e.rol !== 'Pastor' || e.estado !== 'Activo') return false; 
        const nNorm = quitarAcentos((e.nombre || '').toLowerCase());
        const aNorm = quitarAcentos((e.apellido || '').toLowerCase());
        return nNorm.startsWith(query) || aNorm.startsWith(query);
    });

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            div.innerHTML = `<span class="font-bold uppercase">${est.nombre} ${est.apellido}</span> <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">(${est.nacionalidad || 'V'}-${est.cedula || 'S/N'})</span>`;
            div.onclick = () => seleccionarInstructor(est);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { 
        suggBox.innerHTML = '<div class="px-4 py-3 text-[11px] text-red-500 text-center font-bold uppercase tracking-wider">No se encontraron Pastores activos.</div>';
        suggBox.classList.remove('hidden');
    }
}

function seleccionarInstructor(persona) {
    document.getElementById('inst-id').value = persona.idPersona;
    document.getElementById('inst-nac').value = persona.nacionalidad || 'V';
    document.getElementById('inst-cedula').value = persona.cedula || '';
    document.getElementById('inst-nombre').value = `${persona.nombre} ${persona.apellido}`;
    document.getElementById('inst-genero').value = persona.genero || 'M';
    
    document.getElementById('inst-nombre').readOnly = true;
    document.getElementById('inst-nac').disabled = true;
    document.getElementById('inst-genero').disabled = true;
    const blockClasses = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    document.getElementById('inst-nombre').classList.add(...blockClasses);
    document.getElementById('inst-nac').classList.add(...blockClasses);
    document.getElementById('inst-genero').classList.add(...blockClasses);
    
    ocultarTodasSugerencias();
}

function desbloquearInstructor() {
    const blockClasses = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    const elN = document.getElementById('inst-nombre');
    const elNac = document.getElementById('inst-nac');
    const elG = document.getElementById('inst-genero');
    
    elN.readOnly = false; elNac.disabled = false; elG.disabled = false;
    elN.classList.remove(...blockClasses); elNac.classList.remove(...blockClasses); elG.classList.remove(...blockClasses);
}

// ============================================================================
// AUTOCOMPLETADO: ESTUDIANTE 
// ============================================================================
function buscarEstudiantePorCedula() {
    const inputCedula = document.getElementById('est-cedula');
    if (inputCedula.readOnly) return;

    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query; 

    if (query === "") {
        document.getElementById('est-nombre').value = ''; 
        document.getElementById('est-id-temp').value = '';
        desbloquearEstudianteTemp();
        ocultarTodasSugerencias();
        return;
    }

    const suggBox = document.getElementById('sugg-est-cedula');
    suggBox.innerHTML = '';
    const resultados = staffDB.filter(e => e.cedula && e.cedula.toString().startsWith(query));

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            div.innerHTML = `<span class="font-bold text-primary dark:text-blue-400">${est.nacionalidad || 'V'}-${est.cedula}</span> <span class="text-xs text-slate-500 font-bold uppercase">${est.nombre} ${est.apellido}</span>`;
            div.onclick = () => seleccionarEstudianteTemp(est);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { suggBox.classList.add('hidden'); }
}

function buscarEstudiantePorNombre() {
    const inputNombre = document.getElementById('est-nombre');
    if(inputNombre.readOnly) return; 

    const query = quitarAcentos(inputNombre.value.toLowerCase().trim());
    const suggBox = document.getElementById('sugg-est-nombre');
    suggBox.innerHTML = '';
    ocultarTodasSugerencias(suggBox.id);

    if (query.length < 1) { suggBox.classList.add('hidden'); return; }

    const resultados = staffDB.filter(e => {
        const nNorm = quitarAcentos((e.nombre || '').toLowerCase());
        const aNorm = quitarAcentos((e.apellido || '').toLowerCase());
        return nNorm.startsWith(query) || aNorm.startsWith(query);
    });

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-slate-50 dark:border-slate-700/50 flex justify-between";
            div.innerHTML = `<span class="font-bold uppercase">${est.nombre} ${est.apellido}</span> <span class="text-[10px] text-primary dark:text-blue-400 font-bold">(${est.nacionalidad || 'V'}-${est.cedula || 'S/N'})</span>`;
            div.onclick = () => seleccionarEstudianteTemp(est);
            suggBox.appendChild(div);
        });
        suggBox.classList.remove('hidden');
    } else { suggBox.classList.add('hidden'); }
}

function seleccionarEstudianteTemp(persona) {
    document.getElementById('est-id-temp').value = persona.idPersona;
    document.getElementById('est-nac').value = persona.nacionalidad || 'V';
    document.getElementById('est-cedula').value = persona.cedula || '';
    document.getElementById('est-nombre').value = `${persona.nombre} ${persona.apellido}`;
    document.getElementById('est-genero-temp').value = persona.genero || 'M';
    
    document.getElementById('est-nombre').readOnly = true;
    document.getElementById('est-nac').disabled = true;
    const blockClasses = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    document.getElementById('est-nombre').classList.add(...blockClasses);
    document.getElementById('est-nac').classList.add(...blockClasses);
    
    ocultarTodasSugerencias();
}

function desbloquearEstudianteTemp() {
    const blockClasses = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    const elN = document.getElementById('est-nombre');
    const elNac = document.getElementById('est-nac');
    
    elN.readOnly = false; elNac.disabled = false;
    elN.classList.remove(...blockClasses); elNac.classList.remove(...blockClasses);
}

function agregarEstudianteTabla() {
    const idStr = document.getElementById('est-id-temp').value;
    const nac = document.getElementById('est-nac').value;
    const cedula = document.getElementById('est-cedula').value;
    const nombre = document.getElementById('est-nombre').value;

    if (!idStr || !cedula || !nombre) {
        showNotification("Datos Incompletos", "Por favor, seleccione un estudiante válido.", "warning");
        return;
    }

    if (estudiantesMatriculados.some(e => e.id === parseInt(idStr))) {
        showNotification("Ya Agregado", "Este estudiante ya se encuentra en la matrícula.", "warning");
        return;
    }

    estudiantesMatriculados.push({ id: parseInt(idStr), cedula: `${nac}-${cedula}`, nombre });
    
    document.getElementById('est-id-temp').value = '';
    document.getElementById('est-cedula').value = '';
    document.getElementById('est-nombre').value = '';
    desbloquearEstudianteTemp();
    
    renderTablaEstudiantes();
}

function quitarEstudiante(id) {
    // Si el botón de guardar está oculto, es porque estamos en modo lectura
    if (document.getElementById('save-class-btn').classList.contains('hidden')) return;
    estudiantesMatriculados = estudiantesMatriculados.filter(e => e.id !== id);
    renderTablaEstudiantes();
}

function renderTablaEstudiantes() {
    const tbody = document.getElementById('tabla-estudiantes-body');
    tbody.innerHTML = '';
    const esLectura = document.getElementById('save-class-btn').classList.contains('hidden');

    if (estudiantesMatriculados.length === 0) {
        tbody.innerHTML = '<tr id="row-empty-students"><td colspan="3" class="px-4 py-6 text-center text-sm text-slate-400 italic">No hay estudiantes agregados.</td></tr>';
        return;
    }

    estudiantesMatriculados.forEach(est => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors animate-fade-in';
        tr.innerHTML = `
            <td class="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white">${est.cedula}</td>
            <td class="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">${est.nombre}</td>
            <td class="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium">
                ${!esLectura ? `
                <button type="button" onclick="quitarEstudiante(${est.id})" class="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                    <span class="material-icons-round text-[18px]">close</span>
                </button>` : '<span class="material-icons-round text-slate-300 text-[18px]">lock</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================================
// MODAL CLASE (MODO EDICIÓN BLINDADO)
// ============================================================================
function openClassModal(isEdit = false, data = null) {
    const modal = document.getElementById('class-modal');
    const title = document.getElementById('modal-class-title');
    const saveBtn = document.getElementById('save-class-btn');
    const statusContainer = document.getElementById('class-status-container');
    const currentYear = new Date().getFullYear();
    
    document.getElementById('form-class').reset();
    document.getElementById('class-id').value = '';
    estudiantesMatriculados = [];
    
    desbloquearInstructor();
    desbloquearEstudianteTemp();
    ocultarTodasSugerencias();

    // Resetear bloqueo visual de inputs
    const inputs = ['class-block', 'inst-cedula', 'inst-nombre', 'est-cedula', 'est-nombre', 'inst-nac', 'inst-genero', 'est-nac'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = false;
            el.disabled = false;
            el.classList.remove('bg-slate-100', 'cursor-not-allowed', 'text-slate-500');
        }
    });
    saveBtn.classList.remove('hidden');

    if (isEdit && data) {
        const esEditable = data.anio === currentYear;
        title.innerText = esEditable ? 'Editar Clase' : 'Clase (Modo Lectura)';
        saveBtn.innerText = 'Actualizar Clase';
        statusContainer.classList.remove('hidden');
        
        document.getElementById('class-id').value = data.idCurso;
        document.getElementById('class-block').value = data.idBloque;
        document.getElementById('class-status').value = data.estado || 'Activo';
        
        if(data.instructor) seleccionarInstructor(data.instructor);
        
        if(data.estudiantes) {
            data.estudiantes.forEach(est => {
                estudiantesMatriculados.push({ id: est.idPersona, cedula: est.cedula, nombre: `${est.nombre} ${est.apellido}` });
            });
        }

        // 🔥 BLOQUEO SI EL AÑO NO ES EL ACTUAL 🔥
        if (!esEditable) {
            saveBtn.classList.add('hidden');
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.readOnly = true;
                    el.disabled = true;
                    el.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-500');
                }
            });
        }
    } else {
        title.innerText = 'Nueva Clase';
        saveBtn.innerText = 'Crear Clase';
        statusContainer.classList.add('hidden');
    }

    renderTablaEstudiantes();
    modal.classList.remove('hidden');
}

function closeClassModal() {
    document.getElementById('class-modal').classList.add('hidden');
    ocultarTodasSugerencias();
}

async function handleSaveClass() {
    const id = document.getElementById('class-id').value;
    const idBloque = document.getElementById('class-block').value;
    const idInstructor = document.getElementById('inst-id').value;

    if (!idBloque || !idInstructor || estudiantesMatriculados.length === 0) {
        showNotification("Atención", "Complete todos los campos obligatorios.", "warning");
        return;
    }

    const requestDTO = {
        idBloque: parseInt(idBloque),
        idInstructor: parseInt(idInstructor),
        estudiantesIds: estudiantesMatriculados.map(e => e.id),
        estado: document.getElementById('class-status')?.value || 'Activo'
    };

    const saveBtn = document.getElementById('save-class-btn');
    saveBtn.disabled = true;

    try {
        const url = id !== '' ? `/api/cursos/editar/${id}` : '/api/cursos/crear';
        const method = id !== '' ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestDTO)
        });

        if (response.ok) {
            closeClassModal();
            showNotification("Excelente", "Cambios guardados con éxito.", "success");
            loadClases(); 
        } else {
            showNotification("Error", await response.text(), "error");
        }
    } catch (e) {
        showNotification("Error", "Falla de conexión.", "error");
    } finally {
        saveBtn.disabled = false;
    }
}

// ============================================================================
// CARGA Y RENDER DE TARJETAS
// ============================================================================
async function loadClases() {
    try {
        const res = await fetch('/api/cursos/todos');
        if (res.ok) {
            clasesDB = await res.json();
            renderClases();
        }
    } catch(e) {}
}

function renderClases() {
    const container = document.getElementById('classes-container');
    container.innerHTML = '';
    
    // Obtenemos la sesión para saber si es Líder (Rol 2) o Congregante (Rol 1)
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const esAdminOPastor = session && session.rol >= 3; // Solo 3 (Pastor) o 4 (Admin) pueden editar/calificar

    if(clasesDB.length === 0) {
        container.innerHTML = `<div class="col-span-full p-12 text-center text-slate-400">No hay clases activas.</div>`;
        return;
    }

    clasesDB.forEach(clase => {
        const badgeColor = clase.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700';
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 flex flex-col relative group animate-fade-in';

        const claseJSON = JSON.stringify(clase).replace(/'/g, "&#39;");
        const denominacionBloque = clase.bloque ? clase.bloque.denominacion : 'Bloque Desconocido';
        const nombreInstructor = clase.instructor ? `${clase.instructor.nombre} ${clase.instructor.apellido}` : 'Sin Instructor';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 bg-blue-50 text-primary rounded-2xl flex items-center justify-center"><span class="material-icons-round">class</span></div>
                <span class="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md ${badgeColor}">${clase.estado || 'Activo'}</span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${denominacionBloque}</h3>
            <p class="text-xs font-bold text-slate-400 uppercase mb-4">Año Escolar: ${clase.anio}</p>
            <div class="space-y-2 mb-6 flex-1">
                <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><span class="material-icons-round text-primary text-base">person</span><span class="font-medium">Instructor: <span class="font-normal text-slate-500">${nombreInstructor}</span></span></div>
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><span class="material-icons-round text-primary text-base">groups</span><span class="font-medium">Matrícula: <span class="font-normal text-slate-500">${clase.estudiantes ? clase.estudiantes.length : 0} estudiantes</span></span></div>
            </div>
            <div class="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                <button class="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors" onclick="abrirModalEstudiantes(${clase.idCurso})" title="Ver Estudiantes"><span class="material-icons-round text-xl">visibility</span></button>
                ${esAdminOPastor ? `
                <button class="p-2.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors" onclick='openClassModal(true, ${claseJSON})' title="Editar Clase"><span class="material-icons-round text-xl">edit</span></button>
                <button class="flex-1 py-2 bg-slate-50 hover:bg-primary hover:text-white text-primary font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2" onclick="abrirModalEvaluacion(${clase.idCurso})"><span class="material-icons-round text-sm">checklist</span> Evaluar</button>
                ` : `<div class="flex-1 text-center py-2 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">Solo Visualización</div>`}
            </div>
        `;
        container.appendChild(card);
    });
}

// ============================================================================
// EVALUACIÓN DE TIPS (MANTENIENDO LÓGICA DE BLINDADO DE AÑO)
// ============================================================================
async function abrirModalEvaluacion(idCurso) {
    const curso = clasesDB.find(c => c.idCurso === idCurso);
    if (!curso) return;

    const currentYear = new Date().getFullYear();
    const esEditable = curso.anio === currentYear;

    document.getElementById('eval-curso-id').value = idCurso;
    document.getElementById('titulo-evaluacion').innerText = `Evaluar: ${curso.bloque?.denominacion}`;
    
    const btnGuardar = document.getElementById('btn-guardar-eval');
    btnGuardar.classList.toggle('hidden', !esEditable);

    const selectTips = document.getElementById('eval-tip-select');
    selectTips.innerHTML = '<option value="">Cargando actividades...</option>';
    
    const idBloqueReal = curso.bloque ? curso.bloque.idBloque : null;
    const bloqueData = bloquesDB.find(b => b.idBloque === idBloqueReal);
    const tipsDelBloque = bloqueData?.tips || [];

    selectTips.innerHTML = '<option value="">Seleccione el tip o actividad...</option>';
    tipsDelBloque.forEach(tip => selectTips.innerHTML += `<option value="${tip.idTip}">${tip.titulo}</option>`);

    const tbody = document.getElementById('eval-estudiantes-body');
    tbody.innerHTML = esEditable ? '' : `<tr class="bg-amber-50 dark:bg-amber-900/20"><td colspan="2" class="px-5 py-3 text-center text-xs font-bold text-amber-700 dark:text-amber-500"><span class="material-icons-round text-[14px] align-middle mr-1">lock</span>MODO LECTURA: El año escolar ${curso.anio} ya finalizó.</td></tr>`;

    curso.estudiantes?.forEach(est => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors';
        tr.innerHTML = `
            <td class="px-5 py-3.5">
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-900 dark:text-white uppercase">${est.nombre} ${est.apellido}</span>
                    <span class="text-[11px] font-bold tracking-wider text-slate-400">${est.cedula}</span>
                </div>
            </td>
            <td class="px-5 py-3.5 text-center align-middle">
                <input type="checkbox" disabled class="eval-checkbox w-6 h-6 rounded-md border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-900 cursor-not-allowed shadow-sm transition-all" data-id-estudiante="${est.idPersona}">
            </td>
        `;
        tbody.appendChild(tr);
    });

    selectTips.onchange = async (e) => {
        const idTip = e.target.value;
        const checkboxes = document.querySelectorAll('.eval-checkbox');
        if (!idTip) { checkboxes.forEach(chk => { chk.checked = false; chk.disabled = true; }); return; }

        try {
            const res = await fetch(`/api/evaluaciones/curso/${idCurso}/tip/${idTip}/notas`);
            if (res.ok) {
                const notasMap = await res.json();
                checkboxes.forEach(chk => {
                    const idEst = chk.getAttribute('data-id-estudiante');
                    chk.checked = notasMap[idEst] === true; 
                    chk.disabled = !esEditable;
                    chk.classList.toggle('cursor-not-allowed', !esEditable);
                    chk.classList.toggle('cursor-pointer', esEditable);
                });
            }
        } catch (e) {}
    };

    document.getElementById('modal-evaluar').classList.remove('hidden');
}

function closeModalEvaluacion() { document.getElementById('modal-evaluar').classList.add('hidden'); }

async function guardarEvaluacion() {
    const idCurso = document.getElementById('eval-curso-id').value;
    const idTip = document.getElementById('eval-tip-select').value;
    
    if (!idTip) { showNotification("Atención", "Seleccione el Tip que desea evaluar.", "warning"); return; }

    const evaluaciones = [];
    document.querySelectorAll('.eval-checkbox').forEach(chk => {
        evaluaciones.push({ idEstudiante: parseInt(chk.getAttribute('data-id-estudiante')), aprobado: chk.checked });
    });

    const btnGuardar = document.getElementById('btn-guardar-eval');
    btnGuardar.disabled = true;

    try {
        const res = await fetch('/api/evaluaciones/guardar-tips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCurso: parseInt(idCurso), idActividad: parseInt(idTip), notas: evaluaciones })
        });
        
        if (res.ok) {
            closeModalEvaluacion();
            showNotification("Éxito", "Calificaciones registradas.", "success");
        } else {
            showNotification("Error", await res.text(), "error");
        }
    } catch (e) {} finally {
        btnGuardar.disabled = false;
    }
}

function abrirModalEstudiantes(id) {
    const curso = clasesDB.find(c => c.idCurso === id);
    const container = document.getElementById('students-list-container');
    container.innerHTML = '';
    curso.estudiantes?.forEach(est => {
        container.innerHTML += `<div class="px-6 py-4 flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0"><div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">${est.nombre.charAt(0)}</div><div class="flex flex-col"><span class="font-bold text-sm text-slate-900 dark:text-white uppercase">${est.nombre} ${est.apellido}</span><span class="text-xs text-slate-500 font-medium">${est.cedula}</span></div></div>`;
    });
    document.getElementById('students-modal').classList.remove('hidden');
}

function closeStudentsModal() { document.getElementById('students-modal').classList.add('hidden'); }