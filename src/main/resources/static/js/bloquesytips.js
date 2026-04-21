let blocksData = [];
let editingBlockId = null;

window.addEventListener('DOMContentLoaded', () => {
    fetchBlocks();
});

async function fetchBlocks() {
    try {
        const res = await fetch('/api/bloques/todos');
        if (res.ok) {
            blocksData = await res.json();
            renderAllBlocks(blocksData);
        }
    } catch (e) { console.error("Error bloques:", e); }
}

// --- BUSCADOR ---
function filterBlocks() {
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    if (!q) { renderAllBlocks(blocksData); return; }
    
    const filtrados = blocksData.filter(b => 
        b.denominacion.toLowerCase().includes(q) || 
        b.tips.some(t => t.titulo.toLowerCase().includes(q))
    );
    renderAllBlocks(filtrados);
}

// --- TIPS Y VALIDACIONES ---
function checkTipCount() {
    const count = document.querySelectorAll('.tip-entry').length;
    const btn = document.getElementById('btn-add-tip');
    if (btn) {
        if (count >= 4) {
            btn.classList.add('hidden');
        } else {
            btn.classList.remove('hidden');
        }
    }
}

function addTipField(title = '', description = '') {
    const container = document.getElementById('tips-container');
    const currentCount = container.querySelectorAll('.tip-entry').length;
    
    if (currentCount >= 4) {
        showError("Solo se permiten exactamente 4 tips por bloque.");
        return;
    }

    const newTip = document.createElement('div');
    newTip.className = "p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 relative group tip-entry flex gap-4 items-start";
    newTip.innerHTML = `
        <div class="flex-1 space-y-3">
            <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Tip <span class="text-red-500">*</span></label>
                <input type="text" value="${title}" class="tip-name-input w-full rounded-lg border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:border-primary">
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción <span class="text-red-500">*</span></label>
                <textarea rows="2" class="tip-desc-input w-full rounded-lg border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:border-primary">${description}</textarea>
            </div>
        </div>
        <button type="button" onclick="this.closest('.tip-entry').remove(); checkTipCount();" class="mt-6 flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg">
            <span class="font-bold text-2xl text-red-600 leading-none" style="margin-top: -4px;">-</span>
        </button>
    `;
    container.appendChild(newTip);
    checkTipCount();
}

// --- MODALES Y GUARDADO ---
function openBlockModal(isEdit = false, blockId = null) {
    document.getElementById('block-modal').classList.remove('hidden');
    document.getElementById('tips-container').innerHTML = '';
    document.getElementById('block-error-msg').classList.add('hidden');
    
    if (isEdit && blockId) {
        editingBlockId = blockId;
        const block = blocksData.find(b => b.idBloque === blockId);
        document.getElementById('block-modal-title').textContent = 'Editar Bloque';
        document.getElementById('save-block-btn').textContent = 'Guardar Cambios';
        
        document.getElementById('block-name-input').value = block.denominacion;

        block.tips.forEach(t => addTipField(t.titulo, t.descripcion));
    } else {
        editingBlockId = null;
        document.getElementById('block-modal-title').textContent = 'Nuevo Bloque';
        document.getElementById('save-block-btn').textContent = 'Guardar Bloque';
        document.getElementById('block-name-input').value = '';

        for (let i = 0; i < 4; i++) {
            addTipField();
        }
    }
    checkTipCount();
}

function closeBlockModal() { document.getElementById('block-modal').classList.add('hidden'); }

function showError(msg) {
    document.getElementById('block-error-text').innerText = msg;
    document.getElementById('block-error-msg').classList.remove('hidden');
}

async function saveBlock() {
    document.getElementById('block-error-msg').classList.add('hidden');
    const denominacion = document.getElementById('block-name-input').value.trim();
    
    if (!denominacion) { showError("El nombre del bloque es obligatorio."); return; }

    const tips = [];
    let errorEnTips = false;

    document.querySelectorAll('.tip-entry').forEach(entry => {
        const t = entry.querySelector('.tip-name-input').value.trim();
        const d = entry.querySelector('.tip-desc-input').value.trim();
        if (t && d) {
            tips.push({ titulo: t, descripcion: d });
        } else {
            errorEnTips = true;
        }
    });

    if (errorEnTips || tips.length !== 4) { 
        showError("Debes completar exactamente 4 tips con su título y descripción válidos."); 
        return; 
    }

    const payload = {
        denominacion: denominacion,
        tips: tips
    };

    const url = editingBlockId ? `/api/bloques/modificar/${editingBlockId}` : '/api/bloques/crear';
    const method = editingBlockId ? 'PUT' : 'POST';

    // Cambiar estado del botón a "Cargando"
    const saveBtn = document.getElementById('save-block-btn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
        const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        
        if (res.ok) { 
            closeBlockModal(); 
            fetchBlocks(); 
        } else { 
            // ⚡ AQUÍ ESTÁ LA MAGIA ⚡
            // Leemos el mensaje de texto exacto que nos envía Java (ej: "El nombre del bloque ya existe.")
            const errorText = await res.text(); 
            showError(errorText); // Lo mostramos en la caja roja
        }
    } catch (e) { 
        showError("Error de conexión con el servidor."); 
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async function toggleEstado(id) {
    const b = blocksData.find(x => x.idBloque === id);
    const nuevo = b.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
        const res = await fetch(`/api/bloques/${id}/estado`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevo })
        });
        if (res.ok) fetchBlocks();
    } catch (e) {}
}

function openTipsListModal(id) {
    const b = blocksData.find(x => x.idBloque === id);
    document.getElementById('tips-list-modal-title').textContent = 'Tips de ' + b.denominacion;
    const content = document.getElementById('tips-list-content');
    content.innerHTML = '';
    b.tips.forEach(t => {
        content.innerHTML += `<div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600"><h4 class="font-bold text-slate-900 dark:text-white">${t.titulo}</h4><p class="text-sm text-slate-600 dark:text-slate-300">${t.descripcion}</p></div>`;
    });
    document.getElementById('tips-list-modal').classList.remove('hidden');
}

function closeTipsListModal() { document.getElementById('tips-list-modal').classList.add('hidden'); }
function toggleCardMenu(btn) { btn.nextElementSibling.classList.toggle('hidden'); }

// --- RENDERIZADO VISUAL ---
function renderAllBlocks(lista = blocksData) {
    const container = document.getElementById('blocks-container');
    container.innerHTML = ''; 

    if (!lista || lista.length === 0) {
        container.innerHTML = `
        <div class="col-span-full text-center p-12 bg-white dark:bg-slate-800 rounded-3xl ios-shadow border border-slate-100 dark:border-slate-700">
            <span class="material-icons-round text-5xl text-slate-300 dark:text-slate-600 mb-3 block">school</span>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-1">No hay bloques registrados</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">Haz clic en el botón '+' de la esquina para agregar tu primer bloque.</p>
        </div>`;
        return;
    }

    lista.forEach(b => {
        const inactivo = b.estado === 'Inactivo' ? 'opacity-60 grayscale-[0.5]' : '';
        const badge = b.estado === 'Activo' ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs rounded-lg font-bold">Activo</span>' : '<span class="px-2 py-0.5 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs rounded-lg font-bold">Inactivo</span>';
        
        let tipsHtml = b.tips.slice(0, 3).map(t => `<span class="inline-flex px-3 py-1.5 rounded-lg text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 truncate max-w-[100%]">${t.titulo}</span>`).join('');
        let moreBtn = b.tips.length > 3 ? `<button class="px-3 py-1.5 rounded-lg text-sm bg-blue-50 text-primary dark:bg-blue-900/30 dark:text-blue-400" onclick="openTipsListModal(${b.idBloque})">+${b.tips.length - 3} más</button>` : '';

        container.innerHTML += `
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-200 dark:border-slate-700 relative ${inactivo} animate-fade-in">
            <div class="flex items-start justify-between mb-4">
                <div class="flex flex-col"><h3 class="text-xl font-bold text-slate-900 dark:text-white">${b.denominacion}</h3><div class="mt-1">${badge}</div></div>
                <div class="relative">
                    <button class="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-full" onclick="toggleCardMenu(this)"><span class="material-icons-round">more_vert</span></button>
                    <div class="hidden absolute right-0 mt-2 w-40 bg-white dark:bg-slate-700 rounded-xl ios-shadow border border-slate-100 dark:border-slate-600 z-10 shadow-xl overflow-hidden">
                        <button onclick="openBlockModal(true, ${b.idBloque})" class="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><span class="material-icons-round text-sm">edit</span> Editar</button>
                        <button onclick="toggleEstado(${b.idBloque})" class="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><span class="material-icons-round text-sm">${b.estado === 'Activo' ? 'block' : 'check_circle'}</span> ${b.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button>
                    </div>
                </div>
            </div>
            
            <div><p class="text-[10px] uppercase font-bold text-slate-400 mb-2">TIPS DEL BLOQUE (${b.tips.length})</p><div class="flex flex-wrap gap-2">${tipsHtml}${moreBtn}</div></div>
        </div>`;
    });
}