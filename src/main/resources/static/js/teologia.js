// ============================================================================
// GESTIÓN DE TEOLOGÍA (PENSUM / UNIDADES CURRICULARES)
// ============================================================================

let teologiaData = [];
let editingTeologiaId = null;

// ⚡ VARIABLES DE PAGINACIÓN: CUADRÍCULA PRINCIPAL
let currentPageGrid = 1;
const itemsPerPageGrid = 6;

window.addEventListener('DOMContentLoaded', () => {
    fetchTeologias();
});

async function fetchTeologias() {
    try {
        const res = await fetch('/api/teologia/todos');
        if (res.ok) {
            teologiaData = await res.json();
            renderAllTeologias(teologiaData);
        }
    } catch (e) { console.error("Error cargando teologías:", e); }
}

// --- BUSCADOR ---
function filterTeologias() {
    currentPageGrid = 1; // ⚡ Reinicia la página al buscar
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    if (!q) { renderAllTeologias(teologiaData); return; }
    
    const filtrados = teologiaData.filter(t => 
        t.denominacion.toLowerCase().includes(q) || 
        t.descripcion.toLowerCase().includes(q) ||
        t.temas.some(tema => tema.denominacion.toLowerCase().includes(q))
    );
    renderAllTeologias(filtrados);
}

// --- GESTIÓN DE TEMAS (MÍNIMO 5, ILIMITADOS) ---
function addTemaField(title = '') {
    const container = document.getElementById('temas-container');
    const currentCount = container.querySelectorAll('.tema-entry').length;
    
    const newTema = document.createElement('div');
    newTema.className = "p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 relative group tema-entry flex gap-3 items-center animate-fade-in";
    
    newTema.innerHTML = `
        <div class="flex-1 flex items-center gap-3">
            <span class="text-slate-400 font-bold num-tema">${currentCount + 1}.</span>
            <input type="text" value="${title}" placeholder="Nombre del tema..." class="tema-name-input w-full rounded-lg border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:border-primary">
        </div>
        <button type="button" onclick="eliminarTema(this)" class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg text-red-600 transition-colors" title="Eliminar tema">
            <span class="material-icons-round text-sm">delete</span>
        </button>
    `;
    container.appendChild(newTema);
    reenumerarTemas();
}

function eliminarTema(btn) {
    const container = document.getElementById('temas-container');
    const currentCount = container.querySelectorAll('.tema-entry').length;
    
    if (currentCount <= 5) {
        showError("No puedes eliminar este campo. El mínimo obligatorio es de 5 temas por unidad.");
        return;
    }
    
    document.getElementById('teologia-error-msg').classList.add('hidden'); 
    btn.closest('.tema-entry').remove();
    reenumerarTemas();
}

function reenumerarTemas() {
    const entries = document.querySelectorAll('.tema-entry');
    entries.forEach((entry, index) => {
        entry.querySelector('.num-tema').textContent = `${index + 1}.`;
    });
}

// --- MODALES Y GUARDADO ---
function openTeologiaModal(isEdit = false, teologiaId = null) {
    document.getElementById('teologia-modal').classList.remove('hidden');
    document.getElementById('temas-container').innerHTML = '';
    document.getElementById('teologia-error-msg').classList.add('hidden');
    
    if (isEdit && teologiaId) {
        editingTeologiaId = teologiaId;
        const teo = teologiaData.find(t => t.idTeologia === teologiaId);
        document.getElementById('teologia-modal-title').textContent = 'Editar Unidad de Teología';
        document.getElementById('save-teologia-btn').textContent = 'Guardar Cambios';
        
        document.getElementById('teologia-name-input').value = teo.denominacion;
        document.getElementById('teologia-desc-input').value = teo.descripcion;

        teo.temas.forEach(t => addTemaField(t.denominacion));

        const temasActuales = document.querySelectorAll('.tema-entry').length;
        if (temasActuales < 5) {
            for (let i = temasActuales; i < 5; i++) addTemaField();
        }

    } else {
        editingTeologiaId = null;
        document.getElementById('teologia-modal-title').textContent = 'Nueva Unidad de Teología';
        document.getElementById('save-teologia-btn').textContent = 'Guardar Unidad';
        document.getElementById('teologia-name-input').value = '';
        document.getElementById('teologia-desc-input').value = '';

        for (let i = 0; i < 5; i++) {
            addTemaField();
        }
    }
}

function closeTeologiaModal() { document.getElementById('teologia-modal').classList.add('hidden'); }

function showError(msg) {
    const errorMsgContainer = document.getElementById('teologia-error-msg');
    document.getElementById('teologia-error-text').innerText = msg;
    errorMsgContainer.classList.remove('hidden');
    errorMsgContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveTeologia() {
    document.getElementById('teologia-error-msg').classList.add('hidden');
    
    const denominacion = document.getElementById('teologia-name-input').value.trim();
    const descripcion = document.getElementById('teologia-desc-input').value.trim();
    
    if (!denominacion || !descripcion) { 
        showError("El nombre y la descripción son obligatorios."); 
        return; 
    }

    const claseRepetida = teologiaData.find(teo => 
        teo.denominacion.toLowerCase() === denominacion.toLowerCase() && 
        teo.idTeologia !== editingTeologiaId
    );
    
    if (claseRepetida) {
        showError(`Ya existe una unidad de teología llamada "${claseRepetida.denominacion}".`);
        return;
    }

    const temas = [];
    let errorEnTemas = false;
    
    const nombresTemasSet = new Set();
    let temaDuplicadoLocal = null;

    document.querySelectorAll('.tema-entry').forEach(entry => {
        const t = entry.querySelector('.tema-name-input').value.trim();
        if (t) {
            const tLower = t.toLowerCase();
            if (nombresTemasSet.has(tLower)) {
                temaDuplicadoLocal = t; 
            }
            nombresTemasSet.add(tLower);
            temas.push({ denominacion: t });
        } else {
            errorEnTemas = true;
        }
    });

    if (errorEnTemas || temas.length < 5) { 
        showError("Debes completar el nombre de todos los temas en pantalla (Mínimo 5)."); 
        return; 
    }

    if (temaDuplicadoLocal) {
        showError(`El tema "${temaDuplicadoLocal}" está escrito varias veces en el formulario. Los temas no se pueden repetir.`);
        return;
    }

    let temaEnOtraClase = null;
    let nombreClaseAjena = null;

    for (const teo of teologiaData) {
        if (teo.idTeologia === editingTeologiaId) continue; 
        for (const tema of teo.temas) {
            if (nombresTemasSet.has(tema.denominacion.toLowerCase())) {
                temaEnOtraClase = tema.denominacion;
                nombreClaseAjena = teo.denominacion;
                break;
            }
        }
        if (temaEnOtraClase) break;
    }

    if (temaEnOtraClase) {
        showError(`El tema "${temaEnOtraClase}" no se puede usar porque ya pertenece a la clase "${nombreClaseAjena}".`);
        return;
    }

    const payload = {
        denominacion: denominacion,
        descripcion: descripcion,
        temas: temas
    };

    const url = editingTeologiaId ? `/api/teologia/modificar/${editingTeologiaId}` : '/api/teologia/crear';
    const method = editingTeologiaId ? 'PUT' : 'POST';

    const saveBtn = document.getElementById('save-teologia-btn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-round animate-spin text-sm">refresh</span> Guardando...';

    try {
        const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { 
            closeTeologiaModal(); 
            fetchTeologias(); 
        } else { 
            showError(await res.text()); 
        }
    } catch (e) { 
        showError("Error de conexión con el servidor."); 
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async function toggleEstado(id) {
    const t = teologiaData.find(x => x.idTeologia === id);
    const nuevo = t.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
        const res = await fetch(`/api/teologia/${id}/estado`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevo })
        });
        if (res.ok) fetchTeologias();
    } catch (e) {}
}

function openTemasListModal(id) {
    const t = teologiaData.find(x => x.idTeologia === id);
    document.getElementById('temas-list-modal-title').textContent = 'Temas de: ' + t.denominacion;
    
    const content = document.getElementById('temas-list-content');
    content.innerHTML = `<p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Total de temas: ${t.temas.length}</p>`;
    
    t.temas.forEach((tema, idx) => {
        content.innerHTML += `
        <div class="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 flex gap-3 items-center mb-2">
            <span class="font-bold text-primary dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs">${idx + 1}</span>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm">${tema.denominacion}</h4>
        </div>`;
    });
    document.getElementById('temas-list-modal').classList.remove('hidden');
}

function closeTemasListModal() { document.getElementById('temas-list-modal').classList.add('hidden'); }
function toggleCardMenu(btn) { btn.nextElementSibling.classList.toggle('hidden'); }

// --- 🖥️ RENDERIZADO VISUAL CON PAGINACIÓN 🖥️ ---
function renderAllTeologias(lista = teologiaData) {
    const container = document.getElementById('teologia-container');
    container.innerHTML = ''; 

    // ⚡ Construcción de contenedor de paginación
    let paginationContainer = document.getElementById('grid-pagination-controls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'grid-pagination-controls';
        paginationContainer.className = 'w-full mt-8 flex justify-center items-center gap-2';
        container.after(paginationContainer);
    } else {
        paginationContainer.innerHTML = '';
    }

    if (!lista || lista.length === 0) {
        container.innerHTML = `
        <div class="col-span-full text-center p-12 bg-white dark:bg-slate-800 rounded-3xl ios-shadow border border-slate-100 dark:border-slate-700">
            <span class="material-icons-round text-5xl text-slate-300 dark:text-slate-600 mb-3 block">menu_book</span>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">No hay Teologías registradas</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">Haz clic en el botón '+' para agregar tu primera unidad.</p>
        </div>`;
        return;
    }

    // ⚡ Lógica Matemática de Paginación ⚡
    const totalPages = Math.ceil(lista.length / itemsPerPageGrid);
    if (currentPageGrid > totalPages && totalPages > 0) currentPageGrid = totalPages;

    const startIndex = (currentPageGrid - 1) * itemsPerPageGrid;
    const endIndex = startIndex + itemsPerPageGrid;
    const paginatedLista = lista.slice(startIndex, endIndex);

    paginatedLista.forEach(teo => {
        const inactivo = teo.estado === 'Inactivo' ? 'opacity-60 grayscale-[0.5]' : '';
        const badge = teo.estado === 'Activo' ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs rounded-lg font-bold">Activo</span>' : '<span class="px-2 py-0.5 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs rounded-lg font-bold">Inactivo</span>';
        
        let temasHtml = teo.temas.slice(0, 3).map((t, i) => `<span class="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 truncate max-w-[100%]">${i+1}. ${t.denominacion}</span>`).join('');
        let moreBtn = teo.temas.length > 3 ? `<button class="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-primary dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 transition-colors" onclick="openTemasListModal(${teo.idTeologia})">+${teo.temas.length - 3} más</button>` : '';

        container.innerHTML += `
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-200 dark:border-slate-700 relative ${inactivo} animate-fade-in flex flex-col">
            <div class="flex items-start justify-between mb-3">
                <div class="flex flex-col"><h3 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${teo.denominacion}</h3><div class="mt-1">${badge}</div></div>
                <div class="relative">
                    <button class="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-full transition-colors" onclick="toggleCardMenu(this)"><span class="material-icons-round">more_vert</span></button>
                    <div class="hidden absolute right-0 mt-2 w-40 bg-white dark:bg-slate-700 rounded-xl ios-shadow border border-slate-100 dark:border-slate-600 z-10 shadow-xl overflow-hidden">
                        <button onclick="openTeologiaModal(true, ${teo.idTeologia})" class="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2 transition-colors"><span class="material-icons-round text-sm">edit</span> Editar</button>
                        <button onclick="toggleEstado(${teo.idTeologia})" class="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2 transition-colors"><span class="material-icons-round text-sm">${teo.estado === 'Activo' ? 'block' : 'check_circle'}</span> ${teo.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                    </div>
                </div>
            </div>
            
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-5 flex-1 line-clamp-2">${teo.descripcion}</p>
            
            <div class="mt-auto">
                <p class="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">TEMAS REGISTRADOS (${teo.temas.length})</p>
                <div class="flex flex-wrap gap-2">${temasHtml}${moreBtn}</div>
            </div>
        </div>`;
    });

    // ⚡ Construcción de Botones de Paginación ⚡
    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_left</span>';
        prevBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === 1 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        prevBtn.disabled = currentPageGrid === 1;
        prevBtn.onclick = () => { if(currentPageGrid > 1) { currentPageGrid--; renderAllTeologias(lista); } };
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            pageBtn.className = `w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${currentPageGrid === i ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
            pageBtn.onclick = () => { currentPageGrid = i; renderAllTeologias(lista); };
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<span class="material-icons-round text-sm">chevron_right</span>';
        nextBtn.className = `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentPageGrid === totalPages ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 ios-shadow'}`;
        nextBtn.disabled = currentPageGrid === totalPages;
        nextBtn.onclick = () => { if(currentPageGrid < totalPages) { currentPageGrid++; renderAllTeologias(lista); } };
        paginationContainer.appendChild(nextBtn);
    }
}