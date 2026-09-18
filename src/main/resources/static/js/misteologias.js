let progresoTeologiaGlobal = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    if (!session) { window.location.href = '/login'; return; }

    const container = document.getElementById('mis-teologias-container');
    container.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center p-12 text-slate-400"><span class="material-icons-round text-5xl animate-spin mb-4">refresh</span><p class="font-medium">Cargando unidades curriculares...</p></div>';

    try {
        const resClases = await fetch('/api/clases-teologia/todos');
        if (!resClases.ok) throw new Error("Error al consultar clases de teología");
        const clasesBD = await resClases.json();

        const nombreSesion = String(session.nombre || '').toLowerCase().trim();
        const apellidoSesion = String(session.apellido || '').toLowerCase().trim();
        const nombreCompletoSesion = `${nombreSesion} ${apellidoSesion !== 'undefined' ? apellidoSesion : ''}`.trim();

        let miIdRealBD = null;

        // 1. Filtrar SOLAMENTE las clases donde el usuario actual está matriculado
        const misClasesCursos = clasesBD.filter(c => {
            if (!c.estudiantes) return false;
            return c.estudiantes.some(est => {
                const estNombreCompleto = `${est.nombre || ''} ${est.apellido || ''}`.toLowerCase().trim();
                if (estNombreCompleto === nombreCompletoSesion || estNombreCompleto.includes(nombreSesion)) {
                    miIdRealBD = est.idPersona || est.idUsuario || est.id;
                    return true;
                }
                return false;
            });
        });

        if (misClasesCursos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full p-12 bg-white dark:bg-slate-800 rounded-3xl text-center ios-shadow border border-slate-100 dark:border-slate-700">
                    <span class="material-icons-round text-6xl text-slate-300 dark:text-slate-600">school</span>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white mt-4">No estás matriculado</h3>
                    <p class="text-slate-500 dark:text-slate-400 mt-2">Actualmente no estás cursando ninguna unidad de teología.</p>
                </div>`;
            return;
        }

        container.innerHTML = ''; 
        progresoTeologiaGlobal = [];

        // 2. Procesar cada clase matriculada
        for (const clase of misClasesCursos) {
            const card = document.createElement('div');
            card.className = "bg-white dark:bg-slate-800 rounded-3xl p-6 ios-shadow border border-slate-100 dark:border-slate-700 flex flex-col animate-fade-in";
            
            const instructorStr = clase.instructor ? `${clase.instructor.nombre} ${clase.instructor.apellido}` : 'Sin asignar';
            const carreraStr = clase.teologia?.denominacion || 'Unidad Teológica';
            const materiaStr = clase.tema?.denominacion || 'Materia Desconocida';

            let progresoBloque = {
                carrera: carreraStr,
                materia: materiaStr,
                anio: clase.anio,
                instructor: instructorStr,
                aprobados: 0,
                reprobados: 0,
                pendientes: 0,
                totales: 0,
                evaluaciones: []
            };

            // Estructura visual de la tarjeta
            card.innerHTML = `
                <div class="flex items-start justify-between mb-4 gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${carreraStr} - ${materiaStr}</h3>
                        <span class="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] uppercase tracking-wider font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 shadow-sm">
                            <span class="material-icons-round text-[14px]">task_alt</span> <span id="counter-teo-${clase.idClaseTeologia}">0 de 0</span>
                        </span>
                    </div>
                    <span class="px-2.5 py-1 bg-blue-50 text-primary dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800/50 whitespace-nowrap">Año ${clase.anio}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-6">
                    <span class="material-icons-round text-slate-400">person</span>
                    <span>Profesor: <b class="text-slate-800 dark:text-white">${instructorStr}</b></span>
                </div>
                <div class="space-y-3" id="teo-container-${clase.idClaseTeologia}">
                    <p class="text-xs text-slate-400 italic">Consultando plan de evaluación...</p>
                </div>
            `;
            container.appendChild(card);

            const evalContainer = document.getElementById(`teo-container-${clase.idClaseTeologia}`);
            evalContainer.innerHTML = '<p class="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">PLAN DE EVALUACIÓN Y NOTAS</p>';
            
            // 3. Consultar las evaluaciones (Planificación) de esta clase
            try {
                const resPlan = await fetch(`/api/planificacion/clase/${clase.idClaseTeologia}`);
                if (resPlan.ok && resPlan.status !== 204) {
                    const planificaciones = await resPlan.json();
                    progresoBloque.totales = planificaciones.length;

                    for (const ev of planificaciones) {
                        let estadoActual = 'PENDIENTE'; 
                        let notaTexto = 'Sin Evaluar';

                        // 4. Consultar las notas específicas de esta evaluación
                        try {
                            const resNota = await fetch(`/api/clases-teologia/clase/${clase.idClaseTeologia}/planificacion/${ev.idPlanificacion}/notas`);
                            if (resNota.ok) {
                                const notasMap = await resNota.json();
                                const keyString = String(miIdRealBD);
                                let puntaje = null;
                                
                                if (notasMap.hasOwnProperty(miIdRealBD)) puntaje = notasMap[miIdRealBD];
                                else if (notasMap.hasOwnProperty(keyString)) puntaje = notasMap[keyString];

                                if (puntaje !== null) {
                                    notaTexto = `${puntaje}/${ev.escala} pts`;
                                    // ⚡ LÓGICA DE APROBACIÓN: La mitad de la escala o más es Aprobado
                                    let minimoAprobatorio = Math.ceil(ev.escala / 2);
                                    estadoActual = puntaje >= minimoAprobatorio ? 'APROBADO' : 'REPROBADO';
                                }
                            }
                        } catch (e) { }

                        if (estadoActual === 'APROBADO') progresoBloque.aprobados++;
                        else if (estadoActual === 'REPROBADO') progresoBloque.reprobados++;
                        else progresoBloque.pendientes++;
                        
                        progresoBloque.evaluaciones.push({ 
                            titulo: `${ev.contenido} (${ev.ponderacion}%)`, 
                            estado: estadoActual,
                            nota: notaTexto
                        });

                        let icono = '';
                        let bgClass = '';
                        
                        if (estadoActual === 'APROBADO') {
                            icono = '<span class="material-icons-round text-blue-600 dark:text-blue-500" title="Aprobado">check_circle</span>';
                            bgClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50';
                        } else if (estadoActual === 'REPROBADO') {
                            icono = '<span class="material-icons-round text-red-500" title="Reprobado">cancel</span>';
                            bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50';
                        } else { 
                            icono = '<span class="material-icons-round text-slate-300 dark:text-slate-600" title="Pendiente">radio_button_unchecked</span>';
                            bgClass = 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700';
                        }

                        evalContainer.innerHTML += `
                            <div class="flex items-center justify-between p-3 rounded-xl border transition-all ${bgClass}">
                                <div class="flex items-center gap-3">
                                    ${icono} 
                                    <span class="text-sm font-medium dark:text-slate-200">${ev.contenido} <span class="text-[10px] text-slate-500 ml-1">(${ev.ponderacion}%)</span></span>
                                </div>
                                <span class="text-xs font-bold ${estadoActual === 'PENDIENTE' ? 'text-slate-400' : 'text-slate-800 dark:text-white'}">${notaTexto}</span>
                            </div>
                        `;
                    }
                    
                    document.getElementById(`counter-teo-${clase.idClaseTeologia}`).innerText = `${progresoBloque.aprobados} de ${progresoBloque.totales}`;
                    
                } else {
                    evalContainer.innerHTML += `<p class="text-sm text-slate-500">Aún no se ha publicado el plan de evaluación.</p>`;
                }
            } catch (e) {
                evalContainer.innerHTML += `<p class="text-sm text-red-500">Error al cargar evaluaciones.</p>`;
            }

            progresoTeologiaGlobal.push(progresoBloque);
        }

        if (progresoTeologiaGlobal.length > 0) {
            document.getElementById('btn-reporte-progreso').classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error general:", error);
        container.innerHTML = `<div class="col-span-full p-6 text-center text-red-500 font-bold">Ocurrió un error al cargar las unidades curriculares.</div>`;
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
    } catch (error) {}

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

function dibujarCabeceraTablaTeologia(doc, startY) {
    doc.autoTable({
        startY: startY,
        head: [['Evaluación / Contenido', 'Nota', 'Estado de Calificación']],
        body: [],
        theme: 'plain',
        headStyles: { fillColor: [11, 59, 140], textColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30 },
            2: { cellWidth: 52 }
        },
        margin: { bottom: 0 }
    });
    return doc.lastAutoTable.finalY;
}

async function generarReporteTeologia() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    
    const nombreStr = session.nombre && session.nombre !== 'undefined' ? session.nombre : '';
    const apellidoStr = session.apellido && session.apellido !== 'undefined' ? session.apellido : '';
    const nombreEstudiante = `${nombreStr} ${apellidoStr}`.trim();

    await configurarCabeceraPDF(doc, "Reporte Académico de Teología");

    // Datos del Estudiante
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Datos del Estudiante:", 14, 45);
    doc.setFont(undefined, 'normal');
    doc.text(`Nombre Completo: ${nombreEstudiante}`, 14, 51);
    doc.text(`Unidades Curriculares en curso: ${progresoTeologiaGlobal.length}`, 14, 57);

    // Generar Gráfico
    const canvas = document.getElementById('progressChartCanvas');
    const ctx = canvas.getContext('2d');

    if (chartInstance) chartInstance.destroy();

    const labels = progresoTeologiaGlobal.map(p => p.materia.length > 15 ? p.materia.substring(0,15) + '...' : p.materia);
    const dataAprobados = progresoTeologiaGlobal.map(p => p.aprobados);
    const dataReprobados = progresoTeologiaGlobal.map(p => p.reprobados);
    const dataPendientes = progresoTeologiaGlobal.map(p => p.pendientes);

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Aprobados', data: dataAprobados, backgroundColor: '#0b3b8c' }, 
                { label: 'Reprobados', data: dataReprobados, backgroundColor: '#ef4444' }, 
                { label: 'Pendientes', data: dataPendientes, backgroundColor: '#cbd5e1' }  
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

    currentY = dibujarCabeceraTablaTeologia(doc, currentY);

    progresoTeologiaGlobal.forEach(b => {
        let tableData = [];

        tableData.push([
            { content: `${b.carrera.toUpperCase()} - ${b.materia.toUpperCase()} (Prof. ${b.instructor}) - Progreso: ${b.aprobados} de ${b.totales}`, colSpan: 3, styles: { fillColor: [240, 240, 240], textColor: [11, 59, 140], fontStyle: 'bold' } }
        ]);

        if (b.evaluaciones.length === 0) {
            tableData.push(['El profesor no ha publicado el plan de evaluación.', '', '']);
        } else {
            b.evaluaciones.forEach(ev => {
                const estadoTxt = ev.estado.charAt(0) + ev.estado.slice(1).toLowerCase(); 
                tableData.push([ev.titulo, ev.nota, estadoTxt]);
            });
        }
        
        tableData.push([{ content: '', colSpan: 3, styles: { fillColor: [255, 255, 255], minCellHeight: 3 } }]);

        const estimatedHeight = tableData.length * 9;

        if (currentY + estimatedHeight > (pageHeight - bottomMargin)) {
            doc.addPage();
            currentY = 20; 
            currentY = dibujarCabeceraTablaTeologia(doc, currentY); 
        }

        doc.autoTable({
            startY: currentY,
            body: tableData,
            theme: 'plain', 
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 30 },
                2: { cellWidth: 52 }
            },
            styles: { lineWidth: 0.1, lineColor: [220, 220, 220] },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 2 && !data.cell.styles.fillColor) {
                    if (data.cell.raw === 'Aprobado') {
                        data.cell.styles.textColor = [11, 59, 140]; 
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Reprobado') {
                        data.cell.styles.textColor = [220, 38, 38]; 
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'Pendiente') {
                        data.cell.styles.textColor = [100, 116, 139]; 
                    }
                }
                if (data.section === 'body' && data.column.index === 1 && !data.cell.styles.fillColor) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 2; 
    });

    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
}