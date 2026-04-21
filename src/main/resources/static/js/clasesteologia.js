// --- Lógica Específica para Gestión de Teología ---

// --- Base de Datos Simulada ---
let periodoActual = "2026-I";

const curriculum = {
    "Con Jesús": [
        "1. Dar a conocer su nombre.",
        "2. Establece a Jesús en los corazones.",
        "3. Mi identidad Jesús.",
        "4. Dónde hallar a Díos."
    ],
    "Con uno Mismo": [
        "5. Amor y misericordia.",
        "6. No tengo derecho a permanecer ofendido.",
        "7. Hazme ver lo que no veo.",
        "8. Eres libre."
    ],
    "Con todos los demás": [
        "9. Dios no ah terminado en ti, tampoco en tu hermano.",
        "10. Si sabes que tu hermano lo está haciendo mal es porque tú lo sabes hacer mejor.",
        "11. No hagas a otro lo que no quieres que te hagan a tí.",
        "12. Amor al prójimo."
    ],
    "Con el trabajo": [
        "13. Pasión y sacrificio.",
        "14. La grandeza del servicio.",
        "15. Nadie da lo que no tiene.",
        "16. La integridad no puede ser supervisada."
    ],
    "Con la guerra espiritual": [
        "17. Soy hombre puesto bajo autoridad.",
        "18. El poder está en tu boca.",
        "19. Un soldado dividido no tiene espada.",
        "20. Marcando la diferencia."
    ]
};

const materiasAprobadas = {
    "V-12345678": ["1. Dar a conocer su nombre.", "5. Amor y misericordia."],
    "E-87654321": [],
    "V-23456789": [],
    "V-34567890": []
};

const estudiantesDB = [
    { cedula: "V-12345678", nombre: "Juan", apellido: "Pérez" },
    { cedula: "E-87654321", nombre: "Robert", apellido: "Smith" },
    { cedula: "V-23456789", nombre: "María", apellido: "Gómez" },
    { cedula: "V-34567890", nombre: "Carlos", apellido: "Ruiz" },
    { cedula: "V-45678901", nombre: "Ana", apellido: "Martínez" }
];

let estudiantesClase = [];
let clasesCreadas = [];
let currentClassId = null;

// --- Inicialización ---
window.onload = () => {
    document.getElementById('display-periodo').textContent = periodoActual;
    document.getElementById('badge-periodo').textContent = periodoActual;
    
    const selectCarrera = document.getElementById('clase-carrera');
    Object.keys(curriculum).forEach(carrera => {
        selectCarrera.innerHTML += `<option value="${carrera}">${carrera}</option>`;
    });

    document.addEventListener('click', function(event) {
        const container = document.getElementById('busqueda-container');
        if (container && !container.contains(event.target)) {
            ocultarSugerencias();
        }
        
        if(!event.target.closest('.btn-menu-clase') && !event.target.closest('.card-menu-dropdown')) {
            document.querySelectorAll('.card-menu-dropdown').forEach(m => m.classList.add('hidden'));
        }
    });

    renderizarGridClases();
};

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.toggle('hidden');
        if(modalId === 'modal-clase' && !modal.classList.contains('hidden')) {
            limpiarFormularioClase();
        }
    }
}

function guardarPeriodo() {
    const nuevoPeriodo = document.getElementById('nuevo-periodo').value.trim();
    if(nuevoPeriodo) {
        periodoActual = nuevoPeriodo;
        document.getElementById('display-periodo').textContent = periodoActual;
        document.getElementById('badge-periodo').textContent = periodoActual;
        toggleModal('modal-periodo');
    }
}

function actualizarMaterias() {
    const carrera = document.getElementById('clase-carrera').value;
    const selectMateria = document.getElementById('clase-materia');
    selectMateria.innerHTML = '<option value="">Seleccione una unidad curricular...</option>';
    
    if(carrera && curriculum[carrera]) {
        curriculum[carrera].forEach(materia => {
            selectMateria.innerHTML += `<option value="${materia}">${materia}</option>`;
        });
    }
    revalidarListaPorMateria();
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
        mostrarError(`<b>¡Atención!</b> Al cambiar la materia seleccionada a <b>${materia}</b>, se removieron automáticamente los siguientes estudiantes que ya la habían cursado y aprobado:<br><ul class="list-disc pl-5 mt-2"><li>` + removidos.join("</li><li>") + `</li></ul>`);
    } else {
        document.getElementById('estudiante-error').classList.add('hidden');
    }
}

// --- Búsqueda y Autocompletado ---
function quitarAcentos(cadena) {
    return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buscarPorCedula() {
    const inputCedula = document.getElementById('est-cedula');
    const inputNombre = document.getElementById('est-nombre');
    const inputApellido = document.getElementById('est-apellido');
    
    const query = inputCedula.value.trim();
    const numericQuery = query.replace(/\D/g, ''); 

    if (query === '' || inputNombre.readOnly) {
        inputNombre.value = '';
        inputApellido.value = '';
        inputNombre.readOnly = false;
        inputApellido.readOnly = false;
        inputNombre.classList.remove('bg-slate-100', 'dark:bg-slate-700/50');
        inputApellido.classList.remove('bg-slate-100', 'dark:bg-slate-700/50');
    }

    const suggestionsBox = document.getElementById('suggestions-box-cedula');
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';

    if (numericQuery.length < 3) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    const resultados = estudiantesDB.filter(e => e.cedula.replace(/\D/g, '').includes(numericQuery));

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50 last:border-0 flex items-center justify-between";
            div.innerHTML = `<span class="font-bold text-primary dark:text-blue-400">${est.cedula}</span> <span class="text-xs text-slate-500">${est.nombre} ${est.apellido}</span>`;
            div.onclick = () => seleccionarEstudiante(est);
            suggestionsBox.appendChild(div);
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.classList.add('hidden');
    }
}

function buscarPorTexto(inputId, boxId) {
    const inputElement = document.getElementById(inputId);
    
    if(inputElement.readOnly) return; 

    const query = quitarAcentos(inputElement.value.toLowerCase().trim());
    const suggestionsBox = document.getElementById(boxId);
    
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';

    if (query.length < 2) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    const resultados = estudiantesDB.filter(e => {
        const nombreNorm = quitarAcentos(e.nombre.toLowerCase());
        const apellidoNorm = quitarAcentos(e.apellido.toLowerCase());
        return nombreNorm.includes(query) || apellidoNorm.includes(query);
    });

    if (resultados.length > 0) {
        resultados.forEach(est => {
            const div = document.createElement('div');
            div.className = "px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700/50 last:border-0";
            div.innerHTML = `<span class="font-semibold">${est.nombre} ${est.apellido}</span> <span class="text-xs text-slate-500">(${est.cedula})</span>`;
            div.onclick = () => seleccionarEstudiante(est);
            suggestionsBox.appendChild(div);
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.classList.add('hidden');
    }

    const otroBoxId = boxId === 'suggestions-box-nombre' ? 'suggestions-box-apellido' : 'suggestions-box-nombre';
    const otroBox = document.getElementById(otroBoxId);
    if(otroBox) otroBox.classList.add('hidden');
    document.getElementById('suggestions-box-cedula').classList.add('hidden');
}

function seleccionarEstudiante(est) {
    document.getElementById('est-cedula').value = est.cedula; 
    document.getElementById('est-nombre').value = est.nombre;
    document.getElementById('est-apellido').value = est.apellido;
    document.getElementById('est-nombre').readOnly = true;
    document.getElementById('est-apellido').readOnly = true;
    document.getElementById('est-nombre').classList.add('bg-slate-100', 'dark:bg-slate-700/50');
    document.getElementById('est-apellido').classList.add('bg-slate-100', 'dark:bg-slate-700/50');
    ocultarSugerencias();
}

function ocultarSugerencias() {
    const boxCedula = document.getElementById('suggestions-box-cedula');
    const boxNombre = document.getElementById('suggestions-box-nombre');
    const boxApellido = document.getElementById('suggestions-box-apellido');
    if(boxCedula) boxCedula.classList.add('hidden');
    if(boxNombre) boxNombre.classList.add('hidden');
    if(boxApellido) boxApellido.classList.add('hidden');
}

function limpiarCamposEstudiante() {
    document.getElementById('est-cedula').value = "";
    document.getElementById('est-nombre').value = "";
    document.getElementById('est-apellido').value = "";
    document.getElementById('est-nombre').readOnly = false;
    document.getElementById('est-apellido').readOnly = false;
    document.getElementById('est-nombre').classList.remove('bg-slate-100', 'dark:bg-slate-700/50');
    document.getElementById('est-apellido').classList.remove('bg-slate-100', 'dark:bg-slate-700/50');
}

// --- Matricular Estudiantes en la Clase ---
function agregarEstudiante() {
    let inputCedulaOriginal = document.getElementById('est-cedula').value.trim().toUpperCase();
    const nombre = document.getElementById('est-nombre').value.trim();
    const apellido = document.getElementById('est-apellido').value.trim();
    const materia = document.getElementById('clase-materia').value;
    const errorContainer = document.getElementById('estudiante-error');

    errorContainer.classList.add('hidden');

    if(!materia) {
        mostrarError("Por favor seleccione primero una Unidad Curricular antes de agregar estudiantes.");
        return;
    }

    if(!inputCedulaOriginal || !nombre || !apellido) {
        mostrarError("Por favor complete los datos del estudiante.");
        return;
    }

    let cedulaFinal = inputCedulaOriginal;
    if (/^\d+$/.test(inputCedulaOriginal)) {
        const estDB = estudiantesDB.find(e => e.cedula.replace(/\D/g, '') === inputCedulaOriginal);
        if (estDB) {
            cedulaFinal = estDB.cedula; 
        } else {
            cedulaFinal = "V-" + inputCedulaOriginal; 
        }
    }

    if(estudiantesClase.some(e => e.cedula === cedulaFinal)) {
        mostrarError("El estudiante ya está agregado a esta clase.");
        return;
    }

    const aprobadas = materiasAprobadas[cedulaFinal] || [];
    if(aprobadas.includes(materia)) {
        const msj = `El estudiante <b>${nombre.toUpperCase()} ${apellido.toUpperCase()}</b> con la cédula de identidad <b>${cedulaFinal}</b> ya cursó y aprobó esta materia.`;
        mostrarError(msj);
        limpiarCamposEstudiante(); 
        return;
    }

    estudiantesClase.push({ cedula: cedulaFinal, nombre, apellido });
    renderizarTablaMatricula();
    limpiarCamposEstudiante(); 
}

function mostrarError(htmlMsg) {
    const errorContainer = document.getElementById('estudiante-error');
    errorContainer.innerHTML = htmlMsg;
    errorContainer.classList.remove('hidden');
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
        tr.className = "border-b border-slate-100 dark:border-slate-700/50";
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">${est.cedula}</td>
            <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">${est.nombre} ${est.apellido}</td>
            <td class="px-4 py-3 text-right">
                <button type="button" onclick="eliminarEstudiante(${index})" class="text-red-500 hover:text-red-700 transition-colors"><span class="material-icons-round text-lg">delete</span></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarEstudiante(index) {
    estudiantesClase.splice(index, 1);
    renderizarTablaMatricula();
}

function limpiarFormularioClase() {
    document.getElementById('form-clase').reset();
    document.getElementById('clase-materia').innerHTML = '<option value="">Seleccione una unidad curricular...</option>';
    document.getElementById('estudiante-error').classList.add('hidden');
    estudiantesClase = [];
    renderizarTablaMatricula();
}

// --- Guardado y Grid de Clases ---
function guardarClase() {
    const carrera = document.getElementById('clase-carrera').value;
    const materia = document.getElementById('clase-materia').value;

    if(!carrera || !materia) return alert("Debe seleccionar Módulo y Unidad Curricular.");
    if(estudiantesClase.length === 0) return alert("Debe agregar al menos un estudiante.");

    for (let est of estudiantesClase) {
        const aprobadas = materiasAprobadas[est.cedula] || [];
        if (aprobadas.includes(materia)) {
            mostrarError(`No se puede crear la clase. El estudiante <b>${est.nombre.toUpperCase()} ${est.apellido.toUpperCase()}</b> con la cédula <b>${est.cedula}</b> ya aprobó la materia seleccionada. Por favor, remuévalo de la lista.`);
            return; 
        }
    }

    const nuevaClase = {
        id: Date.now(),
        periodo: periodoActual,
        carrera: carrera,
        materia: materia,
        estudiantes: [...estudiantesClase],
        plan: [], 
        oculto: false
    };

    clasesCreadas.push(nuevaClase);
    renderizarGridClases();
    toggleModal('modal-clase');
}

function toggleMenuClase(idStr) {
    document.querySelectorAll('.card-menu-dropdown').forEach(m => {
        if(m.id !== idStr) m.classList.add('hidden');
    });
    document.getElementById(idStr).classList.toggle('hidden');
}

function renderizarGridClases() {
    const container = document.getElementById('grid-container');
    const emptyState = document.getElementById('empty-state');
    
    if(clasesCreadas.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = '';

    clasesCreadas.forEach(clase => {
        const card = document.createElement('div');
        card.className = `bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 relative flex flex-col transition-all duration-300 ${clase.oculto ? 'opacity-70 bg-slate-50 dark:bg-slate-800/80' : ''}`;
        
        let btnCalificarHTML = '';
        if(clase.plan.length > 0) {
            btnCalificarHTML = `
                <button onclick="abrirModalCalificar(${clase.id})" class="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors border border-green-200 dark:border-green-800/50">
                    <span class="material-icons-round text-lg">fact_check</span> Evaluar / Calificar
                </button>
            `;
        }

        let planVisualStatus = clase.plan.length > 0 
            ? `<span class="text-xs font-bold text-primary dark:text-blue-400 bg-primary/10 px-2 py-1 rounded-md">${clase.plan.length} Evaluaciones</span>`
            : `<span class="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">Sin plan</span>`;

        let badgeOculto = clase.oculto 
            ? `<span class="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1" title="No visible en Noticias"><span class="material-icons-round text-[14px]">visibility_off</span> Oculto</span>`
            : '';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg border border-primary/20">${clase.periodo}</span>
                    ${badgeOculto}
                </div>
                <div class="relative">
                    <button class="btn-menu-clase p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" onclick="toggleMenuClase('menu-${clase.id}')">
                        <span class="material-icons-round text-lg">more_vert</span>
                    </button>
                    <div id="menu-${clase.id}" class="card-menu-dropdown hidden absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-30 py-1">
                        <button class="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                            <span class="material-icons-round text-[18px] text-slate-400">edit</span> Editar Clase
                        </button>
                        <button class="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2" onclick="toggleOculto(${clase.id})">
                            <span class="material-icons-round text-[18px] text-slate-400">${clase.oculto ? 'visibility' : 'visibility_off'}</span> ${clase.oculto ? 'Mostrar en Noticias' : 'Quitar de Noticias'}
                        </button>
                        <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                        <button class="w-full text-left px-4 py-2 text-sm text-primary font-medium hover:bg-primary/5 flex items-center gap-2" onclick="abrirModalPlan(${clase.id})">
                            <span class="material-icons-round text-[18px]">assignment</span> Agregar Plan de Eval.
                        </button>
                    </div>
                </div>
            </div>
            
            <h3 class="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-1 ${clase.oculto ? 'text-slate-500 dark:text-slate-400' : ''}">${clase.materia}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">${clase.carrera}</p>
            
            <div class="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span class="material-icons-round text-lg">groups</span>
                    <span class="text-sm font-semibold">${clase.estudiantes.length} Matriculados</span>
                </div>
                ${planVisualStatus}
            </div>
            ${btnCalificarHTML}
        `;
        container.appendChild(card);
    });
}

function toggleOculto(id) {
    const clase = clasesCreadas.find(c => c.id === id);
    clase.oculto = !clase.oculto;
    renderizarGridClases();
}

// --- Gestión Plan de Evaluación ---
function abrirModalPlan(id) {
    currentClassId = id;
    const clase = clasesCreadas.find(c => c.id === id);
    
    for(let i=1; i<=5; i++) document.getElementById(`eval-${i}`).value = '';
    
    clase.plan.forEach((p, idx) => {
        if(idx < 5) document.getElementById(`eval-${idx+1}`).value = p.nombre;
    });
    
    toggleModal('modal-plan');
    document.getElementById(`menu-${id}`).classList.add('hidden');
}

function guardarPlan() {
    const clase = clasesCreadas.find(c => c.id === currentClassId);
    let nuevoPlan = [];
    
    for(let i=1; i<=5; i++) {
        const nombreEval = document.getElementById(`eval-${i}`).value.trim();
        if(nombreEval) {
            const existe = clase.plan.find(p => p.nombre === nombreEval);
            if(existe) {
                nuevoPlan.push(existe);
            } else {
                nuevoPlan.push({ nombre: nombreEval, completada: false, notas: {} });
            }
        }
    }

    if(nuevoPlan.length < 3 || nuevoPlan.length > 5) {
        return alert("Debe agregar un mínimo de 3 y un máximo de 5 evaluaciones.");
    }

    clase.plan = nuevoPlan;
    toggleModal('modal-plan');
    renderizarGridClases();
}

// --- Gestión de Calificaciones ---
function abrirModalCalificar(id) {
    currentClassId = id;
    const clase = clasesCreadas.find(c => c.id === id);
    
    document.getElementById('calificar-titulo').textContent = clase.materia;

    let theadHTML = `<tr><th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estudiante</th>`;
    clase.plan.forEach((p, idx) => {
        theadHTML += `
            <th class="px-4 py-3 text-center w-28 bg-slate-100/50 dark:bg-slate-800/30">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mb-2" title="${p.nombre}">${p.nombre}</div>
                <label class="inline-flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm">
                    <input type="checkbox" id="chk-eval-${idx}" ${p.completada ? 'checked' : ''} class="rounded text-green-500 focus:ring-green-500 w-3.5 h-3.5">
                    <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Hecha</span>
                </label>
            </th>`;
    });
    theadHTML += `</tr>`;
    document.getElementById('calificar-thead').innerHTML = theadHTML;

    let tbodyHTML = '';
    clase.estudiantes.forEach(est => {
        tbodyHTML += `<tr class="border-b border-slate-100 dark:border-slate-700/50">
            <td class="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
                ${est.nombre} ${est.apellido}
                <div class="text-xs text-slate-500 font-normal">${est.cedula}</div>
            </td>`;
        
        clase.plan.forEach((p, idx) => {
            const nota = p.notas[est.cedula] !== undefined ? p.notas[est.cedula] : '';
            tbodyHTML += `
            <td class="px-2 py-3 text-center bg-slate-50/30 dark:bg-slate-800/10">
                <input type="number" min="0" max="20" id="nota-${idx}-${est.cedula}" value="${nota}" placeholder="-" class="w-16 h-8 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm text-center focus:ring-primary font-semibold">
            </td>`;
        });
        tbodyHTML += `</tr>`;
    });
    document.getElementById('calificar-tbody').innerHTML = tbodyHTML;

    toggleModal('modal-calificar');
}

function guardarCalificaciones() {
    const clase = clasesCreadas.find(c => c.id === currentClassId);
    
    clase.plan.forEach((p, idx) => {
        p.completada = document.getElementById(`chk-eval-${idx}`).checked;
        clase.estudiantes.forEach(est => {
            const valInput = document.getElementById(`nota-${idx}-${est.cedula}`).value;
            if(valInput !== '') {
                let nota = parseInt(valInput);
                if(nota < 0) nota = 0;
                if(nota > 20) nota = 20;
                p.notas[est.cedula] = nota;
            } else {
                delete p.notas[est.cedula];
            }
        });
    });

    toggleModal('modal-calificar');
    alert("Evaluaciones y calificaciones guardadas exitosamente.");
}