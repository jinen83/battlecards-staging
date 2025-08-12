document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIG ---
    const EDIT_PASSWORD = 'sales123';

    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const mainNavList = document.getElementById('main-nav-list');
    const mainContent = document.getElementById('main-content');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const passwordModal = document.getElementById('password-modal');
    const passwordInput = document.getElementById('password-input');
    const passwordError = document.getElementById('password-error');
    const submitPasswordBtn = document.getElementById('submit-password-btn');
    const inputModal = document.getElementById('input-modal');
    const inputModalTitle = document.getElementById('input-modal-title');
    const inputModalField = document.getElementById('input-modal-field');
    const inputModalSubmit = document.getElementById('input-modal-submit');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const openMenuBtn = document.getElementById('open-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileHeaderTitle = document.getElementById('mobile-header-title');

    // --- State ---
    let battleCardData = {};
    let isEditMode = false;
    let activeCardId = null;
    let activeSubTabId = null;

    // --- Data Persistence ---
    async function loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const jsonData = await response.json();
            // Use local storage as an override, but fall back to fetched data
            const storedData = localStorage.getItem('battleCardData');
            battleCardData = storedData ? JSON.parse(storedData) : jsonData;
        } catch (e) {
            console.error("Failed to load data.json, using fallback. Error:", e);
            // In a real app, you'd show an error message to the user.
        }
    }
    function saveData() {
        localStorage.setItem('battleCardData', JSON.stringify(battleCardData, null, 2));
    }

    // --- HTML Generation & Rendering ---
    const createDeleteBtn = (path) => `<button class="edit-control text-red-500 hover:text-red-700 ml-2" data-action="delete" data-path="${path}"><ion-icon name="trash-outline"></ion-icon></button>`;
    
    function parseMarkdown(text = '') {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italic
            .replace(/\n/g, '<br>');                      // Newlines
    }

    function generateCardHTML(cardId, cardData) {
        const tabsNavHTML = cardData.tabs.map((t, i) => `<div class="relative group"><button class="sub-tab-link whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-sub-tab-target="${t.id}">${t.title}</button><div class="absolute top-0 right-0">${createDeleteBtn(`${cardId}.tabs[${i}]`)}</div></div>`).join('') + `<div class="py-4 px-1 edit-control"><button class="text-sm font-medium text-sky-600 hover:text-sky-800" data-action="add-tab" data-path="${cardId}.tabs">+ Add Tab</button></div>`;
        
        const tabsContentHTML = cardData.tabs.map((tab, tabIndex) => {
            const headersHTML = tab.headers.map((h, i) => `<th class="px-6 py-3 editable" data-path="${cardId}.tabs[${tabIndex}].headers[${i}]">${h}</th>`).join('') + `<th class="w-12 edit-control"><button class="text-sky-600 hover:text-sky-800" data-action="add-column" data-path="${cardId}.tabs[${tabIndex}]"><ion-icon name="add-circle-outline" class="text-lg"></ion-icon></button></th>`;
            
            const rowsHTML = tab.content.map((item, contentIndex) => {
                const cellsHTML = item.row.map((cell, cellIndex) => `<td class="px-6 py-4 editable" data-path="${cardId}.tabs[${tabIndex}].content[${contentIndex}].row[${cellIndex}]">${parseMarkdown(cell)}</td>`).join('');
                const detailsHTML = `<tr class="details-row"><td colspan="${tab.headers.length + 2}" class="p-4 bg-gray-50"><div class="editable" data-path="${cardId}.tabs[${tabIndex}].content[${contentIndex}].details">${parseMarkdown(item.details)}</div></td></tr>`;
                return `<tr class="expandable-row border-b group" data-row-index="${contentIndex}"><td class="px-2 py-4 text-center text-gray-400"><ion-icon name="chevron-forward-outline" class="expand-icon"></ion-icon></td>${cellsHTML}<td class="px-2 py-4 w-12 text-center">${createDeleteBtn(`${cardId}.tabs[${tabIndex}].content[${contentIndex}]`)}</td></tr>${detailsHTML}`;
            }).join('');

            return `<div id="${tab.id}" class="content-pane sub-tab-content">${tab.description ? `<p class="text-gray-600 mb-4 editable" data-path="${cardId}.tabs[${tabIndex}].description">${parseMarkdown(tab.description)}</p>` : ''}<div class="table-container overflow-x-auto bg-white rounded-lg shadow"><table class="w-full text-sm text-left"><thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th class="w-12"></th>${headersHTML}</tr></thead><tbody>${rowsHTML}</tbody></table><div class="p-4 edit-control"><button class="text-sm font-medium text-sky-600 hover:text-sky-800" data-action="add-row" data-path="${cardId}.tabs[${tabIndex}].content">+ Add Row</button></div></div></div>`;
        }).join('');

        return `<div id="${cardId}" class="content-pane battle-card-content"><div class="flex justify-between items-center"><h2 class="text-2xl md:text-3xl font-bold mb-2 editable" data-path="${cardId}.title">${cardData.title}</h2>${createDeleteBtn(cardId)}</div><p class="text-gray-500 mb-8 editable" data-path="${cardId}.subtitle">${parseMarkdown(cardData.subtitle)}</p><div class="border-b border-gray-200 mb-6"><nav class="sub-tab-nav -mb-px flex flex-wrap space-x-4 sm:space-x-8">${tabsNavHTML}</nav></div>${tabsContentHTML}</div>`;
    }

    // --- App Logic ---
    function renderApp() {
        const currentActiveCard = activeCardId;
        const currentActiveSubTab = activeSubTabId;
        mainNavList.innerHTML = '';
        mainContent.innerHTML = '';
        for (const key in battleCardData) {
            mainNavList.innerHTML += `<li><a href="#" class="nav-link block w-full text-left px-4 py-2 rounded-lg transition-colors duration-200" data-target="${key}">${battleCardData[key].title}</a></li>`;
            mainContent.innerHTML += generateCardHTML(key, battleCardData[key]);
        }
        const cardToSelect = battleCardData[currentActiveCard] ? currentActiveCard : Object.keys(battleCardData)[0];
        if (cardToSelect) {
            switchMainTab(cardToSelect, currentActiveSubTab);
        }
    }

    function switchMainTab(targetId, subTabToSelect = null) {
        activeCardId = targetId;
        document.querySelectorAll('.battle-card-content').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const targetPane = document.getElementById(targetId);
        const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (targetPane && targetLink) {
            targetPane.classList.add('active');
            targetLink.classList.add('active');
            mobileHeaderTitle.textContent = battleCardData[targetId].title;
            initializeSubTabs(targetId, subTabToSelect);
        }
        toggleMobileMenu(false);
    }
    
    function switchSubTab(cardId, tabId) {
        activeSubTabId = tabId;
        const cardElement = document.getElementById(cardId);
        if (!cardElement) return;
        cardElement.querySelectorAll('.sub-tab-content').forEach(p => p.classList.remove('active'));
        cardElement.querySelectorAll('.sub-tab-link').forEach(l => l.classList.remove('active'));
        const targetPane = cardElement.querySelector(`#${tabId}`);
        const targetLink = cardElement.querySelector(`[data-sub-tab-target="${tabId}"]`);
        if(targetPane && targetLink) {
            targetPane.classList.add('active');
            targetLink.classList.add('active');
        }
    }

    function initializeSubTabs(cardId, subTabToSelect = null) {
        const subTabNav = document.getElementById(cardId)?.querySelector('.sub-tab-nav');
        if (subTabNav && subTabNav.children.length > 0) {
            let tabToSelect = subTabToSelect;
            if (!tabToSelect || !document.getElementById(tabToSelect)) {
                 const firstTabButton = subTabNav.children[0].querySelector('button');
                 if(firstTabButton) tabToSelect = firstTabButton.dataset.subTabTarget;
            }
            if(tabToSelect) switchSubTab(cardId, tabToSelect);
        }
    }

    function toggleMobileMenu(show) {
        if (show) {
            sidebar.classList.remove('-translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
        }
    }

    // --- Edit Mode & CRUD Functions ---
    function enterEditMode() { isEditMode = true; appContainer.classList.add('in-edit-mode'); editModeBtn.innerHTML = `<ion-icon name="save-outline" class="mr-2 text-lg"></ion-icon><span>Exit Edit Mode</span>`; }
    function exitEditMode() { isEditMode = false; appContainer.classList.remove('in-edit-mode'); editModeBtn.innerHTML = `<ion-icon name="create-outline" class="mr-2 text-lg"></ion-icon><span>Edit Content</span>`; renderApp(); }
    
    function getObjectByPath(obj, path) { const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.'); let current = obj; for (const key of keys) { if (current === undefined) return undefined; current = current[key]; } return current; }
    function updateObjectByPath(obj, path, value) { const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.'); let current = obj; for (let i = 0; i < keys.length - 1; i++) { current = current[keys[i]]; } current[keys[keys.length - 1]] = value; }
    function deleteObjectByPath(obj, path) { const keys = path.replace(/\[(\w+)\]/g, '.$1').split('.'); let current = obj; for (let i = 0; i < keys.length - 1; i++) { current = current[keys[i]]; } const finalKey = keys[keys.length - 1]; if (Array.isArray(current)) current.splice(parseInt(finalKey), 1); else delete current[finalKey]; }

    function promptForInput(title) {
        return new Promise(resolve => {
            inputModal.style.display = 'flex';
            inputModalTitle.textContent = title;
            inputModalField.value = '';
            inputModalField.focus();
            
            const onSubmit = () => { resolve(inputModalField.value); cleanup(); };
            const onCancel = () => { resolve(null); cleanup(); };
            const cleanup = () => { inputModal.style.display = 'none'; inputModalSubmit.removeEventListener('click', onSubmit); inputModal.querySelectorAll('.modal-cancel-btn').forEach(b => b.removeEventListener('click', onCancel)); };
            inputModalSubmit.addEventListener('click', onSubmit);
            inputModal.querySelectorAll('.modal-cancel-btn').forEach(b => b.addEventListener('click', onCancel));
        });
    }

    // --- Event Listeners ---
    mainNavList.addEventListener('click', (e) => e.target.closest('.nav-link') && (e.preventDefault(), switchMainTab(e.target.closest('.nav-link').dataset.target)));
    mainContent.addEventListener('click', (e) => {
        const subTabLink = e.target.closest('.sub-tab-link');
        const expandableRow = e.target.closest('.expandable-row');
        
        if (subTabLink) { e.preventDefault(); switchSubTab(activeCardId, subTabLink.dataset.subTabTarget); }
        if (expandableRow) {
            expandableRow.classList.toggle('row-expanded');
            const detailsRow = expandableRow.nextElementSibling;
            if (detailsRow && detailsRow.classList.contains('details-row')) {
                detailsRow.classList.toggle('expanded');
            }
        }
    });
    
    mainContent.addEventListener('click', (e) => {
        if (!isEditMode) return;
        const editable = e.target.closest('.editable');
        const actionBtn = e.target.closest('[data-action]');

        if (editable) {
            const originalHTML = editable.innerHTML;
            const input = document.createElement('textarea');
            input.value = getObjectByPath(battleCardData, editable.dataset.path);
            input.className = "w-full h-auto p-1 border rounded bg-white";
            input.style.minHeight = `${editable.offsetHeight + 10}px`;
            editable.innerHTML = '';
            editable.appendChild(input);
            input.focus();
            const saveChange = () => { const newValue = input.value; updateObjectByPath(battleCardData, editable.dataset.path, newValue); saveData(); editable.innerHTML = parseMarkdown(newValue); };
            input.addEventListener('blur', saveChange);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); } if (e.key === 'Escape') editable.innerHTML = originalHTML; });
        } else if (actionBtn) {
            e.preventDefault();
            const { action, path } = actionBtn.dataset;
            if (action === 'delete') {
                if (confirm('Are you sure you want to delete this item?')) { deleteObjectByPath(battleCardData, path); saveData(); renderApp(); }
            } else if (action === 'add-row') {
                const array = getObjectByPath(battleCardData, path);
                const numColumns = array.length > 0 ? array[0].row.length : 3;
                array.push({ row: Array(numColumns).fill("..."), details: "More details here..." });
                saveData();
                renderApp();
            } else if (action === 'add-tab') {
                promptForInput("Enter New Tab Title").then(title => {
                    if (title) {
                        const array = getObjectByPath(battleCardData, path);
                        const newId = `${activeCardId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
                        array.push({ id: newId, title: title, headers: ["Feature", "DronaHQ", "New Competitor"], content: [] });
                        saveData();
                        activeSubTabId = newId;
                        renderApp();
                    }
                });
            } else if (action === 'add-column') {
                promptForInput("Enter New Column Header").then(header => {
                    if (header) {
                        const tab = getObjectByPath(battleCardData, path);
                        tab.headers.push(header);
                        tab.content.forEach(item => item.row.push("..."));
                        saveData();
                        renderApp();
                    }
                });
            }
        }
    });

    document.getElementById('add-card-btn').addEventListener('click', () => {
        promptForInput("Enter New Card Title (e.g., Salesforce)").then(title => {
            if (title) {
                const id = title.toLowerCase().replace(/\s+/g, '-');
                if (battleCardData[id]) { alert('A card with this ID already exists.'); return; }
                battleCardData[id] = { title, subtitle: "New card subtitle...", tabs: [] };
                saveData();
                activeCardId = id;
                renderApp();
            }
        });
    });

    editModeBtn.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
            alert("Editing is disabled on mobile devices for a better experience.");
            return;
        }
        if (isEditMode) exitEditMode();
        else { passwordModal.style.display = 'flex'; passwordInput.focus(); }
    });

    // Mobile Menu Listeners
    openMenuBtn.addEventListener('click', () => toggleMobileMenu(true));
    closeMenuBtn.addEventListener('click', () => toggleMobileMenu(false));
    mobileMenuOverlay.addEventListener('click', () => toggleMobileMenu(false));

    // Password Modal Listeners
    passwordModal.querySelectorAll('.modal-cancel-btn').forEach(b => b.addEventListener('click', () => passwordModal.style.display = 'none'));
    submitPasswordBtn.addEventListener('click', () => {
        if (passwordInput.value === EDIT_PASSWORD) {
            passwordModal.style.display = 'none';
            passwordInput.value = '';
            passwordError.classList.add('hidden');
            enterEditMode();
        } else { passwordError.classList.remove('hidden'); }
    });
    passwordInput.addEventListener('keydown', (e) => e.key === 'Enter' && submitPasswordBtn.click());

    // --- Initial Load ---
    loadData().then(() => {
        renderApp();
    });
});
