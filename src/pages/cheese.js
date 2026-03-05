async function getDataFromClipboard() {
    const text = await navigator.clipboard.readText();
    return text ? JSON.parse(text) : {};
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function waitForGtinOption(inputName, gtin, timeoutMs = 8000) {
    const targetValue = String(gtin).trim();
    const findGtinOption = (input) => {
        const listboxId = input.getAttribute('aria-controls') || input.getAttribute('aria-owns');
        let listbox = listboxId ? document.getElementById(listboxId) : null;
        if (!listbox) {
            listbox = document.querySelector('ul[role="listbox"]');
        }
        if (!listbox) {
            return null;
        }
        const options = Array.from(listbox.querySelectorAll('li[role="option"]'));
        const exactOption = options.find(option => {
            const dataValue = option.getAttribute('data-value')?.trim() ?? '';
            const label = option.textContent?.trim() ?? '';
            return dataValue === targetValue || label === targetValue;
        });
        if (exactOption) {
            return exactOption;
        }
        if (options.length === 1) {
            return options[0];
        }
        if (options.length > 1) {
            return { multiple: true };
        }
        return null;
    };
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (!input) {
            await sleep(50);
            continue;
        }
        const option = findGtinOption(input);
        if (option) {
            return option;
        }
        await sleep(50);
    }
    return null;
};

async function waitForInputValueByName(inputName, expectedValue, timeoutMs = 3000) {
    const expected = String(expectedValue).trim();
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (input && input.value === expected) {
            return true;
        }
        await sleep(50);
    }
    return false;
}

async function waitForInputByName(inputName, timeoutMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (input) {
            return input;
        }
        await sleep(50);
    }
    return null;
}

function isProductRowReady(input) {
    if (!input || input.getClientRects().length === 0) {
        return false;
    }
    const root = input.closest('.MuiFormControl-root') ?? input.parentElement;
    const combobox = root?.querySelector('[role="combobox"]') ?? null;
    if (!combobox || combobox.getClientRects().length === 0) {
        return false;
    }
    if (combobox.getAttribute('aria-disabled') === 'true' || combobox.classList.contains('Mui-disabled')) {
        return false;
    }
    return true;
}

function getProductRowInputs(readyOnly = false) {
    const rows = Array.from(document.querySelectorAll('input[name^="osuProducts["][name$="[compositeProductKey]"]'));
    if (!readyOnly) {
        return rows;
    }
    return rows.filter(isProductRowReady);
}

async function waitForProductRowInput(index, timeoutMs = 7000, stableMs = 200) {
    const inputName = `osuProducts[${index}][compositeProductKey]`;
    const start = Date.now();
    let candidate = null;
    let stableSince = 0;
    while (Date.now() - start < timeoutMs) {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (input && isProductRowReady(input) && input.isConnected) {
            if (input !== candidate) {
                candidate = input;
                stableSince = Date.now();
            } else if (Date.now() - stableSince >= stableMs) {
                return input;
            }
        } else {
            candidate = null;
            stableSince = 0;
        }
        await sleep(50);
    }
    return null;
}

function triggerAddItemClick(button) {
    const rect = button.getBoundingClientRect();
    const eventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
    };

    button.focus();
    if (typeof PointerEvent === 'function') {
        button.dispatchEvent(new PointerEvent('pointerdown', eventInit));
    }
    button.dispatchEvent(new MouseEvent('mousedown', eventInit));
    if (typeof PointerEvent === 'function') {
        button.dispatchEvent(new PointerEvent('pointerup', eventInit));
    }
    button.dispatchEvent(new MouseEvent('mouseup', eventInit));
    button.dispatchEvent(new MouseEvent('click', eventInit));
}

function setInputValueWithoutBlur(input, value) {
    if (!input) {
        return;
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
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
    let skiped = 0;
    for (let index = 0; index < items.length; ++index) {
        const [gtin, quantity] = items[index];
        const targetIndex = index - skiped;
        const rowName = `osuProducts[${targetIndex}][compositeProductKey]`;
        let row = await waitForProductRowInput(targetIndex, 500, 150);
        if (!row) {
            const addButton = Array.from(document.querySelectorAll('button')).filter(button =>
                button.textContent?.trim() === 'Добавить товар')[0];
            if (!addButton) {
                console.warn('[DocsAutofill] Add item button not found.');
                break;
            }
            triggerAddItemClick(addButton);
            row = await waitForProductRowInput(targetIndex, 7000, 250);
            if (!row) {
                const allRows = getProductRowInputs(false).map(input => input.name).join(', ');
                const readyRows = getProductRowInputs(true).map(input => input.name).join(', ');
                console.warn(`[DocsAutofill] Failed to find ready input for product at index ${targetIndex}. Ready rows: ${readyRows || 'none'}. All rows: ${allRows || 'none'}.`);
                break;
            }
        }
        row.focus();
        setInputValueWithoutBlur(row, gtin);
        row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
        row.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
        let option = await waitForGtinOption(rowName, gtin, 10000);
        if (!option) {
            row = await waitForInputByName(rowName, 500);
            if (row) {
                row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
                row.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
            }
            option = await waitForGtinOption(rowName, gtin, 5000);
        }
        if (!option) {
            console.warn('[DocsAutofill] GTIN option not found. Aborting to avoid wrong selection.');
            skiped += 1;
            continue;
        }
        if (option.multiple) {
            console.warn('[DocsAutofill] Multiple GTIN options found. Aborting to avoid wrong selection.');
            skiped += 1;
            continue;
        }
        option.click();
        row = await waitForInputByName(rowName, 500);
        row?.dispatchEvent(new Event('change', { bubbles: true }));
        const committed = await waitForInputValueByName(rowName, gtin, 3000);
        if (!committed) {
            console.warn(`[DocsAutofill] GTIN was not committed for row ${rowName}.`);
            skiped += 1;
            continue;
        }
        const quantityInputName = `osuProducts[${targetIndex}][quantity]`;
        const quantityInput = await waitForInputByName(quantityInputName, 3000);
        if (!quantityInput) {
            console.warn(`[DocsAutofill] Quantity input not found for ${quantityInputName}.`);
            skiped += 1;
            continue;
        }
        setReactInputValue(quantityInput, quantity);
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
