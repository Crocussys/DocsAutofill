async function copyCheeseGTIN(statusButtonId) {
    let rows = document.querySelectorAll('div[data-test="product.row"]');
    if (!rows || rows.length === 0) {
        rows = document.querySelectorAll('#redesign-portal .DataRow');
    }
    if (!rows || rows.length === 0) {
        console.warn('[DocsAutofill] GTIN rows not found for copy.');
        return false;
    }
    const gtins = [];
    rows.forEach(row => {
        if (row.querySelector('[data-column="name"]')?.innerText.toLowerCase().startsWith('сыр')) {
            gtins.push({
                "gtin": row.querySelector('[data-column="gtin"] a')?.innerText,
                "quantity": Number(row.querySelector('[data-column="quantity"]')?.innerText.replace(',', '.').match(/\d+(\.\d+)?/)?.[0])
            })
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

const PRODUCT_ROW_NAME_PREFIX = 'osuProducts[';
const PRODUCT_ROW_NAME_SUFFIX = '][compositeProductKey]';

function getProductRowInputName(index) {
    return `osuProducts[${index}][compositeProductKey]`;
}

function getProductRowInputs(readyOnly = false) {
    return getInputsByNamePattern(PRODUCT_ROW_NAME_PREFIX, PRODUCT_ROW_NAME_SUFFIX, readyOnly, isMuiInputReady);
}

async function waitForProductRowInput(index, timeoutMs = 7000, stableMs = 200) {
    return waitForStableInputByName(getProductRowInputName(index), timeoutMs, stableMs, isMuiInputReady);
}

async function waitForDisabledInputByName(inputName, timeoutMs = 5000, pollMs = 50) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (input && input.disabled) {
            return input;
        }
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    return null;
}

async function pasteTemplate() {
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
}

async function pasteCheeseGTIN() {
    const MAX_ROW_RETRIES = 3;
    const rowInputExists = (rowName) => {
        const input = document.querySelector(`input[name="${rowName}"]`);
        return Boolean(input && input.isConnected);
    };
    const waitForRowOrCreate = async (targetIndex) => {
        let row = await waitForProductRowInput(targetIndex, 500, 150);
        if (row) {
            return row;
        }
        const addButton = findButtonByText('Добавить товар', true);
        if (!addButton) {
            return null;
        }
        triggerAddItemClick(addButton);
        row = await waitForProductRowInput(targetIndex, 7000, 250);
        return row;
    };

    const items = await getDataFromClipboard(text => JSON.parse(text));
    let skipped = 0;
    for (let index = 0; index < items.length; ++index) {
        const item = items[index];
        const gtin = item["gtin"];
        const quantity = item["quantity"];
        let processed = false;
        for (let attempt = 1; attempt <= MAX_ROW_RETRIES; attempt += 1) {
            const targetIndex = index - skipped;
            const rowName = getProductRowInputName(targetIndex);

            let row = await waitForRowOrCreate(targetIndex);
            if (!row) {
                const allRows = getProductRowInputs(false).map(input => input.name).join(', ');
                const readyRows = getProductRowInputs(true).map(input => input.name).join(', ');
                console.warn(`[DocsAutofill] Failed to find ready input for product at index ${targetIndex}. Ready rows: ${readyRows || 'none'}. All rows: ${allRows || 'none'}.`);
                if (attempt < MAX_ROW_RETRIES) {
                    continue;
                }
                skipped += 1;
                processed = true;
                break;
            }

            row = await waitForInputByName(rowName, 300);
            if (!row || !row.isConnected) {
                if (attempt < MAX_ROW_RETRIES) {
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared before GTIN input. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                console.warn(`[DocsAutofill] Product row ${rowName} keeps disappearing. Skipping GTIN ${gtin}.`);
                skipped += 1;
                processed = true;
                break;
            }

            await bringIntoView(row);
            row.focus();
            setInputValueWithoutBlur(row, gtin);
            row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
            row.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));

            if (!rowInputExists(rowName)) {
                if (attempt < MAX_ROW_RETRIES) {
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared after GTIN input. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                console.warn(`[DocsAutofill] Product row ${rowName} keeps disappearing. Skipping GTIN ${gtin}.`);
                skipped += 1;
                processed = true;
                break;
            }

            let option = await waitForGtinOption(rowName, gtin, 10000);
            if (!option) {
                row = await waitForInputByName(rowName, 500);
                if (!row || !row.isConnected) {
                    if (attempt < MAX_ROW_RETRIES) {
                        console.warn(`[DocsAutofill] Product row ${rowName} disappeared while opening GTIN options. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared while opening GTIN options. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
                row.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
                option = await waitForGtinOption(rowName, gtin, 5000);
            }

            if (!option) {
                if (!rowInputExists(rowName)) {
                    if (attempt < MAX_ROW_RETRIES) {
                        console.warn(`[DocsAutofill] Product row ${rowName} disappeared before option select. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared before option select. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                console.warn('[DocsAutofill] GTIN option not found. Aborting to avoid wrong selection.');
                skipped += 1;
                processed = true;
                break;
            }

            if (option.multiple) {
                console.warn('[DocsAutofill] Multiple GTIN options found. Aborting to avoid wrong selection.');
                skipped += 1;
                processed = true;
                break;
            }

            option.click();
            row = await waitForInputByName(rowName, 500);
            if (!row || !row.isConnected) {
                if (attempt < MAX_ROW_RETRIES) {
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared after option click. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                console.warn(`[DocsAutofill] Product row ${rowName} disappeared after option click. Skipping GTIN ${gtin}.`);
                skipped += 1;
                processed = true;
                break;
            }
            row.dispatchEvent(new Event('change', { bubbles: true }));

            const weightInputName = `osuProducts[${targetIndex}][weight]`;
            const disabledWeightInput = await waitForDisabledInputByName(weightInputName, 5000);
            if (!disabledWeightInput) {
                if (!rowInputExists(rowName)) {
                    if (attempt < MAX_ROW_RETRIES) {
                        console.warn(`[DocsAutofill] Product row ${rowName} disappeared before weight lock. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared before weight lock. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                console.warn(`[DocsAutofill] Weight input did not become disabled for ${weightInputName}.`);
                skipped += 1;
                processed = true;
                break;
            }

            const quantityInputName = `osuProducts[${targetIndex}][quantity]`;
            const quantityInput = await waitForInputByName(quantityInputName, 3000);
            if (!quantityInput || !quantityInput.isConnected) {
                if (!rowInputExists(rowName)) {
                    if (attempt < MAX_ROW_RETRIES) {
                        console.warn(`[DocsAutofill] Product row ${rowName} disappeared before quantity input. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    console.warn(`[DocsAutofill] Product row ${rowName} disappeared before quantity input. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                console.warn(`[DocsAutofill] Quantity input not found for ${quantityInputName}.`);
                skipped += 1;
                processed = true;
                break;
            }

            await bringIntoView(quantityInput);
            if (!quantityInput.isConnected) {
                if (attempt < MAX_ROW_RETRIES) {
                    console.warn(`[DocsAutofill] Quantity input for ${quantityInputName} disappeared after scroll. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                console.warn(`[DocsAutofill] Quantity input for ${quantityInputName} disappeared after scroll. Skipping GTIN ${gtin}.`);
                skipped += 1;
                processed = true;
                break;
            }

            setReactInputValue(quantityInput, quantity);
            processed = true;
            break;
        }

        if (!processed) {
            console.warn(`[DocsAutofill] Exhausted retries for GTIN ${gtin}. Skipping item.`);
            skipped += 1;
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

    const BUTTONS = [
        {
            path: '/warehouse',
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
        {
            path: '/requests/withdrawing/create',
            id: 'docsautofill-template-button',
            text: 'Шаблон',
            onClick: pasteTemplate,
            size: { width: '110px', height: '40px' },
            marginLeft: '24px',
            marginTop: '0px',
            getContainer: () => {
                const header = Array.from(document.querySelectorAll('#redesign-portal .FormLayout-FormHeaderSection'))
                    .find(el => el.textContent?.includes('Вывод из оборота'));
                return header || document.querySelector('#WindowHeader div.FormLayout-FormHeaderSection');
            },
            insertAfter: false
        },
        {
            path: '/requests/withdrawing/create',
            id: 'docsautofill-paste-cheese-button',
            text: 'Вставить сыры',
            onClick: pasteCheeseGTIN,
            size: { width: '150px', height: '40px' },
            marginLeft: '0px',
            marginTop: '8px',
            getContainer: () => {
                const title = Array.from(document.querySelectorAll('h4'))
                    .find(el => (el.textContent ?? '').trim().includes('Список товаров'));
                return title?.parentElement?.parentElement ?? null;
            },
            insertAfter: true
        }
    ];

    const observer = new MutationObserver(() => {
        const path = normalizePath(window.location.pathname);

        BUTTONS.forEach((cfg) => {
            if (normalizePath(cfg.path) !== path) {
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

        BUTTONS.filter(cfg => normalizePath(cfg.path) === path).forEach((config) => {
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
