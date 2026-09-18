// ============================================================================
// GESTIÓN DE CLASES DE TEOLOGÍA
// ============================================================================

const periodoActual = new Date().getFullYear();

let teologiasDB = [];
let personasDB = []; // Usuarios activos
let pastoresDB = []; // Pastores activos
let estudiantesClase = []; 
let clasesCreadas = []; 
let editandoId = null;  

let planClaseId = null;
let evalIdCounter = 0;
let hoyCaracasGlobal = new Date().toISOString().split('T')[0];

let currentPlanificaciones = [];

// VARIABLES DE PAGINACIÓN: CUADRÍCULA PRINCIPAL
let currentPageGrid = 1;
const itemsPerPageGrid = 6;

const materiasAprobadas = {
    "V-12345678": ["1. Dar a conocer su nombre.", "5. Amor y misericordia."],
    "E-87654321": [],
    "V-23456789": [],
    "V-34567890": []
};

window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('display-periodo').textContent = periodoActual;
    document.getElementById('badge-periodo').textContent = periodoActual;
    
    document.addEventListener('click', function(event) {
        const container = document.getElementById('busqueda-container');
        if (container && !container.contains(event.target)) {
            ocultarSugerencias();
        }

        if (!event.target.closest('.menu-contenedor')) {
            document.querySelectorAll('.card-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });

    await cargarDatosIniciales();
});

function formatearFecha(isoDate) {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

async function cargarDatosIniciales() {
    try {
        const resTeo = await fetch('/api/teologia/todos');
        if (resTeo.ok) {
            teologiasDB = await resTeo.json();
            const selectCarrera = document.getElementById('clase-carrera');
            selectCarrera.innerHTML = '<option value="">Seleccione el módulo...</option>';
            
            teologiasDB.forEach(t => {
                if(t.estado === 'Activo') {
                    selectCarrera.innerHTML += `<option value="${t.idTeologia}">${t.denominacion}</option>`;
                }
            });
        }

        try {
            let resUsu = await fetch('/api/usuarios/todos');
            if (resUsu.ok) {
                let usuarios = await resUsu.json();
                
                let usuariosMapeados = usuarios.map(u => ({
                    idPersona: u.persona?.idPersona || u.idPersona || u.idUsuario,
                    cedula: u.persona?.cedula || u.cedula || '',
                    nombre: u.persona?.nombre || u.nombre || '',
                    apellido: u.persona?.apellido || u.apellido || '',
                    nacionalidad: u.persona?.nacionalidad || u.nacionalidad || 'V',
                    genero: u.persona?.genero || u.genero || 'M',
                    rol: String(u.rol?.nombre || u.rol?.denominacion || u.rol || '').toLowerCase(),
                    estado: String(u.estado || 'Activo').toLowerCase()
                }));

                pastoresDB = usuariosMapeados.filter(u => u.rol.includes('pastor') && u.estado === 'activo');
                personasDB = usuariosMapeados.filter(u => u.estado === 'activo');
            }
        } catch(e) {}

        const resClases = await fetch('/api/clases-teologia/todos');
        if (resClases.ok) {
            const clasesBD = await resClases.json();
            clasesCreadas = []; 

            for (let c of clasesBD) {
                let tienePlan = false;
                try {
                    const resPlan = await fetch(`/api/planificacion/clase/${c.idClaseTeologia}`);
                    if (resPlan.ok && resPlan.status !== 204) tienePlan = true;
                } catch(e) {}

                clasesCreadas.push({
                    id: c.idClaseTeologia,
                    periodo: c.anio,
                    fechaInicio: c.fechaInicio || '', 
                    fechaFin: c.fechaFin || '',       
                    carrera: c.teologia?.denominacion || 'Unidad Teológica',
                    idTeologia: c.teologia?.idTeologia, 
                    idTema: c.tema?.idTema,             
                    temaNombre: c.tema?.denominacion, 
                    instructor: c.instructor,
                    estudiantes: c.estudiantes || [],
                    tienePlan: tienePlan,
                    plan: [], 
                    oculto: false
                });
            }
            renderizarGridClases();
        }

    } catch (e) { console.error("Error cargando datos:", e); }
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.toggle('hidden');
}

// ⚡ NUEVA FUNCIÓN: MOSTRAR ALERTA EN MODAL ⚡
function mostrarAlerta(titulo, mensaje) {
    document.getElementById('error-title').innerText = titulo;
    document.getElementById('error-message').innerHTML = mensaje;
    toggleModal('modal-error');
}

function actualizarMaterias() {
    const idTeologia = document.getElementById('clase-carrera').value;
    const selectMateria = document.getElementById('clase-materia');
    selectMateria.innerHTML = '<option value="">Seleccione una unidad curricular...</option>';
    
    if (idTeologia) {
        const teoSeleccionada = teologiasDB.find(t => t.idTeologia == idTeologia);
        if (teoSeleccionada && teoSeleccionada.temas) {
            teoSeleccionada.temas.forEach(tema => {
                selectMateria.innerHTML += `<option value="${tema.idTema}" data-nombre="${tema.denominacion}">${tema.denominacion}</option>`;
            });
        }
    }
    
    if(!editandoId) {
        estudiantesClase = [];
        renderizarTablaMatricula();
    }
}

function revalidarListaPorMateria() {
    const materia = document.getElementById('clase-materia').value;
    if (!materia || estudiantesClase.length === 0) {
        document.getElementById('estudiante-error').classList.add('hidden');
        return;
    }

    let removidos = [];
    let nuevaLista = [];

    estudiantesClase.forEach(est => {
        const aprobadas = materiasAprobadas[est.cedula] || [];
        if (aprobadas.includes(materia)) {
            removidos.push(`<b>${est.nombre.toUpperCase()} ${est.apellido.toUpperCase()}</b> (${est.cedula})`);
        } else {
            nuevaLista.push(est);
        }
    });

    if (removidos.length > 0) {
        estudiantesClase = nuevaLista;
        renderizarTablaMatricula();
        mostrarError(`<b>¡Atención!</b> Al cambiar la unidad curricular, se removieron los siguientes estudiantes que ya la habían cursado y aprobado:<br><ul class="list-disc pl-5 mt-2"><li>` + removidos.join("</li><li>") + `</li></ul>`);
    } else {
        document.getElementById('estudiante-error').classList.add('hidden');
    }
}

function validarFechasClaseEnTiempoReal(input) {
    if (!input.value) return;

    const isEdit = editandoId !== null;
    const fInicio = document.getElementById('clase-fecha-inicio').value;
    const fFin = document.getElementById('clase-fecha-fin').value;

    if (!isEdit && input.value < hoyCaracasGlobal) {
        mostrarError("La fecha de la clase no puede ser anterior al día de hoy.");
        input.value = '';
        return;
    }

    if (fInicio && fFin) {
        if (fInicio >= fFin) {
            mostrarError("La fecha de inicio de la clase debe ser estrictamente anterior a su fecha de fin.");
            input.value = '';
            return;
        }
        document.getElementById('estudiante-error').classList.add('hidden');
    }
}

// ============================================================================
// AUTOCOMPLETADO EXACTO: INSTRUCTOR
// ============================================================================
function buscarInstructorPorCedula() {
    const inputCedula = document.getElementById('inst-cedula');
    if (inputCedula.readOnly) return; 

    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query; 

    if (query === "") {
        document.getElementById('inst-nombre').value = ''; 
        document.getElementById('inst-id').value = '';
        desbloquearInstructor();
        ocultarSugerencias();
        return;
    }

    const suggBox = document.getElementById('sugg-inst-cedula');
    suggBox.innerHTML = '';
    
    const resultados = pastoresDB.filter(e => e.cedula && e.cedula.toString().startsWith(query));

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

    formatNombreInput(inputNombre); 
    const query = quitarAcentos(inputNombre.value.toLowerCase().trim());
    const suggBox = document.getElementById('sugg-inst-nombre');
    suggBox.innerHTML = '';
    ocultarSugerencias('sugg-inst-nombre');

    if (query === "") { suggBox.classList.add('hidden'); return; }

    const resultados = pastoresDB.filter(e => {
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
    document.getElementById('inst-id').value = persona.idPersona || persona.idUsuario;
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
    
    ocultarSugerencias();

    const idInst = persona.idPersona || persona.idUsuario;
    const idx = estudiantesClase.findIndex(e => e.idPersona == idInst);
    if (idx !== -1) {
        const removido = estudiantesClase.splice(idx, 1)[0];
        renderizarTablaMatricula();
        mostrarError(`<b>¡Atención!</b> <b>${removido.nombre} ${removido.apellido}</b> fue removido de la matrícula al ser designado como el Instructor de esta clase.`);
    }
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
// AUTOCOMPLETADO EXACTO: ESTUDIANTES (ACTIVOS)
// ============================================================================
function quitarAcentos(cadena) {
    return cadena ? cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}

function formatNombreInput(inputElement) {
    let val = inputElement.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    val = val.trimStart().replace(/\s{2,}/g, ' '); 
    let partes = val.split(' ');
    if (partes.length > 2) val = partes[0] + ' ' + partes[1]; 
    inputElement.value = val.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    if (val.endsWith(' ') && partes.length === 1) inputElement.value += " ";
}

function buscarPorCedula() {
    const inputCedula = document.getElementById('est-cedula');
    if (inputCedula.readOnly) return;

    let query = inputCedula.value.replace(/\D/g, '').substring(0, 8);
    inputCedula.value = query; 

    if (query === "") {
        document.getElementById('est-idPersona').value = '';
        document.getElementById('est-nombre').value = ''; 
        document.getElementById('est-apellido').value = '';
        limpiarInputsReadOnly();
        ocultarSugerencias();
        return;
    }

    const suggestionsBox = document.getElementById('suggestions-box-cedula');
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';

    const resultados = personasDB.filter(p => p.cedula && p.cedula.toString().startsWith(query));
    mostrarResultadosSugerencia(resultados, suggestionsBox, 'cedula');
}

function buscarPorTexto(inputId, boxId) {
    const inputElement = document.getElementById(inputId);
    if(inputElement.readOnly) return; 

    formatNombreInput(inputElement); 
    const query = quitarAcentos(inputElement.value.toLowerCase().trim());
    const suggestionsBox = document.getElementById(boxId);
    
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';
    ocultarSugerencias(boxId);

    if (query === "") { 
        suggestionsBox.classList.add('hidden'); 
        return; 
    }

    const resultados = personasDB.filter(p => {
        const nombreNorm = quitarAcentos(p.nombre?.toLowerCase() || "");
        const apellidoNorm = quitarAcentos(p.apellido?.toLowerCase() || "");
        
        if (inputId === 'est-nombre') return nombreNorm.startsWith(query);
        if (inputId === 'est-apellido') return apellidoNorm.startsWith(query);
        return nombreNorm.startsWith(query) || apellidoNorm.startsWith(query);
    });

    mostrarResultadosSugerencia(resultados, suggestionsBox, 'texto');
}

function mostrarResultadosSugerencia(resultados, box, tipo) {
    if (resultados.length > 0) {
        resultados.forEach(per => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50 last:border-0 flex justify-between items-center";
            if(tipo === 'cedula') {
                div.innerHTML = `<span class="font-bold text-primary dark:text-blue-400">${per.cedula}</span> <span class="text-xs text-slate-500">${per.nombre} ${per.apellido}</span>`;
            } else {
                div.innerHTML = `<span class="font-semibold uppercase">${per.nombre} ${per.apellido}</span> <span class="text-[10px] text-primary dark:text-blue-400 font-bold">(${per.cedula || 'S/N'})</span>`;
            }
            div.onclick = () => seleccionarEstudiante(per);
            box.appendChild(div);
        });
        box.classList.remove('hidden');
    } else { 
        box.innerHTML = '<div class="px-4 py-3 text-[11px] text-red-500 text-center font-bold uppercase tracking-wider">No se encontraron usuarios activos.</div>';
        box.classList.remove('hidden'); 
    }
}

function seleccionarEstudiante(per) {
    const idVal = per.idPersona || per.idUsuario;
    
    const idInst = document.getElementById('inst-id').value;
    if(idInst && idInst == idVal) {
        mostrarError(`<b>¡Atención!</b> No puedes seleccionar a <b>${per.nombre} ${per.apellido}</b> como estudiante porque ya es el Instructor asignado.`);
        limpiarCamposEstudiante(); 
        ocultarSugerencias();
        return;
    }

    if(estudiantesClase.some(e => e.idPersona == idVal || e.cedula == per.cedula)) {
        mostrarError(`<b>¡Atención!</b> El estudiante <b>${per.nombre} ${per.apellido}</b> ya se encuentra matriculado en la tabla.`);
        limpiarCamposEstudiante();
        ocultarSugerencias();
        return;
    }

    const selectMateria = document.getElementById('clase-materia');
    if (selectMateria.value) {
        const materiaNombre = selectMateria.options[selectMateria.selectedIndex].getAttribute('data-nombre');
        const aprobadas = materiasAprobadas[per.cedula] || [];
        if(aprobadas.includes(materiaNombre)) {
            mostrarError(`<b>¡Atención!</b> El estudiante <b>${per.nombre.toUpperCase()} ${per.apellido.toUpperCase()}</b> (${per.cedula}) ya cursó y aprobó la unidad curricular <b>${materiaNombre}</b>.`);
            limpiarCamposEstudiante(); 
            ocultarSugerencias();
            return;
        }
    }

    document.getElementById('estudiante-error').classList.add('hidden');

    document.getElementById('est-idPersona').value = idVal;
    document.getElementById('est-cedula').value = per.cedula || ''; 
    document.getElementById('est-nombre').value = per.nombre || '';
    document.getElementById('est-apellido').value = per.apellido || '';
    
    document.getElementById('est-nombre').readOnly = true;
    document.getElementById('est-apellido').readOnly = true;
    
    const clasesBloqueo = ['bg-slate-100', 'dark:bg-slate-700/50', 'text-slate-500', 'cursor-not-allowed'];
    document.getElementById('est-nombre').classList.add(...clasesBloqueo);
    document.getElementById('est-apellido').classList.add(...clasesBloqueo);
    
    ocultarSugerencias();
}

function ocultarSugerencias(excepcionId = '') {
    ['suggestions-box-cedula', 'suggestions-box-nombre', 'suggestions-box-apellido', 'sugg-inst-cedula', 'sugg-inst-nombre'].forEach(id => {
        if(id !== excepcionId) {
            const box = document.getElementById(id);
            if(box) box.classList.add('hidden');
        }
    });
}

function limpiarCamposEstudiante() {
    document.getElementById('est-idPersona').value = "";
    document.getElementById('est-cedula').value = "";
    document.getElementById('est-nombre').value = "";
    document.getElementById('est-apellido').value = "";
    limpiarInputsReadOnly();
}

function limpiarInputsReadOnly() {
    ['est-nombre', 'est-apellido'].forEach(id => {
        const el = document.getElementById(id);
        el.readOnly = false;
        el.classList.remove('bg-slate-100', 'dark:bg-slate-700/50', 'pointer-events-none');
    });
}

function agregarEstudiante() {
    const idPersona = document.getElementById('est-idPersona').value;
    const cedula = document.getElementById('est-cedula').value.trim();
    const nombre = document.getElementById('est-nombre').value.trim();
    const apellido = document.getElementById('est-apellido').value.trim();
    const selectMateria = document.getElementById('clase-materia');
    const idTema = selectMateria.value;

    const errorContainer = document.getElementById('estudiante-error');
    errorContainer.classList.add('hidden');

    if(!idTema) { mostrarError("Por favor seleccione primero una Unidad Curricular."); return; }
    if(!idPersona || !cedula || !nombre || !apellido) { mostrarError("Por favor seleccione un estudiante válido de las sugerencias."); return; }
    
    estudiantesClase.push({ idPersona: parseInt(idPersona), cedula, nombre, apellido });
    renderizarTablaMatricula();
    limpiarCamposEstudiante(); 
}

function mostrarError(htmlMsg) {
    const errorContainer = document.getElementById('estudiante-error');
    errorContainer.innerHTML = htmlMsg;
    errorContainer.classList.remove('hidden');
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderizarTablaMatricula() {
    const tbody = document.getElementById('tabla-matricula-body');
    tbody.innerHTML = '';
    
    if(estudiantesClase.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-sm text-slate-500">No hay estudiantes agregados.</td></tr>`;
        return;
    }

    estudiantesClase.forEach((est, index) => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100 dark:border-slate-700/50 animate-fade-in";
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">${est.cedula}</td>
            <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">${est.nombre} ${est.apellido}</td>
            <td class="px-4 py-3 text-right">
                <button type="button" onclick="eliminarEstudiante(${index})" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors ml-auto"><span class="material-icons-round text-lg">delete</span></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarEstudiante(index) {
    estudiantesClase.splice(index, 1);
    renderizarTablaMatricula();
}

async function abrirModalNuevaClase() {
    editandoId = null;
    document.getElementById('titulo-modal-clase').innerText = "Nueva Clase";
    document.getElementById('btn-guardar-clase').innerHTML = "Crear Clase";
    limpiarFormularioClase();
    
    try {
        const timeRes = await fetch('https://worldtimeapi.org/api/timezone/America/Caracas');
        if (timeRes.ok) {
            const timeData = await timeRes.json();
            hoyCaracasGlobal = timeData.datetime.split('T')[0];
        }
    } catch(e) {}

    document.getElementById('clase-fecha-inicio').setAttribute('min', hoyCaracasGlobal);
    document.getElementById('clase-fecha-fin').setAttribute('min', hoyCaracasGlobal);

    toggleModal('modal-clase');
}

function editarClase(idClase) {
    const clase = clasesCreadas.find(c => c.id === idClase);
    if (!clase) return;

    editandoId = idClase;
    document.getElementById('titulo-modal-clase').innerText = "Editar Clase";
    document.getElementById('btn-guardar-clase').innerHTML = "Guardar Cambios";

    limpiarFormularioClase(); 

    document.getElementById('clase-fecha-inicio').removeAttribute('min');
    document.getElementById('clase-fecha-fin').removeAttribute('min');

    const teologiaId = clase.idTeologia || (clase.teologia ? clase.teologia.idTeologia : null);
    const temaId = clase.idTema || (clase.tema ? clase.tema.idTema : null);

    if (teologiaId) {
        document.getElementById('clase-carrera').value = teologiaId;
        actualizarMaterias(); 
    }
    if (temaId) document.getElementById('clase-materia').value = temaId;

    document.getElementById('clase-fecha-inicio').value = clase.fechaInicio || '';
    document.getElementById('clase-fecha-fin').value = clase.fechaFin || '';

    if (clase.instructor) seleccionarInstructor(clase.instructor);

    if (clase.estudiantes) {
        estudiantesClase = clase.estudiantes.map(est => ({
            idPersona: est.idPersona || est.idUsuario,
            cedula: est.cedula,
            nombre: est.nombre,
            apellido: est.apellido
        }));
    }

    renderizarTablaMatricula();
    document.getElementById(`menu-clase-${idClase}`)?.classList.add('hidden');
    toggleModal('modal-clase');
}

function limpiarFormularioClase() {
    document.getElementById('form-clase').reset();
    document.getElementById('clase-materia').innerHTML = '<option value="">Seleccione una unidad curricular...</option>';
    document.getElementById('estudiante-error').classList.add('hidden');
    
    document.getElementById('clase-fecha-inicio').value = '';
    document.getElementById('clase-fecha-fin').value = '';

    document.getElementById('inst-id').value = '';
    desbloquearInstructor();

    estudiantesClase = [];
    limpiarCamposEstudiante();
    renderizarTablaMatricula();
}

async function guardarClase() {
    const idTeologia = document.getElementById('clase-carrera').value;
    const idInstructor = document.getElementById('inst-id').value; 
    const selectMateria = document.getElementById('clase-materia');
    const idTema = selectMateria.value;
    
    const fInicio = document.getElementById('clase-fecha-inicio').value;
    const fFin = document.getElementById('clase-fecha-fin').value;

    if(!idTeologia || !idTema || !idInstructor || !fInicio || !fFin) {
        mostrarError("Debe completar todos los campos obligatorios (Incluyendo el Instructor y las fechas).");
        return;
    }

    const isEdit = editandoId !== null;
    if (!isEdit && (fInicio < hoyCaracasGlobal || fFin < hoyCaracasGlobal)) {
        mostrarError("Las fechas de la clase no pueden ser anteriores al día de hoy.");
        return;
    }
    if (fInicio >= fFin) {
        mostrarError("La fecha de inicio debe ser estrictamente anterior a la fecha de fin.");
        return;
    }
    
    if(estudiantesClase.length === 0) {
        mostrarError("Debe añadir al menos un estudiante a la matrícula.");
        return;
    }

    const payload = {
        idTeologia: parseInt(idTeologia),
        idTema: parseInt(idTema),
        idInstructor: parseInt(idInstructor),
        fechaInicio: fInicio, 
        fechaFin: fFin,       
        estudiantesIds: estudiantesClase.map(est => est.idPersona),
        estado: "Activo"
    };

    const saveBtn = document.getElementById('btn-guardar-clase');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-round animate-spin text-sm">refresh</span> Guardando...';

    const url = editandoId ? `/api/clases-teologia/editar/${editandoId}` : '/api/clases-teologia/crear';
    const method = editandoId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const materiaNombre = selectMateria.options[selectMateria.selectedIndex].getAttribute('data-nombre');
            await cargarDatosIniciales(); 
            mostrarExito(
                editandoId ? "¡Clase Actualizada!" : "¡Clase Creada!", 
                `La clase de <b>${materiaNombre}</b> ha sido guardada exitosamente.`
            );
        } else { mostrarError(await res.text()); }
    } catch (e) { mostrarError("Error de conexión con el servidor."); } 
    finally { saveBtn.disabled = false; saveBtn.innerHTML = originalText; }
}

function renderizarGridClases() {
    const container = document.getElementById('grid-container');
    const emptyState = document.getElementById('empty-state');
    
    let paginationContainer = document.getElementById('grid-pagination-controls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'grid-pagination-controls';
        paginationContainer.className = 'col-span-full mt-8 flex justify-center items-center gap-2 w-full';
        container.after(paginationContainer);
    } else { paginationContainer.innerHTML = ''; }

    if(clasesCreadas.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        paginationContainer.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = '';

    const totalPages = Math.ceil(clasesCreadas.length / itemsPerPageGrid);
    if (currentPageGrid > totalPages && totalPages > 0) currentPageGrid = totalPages;

    const startIndex = (currentPageGrid - 1) * itemsPerPageGrid;
    const endIndex = startIndex + itemsPerPageGrid;
    const paginatedLista = clasesCreadas.slice(startIndex, endIndex);

    paginatedLista.forEach(clase => {
        const isEditable = clase.periodo === periodoActual;

        const card = document.createElement('div');
        card.className = `bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 relative flex flex-col transition-all duration-300 hover:shadow-lg ${clase.oculto ? 'opacity-70 bg-slate-50 dark:bg-slate-800/80' : ''}`;
        
        const instructorName = clase.instructor ? `${clase.instructor.nombre} ${clase.instructor.apellido}` : 'Sin Instructor';
        
        let badgeOculto = clase.oculto 
            ? `<span class="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1"><span class="material-icons-round text-[14px]">visibility_off</span> Oculto</span>`
            : '';

        let fechasHtml = '';
        if(clase.fechaInicio && clase.fechaFin) {
            fechasHtml = `<p class="text-[11px] font-bold text-slate-500 uppercase mb-4 flex items-center gap-1"><span class="material-icons-round text-[14px]">event</span> ${formatearFecha(clase.fechaInicio)} al ${formatearFecha(clase.fechaFin)}</p>`;
        } else {
            fechasHtml = `<p class="text-xs font-bold text-slate-400 uppercase mb-4">Año Escolar: ${clase.periodo}</p>`;
        }

        let menuOpciones = '';
        if (isEditable) {
            menuOpciones = `
                <button onclick="editarClase(${clase.id})" class="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-700/50">
                    <span class="material-icons-round text-[18px] text-slate-400">edit</span> Editar Clase
                </button>
                <button onclick="${clase.tienePlan ? `verPlan(${clase.id})` : `agregarPlan(${clase.id})`}" class="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors">
                    <span class="material-icons-round text-[18px] ${clase.tienePlan ? 'text-blue-500' : 'text-slate-400'}">${clase.tienePlan ? 'visibility' : 'assignment'}</span> 
                    ${clase.tienePlan ? 'Ver plan de evaluación' : 'Agregar plan de evaluación'}
                </button>
            `;
        } else {
            menuOpciones = `
                <button onclick="verPlan(${clase.id})" class="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors">
                    <span class="material-icons-round text-[18px] text-blue-500">visibility</span> Ver plan de evaluación
                </button>
            `;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4 relative">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-1 ${isEditable ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-500 border-slate-300'} text-xs font-bold rounded-lg border">${clase.periodo}</span>
                    ${!isEditable ? '<span class="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-lg border border-amber-200">Lectura</span>' : ''}
                    ${badgeOculto}
                </div>
                <div class="relative menu-contenedor">
                    <button onclick="toggleCardMenu(event, ${clase.id})" class="p-1.5 text-slate-400 hover:text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <span class="material-icons-round">more_vert</span>
                    </button>
                    <div id="menu-clase-${clase.id}" class="card-menu hidden absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-30 overflow-hidden ios-shadow">
                        ${menuOpciones}
                    </div>
                </div>
            </div>
            
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1 pr-2">${clase.carrera}</h3>
            <p class="text-sm text-primary dark:text-blue-400 font-bold mb-2">${clase.temaNombre}</p>
            ${fechasHtml}

            <div class="space-y-2 mb-4 flex-1">
                <div class="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span class="material-icons-round text-primary text-base mt-0.5">person</span>
                    <span class="font-medium">Instructor: <span class="font-normal text-slate-500 dark:text-slate-400">${instructorName}</span></span>
                </div>
            </div>
            
            <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                <button onclick="verMatricula(${clase.id})" class="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors" title="Ver Estudiantes">
                    <span class="material-icons-round text-xl">visibility</span>
                </button>
                ${isEditable ? `
                <button class="flex-1 py-2 bg-slate-50 hover:bg-primary hover:text-white text-primary font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2" onclick="abrirModalEvaluacion(${clase.id})">
                    <span class="material-icons-round text-sm">checklist</span> Evaluar
                </button>
                ` : `
                <button class="flex-1 py-2 bg-slate-50 text-slate-500 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2" onclick="abrirModalEvaluacion(${clase.id})">
                    <span class="material-icons-round text-sm">grading</span> Ver Notas
                </button>
                `}
            </div>
        `;
        container.appendChild(card);
    });

    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_left</span>';
        prevBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        prevBtn.disabled = currentPageGrid === 1;
        prevBtn.onclick = () => { if(currentPageGrid > 1) { currentPageGrid--; renderizarGridClases(); } };
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            pageBtn.className = `w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${currentPageGrid === i ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
            pageBtn.onclick = () => { currentPageGrid = i; renderizarGridClases(); };
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_right</span>';
        nextBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === totalPages ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        nextBtn.disabled = currentPageGrid === totalPages;
        nextBtn.onclick = () => { if(currentPageGrid < totalPages) { currentPageGrid++; renderizarGridClases(); } };
        paginationContainer.appendChild(nextBtn);
    }
}

function toggleCardMenu(event, id) {
    event.stopPropagation(); 
    document.querySelectorAll('.card-menu').forEach(menu => {
        if(menu.id !== `menu-clase-${id}`) menu.classList.add('hidden');
    });
    const menu = document.getElementById(`menu-clase-${id}`);
    if (menu) menu.classList.toggle('hidden');
}

function verMatricula(idClase) {
    const clase = clasesCreadas.find(c => c.id === idClase);
    if (!clase) return;

    document.getElementById('modal-ver-matricula-titulo').innerText = clase.carrera;
    const tbody = document.getElementById('tabla-ver-matricula-body');
    tbody.innerHTML = '';
    
    if (!clase.estudiantes || clase.estudiantes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="px-6 py-8 text-center text-sm text-slate-500">No hay estudiantes matriculados en esta clase.</td></tr>`;
    } else {
        clase.estudiantes.forEach(est => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">${est.cedula || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                            ${est.nombre.charAt(0)}${est.apellido.charAt(0)}
                        </div>
                        ${est.nombre} ${est.apellido}
                    </td>
                </tr>
            `;
        });
    }

    toggleModal('modal-ver-matricula');
}

function mostrarExito(titulo, mensaje) {
    document.getElementById('success-title').innerText = titulo;
    document.getElementById('success-message').innerHTML = mensaje;
    
    const modalesAbiertos = ['modal-clase', 'modal-ver-matricula', 'modal-plan', 'modal-evaluar'];
    modalesAbiertos.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden')) toggleModal(id);
    });

    toggleModal('modal-success');
}

// ============================================================================
// LÓGICA DE PLAN DE EVALUACIÓN
// ============================================================================
function agregarPlan(idClase) {
    const clase = clasesCreadas.find(c => c.id === idClase);
    if (!clase) return;

    planClaseId = idClase;
    document.getElementById('plan-modal-carrera').innerText = clase.carrera;
    document.getElementById('plan-modal-materia').innerText = clase.temaNombre || "Unidad Curricular";

    document.getElementById('evaluaciones-container').innerHTML = '';
    evalIdCounter = 0;
    document.getElementById('plan-error').classList.add('hidden');

    for (let i = 0; i < 3; i++) agregarFilaEvaluacion();

    document.getElementById(`menu-clase-${idClase}`)?.classList.add('hidden');
    toggleModal('modal-plan');
}

function agregarFilaEvaluacion() {
    const container = document.getElementById('evaluaciones-container');
    const count = container.children.length;

    if (count >= 5) return; 

    evalIdCounter++;
    const id = evalIdCounter;

    const claseActual = clasesCreadas.find(c => c.id === planClaseId);
    let minFecha = hoyCaracasGlobal > claseActual.fechaInicio ? hoyCaracasGlobal : claseActual.fechaInicio;

    const fila = document.createElement('div');
    fila.id = `eval-row-${id}`;
    fila.className = "flex flex-col md:flex-row gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl relative group animate-fade-in";
    
    fila.innerHTML = `
        <div class="flex-1 min-w-[180px]">
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Evaluación / Contenido</label>
            <input type="text" placeholder="Ej. Examen Tema 1" class="eval-tema w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:text-sm focus:ring-primary">
        </div>
        <div class="w-full md:w-36">
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Actividad</label>
            <select class="eval-tipo w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:text-sm focus:ring-primary">
                <option value="">Seleccione...</option>
                <option value="1">Examen Escrito</option>
                <option value="2">Exposición</option>
                <option value="3">Trabajo Práctico</option>
                <option value="4">Taller</option>
                <option value="5">Ensayo</option>
            </select>
        </div>
        <div class="w-full md:w-20">
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Peso (%)</label>
            <input type="text" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 3);" placeholder="Ej. 25" class="eval-ponderacion w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:text-sm focus:ring-primary text-center">
        </div>
        <div class="w-full md:w-36">
            <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Fecha de Aplicación <span class="text-red-500">*</span></label>
            <input type="date" min="${minFecha}" max="${claseActual.fechaFin}" onchange="validarFechasPlanEnTiempoReal(this)" class="eval-fecha-plan w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:text-sm focus:ring-primary cursor-pointer px-2">
        </div>

        <div class="flex items-end pb-1 pl-2">
            <button type="button" onclick="eliminarFilaEvaluacion(${id})" class="btn-eliminar-eval w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors" title="Eliminar evaluación">
                <span class="material-icons-round text-lg">delete</span>
            </button>
        </div>
    `;

    container.appendChild(fila);
    actualizarEstadoBotonAdd();
}

function eliminarFilaEvaluacion(id) {
    const container = document.getElementById('evaluaciones-container');
    if (container.children.length <= 3) {
        mostrarErrorPlan("El plan de evaluación debe tener un mínimo de 3 evaluaciones.");
        return;
    }

    const fila = document.getElementById(`eval-row-${id}`);
    if (fila) {
        fila.remove();
        actualizarEstadoBotonAdd();
        document.getElementById('plan-error').classList.add('hidden'); 
    }
}

function actualizarEstadoBotonAdd() {
    const count = document.getElementById('evaluaciones-container').children.length;
    document.getElementById('contador-eval').innerText = count;
    
    const btnAdd = document.getElementById('btn-add-eval');
    if (count >= 5) btnAdd.classList.add('hidden');
    else btnAdd.classList.remove('hidden');

    const btnsEliminar = document.querySelectorAll('.btn-eliminar-eval');
    btnsEliminar.forEach(btn => {
        if(count <= 3) btn.classList.add('opacity-40', 'cursor-not-allowed');
        else btn.classList.remove('opacity-40', 'cursor-not-allowed');
    });
}

function mostrarErrorPlan(msg) {
    const div = document.getElementById('plan-error');
    div.innerHTML = msg;
    div.classList.remove('hidden');
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function validarFechasPlanEnTiempoReal(input) {
    if (!input.value) return;

    const claseActual = clasesCreadas.find(c => c.id === planClaseId);
    const val = input.value;
    
    if (val < claseActual.fechaInicio || val > claseActual.fechaFin) {
        mostrarErrorPlan(`La fecha debe estar dentro del rango de la clase (${formatearFecha(claseActual.fechaInicio)} al ${formatearFecha(claseActual.fechaFin)}).`);
        input.value = '';
        return;
    }

    const allInputs = document.querySelectorAll('.eval-fecha-plan');
    for (let otherInput of allInputs) {
        if (otherInput !== input && otherInput.value === val) {
            mostrarErrorPlan("Cruce de Fechas: Ya hay otra evaluación programada para este mismo día.");
            input.value = '';
            return;
        }
    }

    document.getElementById('plan-error').classList.add('hidden');
}

async function guardarPlan() {
    const filas = document.querySelectorAll('#evaluaciones-container > div');
    let planData = [];
    let error = false;
    let sumaPonderacion = 0;
    
    const claseActual = clasesCreadas.find(c => c.id === planClaseId);
    let errorFechas = "";

    filas.forEach(fila => {
        const contenido = fila.querySelector('.eval-tema').value.trim();
        const idActividad = fila.querySelector('.eval-tipo').value;
        const ponderacion = parseInt(fila.querySelector('.eval-ponderacion').value);
        const fPlanif = fila.querySelector('.eval-fecha-plan').value; 

        if (!contenido || !idActividad || !fPlanif || isNaN(ponderacion)) {
            error = true;
        } else {
            if (fPlanif < claseActual.fechaInicio || fPlanif > claseActual.fechaFin) {
                errorFechas = "Todas las fechas deben estar estrictamente dentro del rango del módulo.";
            }
            sumaPonderacion += ponderacion;
            planData.push({ 
                contenidoEvaluar: contenido, 
                escala: 20, 
                ponderacion: ponderacion,
                fechaPlanif: fPlanif,
                actividad: { idActividad: parseInt(idActividad) } 
            });
        }
    });

    if (error) { mostrarErrorPlan("Por favor, complete todos los campos en todas las evaluaciones."); return; }
    if (errorFechas !== "") { mostrarErrorPlan(errorFechas); return; }
    if (sumaPonderacion !== 100) { mostrarErrorPlan(`El total de los pesos debe sumar exactamente 100%. Actualmente la suma es <b>${sumaPonderacion}%</b>.`); return; }
    if (planData.length < 3 || planData.length > 5) { mostrarErrorPlan("Debe registrar entre 3 y 5 evaluaciones."); return; }

    const fechasSet = new Set();
    for(let i=0; i<planData.length; i++) {
        if (fechasSet.has(planData[i].fechaPlanif)) {
            mostrarErrorPlan("Cruce de Fechas: No puedes programar dos evaluaciones para el mismo día.");
            return;
        }
        fechasSet.add(planData[i].fechaPlanif);
    }

    const saveBtn = document.getElementById('btn-guardar-plan');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-round animate-spin text-sm">refresh</span> Guardando...';

    const payload = {
        idClaseTeologia: planClaseId,
        evaluaciones: planData
    };

    try {
        const res = await fetch(`/api/planificacion/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
       
        if (res.ok) {
             await cargarDatosIniciales(); 
             mostrarExito("¡Plan Guardado!", "El plan de evaluación ha sido registrado exitosamente para esta clase.");
        } else { mostrarErrorPlan(await res.text()); }
    } catch(e) { mostrarErrorPlan("Error de conexión al guardar el plan de evaluación."); } 
    finally { saveBtn.disabled = false; saveBtn.innerHTML = originalText; }
}

async function verPlan(idClase) {
    const clase = clasesCreadas.find(c => c.id === idClase);
    if (!clase) return;

    document.getElementById(`menu-clase-${idClase}`)?.classList.add('hidden');
    document.getElementById('ver-plan-carrera').innerText = clase.carrera;
    document.getElementById('ver-plan-materia').innerText = clase.temaNombre || "Unidad Curricular";

    const tbody = document.getElementById('tabla-ver-plan-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500 font-medium"><span class="material-icons-round animate-spin">refresh</span> Cargando...</td></tr>';
    
    toggleModal('modal-ver-plan');

    try {
        const res = await fetch(`/api/planificacion/clase/${idClase}`);
        if (res.ok && res.status !== 204) {
            const evaluaciones = await res.json();
            tbody.innerHTML = '';
            
            evaluaciones.forEach(ev => {
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td class="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">${ev.contenido}</td>
                        <td class="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            <span class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600">${ev.actividad}</span>
                        </td>
                        <td class="px-5 py-4 text-sm font-black text-center text-primary dark:text-blue-400 text-lg">${ev.ponderacion}%</td>
                        <td class="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap text-center">
                            ${formatearFecha(ev.fecha)}
                        </td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500 font-bold">Error al cargar el plan de evaluación.</td></tr>';
    }
}

// ============================================================================
// GESTIÓN DE CALIFICACIONES (EVALUAR A LOS ESTUDIANTES)
// ============================================================================
async function abrirModalEvaluacion(idClase) {
    const clase = clasesCreadas.find(c => c.id === idClase);
    if (!clase) return;

    const isEditable = clase.periodo === periodoActual;

    document.getElementById('eval-curso-id').value = idClase;
    document.getElementById('titulo-evaluacion').innerText = isEditable ? `Evaluar: ${clase.temaNombre}` : `Ver Notas: ${clase.temaNombre}`;
    document.getElementById('subtitulo-evaluacion').innerText = isEditable ? "Ingresa la nota del 1 al límite máximo" : "El año escolar está cerrado.";
    document.getElementById('icon-eval-title').innerText = isEditable ? 'checklist' : 'grading';
    
    const btnGuardar = document.getElementById('btn-guardar-eval');
    btnGuardar.classList.toggle('hidden', !isEditable);

    const selectPlan = document.getElementById('eval-plan-select');
    selectPlan.innerHTML = '<option value="">Cargando evaluaciones...</option>';
    currentPlanificaciones = [];

    const tbody = document.getElementById('eval-estudiantes-body');
    tbody.innerHTML = '';

    document.getElementById('modal-evaluar').classList.remove('hidden');

    try {
        const res = await fetch(`/api/planificacion/clase/${idClase}`);
        if (res.ok && res.status !== 204) {
            currentPlanificaciones = await res.json();
            
            selectPlan.innerHTML = '<option value="">Seleccione la evaluación a calificar...</option>';
            currentPlanificaciones.forEach(p => {
                selectPlan.innerHTML += `<option value="${p.idPlanificacion}" data-escala="${p.escala}">
                    ${p.contenido} (${p.ponderacion}%) - Max: ${p.escala}pts
                </option>`;
            });

            selectPlan.onchange = async (e) => {
                const idPlan = e.target.value;
                if (!idPlan) { tbody.innerHTML = ''; return; }

                const selectedOption = e.target.options[e.target.selectedIndex];
                const escalaMax = parseInt(selectedOption.getAttribute('data-escala'));

                tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-slate-500 font-medium">Cargando estudiantes...</td></tr>';

                try {
                    const resNotas = await fetch(`/api/clases-teologia/clase/${idClase}/planificacion/${idPlan}/notas`);
                    let notasMap = {};
                    if (resNotas.ok) notasMap = await resNotas.json();

                    tbody.innerHTML = '';

                    clase.estudiantes.forEach(est => {
                        const idEst = est.idPersona || est.idUsuario;
                        const notaExistente = notasMap[idEst] !== undefined ? notasMap[idEst] : '';

                        tbody.innerHTML += `
                            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700/50">
                                <td class="px-5 py-3.5">
                                    <div class="flex flex-col">
                                        <span class="text-sm font-bold text-slate-900 dark:text-white uppercase">${est.nombre} ${est.apellido}</span>
                                        <span class="text-[11px] font-bold tracking-wider text-slate-400">${est.cedula}</span>
                                    </div>
                                </td>
                                <td class="px-5 py-3.5 text-center align-middle">
                                    <div class="flex items-center justify-center gap-2">
                                        <input type="text" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 2);" data-est-id="${idEst}" value="${notaExistente}" ${!isEditable ? 'disabled' : ''} class="nota-input w-20 text-center rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 font-bold focus:ring-primary transition-all disabled:opacity-50">
                                        <span class="text-xs font-bold text-slate-400">/ ${escalaMax}</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });

                } catch(e) {
                    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-red-500 font-bold">Error cargando estudiantes.</td></tr>';
                }
            };
        } else {
            selectPlan.innerHTML = '<option value="">No hay plan de evaluación registrado.</option>';
        }
    } catch (e) {
        selectPlan.innerHTML = '<option value="">Error al cargar la planificación.</option>';
    }
}

async function guardarNotas() {
    const idClase = document.getElementById('eval-curso-id').value;
    const selectPlan = document.getElementById('eval-plan-select');
    const idPlan = selectPlan.value;
    
    if (!idPlan) { mostrarAlerta("Evaluación no seleccionada", "Seleccione la evaluación a calificar antes de guardar."); return; }

    const selectedOption = selectPlan.options[selectPlan.selectedIndex];
    const escalaMax = parseInt(selectedOption.getAttribute('data-escala'));

    const inputs = document.querySelectorAll('.nota-input');
    const evaluaciones = [];
    let errorRango = false;

    inputs.forEach(inp => {
        const val = inp.value;
        if (val !== "") {
            const notaNum = parseInt(val);
            if (notaNum < 1 || notaNum > escalaMax) {
                errorRango = true;
                inp.classList.add('border-red-500', 'ring-red-500');
            } else {
                inp.classList.remove('border-red-500', 'ring-red-500');
                evaluaciones.push({
                    idEstudiante: parseInt(inp.getAttribute('data-est-id')),
                    puntaje: notaNum
                });
            }
        }
    });

    if (errorRango) {
        mostrarAlerta("Límite Excedido", `Hay notas fuera del límite permitido (1 al ${escalaMax}). Corríjalas antes de guardar.`);
        return;
    }

    if (evaluaciones.length === 0) {
        mostrarAlerta("Campos Vacíos", "Debe ingresar al menos una nota para guardar.");
        return;
    }

    const btnGuardar = document.getElementById('btn-guardar-eval');
    const originalText = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span class="material-icons-round animate-spin text-sm">refresh</span> Guardando...';

    try {
        const res = await fetch('/api/clases-teologia/guardar-notas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idClaseTeologia: parseInt(idClase), 
                idPlanificacion: parseInt(idPlan), 
                notas: evaluaciones 
            })
        });
        
        if (res.ok) {
            mostrarExito("¡Notas Guardadas!", "Las calificaciones han sido registradas en el sistema de manera exitosa.");
        } else {
            mostrarAlerta("Error al Guardar", await res.text());
        }
    } catch (e) {
        mostrarAlerta("Error de Conexión", "No se pudo conectar con el servidor al guardar las notas.");
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = originalText;
    }
}