// --- ⚡ INYECCIÓN GLOBAL DEL FAVICON (Icono de pestaña) ⚡ ---
(function setGlobalFavicon() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = '/images/LogoIglesiaDeLaCalle.jpeg';
})();

// --- Inicialización del Tema Oscuro ---
if (localStorage.getItem('iglesia_theme') === 'dark' || (!('iglesia_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// --- Configuración de Tailwind ---
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#0052cc",
                "background-light": "#f4f7fa",
                "background-dark": "#0f172a",
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.75rem",
            },
        },
    },
};

// --- ⚡ GUARDIÁN DE SESIÓN Y NAVEGACIÓN ⚡ ---
document.addEventListener('DOMContentLoaded', () => {
    aplicarPermisos();
    protegerRutasSeguras();
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        aplicarPermisos();
        protegerRutasSeguras();
    }
});

function protegerRutasSeguras() {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const path = window.location.pathname.toLowerCase();
    
    const rutasPublicas = ['/', '/index.html', '/login', '/login.html', '/registro', '/registro.html', '/estudios', '/estudios.html'];
    const esPublica = rutasPublicas.some(ruta => path === ruta || path.endsWith(ruta));

    if (!session && !esPublica) {
        window.location.href = '/login';
        return;
    }

    const rutasAdmin = ['/usuarios', '/servicios', '/eventos', '/ministerios', '/bloquesytips', '/clasesimpartiendo', '/teologia', '/consultas', '/reportes'];
    const intentaEntrarAdmin = rutasAdmin.some(ruta => path.includes(ruta));
    
    if (session && session.estado === 'Bloqueado' && intentaEntrarAdmin) {
        window.location.href = '/'; 
        return;
    }
}

// --- ⚡ LÓGICA DE PERMISOS CORREGIDA ⚡ ---
function aplicarPermisos() {
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    const userHeader = document.getElementById('user-header-section');
    
    if (userHeader) {
        if (!session) {
            userHeader.innerHTML = `
                <div class="flex gap-2 justify-end w-full">
                    <a href="/login" class="px-4 py-2 text-sm font-bold text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors">Iniciar Sesión</a>
                    <a href="/registro" class="px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors">Registrarse</a>
                </div>
            `;
        } else {
            let avatarHTML = (session.foto && session.foto.trim() !== "") 
                ? `<img src="${session.foto}" class="w-full h-full object-cover" />` 
                : `<span class="text-white font-bold">${session.nombre.charAt(0)}</span>`;

            userHeader.innerHTML = `
                <div class="relative flex justify-end w-full">
                    <button class="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onclick="toggleUserMenu()">
                        <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                            ${avatarHTML}
                        </div>
                        <span class="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">${session.nombre}</span>
                        <span class="material-icons-round text-slate-400 text-sm">expand_more</span>
                    </button>
                    <div class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 hidden z-[100]" id="user-dropdown">
                        <div class="p-2 space-y-1">
                            <a class="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors" href="/configperfil">
                                <span class="material-icons-round text-lg text-slate-400">person_outline</span>
                                Config. Perfil
                            </a>
                            <div class="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                            <button onclick="logout()" class="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                                <span class="material-icons-round text-lg">logout</span> Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    let rol = session ? session.rol : 0; 
    
    if (session && session.estado === 'Bloqueado') {
        rol = 0; 
        if (!document.getElementById('blocked-user-banner')) {
            const banner = document.createElement('div');
            banner.id = 'blocked-user-banner';
            banner.className = 'w-full bg-red-600 text-white p-4 shadow-lg flex flex-col sm:flex-row items-center justify-center gap-3 z-[9999] flex-shrink-0';
            banner.innerHTML = `
                <span class="material-icons-round text-3xl animate-pulse">gpp_bad</span>
                <div class="text-center sm:text-left">
                    <p class="font-bold text-base uppercase tracking-wide">Tu cuenta se encuentra bloqueada</p>
                    <p class="text-xs sm:text-sm text-red-100">Actualmente no tienes privilegios en el sistema.</p>
                </div>
            `;
            const mainContentArea = document.querySelector('.flex-1.flex-col');
            if (mainContentArea) mainContentArea.insertBefore(banner, mainContentArea.firstChild);
            else document.body.insertBefore(banner, document.body.firstChild);
        }
    }

    const sidebarLinks = {
        usuarios: document.querySelector('a[href="/usuarios"]'),
        servicios: document.querySelector('a[href="/servicios"]'),
        eventos: document.querySelector('a[href="/eventos"]'),
        ministerios: document.querySelector('a[href="/ministerios"]'),
        consultas: document.querySelector('a[href="/consultas"]'),
        reportes: document.querySelector('a[href="/reportes"]')
    };

    // 🔥 CORRECCIÓN: Ocultar TODOS los submenús (Bloques y Teología) para congregantes
    const submenus = document.querySelectorAll('.submenu-container');

    if (rol === 0 || rol === 1) { // Invitado o Congregante
        Object.values(sidebarLinks).forEach(el => {
            if (el) el.classList.add('hidden');
        });
        submenus.forEach(menu => menu.classList.add('hidden')); // Adiós a Teología y Bloques para ellos
    } else if (rol === 2) { // Líder
        if (sidebarLinks.reportes) sidebarLinks.reportes.classList.add('hidden');
    }

    if (window.location.pathname.toLowerCase().includes('estudios') && rol === 0) {
        document.querySelectorAll('.study-tab').forEach(tab => {
            if (!tab.innerText.includes('Disponibles')) tab.classList.add('hidden');
        });
    }
}

function logout() {
    localStorage.removeItem('iglesia_session');
    window.location.href = '/login'; 
}

function toggleUserMenu() {
    const userMenu = document.getElementById('user-dropdown');
    if (userMenu) userMenu.classList.toggle('hidden');
}

document.addEventListener('click', (event) => {
    const userMenu = document.getElementById('user-dropdown');
    const userButton = document.querySelector('button[onclick="toggleUserMenu()"]');
    if (userMenu && !userMenu.classList.contains('hidden')) {
        if (!userMenu.contains(event.target) && !userButton.contains(event.target)) {
            userMenu.classList.add('hidden');
        }
    }
});

function toggleDarkMode() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    if (html.classList.contains('dark')) localStorage.setItem('iglesia_theme', 'dark');
    else localStorage.setItem('iglesia_theme', 'light');
}

function toggleMobileMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    if (menu) menu.classList.toggle('-translate-x-full');
    if (overlay) overlay.classList.toggle('hidden');
}

function toggleSubmenu(id) {
    const submenu = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!submenu) return;
    
    const container = submenu.closest('.submenu-container');
    if (submenu.style.maxHeight) {
        submenu.style.maxHeight = null;
        submenu.style.opacity = "0";
        if (arrow) arrow.classList.remove('rotate-180');
        if(container) container.classList.remove('bg-slate-50', 'dark:bg-slate-800/50');
    } else {
        submenu.style.maxHeight = submenu.scrollHeight + "px";
        submenu.style.opacity = "1";
        if (arrow) arrow.classList.add('rotate-180');
        if(container) container.classList.add('bg-slate-50', 'dark:bg-slate-800/50');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// --- ⚡ MENÚ DINÁMICO (MODO FORZADO PARA PRESENTACIÓN) ⚡ ---
document.addEventListener('DOMContentLoaded', async () => {
    const navMenu = document.querySelector('#side-menu nav');
    const session = JSON.parse(localStorage.getItem('iglesia_session'));
    if (!navMenu || !session) return;

    const path = window.location.pathname;
    const botonNoticias = navMenu.querySelector('a[href="/"]');
    if (!botonNoticias) return;

    const clasesActivo = "flex items-center gap-4 px-4 py-3 bg-primary text-white font-medium rounded-xl ios-shadow";
    const clasesInactivo = "flex items-center gap-4 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors";

    // 1. FORZAR MIS MINISTERIOS (Aparece sí o sí para la presentación)
    if (!navMenu.querySelector('a[href="/mis-ministerios"]')) {
        botonNoticias.insertAdjacentHTML('afterend', `
            <a class="${path.includes('/mis-ministerios') ? clasesActivo : clasesInactivo}" href="/mis-ministerios">
                <span class="material-icons-round">groups</span> <span>Mis Ministerios</span>
            </a>
        `);
    }

    // 2. FORZAR MIS BLOQUES (Aparece sí o sí para la presentación)
    if (!navMenu.querySelector('a[href="/mis-bloques"]')) {
        const btnMin = navMenu.querySelector('a[href="/mis-ministerios"]') || botonNoticias;
        btnMin.insertAdjacentHTML('afterend', `
            <a class="${path.includes('/mis-bloques') ? clasesActivo : clasesInactivo}" href="/mis-bloques">
                <span class="material-icons-round">local_library</span> <span>Mis Bloques</span>
            </a>
        `);
    }
});