// --- Lógica Específica para la pantalla de Estudios ---

function switchStudyTab(tabId, element) {
    const tabs = document.querySelectorAll('.study-tab');
    tabs.forEach(tab => {
        tab.classList.remove('text-primary', 'border-primary');
        tab.classList.add('text-slate-500', 'border-transparent');
    });
    
    element.classList.add('text-primary', 'border-primary');
    element.classList.remove('text-slate-500', 'border-transparent');
    
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        if (content.id === tabId) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

function openModal(title, description, instructor) {
    const modal = document.getElementById('class-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-description');
    const modalInstructor = document.getElementById('modal-instructor');
    
    modalTitle.textContent = title;
    modalDesc.textContent = description;
    modalInstructor.textContent = instructor;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
}

function closeModal() {
    const modal = document.getElementById('class-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}