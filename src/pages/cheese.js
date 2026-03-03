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
    if (!document.querySelector('#redesign-portal')) {
        return;
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const findRowInput = (row, selectors) => {
        for (const selector of selectors) {
            const el = row.querySelector(selector);
            if (el) {
                return el;
            }
        }
        return null;
    };

    const waitForInteractiveRowInput = async (row, selectors, timeoutMs = 5000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const input = findRowInput(row, selectors);
            if (input && input.isConnected && !input.disabled && input.getAttribute('aria-disabled') !== 'true' && !input.readOnly) {
                return input;
            }
            await sleep(50);
        }
        return null;
    };

    const gtinSelectors = [
        'input[name*="[compositeProductKey]"]',
        'input[name*="compositeProductKey"]'
    ];

    const waitForExactValue = async (input, expected, timeoutMs = 500) => {
        const expectedStr = String(expected);
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if ((input?.value ?? '') === expectedStr) {
                return true;
            }
            await sleep(50);
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
        await sleep(200);
        return input.value === qtyValue && /^\d+$/.test(input.value);
    };

    const getVisibleListboxes = () => Array.from(document.querySelectorAll('ul[role="listbox"]'))
        .filter(listbox => listbox.isConnected && listbox.getAttribute('aria-hidden') !== 'true');

    const getListboxesForInput = (input) => {
        const ids = [input.getAttribute('aria-controls'), input.getAttribute('aria-owns')]
            .filter(Boolean);
        const byIds = ids
            .map(id => document.getElementById(id))
            .filter(Boolean);
        if (byIds.length > 0) {
            return byIds;
        }
        return getVisibleListboxes();
    };

    const normalizeDigits = (value) => (value ?? '').toString().replace(/\D/g, '');

    const optionMatchesGtin = (option, gtin) => {
        const target = String(gtin).trim();
        const optionDataValue = option.getAttribute('data-value') ?? '';
        const optionText = option.textContent?.trim() ?? '';
        if (optionDataValue === target || optionText === target) {
            return true;
        }
        const targetDigits = target.replace(/\D/g, '');
        if (!targetDigits) {
            return false;
        }
        const optionDigits = `${optionDataValue} ${optionText}`.replace(/\D/g, '');
        return optionDigits.includes(targetDigits);
    };

    const findGtinOption = (input, gtin) => {
        const listboxes = getListboxesForInput(input);
        if (listboxes.length === 0) {
            return null;
        }
        const options = listboxes
            .flatMap(listbox => Array.from(listbox.querySelectorAll('li[role="option"]')))
            .filter(option => option.getAttribute('aria-disabled') !== 'true');
        if (options.length === 0) {
            return null;
        }
        const matched = options.filter(option => optionMatchesGtin(option, gtin));
        if (matched.length === 1) {
            return matched[0];
        }
        if (matched.length > 1) {
            return { multiple: true };
        }
        return null;
    };

    const waitForGtinOption = async (input, gtin, timeoutMs = 6000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const option = findGtinOption(input, gtin);
            if (option) {
                return option;
            }
            await sleep(50);
        }
        return null;
    };

    const waitForGtinApplied = async (input, targetDigits, timeoutMs = 1200) => {
        if (!targetDigits) {
            return false;
        }
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (!input || !input.isConnected) {
                return false;
            }
            const currentDigits = normalizeDigits(input.value);
            if (currentDigits.includes(targetDigits)) {
                return true;
            }
            await sleep(50);
        }
        return false;
    };

    const setGtinValue = async (getInput, value) => {
        const gtinValue = String(value).trim();
        const targetDigits = normalizeDigits(gtinValue);
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const input = typeof getInput === 'function'
                ? await getInput()
                : getInput;
            if (!input || !input.isConnected) {
                await sleep(100);
                continue;
            }
            if (input.disabled || input.getAttribute('aria-disabled') === 'true' || input.readOnly) {
                await sleep(100);
                continue;
            }

            input.focus();
            input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            setInputValueNoBlur(input, '');
            setInputValueNoBlur(input, gtinValue);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));

            const option = await waitForGtinOption(input, gtinValue, 1500);
            if (option?.multiple) {
                console.warn('[DocsAutofill] Multiple GTIN options found. Aborting to avoid wrong selection.');
                return false;
            }
            if (option) {
                option.click();
                input.dispatchEvent(new Event('change', { bubbles: true }));
                const applied = await waitForGtinApplied(input, targetDigits);
                if (applied) {
                    return true;
                }
            }
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
            await sleep(150);
        }
        console.warn('[DocsAutofill] GTIN option not found. Aborting to avoid wrong selection.');
        return false;
    };

    const getRows = () => Array.from(document.querySelectorAll('div[data-test="product.row"]'));

    const waitForRowsCount = async (minCount, timeoutMs = 5000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (getRows().length >= minCount) {
                return true;
            }
            await sleep(50);
        }
        return false;
    };

    const waitForRowInputsByIndex = async (rowIndex, timeoutMs = 5000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const row = getRows()[rowIndex];
            if (!row) {
                await sleep(50);
                continue;
            }

            const gtinInput = await waitForInteractiveRowInput(row, gtinSelectors, 250);
            if (!gtinInput || !gtinInput.name || !gtinInput.name.includes('[compositeProductKey]')) {
                await sleep(50);
                continue;
            }

            const qtyName = gtinInput.name.replace('[compositeProductKey]', '[quantity]');
            const qtyInput = await waitForInteractiveRowInput(row, [`input[name="${qtyName}"]`], 250);
            if (!qtyInput) {
                await sleep(50);
                continue;
            }

            return { gtinInput, qtyInput };
        }
        return null;
    };

    const addButtonLabel = '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0442\u043e\u0432\u0430\u0440';
    const items = Object.entries(data);
    for (let index = 0; index < items.length; index += 1) {
        const [gtin, quantity] = items[index];

        if (index === 0) {
            const hasFirstRow = await waitForRowsCount(1, 3000);
            if (!hasFirstRow) {
                console.warn('[DocsAutofill] First row not found. Aborting to avoid overwriting existing data.');
                break;
            }
        } else {
            const rowsBeforeCount = getRows().length;
            const btnAdd = [...document.querySelectorAll('button')]
                .find(b => b.textContent.trim() === addButtonLabel);
            if (!btnAdd) {
                console.warn('[DocsAutofill] Add item button not found. Aborting to avoid overwriting existing data.');
                break;
            }
            btnAdd.click();
            const hasNewRow = await waitForRowsCount(rowsBeforeCount + 1, 5000);
            if (!hasNewRow) {
                console.warn('[DocsAutofill] New row not found. Aborting to avoid overwriting existing data.');
                break;
            }
        }

        const targetRowIndex = index === 0 ? 0 : getRows().length - 1;
        const rowInputs = await waitForRowInputsByIndex(targetRowIndex, 5000);
        if (!rowInputs) {
            console.warn('[DocsAutofill] GTIN/quantity inputs not found for row. Aborting to avoid overwriting existing data.');
            break;
        }
        const { qtyInput } = rowInputs;

        const qtyValue = String(quantity).trim();
        if (!/^\d+$/.test(qtyValue)) {
            console.warn('[DocsAutofill] Quantity is not a valid integer. Aborting to avoid overwriting existing data.');
            break;
        }

        const gtinOk = await setGtinValue(async () => {
            const currentInputs = await waitForRowInputsByIndex(targetRowIndex, 800);
            return currentInputs?.gtinInput ?? null;
        }, String(gtin));
        if (!gtinOk) {
            console.warn(`[DocsAutofill] Failed to set GTIN: ${String(gtin)}.`);
            break;
        }

        const rowInputsAfterGtin = await waitForRowInputsByIndex(targetRowIndex, 800);
        const qtyInputToSet = rowInputsAfterGtin?.qtyInput ?? qtyInput;
        const qtyOk = await setQuantityValue(qtyInputToSet, qtyValue);
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
