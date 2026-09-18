// --- Lógica de Reportes Avanzados ---

let dataMinisterios = [];
let dataUsuarios = [];
let dataEventos = [];
let dataServicios = [];

// ⚡ Variables Globales para destruir instancias anteriores de gráficas
let chartMin = null;
let chartUsu = null;
let chartEv = null;
let chartSrv = null;

window.addEventListener('DOMContentLoaded', () => {
    cargarDatosBackend();
    bloquearFechasFuturas(); 
});

async function cargarDatosBackend() {
    try {
        const [resMin, resUsu, resEv, resSrv] = await Promise.all([
            fetch('http://localhost:8080/api/reportes/ministerios'),
            fetch('http://localhost:8080/api/reportes/usuarios'),
            fetch('http://localhost:8080/api/reportes/eventos'),
            fetch('http://localhost:8080/api/reportes/servicios')
        ]);

        if (resMin.ok) {
            dataMinisterios = await resMin.json();
            llenarSelectMinisterios();
        }
        if (resUsu.ok) dataUsuarios = await resUsu.json();
        if (resEv.ok) dataEventos = await resEv.json();
        if (resSrv.ok) dataServicios = await resSrv.json();

        poblarCombosDinamicos();

    } catch (e) { console.error("Error cargando data:", e); }
}

function llenarSelectMinisterios() {
    const select = document.getElementById('f-min-nombre');
    dataMinisterios.forEach(m => {
        select.innerHTML += `<option value="${m.ministerio}">${m.ministerio}</option>`;
    });
}

function poblarCombosDinamicos() {
    const lugares = [...new Set(dataEventos.map(e => e.lugar))].filter(Boolean);
    const selLugar = document.getElementById('f-ev-lugar');
    selLugar.innerHTML = '<option value="Todos">Todos</option>';
    lugares.forEach(l => selLugar.innerHTML += `<option value="${l}">${l}</option>`);

    const maestros = [...new Set(dataServicios.map(s => s.maestro))].filter(m => m !== 'N/A');
    const selMaestro = document.getElementById('f-srv-maestro');
    selMaestro.innerHTML = '<option value="Todos">Todos</option>';
    maestros.forEach(m => selMaestro.innerHTML += `<option value="${m}">${m}</option>`);
}

function switchTab(tabName) {
    document.querySelectorAll('[id^="tab-"]').forEach(btn => {
        btn.className = "flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-xs transition-all bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700";
    });
    document.querySelectorAll('[id^="panel-"]').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('block');
    });

    document.getElementById(`tab-${tabName}`).className = "flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-xs transition-all bg-primary text-white shadow-md";
    document.getElementById(`panel-${tabName}`).classList.remove('hidden');
    document.getElementById(`panel-${tabName}`).classList.add('block');
}

function toggleAsistencia(tipo) {
    const estado = document.getElementById(`f-${tipo}-estado`).value;
    const activo = estado === 'Realizado' || estado === 'Realizada';
    document.getElementById(`f-${tipo}-asis-min`).disabled = !activo;
    document.getElementById(`f-${tipo}-asis-max`).disabled = !activo;
}

function isDateInRange(dateStr, desde, hasta) {
    if (!dateStr || (!desde && !hasta)) return true;
    const d = new Date(dateStr);
    if (desde && d < new Date(desde)) return false;
    if (hasta && d > new Date(hasta)) return false;
    return true;
}

function checkAsistencia(asis, min, max) {
    if (min && parseInt(asis) < parseInt(min)) return false;
    if (max && parseInt(asis) > parseInt(max)) return false;
    return true;
}

function openPdfInNewTab(doc) {
    const blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
}

// ⚡ LECTOR DEL LOGO Y CABECERA
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

// ⚡ BLOQUEA FECHAS FUTURAS EN LOS INPUTS
async function bloquearFechasFuturas() {
    let fechaHoyYYYYMMDD = new Date().toISOString().split('T')[0];
    try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/America/Caracas');
        if (res.ok) {
            const data = await res.json();
            fechaHoyYYYYMMDD = data.datetime.split('T')[0]; 
        }
    } catch (e) { console.warn("Fallo API hora para bloquear inputs."); }

    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.max = fechaHoyYYYYMMDD; 
    });
}

// ⚡ FORMATEADOR DE FECHAS BLINDADO (De AAAA-MM-DD a DD/MM/AAAA)
function formatearFechaLatina(fecha) {
    if (!fecha) return "";
    try {
        let fechaLimpia = String(fecha).trim().split('T')[0].split(' ')[0];
        let partes = fechaLimpia.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return fechaLimpia;
    } catch(e) {
        return fecha;
    }
}

// ==========================================
// ⚡ GENERADOR 1: MINISTERIOS
// ==========================================
async function generarReporteMinisterios() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const fNombre = document.getElementById('f-min-nombre').value;
    const fCond = document.getElementById('f-min-condicion').value;
    const fGen = document.getElementById('f-min-genero').value;
    const fRol = document.getElementById('f-min-rol').value;
    const fDes = document.getElementById('f-min-desde').value;
    const fHas = document.getElementById('f-min-hasta').value;

    await configurarCabeceraPDF(doc, "Composición de Ministerios");

    let tableData = [];
    let countMinisterios = 0;
    let countPersonas = 0;
    
    // Data para Gráfica
    const chartLabels = [];
    const chartData = [];

    dataMinisterios.forEach(min => {
        if (fNombre !== "Todos" && min.ministerio !== fNombre) return;
        if (!isDateInRange(min.fechaCreacion, fDes, fHas)) return;

        let personasFiltradas = min.personas.filter(p => {
            if (fGen !== "Todos" && p.genero !== fGen) return false;
            if (fRol !== "Todos" && p.rol !== fRol) return false;
            let noCedulado = p.cedula <= 0;
            if (fCond === "Cedulados" && noCedulado) return false;
            if (fCond === "NoCedulados" && !noCedulado) return false;
            return true;
        });

        if (personasFiltradas.length > 0) {
            countMinisterios++;
            countPersonas += personasFiltradas.length;
            
            // Recolectar datos para gráfica
            chartLabels.push(min.ministerio.length > 15 ? min.ministerio.substring(0,15) + '...' : min.ministerio);
            chartData.push(personasFiltradas.length);

            tableData.push([
                { content: min.ministerio.toUpperCase(), colSpan: 4, styles: { fillColor: [240, 240, 240], textColor: [11, 59, 140], fontStyle: 'bold' } }
            ]);

            let resp = personasFiltradas.find(p => p.rol === 'Responsable');
            if (resp) tableData.push([resp.nombre, resp.cedula <= 0 ? 'N/C' : resp.cedula, resp.genero, 'Responsable']);

            personasFiltradas.filter(p => p.rol === 'Integrante').forEach(p => {
                tableData.push([p.nombre, p.cedula <= 0 ? 'N/C' : p.cedula, p.genero, 'Integrante']);
            });

            tableData.push([{ content: '', colSpan: 4, styles: { fillColor: [255, 255, 255], minCellHeight: 5 } }]);
        }
    });

    if(tableData.length === 0) tableData.push(["Sin resultados para estos filtros", "", "", ""]);

    // ⚡ ESTADÍSTICA ⚡
    let promedio = countMinisterios > 0 ? Math.round(countPersonas / countMinisterios) : 0;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total de Ministerios: ${countMinisterios} | Promedio de personas por ministerio: ${promedio}`, 14, 38);

    // ⚡ GENERACIÓN DE GRÁFICA (Barras - Azul Corporativo) ⚡
    if (chartMin) chartMin.destroy();
    const ctx = document.getElementById('chartMinisterios').getContext('2d');
    chartMin = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{ label: 'Integrantes por Ministerio', data: chartData, backgroundColor: '#0b3b8c' }] // Azul Corporativo
        },
        options: { animation: false, responsive: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const chartImg = document.getElementById('chartMinisterios').toDataURL('image/png', 1.0);
    doc.addImage(chartImg, 'PNG', 14, 45, 180, 70); // Posición gráfica

    doc.autoTable({
        startY: 125, // Empezar debajo de la gráfica
        head: [['Nombre', 'Cédula', 'Gen', 'Cargo']],
        body: tableData,
        theme: 'plain', 
        headStyles: { fillColor: [11, 59, 140], textColor: [255, 255, 255] },
        styles: { lineWidth: 0.1, lineColor: [220, 220, 220] }
    });

    openPdfInNewTab(doc);
}

// ==========================================
// ⚡ GENERADOR 2: USUARIOS
// ==========================================
async function generarReporteUsuarios() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const fPriv = document.getElementById('f-usu-privilegio').value;
    const fEst = document.getElementById('f-usu-estado').value;
    const fGen = document.getElementById('f-usu-genero').value;
    const fDes = document.getElementById('f-usu-desde').value;
    const fHas = document.getElementById('f-usu-hasta').value;

    await configurarCabeceraPDF(doc, "Demografía de Usuarios");
    
    let tableData = [];
    let countUsuarios = 0;
    
    // Contadores para gráfica circular
    let cPastor = 0, cLider = 0, cCongregante = 0;

    dataUsuarios.forEach(u => {
        if (!isDateInRange(u.fechaCreacion, fDes, fHas)) return;
        if (fPriv !== "Todos" && u.privilegio !== fPriv) return;
        if (fEst !== "Todos" && u.estado !== fEst) return;
        if (fGen !== "Todos" && u.genero !== fGen) return;

        countUsuarios++;
        
        if (u.privilegio === 'Pastor') cPastor++;
        else if (u.privilegio === 'Líder') cLider++;
        else cCongregante++;

        let docDisplay = u.cedula <= 0 ? "N/C" : `${u.nacionalidad}-${u.cedula}`;
        tableData.push([docDisplay, u.nombre, u.genero, u.privilegio, u.estado]);
    });

    if(tableData.length === 0) tableData.push(["Sin resultados", "", "", "", ""]);

    // ⚡ ESTADÍSTICA ⚡
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total de Usuarios Listados: ${countUsuarios} persona(s)`, 14, 38);

    // ⚡ GENERACIÓN DE GRÁFICA (Dona - Azul, Rojo y Verde) ⚡
    if (chartUsu) chartUsu.destroy();
    const ctx = document.getElementById('chartUsuarios').getContext('2d');
    chartUsu = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pastores', 'Líderes', 'Congregantes'],
            datasets: [{ 
                data: [cPastor, cLider, cCongregante], 
                backgroundColor: ['#0b3b8c', '#bd1920', '#22c55e'] // Azul, Rojo, Verde
            }]
        },
        options: { animation: false, responsive: false, plugins: { legend: { position: 'right' } } }
    });

    const chartImg = document.getElementById('chartUsuarios').toDataURL('image/png', 1.0);
    doc.addImage(chartImg, 'PNG', 55, 45, 100, 75); // Gráfica centrada

    doc.autoTable({
        startY: 130, // Empezar debajo de la gráfica
        head: [['Documento', 'Nombre', 'Gen', 'Nivel/Rol', 'Estado']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [189, 25, 32] } 
    });

    openPdfInNewTab(doc);
}

// ==========================================
// ⚡ GENERADOR 3: EVENTOS
// ==========================================
async function generarReporteEventos() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    const fEst = document.getElementById('f-ev-estado').value;
    const fLug = document.getElementById('f-ev-lugar').value;
    const fDes = document.getElementById('f-ev-desde').value;
    const fHas = document.getElementById('f-ev-hasta').value;
    const fAsisMin = document.getElementById('f-ev-asis-min').value;
    const fAsisMax = document.getElementById('f-ev-asis-max').value;

    await configurarCabeceraPDF(doc, "Consolidado de Eventos Especiales");

    let countEventos = 0;
    let sumAsistentes = 0;
    const chartLabels = [];
    const chartData = [];

    let tableData = dataEventos.filter(ev => {
        if (fEst !== "Todos" && ev.estado !== fEst) return false;
        if (fLug !== "Todos" && ev.lugar !== fLug) return false;
        if (!isDateInRange(ev.fecha, fDes, fHas)) return false;
        if ((ev.estado === "Realizado" || ev.estado === "Realizada") && !checkAsistencia(ev.asistentes, fAsisMin, fAsisMax)) return false;
        return true;
    }).map(ev => {
        countEventos++;
        let asis = ev.asistentes !== null && ev.asistentes !== undefined ? parseInt(ev.asistentes) : 0;
        sumAsistentes += asis;
        
        // Recolectar datos para gráfica
        chartLabels.push(ev.titulo.length > 20 ? ev.titulo.substring(0,20) + '...' : ev.titulo);
        chartData.push(asis);

        return [
            ev.titulo, 
            formatearFechaLatina(ev.fecha),
            ev.lugar, 
            ev.director, 
            ev.estado, 
            asis
        ];
    });

    if(tableData.length === 0) tableData.push(["Sin resultados", "", "", "", "", ""]);

    // ⚡ ESTADÍSTICA ⚡
    let promedio = countEventos > 0 ? Math.round(sumAsistentes / countEventos) : 0;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Eventos Listados: ${countEventos} | Asistencia Total: ${sumAsistentes} | Promedio de asistencia: ${promedio} personas/evento`, 14, 38);

    // ⚡ GENERACIÓN DE GRÁFICA (Barras - Azul Corporativo) ⚡
    if (chartEv) chartEv.destroy();
    const ctx = document.getElementById('chartEventos').getContext('2d');
    chartEv = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{ label: 'Nº Asistentes por Evento', data: chartData, backgroundColor: '#0b3b8c' }] // Azul Corporativo
        },
        options: { animation: false, responsive: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const chartImg = document.getElementById('chartEventos').toDataURL('image/png', 1.0);
    doc.addImage(chartImg, 'PNG', 14, 45, 180, 70); 

    doc.autoTable({
        startY: 125, // Inicia debajo de la gráfica
        head: [['Título', 'Fecha', 'Lugar', 'Director', 'Estado', 'Asist.']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [11, 59, 140] }
    });
    openPdfInNewTab(doc);
}

// ==========================================
// ⚡ GENERADOR 4: SERVICIOS
// ==========================================
async function generarReporteServicios() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    const fEst = document.getElementById('f-srv-estado').value;
    const fMae = document.getElementById('f-srv-maestro').value;
    const fDes = document.getElementById('f-srv-desde').value;
    const fHas = document.getElementById('f-srv-hasta').value;
    const fAsisMin = document.getElementById('f-srv-asis-min').value;
    const fAsisMax = document.getElementById('f-srv-asis-max').value;

    await configurarCabeceraPDF(doc, "Consolidado de Servicios Dominicales");

    let countServicios = 0;
    let sumAsistentes = 0;
    const chartLabels = [];
    const chartData = [];

    let tableData = dataServicios.filter(srv => {
        if (fEst !== "Todos" && srv.estado !== fEst) return false;
        if (fMae !== "Todos" && srv.maestro !== fMae) return false;
        if (!isDateInRange(srv.fecha, fDes, fHas)) return false;
        if ((srv.estado === "Realizado" || srv.estado === "Realizada") && !checkAsistencia(srv.asistentes, fAsisMin, fAsisMax)) return false;
        return true;
    }).map(srv => {
        countServicios++;
        let asis = srv.asistentes !== null && srv.asistentes !== undefined ? parseInt(srv.asistentes) : 0;
        sumAsistentes += asis;

        // Recolectar datos para gráfica
        chartLabels.push(srv.titulo.length > 20 ? srv.titulo.substring(0,20) + '...' : srv.titulo);
        chartData.push(asis);

        return [
            srv.titulo, 
            formatearFechaLatina(srv.fecha),
            srv.maestro, 
            srv.director, 
            srv.estado, 
            asis
        ];
    });

    if(tableData.length === 0) tableData.push(["Sin resultados", "", "", "", "", ""]);

    // ⚡ ESTADÍSTICA ⚡
    let promedio = countServicios > 0 ? Math.round(sumAsistentes / countServicios) : 0;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Servicios Listados: ${countServicios} | Asistencia Total: ${sumAsistentes} | Promedio de asistencia: ${promedio} personas/servicio`, 14, 38);

    // ⚡ GENERACIÓN DE GRÁFICA (Barras - Rojo Corporativo) ⚡
    if (chartSrv) chartSrv.destroy();
    const ctx = document.getElementById('chartServicios').getContext('2d');
    chartSrv = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{ label: 'Nº Asistentes por Servicio', data: chartData, backgroundColor: '#bd1920' }] // Rojo Corporativo para variar visualmente
        },
        options: { animation: false, responsive: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const chartImg = document.getElementById('chartServicios').toDataURL('image/png', 1.0);
    doc.addImage(chartImg, 'PNG', 14, 45, 180, 70); 

    doc.autoTable({
        startY: 125, // Inicia debajo de la gráfica
        head: [['Título', 'Fecha', 'Maestro', 'Director', 'Estado', 'Asist.']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [189, 25, 32] }
    });
    openPdfInNewTab(doc);
}

function limpiarFiltros(tipo) {
    if (tipo === 'min') {
        document.getElementById('f-min-nombre').value = 'Todos';
        document.getElementById('f-min-genero').value = 'Todos';
        document.getElementById('f-min-condicion').value = 'Todos';
        document.getElementById('f-min-rol').value = 'Todos';
        document.getElementById('f-min-desde').value = '';
        document.getElementById('f-min-hasta').value = '';
    } 
    else if (tipo === 'usu') {
        document.getElementById('f-usu-privilegio').value = 'Todos';
        document.getElementById('f-usu-estado').value = 'Todos';
        document.getElementById('f-usu-genero').value = 'Todos';
        document.getElementById('f-usu-desde').value = '';
        document.getElementById('f-usu-hasta').value = '';
    } 
    else if (tipo === 'ev') {
        document.getElementById('f-ev-estado').value = 'Todos';
        document.getElementById('f-ev-lugar').value = 'Todos';
        document.getElementById('f-ev-desde').value = '';
        document.getElementById('f-ev-hasta').value = '';
        document.getElementById('f-ev-asis-min').value = '';
        document.getElementById('f-ev-asis-max').value = '';
        toggleAsistencia('ev'); 
    } 
    else if (tipo === 'srv') {
        document.getElementById('f-srv-estado').value = 'Todos';
        document.getElementById('f-srv-maestro').value = 'Todos';
        document.getElementById('f-srv-desde').value = '';
        document.getElementById('f-srv-hasta').value = '';
        document.getElementById('f-srv-asis-min').value = '';
        document.getElementById('f-srv-asis-max').value = '';
        toggleAsistencia('srv'); 
    }
}