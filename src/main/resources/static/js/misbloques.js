let progresoGlobal = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    if (!session) { window.location.href = '/login'; return; }

    const container = document.getElementById('mis-bloques-container');
    container.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center p-12 text-slate-400"><span class="material-icons-round text-5xl animate-spin mb-4">refresh</span><p class="font-medium">Cargando bloques de estudio...</p></div>';

    try {
        // ⚡ OBTENEMOS TODOS LOS BLOQUES Y TODAS LAS CLASES ⚡
        const [resBloques, resClases] = await Promise.all([
            fetch('/api/bloques/todos'),
            fetch('/api/cursos/todos')
        ]);

        if (!resBloques.ok || !resClases.ok) throw new Error("Error al consultar datos");
        
        const bloquesBD = await resBloques.json();
        const todasLasClases = await resClases.json();

        const nombreSesion = String(session.nombre || '').toLowerCase().trim();
        const apellidoSesion = String(session.apellido || '').toLowerCase().trim();
        const nombreCompletoSesion = `${nombreSesion} ${apellidoSesion !== 'undefined' ? apellidoSesion : ''}`.trim();

        let miIdRealBD = null;

        todasLasClases.forEach(c => {
            if (c.estudiantes) {
                c.estudiantes.forEach(est => {
                    const estNombreCompleto = `${est.nombre || ''} ${est.apellido || ''}`.toLowerCase().trim();
                    if (estNombreCompleto === nombreCompletoSesion || estNombreCompleto.includes(nombreSesion)) {
                        miIdRealBD = est.idPersona || est.idUsuario || est.id;
                    }
                });
            }
        });

        const bloquesActivos = bloquesBD.filter(b => b.estado === 'Activo');

        if (bloquesActivos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-12 bg-white dark:bg-slate-800 rounded-3xl text-center ios-shadow border border-slate-100 dark:border-slate-700">
                    <span class="material-icons-round text-6xl text-slate-300 dark:text-slate-600">school</span>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white mt-4">No hay bloques disponibles</h3>
                </div>`;
            return;
        }

        // ⚡ ORDENAMIENTO ESTRICTO: CURSANDO PRIMERO ⚡
        let bloquesProcesados = bloquesActivos.map(block => {
            const miClase = todasLasClases.find(c => c.bloque?.idBloque === block.idBloque && c.estudiantes?.some(est => (est.idPersona || est.idUsuario || est.id) === miIdRealBD));
            return {
                block: block,
                miClase: miClase,
                cursando: !!miClase
            };
        });

        bloquesProcesados.sort((a, b) => Number(b.cursando) - Number(a.cursando));

        container.innerHTML = ''; 
        progresoGlobal = [];

        // ⚡ RECORREMOS LOS BLOQUES YA ORDENADOS ⚡
        for (const item of bloquesProcesados) {
            const { block, miClase, cursando } = item;
            const card = document.createElement('div');

            if (cursando) {
                // ==========================================
                // 🔵 ESTADO: CURSANDO EL BLOQUE
                // ==========================================
                card.className = "bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 flex flex-col animate-fade-in";
                
                const instructorStr = miClase.instructor ? `${miClase.instructor.nombre} ${miClase.instructor.apellido}` : 'Sin asignar';
                
                let progresoBloque = {
                    bloque: block.denominacion,
                    cursando: true,
                    anio: miClase.anio,
                    instructor: instructorStr,
                    tipsAprobados: 0,
                    tipsReprobados: 0,
                    tipsPendientes: 0,
                    tipsTotales: 0,
                    tips: []
                };

                // ⚡ SE INCLUYÓ EL CONTADOR (0 de 0) AL LADO DEL TÍTULO, SE ACTUALIZARÁ LUEGO ⚡
                card.innerHTML = `
                    <div class="flex items-start justify-between mb-4 gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${block.denominacion}</h3>
                            <span class="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] uppercase tracking-wider font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 shadow-sm">
                                <span class="material-icons-round text-[14px]">task_alt</span> <span id="counter-text-${miClase.idCurso}">0 de 0</span>
                            </span>
                        </div>
                        <span class="px-2.5 py-1 bg-blue-50 text-primary dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800/50 whitespace-nowrap">Cursando (${miClase.anio})</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-6">
                        <span class="material-icons-round text-slate-400">person</span>
                        <span>Instructor: <b class="text-slate-800 dark:text-white">${instructorStr}</b></span>
                    </div>
                    <div class="space-y-3" id="tips-container-${miClase.idCurso}">
                        <p class="text-xs text-slate-400 italic">Consultando notas en la base de datos...</p>
                    </div>
                `;
                container.appendChild(card);

                const tipsContainer = document.getElementById(`tips-container-${miClase.idCurso}`);
                tipsContainer.innerHTML = '<p class="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">TUS CALIFICACIONES (TIPS)</p>';
                
                if (block.tips && block.tips.length > 0) {
                    const sortedTips = [...block.tips].sort((a, b) => a.idTip - b.idTip);
                    progresoBloque.tipsTotales = sortedTips.length;

                    for (const tip of sortedTips) {
                        let estadoActual = 'PENDIENTE'; 

                        try {
                            const resNota = await fetch(`/api/evaluaciones/curso/${miClase.idCurso}/tip/${tip.idTip}/notas`);
                            if (resNota.ok) {
                                const notasMap = await resNota.json();
                                const keyString = String(miIdRealBD);
                                if (notasMap.hasOwnProperty(miIdRealBD)) {
                                    estadoActual = notasMap[miIdRealBD] === true ? 'APROBADO' : 'REPROBADO';
                                } else if (notasMap.hasOwnProperty(keyString)) {
                                    estadoActual = notasMap[keyString] === true ? 'APROBADO' : 'REPROBADO';
                                }
                            }
                        } catch (e) { }
                        
                        // ⚡ INCREMENTA EL CONTADOR SEGÚN EL ESTADO ⚡
                        if (estadoActual === 'APROBADO') progresoBloque.tipsAprobados++;
                        else if (estadoActual === 'REPROBADO') progresoBloque.tipsReprobados++;
                        else progresoBloque.tipsPendientes++;
                        
                        progresoBloque.tips.push({ titulo: tip.titulo, estado: estadoActual });

                        let icono = '';
                        let bgClass = '';
                        
                        if (estadoActual === 'APROBADO') {
                            icono = '<span class="material-icons-round text-blue-600 dark:text-blue-500" title="Aprobado">check_circle</span>';
                            bgClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50';
                        } else if (estadoActual === 'REPROBADO') {
                            icono = '<span class="material-icons-round text-red-500" title="Reprobado">cancel</span>';
                            bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50';
                        } else { 
                            icono = '<span class="material-icons-round text-slate-300 dark:text-slate-600" title="Pendiente de Evaluación">radio_button_unchecked</span>';
                            bgClass = 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700';
                        }

                        tipsContainer.innerHTML += `
                            <div class="flex items-center gap-3 p-3 rounded-xl border transition-all ${bgClass}">
                                ${icono} <span class="text-sm font-medium dark:text-slate-200">${tip.titulo}</span>
                            </div>
                        `;
                    }
                    
                    // ⚡ ACTUALIZAMOS EL TEXTO DEL CONTADOR VISUALMENTE ⚡
                    document.getElementById(`counter-text-${miClase.idCurso}`).innerText = `${progresoBloque.tipsAprobados} de ${progresoBloque.tipsTotales}`;
                    
                } else {
                    tipsContainer.innerHTML += `<p class="text-sm text-slate-500">No hay tips registrados.</p>`;
                }

                progresoGlobal.push(progresoBloque);

            } else {
                // ==========================================
                // ⚪ ESTADO: NO CURSANDO ESTE BLOQUE
                // ==========================================
                card.className = "bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 ios-shadow border border-slate-200 dark:border-slate-700 flex flex-col animate-fade-in opacity-80 grayscale-[0.2]";
                
                const tipsTotales = block.tips ? block.tips.length : 0;
                
                progresoGlobal.push({
                    bloque: block.denominacion,
                    cursando: false,
                    tipsAprobados: 0,
                    tipsReprobados: 0,
                    tipsPendientes: tipsTotales,
                    tipsTotales: tipsTotales,
                    tips: block.tips || []
                });

                const tipsBloqueadosHtml = block.tips && block.tips.length > 0 
                    ? block.tips.sort((a,b) => a.idTip - b.idTip).map(tip => `
                        <div class="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            <span class="material-icons-round text-slate-300 dark:text-slate-600">lock</span>
                            <span class="text-sm font-medium text-slate-500 dark:text-slate-400">${tip.titulo}</span>
                        </div>
                    `).join('') 
                    : '<p class="text-sm text-slate-500">No hay tips registrados.</p>';

                // ⚡ SE INCLUYÓ EL CONTADOR EN GRIS ⚡
                card.innerHTML = `
                    <div class="flex items-start justify-between mb-4 gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-xl font-bold text-slate-600 dark:text-slate-300 leading-tight">${block.denominacion}</h3>
                            <span class="px-2 py-1 bg-slate-200 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold rounded-lg border border-slate-300 dark:border-slate-600 flex items-center gap-1 shadow-sm">
                                <span class="material-icons-round text-[14px]">task_alt</span> 0 de ${tipsTotales}
                            </span>
                        </div>
                        <span class="px-2.5 py-1 bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold rounded-lg border border-slate-300 dark:border-slate-600 whitespace-nowrap flex items-center gap-1">
                            <span class="material-icons-round text-[14px]">block</span> No ves este Bloque
                        </span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-6">
                        <span class="material-icons-round">person_off</span>
                        <span>No estás inscrito actualmente</span>
                    </div>
                    <div class="space-y-3">
                        <p class="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">CONTENIDO DEL BLOQUE (TIPS)</p>
                        ${tipsBloqueadosHtml}
                    </div>
                `;
                container.appendChild(card);
            }
        }

        if (progresoGlobal.length > 0) {
            document.getElementById('btn-reporte-progreso').classList.replace('hidden', 'flex');
        }

    } catch (error) {
        console.error("Error consultando clases:", error);
        container.innerHTML = `<div class="col-span-full p-6 text-center text-red-500 font-bold">Ocurrió un error al cargar los bloques.</div>`;
    }
});


// ==========================================
// ⚡ GENERADOR DE REPORTE Y PDF (ESTUDIANTE) ⚡
// ==========================================

async function getBase64ImageFromUrl(imageUrl) {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch(e) { return null; }
}

async function configurarCabeceraPDF(doc, tituloReporte) {
    const logoBase64 = await getBase64ImageFromUrl('/images/LogoIglesiaDeLaCalle.jpeg');
    if (logoBase64) doc.addImage(logoBase64, 'JPEG', 14, 10, 22, 26);

    let fechaReal = new Date().toLocaleDateString('es-VE'); 
    try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/America/Caracas');
        if (res.ok) {
            const data = await res.json();
            fechaReal = new Date(data.datetime).toLocaleDateString('es-VE');
        }
    } catch (error) { console.warn("Usando hora local por fallo de red."); }

    doc.setTextColor(11, 59, 140); 
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text("Fundación Social Fuente de Vida", 40, 18);
    
    doc.setTextColor(189, 25, 32); 
    doc.setFontSize(12);
    doc.text(tituloReporte, 40, 24);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado el: ${fechaReal}`, 40, 30);
}

function dibujarCabeceraTabla(doc, startY) {
    doc.autoTable({
        startY: startY,
        head: [['Tip (Actividad Escolar)', 'Estado de Calificación']],
        body: [],
        theme: 'plain',
        headStyles: { fillColor: [11, 59, 140], textColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 130 },
            1: { cellWidth: 52 }
        },
        margin: { bottom: 0 }
    });
    return doc.lastAutoTable.finalY;
}

async function generarReporteProgreso() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    
    const nombreStr = session.nombre && session.nombre !== 'undefined' ? session.nombre : '';
    const apellidoStr = session.apellido && session.apellido !== 'undefined' ? session.apellido : '';
    const nombreEstudiante = `${nombreStr} ${apellidoStr}`.trim();

    await configurarCabeceraPDF(doc, "Reporte de Progreso Académico");

    const bloquesEnCurso = progresoGlobal.filter(p => p.cursando).length;

    // Datos del Estudiante
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Datos del Estudiante:", 14, 45);
    doc.setFont(undefined, 'normal');
    doc.text(`Nombre Completo: ${nombreEstudiante}`, 14, 51);
    doc.text(`Bloques cursando: ${bloquesEnCurso} de ${progresoGlobal.length}`, 14, 57);

    // Generar Gráfico
    const canvas = document.getElementById('progressChartCanvas');
    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = progresoGlobal.map(p => p.bloque);
    const dataAprobados = progresoGlobal.map(p => p.tipsAprobados);
    const dataReprobados = progresoGlobal.map(p => p.tipsReprobados);
    const dataPendientes = progresoGlobal.map(p => p.tipsPendientes);

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Aprobados', data: dataAprobados, backgroundColor: '#0b3b8c' }, 
                { label: 'Reprobados', data: dataReprobados, backgroundColor: '#ef4444' }, 
                { label: 'Pendientes / Bloqueados', data: dataPendientes, backgroundColor: '#cbd5e1' }  
            ]
        },
        options: {
            animation: false, 
            responsive: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    const chartImage = canvas.toDataURL('image/png', 1.0);
    doc.addImage(chartImage, 'PNG', 14, 65, 180, 90);

    let currentY = 165;
    const pageHeight = 297;
    const bottomMargin = 20;

    currentY = dibujarCabeceraTabla(doc, currentY);

    progresoGlobal.forEach(b => {
        let tableData = [];

        if (b.cursando) {
            // ⚡ EL CONTADOR AHORA ESTÁ EN LA CABECERA DE LA TABLA DEL PDF ⚡
            tableData.push([
                { content: `${b.bloque.toUpperCase()} (Instructor: ${b.instructor}) - Progreso: ${b.tipsAprobados} de ${b.tipsTotales}`, colSpan: 2, styles: { fillColor: [240, 240, 240], textColor: [11, 59, 140], fontStyle: 'bold' } }
            ]);

            if (b.tips.length === 0) {
                tableData.push(['No hay actividades registradas en este bloque', '']);
            } else {
                b.tips.forEach(t => {
                    const estadoTxt = t.estado.charAt(0) + t.estado.slice(1).toLowerCase(); 
                    tableData.push([t.titulo, estadoTxt]);
                });
            }
        } else {
            // ⚡ EL CONTADOR AHORA ESTÁ EN LA CABECERA DE LA TABLA DEL PDF ⚡
            tableData.push([
                { content: `${b.bloque.toUpperCase()} (NO INSCRITO) - Progreso: 0 de ${b.tipsTotales}`, colSpan: 2, styles: { fillColor: [245, 245, 245], textColor: [100, 116, 139], fontStyle: 'bold' } }
            ]);

            if (b.tips.length === 0) {
                tableData.push(['No hay actividades registradas en este bloque', '']);
            } else {
                b.tips.forEach(t => {
                    tableData.push([t.titulo, 'Bloqueado (No Inscrito)']);
                });
            }
        }
        
        tableData.push([{ content: '', colSpan: 2, styles: { fillColor: [255, 255, 255], minCellHeight: 3 } }]);

        const estimatedHeight = tableData.length * 9;

        if (currentY + estimatedHeight > (pageHeight - bottomMargin)) {
            doc.addPage();
            currentY = 20; 
            currentY = dibujarCabeceraTabla(doc, currentY); 
        }

        doc.autoTable({
            startY: currentY,
            body: tableData,
            theme: 'plain', 
            columnStyles: {
                0: { cellWidth: 130 },
                1: { cellWidth: 52 }
            },
            styles: { lineWidth: 0.1, lineColor: [220, 220, 220] },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 1 && !data.cell.styles.fillColor) {
                    if (data.cell.raw === 'Aprobado') {
                        data.cell.styles.textColor = [11, 59, 140]; 
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Reprobado') {
                        data.cell.styles.textColor = [220, 38, 38]; 
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Pendiente') {
                        data.cell.styles.textColor = [100, 116, 139]; 
                    } else if (data.cell.raw === 'Bloqueado (No Inscrito)') {
                        data.cell.styles.textColor = [156, 163, 175]; 
                        data.cell.styles.fontStyle = 'italic';
                    }
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 2; 
    });

    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
}