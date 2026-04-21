// --- Lógica Específica para la pantalla de Noticias y Eventos ---

function toggleLike(button) {
    const icon = button.querySelector('.material-symbols-outlined');
    const counter = button.querySelector('.like-count');
    let count = parseInt(counter.textContent);
    
    if (icon.classList.contains('text-red-500')) {
        // Quitar Like
        icon.classList.remove('text-red-500');
        icon.style.fontVariationSettings = "'FILL' 0";
        icon.classList.add('text-slate-400');
        counter.textContent = count - 1;
        counter.classList.remove('text-red-500');
        counter.classList.add('text-slate-500');
    } else {
        // Dar Like
        icon.classList.add('text-red-500');
        icon.style.fontVariationSettings = "'FILL' 1";
        icon.classList.remove('text-slate-400');
        counter.textContent = count + 1;
        counter.classList.add('text-red-500');
        counter.classList.remove('text-slate-500');
    }
}

function switchTab(tabId, element) {
    // Restaurar el estilo de todas las pestañas
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.classList.remove('bg-primary', 'text-white', 'shadow-md');
        tab.classList.add('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
    });
    
    // Aplicar estilo activo a la pestaña seleccionada
    element.classList.remove('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
    element.classList.add('bg-primary', 'text-white', 'shadow-md');
    
    // Mostrar solo las tarjetas correspondientes a la categoría
    const newsCards = document.querySelectorAll('.news-card');
    newsCards.forEach(card => {
        if (card.dataset.category === tabId) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}