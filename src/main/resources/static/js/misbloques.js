document.addEventListener('DOMContentLoaded', async () => {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    if (!session) { window.location.href = '/login'; return; }

    const container = document.getElementById('mis-bloques-container');

    try {
        const resClases = await fetch('/api/cursos/todos');
        if (!resClases.ok) throw new Error("HTTP " + resClases.status);
        
        const todasLasClases = await resClases.json();

        // ⚡ OBTENEMOS TU NOMBRE DESDE LA SESIÓN ⚡
        const nombreSesion = String(session.nombre || '').toLowerCase().trim();
        const apellidoSesion = String(session.apellido || '').toLowerCase().trim();
        const nombreCompletoSesion = `${nombreSesion} ${apellidoSesion}`.trim();

        let miIdRealBD = null;

        // ⚡ BUSCAMOS EN LA BASE DE DATOS QUIÉN TIENE TU NOMBRE ⚡
        const misClases = todasLasClases.filter(c => {
            if (!c.estudiantes || c.estudiantes.length === 0) return false;
            
            return c.estudiantes.some(est => {
                const estNombreCompleto = `${est.nombre || ''} ${est.apellido || ''}`.toLowerCase().trim();
                
                // Si el nombre coincide, ¡somos nosotros!
                if (estNombreCompleto === nombreCompletoSesion || estNombreCompleto.includes(nombreSesion)) {
                    miIdRealBD = est.idPersona || est.id; // Capturamos el ID real de la BD
                    return true;
                }
                return false;
            });
        });

        if (misClases.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-12 bg-white dark:bg-slate-800 rounded-3xl text-center ios-shadow border border-slate-100 dark:border-slate-700">
                    <span class="material-icons-round text-6xl text-slate-300 dark:text-slate-600">school</span>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white mt-4">No estás inscrito en ningún bloque</h3>
                    <p class="text-slate-500 text-sm mt-2">No se encontró al alumno <b>${session.nombre}</b> en las clases activas.</p>
                </div>`;
            return;
        }

        container.innerHTML = ''; 

        // Renderizar las clases reales
        for (const clase of misClases) {
            const block = clase.bloque;
            const instructorStr = clase.instructor ? `${clase.instructor.nombre} ${clase.instructor.apellido}` : 'Sin asignar';
            
            const card = document.createElement('div');
            card.className = "bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 flex flex-col animate-fade-in";
            card.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${block.denominacion}</h3>
                    <span class="px-2.5 py-1 bg-blue-50 text-primary dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-lg">${clase.anio}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-6">
                    <span class="material-icons-round text-slate-400">person</span>
                    <span>Instructor: <b class="text-slate-800 dark:text-white">${instructorStr}</b></span>
                </div>
                <div class="space-y-3" id="tips-container-${clase.idCurso}">
                    <p class="text-xs text-slate-400 italic">Consultando notas en la base de datos...</p>
                </div>
            `;
            container.appendChild(card);

            const tipsContainer = document.getElementById(`tips-container-${clase.idCurso}`);
            tipsContainer.innerHTML = '<p class="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">TUS CALIFICACIONES (TIPS)</p>';
            
            if (block.tips && block.tips.length > 0) {
                const sortedTips = [...block.tips].sort((a, b) => a.idTip - b.idTip);

                for (const tip of sortedTips) {
                    let estaAprobado = false;
                    try {
                        const resNota = await fetch(`/api/evaluaciones/curso/${clase.idCurso}/tip/${tip.idTip}/notas`);
                        if (resNota.ok) {
                            const notasMap = await resNota.json();
                            // USAMOS EL ID REAL QUE ENCONTRAMOS GRACIAS A TU NOMBRE
                            if (notasMap[miIdRealBD] === true || notasMap[String(miIdRealBD)] === true) {
                                estaAprobado = true;
                            }
                        }
                    } catch (e) { }
                    
                    const icono = estaAprobado ? '<span class="material-icons-round text-green-500">check_circle</span>' : '<span class="material-icons-round text-slate-300 dark:text-slate-600">radio_button_unchecked</span>';
                    const bg = estaAprobado ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700';

                    tipsContainer.innerHTML += `
                        <div class="flex items-center gap-3 p-3 rounded-xl border ${bg}">
                            ${icono} <span class="text-sm font-medium dark:text-slate-200">${tip.titulo}</span>
                        </div>
                    `;
                }
            } else {
                tipsContainer.innerHTML += `<p class="text-sm text-slate-500">No hay tips registrados.</p>`;
            }
        }
    } catch (error) {}
});