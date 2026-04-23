document.addEventListener('DOMContentLoaded', () => {
    cargarMisMinisterios();
});

async function cargarMisMinisterios() {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    if (!session || !session.username) return;

    try {
        const response = await fetch(`/api/ministerios/mis-ministerios/${session.username}`);
        if (response.ok) {
            const data = await response.json();
            renderResponsable(data.comoResponsable);
            renderIntegrante(data.comoIntegrante);
        }
    } catch (error) {
        console.error("Error al cargar los ministerios:", error);
    }
}

function renderResponsable(lista) {
    const container = document.getElementById('grid-responsable');
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = `<p class="text-slate-500 dark:text-slate-400 italic text-sm">No eres responsable de ningún ministerio en este momento.</p>`;
        return;
    }

    lista.forEach(min => {
        const integrantesHTML = min.integrantes.length > 0 
            ? min.integrantes.map(nombre => `<li class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 py-1 border-b border-slate-50 dark:border-slate-700/50 last:border-0"><span class="material-icons-round text-[10px] text-orange-400">person</span> ${nombre}</li>`).join('')
            : '<li class="text-xs text-slate-400 italic">No hay integrantes registrados.</li>';

        container.innerHTML += `
            <article class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-orange-100 dark:border-orange-900/30 shadow-lg shadow-orange-100/20 dark:shadow-none flex flex-col h-full">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600"><span class="material-icons-round">diversity_3</span></div>
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white leading-tight">${min.nombre}</h3>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 flex-1">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Integrantes del Equipo (${min.integrantes.length})</p>
                    <ul class="max-h-40 overflow-y-auto pr-2 no-scrollbar">
                        ${integrantesHTML}
                    </ul>
                </div>
            </article>
        `;
    });
}

function renderIntegrante(lista) {
    const container = document.getElementById('grid-integrante');
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = `<p class="text-slate-500 dark:text-slate-400 italic text-sm">No perteneces a ningún ministerio en este momento.</p>`;
        return;
    }

    lista.forEach(min => {
        container.innerHTML += `
            <article class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full hover:border-primary/30 transition-colors">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary"><span class="material-icons-round">group</span></div>
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white leading-tight">${min.nombre}</h3>
                </div>
                <div class="mt-auto bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsable del Ministerio</p>
                    <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <span class="material-icons-round text-primary text-sm">shield</span>
                        <span class="font-medium">${min.responsable}</span>
                    </div>
                </div>
            </article>
        `;
    });
}
