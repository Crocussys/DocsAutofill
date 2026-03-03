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

    const isInteractiveInput = (input) => {
        if (!input || !input.isConnected) return false;
        if (input.type === 'hidden') return false;
        if (input.disabled || input.getAttribute('aria-disabled') === 'true' || input.readOnly) return false;
        return input.getClientRects().length > 0;
    };

    const findInteractiveRowInput = (row, selectors) => {
        for (const selector of selectors) {
            const candidates = Array.from(row.querySelectorAll(selector));
            const interactive = candidates.find(isInteractiveInput);
            if (interactive) {
                return interactive;
            }
        }
        return findRowInput(row, selectors);
    };

    const waitForInteractiveRowInput = async (row, selectors, timeoutMs = 5000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const input = findInteractiveRowInput(row, selectors);
            if (isInteractiveInput(input)) {
                return input;
            }
            await sleep(50);
        }
        return null;
    };

    const waitForInteractiveInputByName = async (name, timeoutMs = 5000) => {
        const selector = `input[name="${name}"]`;
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const candidates = Array.from(document.querySelectorAll(selector));
            const input = candidates.find(isInteractiveInput) || candidates.find(el => el?.isConnected) || null;
            if (isInteractiveInput(input)) {
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

    const normalizeIntegerText = (value) => (value ?? '')
        .toString()
        .replace(/\s+/g, '')
        .trim();

    const parseQuantityInteger = (value) => {
        const normalized = normalizeIntegerText(value);
        if (!/^\d+$/.test(normalized)) {
            return null;
        }
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const waitForQuantityValue = async (input, expectedInt, timeoutMs = 1200) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const currentInt = parseQuantityInteger(input?.value);
            if (currentInt !== null && currentInt === expectedInt) {
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
        const expectedInt = parseQuantityInteger(qtyValue);
        if (expectedInt === null) {
            return false;
        }
        if (!input || !input.isConnected || input.disabled || input.readOnly) {
            return false;
        }
        input.focus();
        setInputValueNoBlur(input, '');
        setInputValueNoBlur(input, qtyValue);
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        input.blur();
        return waitForQuantityValue(input, expectedInt, 1200);
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
        if (options.length === 1) {
            return options[0];
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

    const setGtinValue = async (inputOrGetter, value) => {
        const gtinValue = String(value).trim();
        for (let attempt = 0; attempt < 6; attempt += 1) {
            const input = typeof inputOrGetter === 'function'
                ? await inputOrGetter()
                : inputOrGetter;
            if (!isInteractiveInput(input)) {
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

            const option = await waitForGtinOption(input, gtinValue, 2500);
            if (option?.multiple) {
                console.warn('[DocsAutofill] Multiple GTIN options found. Aborting to avoid wrong selection.');
                return false;
            }
            if (option) {
                option.click();
                input.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(100);
                return true;
            }
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
            await sleep(150);
        }
        console.warn('[DocsAutofill] GTIN option not found. Aborting to avoid wrong selection.');
        return false;
    };

    const getRows = () => Array.from(document.querySelectorAll('div[data-test="product.row"]'));

    const getAllInputsBySelectors = (selectors) => {
        const seen = new Set();
        const result = [];
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(input => {
                if (!seen.has(input)) {
                    seen.add(input);
                    result.push(input);
                }
            });
        });
        return result;
    };

    const getGtinInputIndexByName = (name) => {
        const m = name?.match(/\[(\d+)\]\[compositeProductKey\]/)
            || name?.match(/\[(\d+)\]\.compositeProductKey/);
        return m ? Number(m[1]) : -1;
    };

    const getGtinInputNames = () => getAllInputsBySelectors(gtinSelectors)
        .filter(isInteractiveInput)
        .map(input => input.name)
        .filter(name => name && name.includes('compositeProductKey'))
        .filter((name, idx, arr) => arr.indexOf(name) === idx);

    const waitForNewGtinInputName = async (namesBefore, timeoutMs = 5000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const namesNow = getGtinInputNames();
            const newNames = namesNow.filter(name => !namesBefore.has(name));
            if (newNames.length === 1) {
                return newNames[0];
            }
            if (newNames.length > 1) {
                return newNames.sort((a, b) => getGtinInputIndexByName(b) - getGtinInputIndexByName(a))[0];
            }
            await sleep(50);
        }
        return null;
    };

    const waitForNewRow = (rowsBefore, timeoutMs = 4000) => new Promise(resolve => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            observer.disconnect();
            resolve(result);
        };

        const checkRows = () => {
            const rowsNow = getRows();
            const newRows = rowsNow.filter(r => !rowsBefore.has(r));
            if (newRows.length === 1) {
                finish(newRows[0]);
            } else if (newRows.length > 1) {
                finish({ multiple: true });
            }
        };

        const observer = new MutationObserver(checkRows);
        observer.observe(rowsContainer, { childList: true, subtree: true });
        const timer = setTimeout(() => finish(null), timeoutMs);
        checkRows();
    });

    const isElementVisible = (el) => !!el && el.isConnected && el.getClientRects().length > 0;

    const findAddItemButton = () => {
        const buttons = Array.from(document.querySelectorAll('button'))
            .filter(button =>
                button.textContent?.trim() === addButtonLabel &&
                button.disabled !== true &&
                button.getAttribute('aria-disabled') !== 'true' &&
                isElementVisible(button)
            );
        if (buttons.length === 0) {
            return null;
        }
        return buttons[buttons.length - 1];
    };

    const clickElementReliably = (el) => {
        if (!el) return;
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        el.click();
    };

    const addRowAndGetGtinName = async (maxAttempts = 3) => {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const rowsBefore = new Set(getRows());
            const rowsBeforeCount = rowsBefore.size;
            const namesBefore = new Set(getGtinInputNames());
            const btnAdd = findAddItemButton();
            if (!btnAdd) {
                return null;
            }

            console.info(`[DocsAutofill] Add item click retry ${attempt + 1}/${maxAttempts} for current row.`);
            clickElementReliably(btnAdd);

            const newGtinName = await waitForNewGtinInputName(namesBefore, 5000);
            if (newGtinName) {
                console.info('[DocsAutofill] New row detected after add item click.');
                return newGtinName;
            }

            await waitForNewRow(rowsBefore, 5000);
            const rowsAfter = getRows();
            if (rowsAfter.length > rowsBeforeCount) {
                const newGtinNameAfterGrowth = await waitForNewGtinInputName(namesBefore, 1200);
                if (newGtinNameAfterGrowth) {
                    console.info('[DocsAutofill] New row detected by row count growth.');
                    return newGtinNameAfterGrowth;
                }
            }

            console.warn('[DocsAutofill] Add item click did not create a row yet, retrying.');
            await sleep(150);
        }
        return null;
    };

    const addButtonLabel = '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0442\u043e\u0432\u0430\u0440';
    const items = Object.entries(data);
    for (let index = 0; index < items.length; index += 1) {
        const [gtin, quantity] = items[index];
        let targetGtinName = null;

        if (index === 0) {
            const firstRow = getRows()[0] ?? null;
            if (!firstRow) {
                console.warn('[DocsAutofill] First row not found. Aborting to avoid overwriting existing data.');
                break;
            }
            const firstRowGtinInput = await waitForInteractiveRowInput(firstRow, gtinSelectors);
            targetGtinName = firstRowGtinInput?.name ?? null;
            if (!targetGtinName) {
                console.warn('[DocsAutofill] GTIN input not found in first row. Aborting to avoid overwriting existing data.');
                break;
            }
        } else {
            const btnAdd = findAddItemButton();
            if (!btnAdd) {
                console.warn('[DocsAutofill] Add item button not found. Aborting to avoid overwriting existing data.');
                break;
            }
            targetGtinName = await addRowAndGetGtinName(3);
            if (!targetGtinName) {
                console.warn('[DocsAutofill] New row not found. Aborting to avoid overwriting existing data.');
                break;
            }
        }

        console.info(`[DocsAutofill] Target GTIN input for item ${index + 1}/${items.length}: ${targetGtinName}`);
        const gtinInput = await waitForInteractiveInputByName(targetGtinName, 2500);
        if (!gtinInput || !gtinInput.name || !gtinInput.name.includes('[compositeProductKey]')) {
            console.warn('[DocsAutofill] GTIN input not found or name is unexpected. Aborting to avoid overwriting existing data.');
            break;
        }

        const qtyName = targetGtinName.replace('[compositeProductKey]', '[quantity]');
        const qtyInput = await waitForInteractiveInputByName(qtyName, 2500);
        if (!qtyInput) {
            console.warn('[DocsAutofill] Quantity input not found for GTIN row. Aborting to avoid overwriting existing data.');
            break;
        }

        const qtyValue = String(quantity).trim();
        if (parseQuantityInteger(qtyValue) === null) {
            console.warn('[DocsAutofill] Quantity is not a valid integer. Aborting to avoid overwriting existing data.');
            break;
        }

        const gtinOk = await setGtinValue(
            () => waitForInteractiveInputByName(targetGtinName, 1200),
            String(gtin)
        );
        if (!gtinOk) {
            console.warn(`[DocsAutofill] Failed to set GTIN: ${String(gtin)}.`);
            break;
        }

        const qtyInputCurrent = await waitForInteractiveInputByName(qtyName, 1200) || qtyInput;
        const qtyOk = await setQuantityValue(qtyInputCurrent, qtyValue);
        if (!qtyOk) {
            console.warn(`[DocsAutofill] Quantity was not set: ${qtyValue}. Aborting to avoid overwriting existing data.`);
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
