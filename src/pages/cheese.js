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
    if (!data || Object.keys(data).length === 0) {
        return;
    }
    const rowsContainer = document.querySelector('#redesign-portal');
    if (!rowsContainer) {
        return;
    }

    const findRowInput = (row, selectors) => {
        for (const selector of selectors) {
            const el = row.querySelector(selector);
            if (el) {
                return el;
            }
        }
        return null;
    };

    const waitForRowInput = async (row, selectors, timeoutMs = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const el = findRowInput(row, selectors);
            if (el) {
                return el;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return null;
    };

    const gtinSelectors = [
        'input[name*="[compositeProductKey]"]',
        'input[name*="compositeProductKey"]'
    ];

    const qtySelectors = [
        'input[name*="[quantity]"]',
        'input[name*="quantity"]'
    ];

    const waitForExactValue = async (input, expected, timeoutMs = 500) => {
        const expectedStr = String(expected);
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if ((input?.value ?? '') === expectedStr) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return false;
    };

    const normalizeValue = (value) => (value ?? '').toString().replace(/_/g, '').trim();

    const waitForGtinApplied = async (input, expected, timeoutMs = 1000) => {
        const expectedStr = String(expected);
        const expectedDigits = expectedStr.replace(/\D/g, '');
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const current = normalizeValue(input?.value);
            if (current) {
                const currentDigits = current.replace(/\D/g, '');
                if (!expectedDigits) {
                    return true;
                }
                if (current.includes(expectedStr)) {
                    return true;
                }
                if (!currentDigits) {
                    return true;
                }
                if (currentDigits.includes(expectedDigits)) {
                    return true;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return false;
    };

    const setInputValueNoBlur = (input, value) => {
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        ['input', 'change'].forEach(evt =>
            input.dispatchEvent(new Event(evt, { bubbles: true }))
        );
    };

    const setQuantityValue = async (input, value) => {
        const qtyValue = String(value).trim();
        if (!/^\d+$/.test(qtyValue)) {
            return false;
        }
        input.focus();
        setInputValueNoBlur(input, '');
        setInputValueNoBlur(input, qtyValue);
        const ok = await waitForExactValue(input, qtyValue, 800);
        if (!ok) {
            return false;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        return input.value === qtyValue && /^\d+$/.test(input.value);
    };

    const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

    const getListboxesForInput = (input) => {
        const candidates = [];
        const ids = [input.getAttribute('aria-controls'), input.getAttribute('aria-owns'), input.id]
            .filter(Boolean);
        for (const id of ids) {
            const byId = document.getElementById(id);
            if (byId && byId.getAttribute('role') === 'listbox') {
                candidates.push(byId);
            }
            const listbox = document.getElementById(`${id}-listbox`);
            if (listbox) {
                candidates.push(listbox);
            }
        }
        document.querySelectorAll('[role="listbox"]').forEach(lb => candidates.push(lb));

        const unique = [];
        const seen = new Set();
        for (const lb of candidates) {
            if (!seen.has(lb)) {
                seen.add(lb);
                unique.push(lb);
            }
        }
        return unique.filter(lb => {
            const rect = lb.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
    };

    const findGtinOption = (input, value) => {
        const target = normalizeText(String(value));
        const listboxes = getListboxesForInput(input);
        for (const listbox of listboxes) {
            const options = Array.from(listbox.querySelectorAll('[role="option"]'));
            if (options.length === 1) {
                return options[0];
            }
            if (options.length > 1) {
                return { multiple: true };
            }
            const exact = options.find(opt => normalizeText(opt.textContent || '') === target);
            if (exact) return exact;
            const byValue = options.find(opt => opt.getAttribute('data-value') === target);
            if (byValue) return byValue;
            const contains = options.find(opt => normalizeText(opt.textContent || '').includes(target));
            if (contains) return contains;
        }
        return null;
    };

    const waitForGtinOption = async (input, value, timeoutMs = 3000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const option = findGtinOption(input, value);
            if (option) return option;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return null;
    };

    const openAutocompleteList = (input) => {
        const root = input.closest('.MuiAutocomplete-root') ?? input.parentElement;
        const indicator = root?.querySelector('.MuiAutocomplete-popupIndicator') ??
            root?.querySelector('button[aria-label*="Open"]');
        if (indicator) {
            indicator.click();
            return;
        }
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };

    const setGtinValue = async (input, value) => {
        input.focus();
        setInputValueNoBlur(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        openAutocompleteList(input);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));

        const option = await waitForGtinOption(input, value);
        if (option && option.multiple) {
            console.warn('[DocsAutofill] Multiple GTIN options found. Aborting to avoid wrong selection.');
            return false;
        }
        if (!option) {
            console.warn('[DocsAutofill] GTIN option not found. Aborting to avoid wrong selection.');
            return false;
        }
        option.click();
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    };

    const getRows = () => Array.from(document.querySelectorAll('div[data-test="product.row"]'));

    const normalizeEmptyValue = (value) => (value ?? '').toString().replace(/_/g, '').trim();

    const isRowEmpty = (row) => {
        const gtinInput = findRowInput(row, gtinSelectors);
        const qtyInput = findRowInput(row, qtySelectors);
        const gtinValue = normalizeEmptyValue(gtinInput?.value);
        const qtyValue = normalizeEmptyValue(qtyInput?.value);
        return gtinValue === '' && qtyValue === '';
    };

    const waitForNewRow = async (rowsBefore, emptyRowsBefore, timeoutMs = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const rowsNow = getRows();
            const newRows = rowsNow.filter(r => !rowsBefore.has(r));
            if (newRows.length === 1) {
                return newRows[0];
            }
            if (newRows.length > 1) {
                return { multiple: true };
            }

            const emptyNow = rowsNow.filter(r => isRowEmpty(r));
            const newEmpty = emptyNow.filter(r => !emptyRowsBefore.has(r));
            if (newEmpty.length === 1) {
                return newEmpty[0];
            }
            if (newEmpty.length > 1) {
                return { multiple: true };
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return null;
    };

    const usedRows = new WeakSet();

    let isFirst = true;
    for (const [gtin, quantity] of Object.entries(data)) {
        let targetRow = null;

        if (isFirst) {
            targetRow = getRows().find(row => !usedRows.has(row) && isRowEmpty(row)) || null;
            if (!targetRow) {
                console.warn('[DocsAutofill] Empty first row not found. Aborting to avoid overwriting existing data.');
                break;
            }
        } else {
            const rowsBefore = new Set(getRows());
            const emptyRowsBefore = new Set(getRows().filter(r => isRowEmpty(r)));
            const btnAdd = [...document.querySelectorAll('button')]
                .find(b => b.textContent.trim() === 'Добавить строку');
            if (!btnAdd) {
                console.warn('[DocsAutofill] \"Добавить строку\" button not found. Aborting to avoid overwriting existing data.');
                break;
            }
            btnAdd.click();
            targetRow = await waitForNewRow(rowsBefore, emptyRowsBefore);
            if (targetRow && targetRow.multiple) {
                console.warn('[DocsAutofill] Multiple new rows detected. Aborting to avoid overwriting existing data.');
                break;
            }
            if (!targetRow) {
                console.warn('[DocsAutofill] New row not found. Aborting to avoid overwriting existing data.');
                break;
            }
        }

        isFirst = false;
        usedRows.add(targetRow);

        const gtinInput = await waitForRowInput(targetRow, gtinSelectors);
        if (!gtinInput || !gtinInput.name || !gtinInput.name.includes('[compositeProductKey]')) {
            console.warn('[DocsAutofill] GTIN input not found or name is unexpected. Aborting to avoid overwriting existing data.');
            break;
        }

        const qtyName = gtinInput.name.replace('[compositeProductKey]', '[quantity]');
        const qtyInput = targetRow.querySelector(`input[name="${qtyName}"]`);
        if (!qtyInput) {
            console.warn('[DocsAutofill] Quantity input not found for GTIN row. Aborting to avoid overwriting existing data.');
            break;
        }

        const qtyValue = String(quantity).trim();
        if (!/^\d+$/.test(qtyValue)) {
            console.warn('[DocsAutofill] Quantity is not a valid integer. Aborting to avoid overwriting existing data.');
            break;
        }

        const gtinOk = await setGtinValue(gtinInput, String(gtin));
        if (!gtinOk) {
            console.warn('[DocsAutofill] GTIN was not set. Aborting to avoid overwriting existing data.');
            break;
        }

        const qtyOk = await setQuantityValue(qtyInput, qtyValue);
        if (!qtyOk) {
            console.warn('[DocsAutofill] Quantity was not set as integer. Aborting to avoid overwriting existing data.');
            break;
        }
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
