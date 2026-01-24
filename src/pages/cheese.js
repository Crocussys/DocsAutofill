async function getDataFromClipboard() {
    const text = await navigator.clipboard.readText();
    return text ? JSON.parse(text) : {};
}

function copyCheeseGTIN() {
    const container = document.querySelector('#redesign-portal div.ReactVirtualizedGrid.ReactVirtualizedList > div');
    const rows = container.querySelectorAll('.DataRow');
    const gtins = {};
    rows.forEach(row => {
        if (row.querySelector('[data-column="name"]')?.innerText.startsWith('Сыр ')) {
            gtins[row.querySelector('[data-column="gtin"] a')?.innerText] = Number(row.querySelector('[data-column="quantity"]')?.innerText.replace(',', '.').match(/\d+(\.\d+)?/)?.[0])
        }
    });
    navigator.clipboard.writeText(JSON.stringify(gtins));
}

async function pasteCheeseGTIN() {
    const date = new Date();
    const today = `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
    selectMuiOption('mui-5', '219');
    selectMuiOption('mui-15', 'OTHER');
    setReactInputValue(document.getElementById('mui-16'), today);
    setReactInputValue(document.getElementById('mui-21'), 'фасовка');
    setReactInputValue(document.getElementById('mui-24'), '1');
    setReactInputValue(document.getElementById('mui-25'), today);
    setReactInputValue(document.getElementById('mui-26'), 'УПД');
    const data = await getDataFromClipboard();
    if (!data || Object.keys(data).length === 0) {
        return;
    }
    const rowsContainer = document.querySelector('#redesign-portal');
    if (!rowsContainer) {
        return;
    }
    let resolveRow;
    const observer = new MutationObserver(() => {
        const rows = document.querySelectorAll('div[data-test="product.row"]');
        if (rows.length > 0 && resolveRow) {
            const r = rows[rows.length - 1];
            resolveRow(r);
            resolveRow = null;
        }
    });
    observer.observe(rowsContainer, { childList: true, subtree: true });
    let first = true;
    for (const [gtin, quantity] of Object.entries(data)) {
        if (!first) {
            const btnAdd = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Добавить строку');
            btnAdd?.click();
        } else {
            first = false;
        }
        const lastRow = await new Promise(resolve => resolveRow = resolve);
        const gtinInput = lastRow.querySelector('input[name*="[compositeProductKey]"]');
        if (gtinInput) {
            setReactInputValue(gtinInput, gtin);
        }
        const qtyInput = lastRow.querySelector('input[name*="[quantity]"]');
        if (qtyInput) {
            setReactInputValue(qtyInput, quantity);
        }
    }
    observer.disconnect();
}


function init() {
    if (window.location.pathname === '/warehouse') {
        const observer = new MutationObserver(() => {
            const container = document.querySelector('#redesign-portal div.MuiBox-root');
            if (container) {
                container.appendChild(createButton(copyCheeseGTIN, 'Копировать сыры', { width: '180px', height: '36px' }));
                observer.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else if (window.location.pathname === '/requests/withdrawing/create') {
        const BUTTON_ID = 'custom-header-button';
        const observer = new MutationObserver(() => {
            const container = document.querySelector('#WindowHeader div.FormLayout-FormHeaderSection');
            if (!container) {
                return;
            }
            if (container.querySelector(`#${BUTTON_ID}`)) {
                return;
            }
            const button = createButton(pasteCheeseGTIN, 'Вставить сыры', { width: '130px', height: '36px' });
            button.id = BUTTON_ID;
            button.style.marginLeft = '8px';
            container.appendChild(button);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}