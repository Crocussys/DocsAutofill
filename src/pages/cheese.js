async function getDataFromClipboard() {
    const text = await navigator.clipboard.readText();
    return text ? JSON.parse(text) : {};
}

function showStatusMessage(buttonId, durationMs = 1000) {
    const status = document.getElementById(`${buttonId}-status`);
    if (!status) {
        return;
    }
    status.style.opacity = '1';
    if (status._hideTimer) {
        clearTimeout(status._hideTimer);
    }
    status._hideTimer = setTimeout(() => {
        status.style.opacity = '0';
    }, durationMs);
}

async function copyCheeseGTIN(statusButtonId) {
    let rows = document.querySelectorAll('div[data-test="product.row"]');
    if (!rows || rows.length === 0) {
        rows = document.querySelectorAll('#redesign-portal .DataRow');
    }
    if (!rows || rows.length === 0) {
        console.warn('[DocsAutofill] GTIN rows not found for copy.');
        return false;
    }
    const gtins = {};
    rows.forEach(row => {
        if (row.querySelector('[data-column="name"]')?.innerText.startsWith('Сыр')) {
            gtins[row.querySelector('[data-column="gtin"] a')?.innerText] = Number(row.querySelector('[data-column="quantity"]')?.innerText.replace(',', '.').match(/\d+(\.\d+)?/)?.[0])
        }
    });
    try {
        await navigator.clipboard.writeText(JSON.stringify(gtins));
        if (statusButtonId) {
            showStatusMessage(statusButtonId);
        }
        return true;
    } catch (error) {
        console.warn('[DocsAutofill] Failed to copy GTINs.', error);
        return false;
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function extractProductIndex(inputName) {
    const match = inputName?.match(/^osuProducts\[(\d+)\]\[compositeProductKey\]$/);
    return match ? Number(match[1]) : -1;
}

function getProductKeyInputs() {
    const rows = Array.from(document.querySelectorAll('input[name^="osuProducts["][name$="[compositeProductKey]"]'));
    rows.sort((a, b) => extractProductIndex(a.name) - extractProductIndex(b.name));
    return rows;
}

function findAddItemButton() {
    const textVariants = [
        'Добавить товар',
        'Р”РѕР±Р°РІРёС‚СЊ С‚РѕРІР°СЂ',
        'Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎвЂљР С•Р Р†Р В°РЎР‚'
    ];

    return Array.from(document.querySelectorAll('button')).find(button => {
        const label = button.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return textVariants.includes(label) || label.includes('товар') || label.includes('РѕРІР°СЂ');
    }) ?? null;
}

async function ensureProductRowByPosition(position, waitTimeoutMs = 5000) {
    let rows = getProductKeyInputs();
    while (rows.length <= position) {
        const addButton = findAddItemButton();
        if (!addButton) {
            console.warn('[DocsAutofill] Add item button not found.');
            return null;
        }

        const previousCount = rows.length;
        addButton.click();

        const start = Date.now();
        while (Date.now() - start < waitTimeoutMs) {
            await sleep(50);
            rows = getProductKeyInputs();
            if (rows.length > previousCount) {
                break;
            }
        }

        if (rows.length <= previousCount) {
            console.warn(`[DocsAutofill] Failed to add product row for position ${position}.`);
            return null;
        }
    }

    return rows[position] ?? null;
}

async function pasteCheeseGTIN() {
    const date = new Date();
    const today = `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
    const okDocumentType = await selectMuiOptionByName('documentType', '219');
    if (!okDocumentType) {
        return;
    }
    const okAction = await selectMuiOptionByName('action', 'OTHER');
    if (!okAction) {
        return;
    }
    setReactInputValue(document.querySelector('input[name="actionDate"]'), today);
    setReactInputValue(document.querySelector('input[name="actionOther"]'), 'фасовка');
    setReactInputValue(document.querySelector('input[name="sourceDocumentNumber"]'), '1');
    setReactInputValue(document.querySelector('input[name="sourceDocumentDate"]'), today);
    setReactInputValue(document.querySelector('input[name="sourceDocumentName"]'), 'УПД');

    const data = await getDataFromClipboard();
    const items = Object.entries(data);
    for (let position = 0; position < items.length; ++position) {
        const [gtin, quantity] = items[position];
        const rowInput = await ensureProductRowByPosition(position);
        if (!rowInput) {
            console.warn(`[DocsAutofill] Failed to find input for product at position ${position}.`);
            break;
        }

        const okGTIN = await selectMuiOptionByName(rowInput.name, gtin);
        if (!okGTIN) {
            console.warn(`[DocsAutofill] Failed to set GTIN: ${gtin}`);
            continue;
        }

        const productIndex = extractProductIndex(rowInput.name);
        if (productIndex < 0) {
            console.warn(`[DocsAutofill] Unexpected row name: ${rowInput.name}`);
            continue;
        }

        const quantityInput = document.querySelector(`input[name="osuProducts[${productIndex}][quantity]"]`);
        if (!quantityInput) {
            console.warn(`[DocsAutofill] Quantity input not found for row ${productIndex}.`);
            continue;
        }

        const integerQuantity = Number.parseInt(quantity, 10);
        if (!Number.isFinite(integerQuantity)) {
            console.warn(`[DocsAutofill] Invalid quantity for GTIN ${gtin}: ${quantity}`);
            continue;
        }

        setReactInputValue(quantityInput, String(integerQuantity));
    }
}

function init() {
    const normalizePath = (path) => {
        if (path.length > 1 && path.endsWith('/')) {
            return path.slice(0, -1);
        }
        return path;
    };

    const BUTTONS = {
        '/warehouse': {
            id: 'docsautofill-copy-cheese',
            text: 'Копировать сыры',
            onClick: () => copyCheeseGTIN('docsautofill-copy-cheese'),
            size: { width: '150px', height: '40px' },
            statusText: 'Скопировано!',
            marginLeft: '24px',
            marginTop: '24px',
            getContainer: () => {
                return document.querySelector('#redesign-portal');
            },
            insertAfter: true
        },
        '/requests/withdrawing/create': {
            id: 'custom-header-button',
            text: 'Вставить сыры',
            onClick: pasteCheeseGTIN,
            size: { width: '150px', height: '40px' },
            marginLeft: '24px',
            marginTop: '0px',
            getContainer: () => {
                const header = Array.from(document.querySelectorAll('#redesign-portal .FormLayout-FormHeaderSection'))
                    .find(el => el.textContent?.includes('Вывод из оборота'));
                return header || document.querySelector('#WindowHeader div.FormLayout-FormHeaderSection');
            },
            insertAfter: false
        }
    };
    const placeButton = (container, element, insertAfter) => {
        if (!insertAfter) {
            if (element.parentElement !== container) {
                container.appendChild(element);
            }
            return;
        }
        const children = Array.from(container.children);
        if (children.length === 0) {
            if (element.parentElement !== container) {
                container.appendChild(element);
            }
            return;
        }
        const firstNonElement = children.find(child => child !== element);
        if (!firstNonElement) {
            return;
        }
        if (firstNonElement.nextElementSibling !== element) {
            firstNonElement.insertAdjacentElement('afterend', element);
        }
    };

    const observer = new MutationObserver(() => {
        const path = normalizePath(window.location.pathname);
        Object.entries(BUTTONS).forEach(([key, cfg]) => {
            if (normalizePath(key) !== path) {
                const wrapper = document.getElementById(`${cfg.id}-wrapper`);
                if (wrapper) {
                    wrapper.remove();
                }
                const button = document.getElementById(cfg.id);
                if (button) {
                    button.remove();
                }
            }
        });

        const config = BUTTONS[path];
        if (!config) {
            return;
        }
        const container = config.getContainer();
        if (!container) {
            return;
        }
        const wrapperId = `${config.id}-wrapper`;
        let wrapper = document.getElementById(wrapperId);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = wrapperId;
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '8px';
        }
        let button = document.getElementById(config.id);
        if (!button) {
            button = createButton(config.onClick, config.text, config.size);
            button.id = config.id;
        }
        if (button.parentElement !== wrapper) {
            wrapper.appendChild(button);
        }
        if (config.statusText) {
            const statusId = `${config.id}-status`;
            let status = document.getElementById(statusId);
            if (!status) {
                status = document.createElement('span');
                status.id = statusId;
                status.textContent = config.statusText;
                status.style.opacity = '0';
                status.style.transition = 'opacity 0.3s ease';
                status.style.color = '#2e7d32';
                status.style.fontSize = '14px';
                status.style.marginLeft = '8px';
                status.style.pointerEvents = 'none';
                status.style.userSelect = 'none';
            }
            if (status.parentElement !== wrapper) {
                wrapper.appendChild(status);
            }
        }
        wrapper.style.marginLeft = config.marginLeft ?? '24px';
        wrapper.style.marginTop = config.marginTop ?? '24px';
        placeButton(container, wrapper, config.insertAfter);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

