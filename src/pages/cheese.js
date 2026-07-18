async function copyCheeseGTIN() {
    const gtins = await getAllCheeseGTINsFromScroll();

    if (!gtins || gtins.length === 0) {
        NotificationService.warn('Сыры для копирования не найдены');
        return false;
    }

    try {
        await navigator.clipboard.writeText(JSON.stringify(gtins));
        NotificationService.info(`Скопировано сыров: ${gtins.length}`);
        return true;
    } catch (error) {
        NotificationService.error('Не удалось скопировать сыры');
        NotificationService.debug(error);
        return false;
    }
}

async function getAllCheeseGTINsFromScroll() {
    const selector = 'div[data-test="product.row"], #redesign-portal .DataRow';
    const initialRows = Array.from(document.querySelectorAll(selector));
    if (initialRows.length === 0) {
        return [];
    }

    const container = getScrollableAncestor(initialRows[0]) || document.scrollingElement || document.documentElement;
    const originalScrollTop = getScrollTop(container);
    const maxScroll = Math.max(0, getScrollHeight(container) - getClientHeight(container));
    const collected = new Map();

    const addVisibleRows = () => {
        const visibleRows = Array.from(document.querySelectorAll(selector));
        getCheeseItemsFromRows(visibleRows).forEach(item => {
            if (!item || !item.gtin) return;
            const key = `${item.gtin}|${item.quantity}`;
            if (!collected.has(key)) {
                collected.set(key, item);
            }
        });
    };

    addVisibleRows();
    if (maxScroll <= 0) {
        await scrollToPosition(container, originalScrollTop);
        return Array.from(collected.values());
    }

    const step = Math.max(1, Math.round(getClientHeight(container) * 0.7));
    for (let top = 0; top <= maxScroll; top = Math.min(maxScroll, top + step)) {
        await scrollToPosition(container, top);
        await new Promise(resolve => setTimeout(resolve, 150));
        addVisibleRows();
        if (top === maxScroll) {
            break;
        }
    }

    await scrollToPosition(container, originalScrollTop);
    return Array.from(collected.values());
}

function getCheeseItemsFromRows(rows) {
    return rows.map(row => {
        const name = row.querySelector('[data-column="name"]')?.innerText?.trim() ?? '';
        if (!name.toLowerCase().startsWith('сыр')) {
            return null;
        }
        const gtin = row.querySelector('[data-column="gtin"] a')?.innerText?.trim();
        const quantityText = row.querySelector('[data-column="quantity"]')?.innerText?.replace(',', '.');
        const quantity = Number(quantityText?.match(/\d+(\.\d+)?/)?.[0]);
        return gtin ? { gtin, quantity: Number.isFinite(quantity) ? quantity : 0 } : null;
    }).filter(Boolean);
}

function getScrollableAncestor(element) {
    let current = element;
    while (current && current !== document.body && current !== document.documentElement) {
        if (isScrollable(current)) {
            return current;
        }
        current = current.parentElement;
    }
    if (isScrollable(document.scrollingElement || document.documentElement)) {
        return document.scrollingElement || document.documentElement;
    }
    return null;
}

function isScrollable(element) {
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    const canScroll = overflowY === 'auto' || overflowY === 'scroll';
    return canScroll && element.scrollHeight > element.clientHeight;
}

function getScrollTop(element) {
    if (!element || element === document.scrollingElement || element === document.documentElement) {
        return window.scrollY || window.pageYOffset || 0;
    }
    return element.scrollTop;
}

function getScrollHeight(element) {
    if (!element || element === document.scrollingElement || element === document.documentElement) {
        return document.documentElement.scrollHeight;
    }
    return element.scrollHeight;
}

function getClientHeight(element) {
    if (!element || element === document.scrollingElement || element === document.documentElement) {
        return window.innerHeight;
    }
    return element.clientHeight;
}

function scrollToPosition(element, top) {
    if (!element || element === document.scrollingElement || element === document.documentElement) {
        window.scrollTo({ left: 0, top, behavior: 'auto' });
    } else {
        element.scrollTop = top;
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

    if (!Array.isArray(items) || items.length === 0) {
        NotificationService.warn('В буфере нет сыров для вставки');
        return;
    }

    let skipped = 0;
    let insertedCount = 0;

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
                NotificationService.warn(`Failed to find ready input for product at index ${targetIndex}. Ready rows: ${readyRows || 'none'}. All rows: ${allRows || 'none'}.`);
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
                    NotificationService.warn(`Product row ${rowName} disappeared before GTIN input. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                NotificationService.warn(`Product row ${rowName} keeps disappearing. Skipping GTIN ${gtin}.`);
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
                    NotificationService.warn(`Product row ${rowName} disappeared after GTIN input. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                NotificationService.warn(`Product row ${rowName} keeps disappearing. Skipping GTIN ${gtin}.`);
                skipped += 1;
                processed = true;
                break;
            }

            let option = await waitForGtinOption(rowName, gtin, 10000);
            if (!option) {
                row = await waitForInputByName(rowName, 500);
                if (!row || !row.isConnected) {
                    if (attempt < MAX_ROW_RETRIES) {
                        NotificationService.warn(`Product row ${rowName} disappeared while opening GTIN options. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    NotificationService.warn(`Product row ${rowName} disappeared while opening GTIN options. Skipping GTIN ${gtin}.`);
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
                        NotificationService.warn(`Product row ${rowName} disappeared before option select. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    NotificationService.warn(`Product row ${rowName} disappeared before option select. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                NotificationService.warn('GTIN option not found. Aborting to avoid wrong selection.');
                skipped += 1;
                processed = true;
                break;
            }

            if (option.multiple) {
                NotificationService.warn('Multiple GTIN options found. Aborting to avoid wrong selection.');
                skipped += 1;
                processed = true;
                break;
            }

            option.click();
            row = await waitForInputByName(rowName, 500);
            if (!row || !row.isConnected) {
                if (attempt < MAX_ROW_RETRIES) {
                    NotificationService.warn(`Product row ${rowName} disappeared after option click. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                NotificationService.warn(`Product row ${rowName} disappeared after option click. Skipping GTIN ${gtin}.`);
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
                        NotificationService.warn(`Product row ${rowName} disappeared before weight lock. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    NotificationService.warn(`Product row ${rowName} disappeared before weight lock. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                NotificationService.warn(`Weight input did not become disabled for ${weightInputName}.`);
                skipped += 1;
                processed = true;
                break;
            }

            const quantityInputName = `osuProducts[${targetIndex}][quantity]`;
            const quantityInput = await waitForInputByName(quantityInputName, 3000);
            if (!quantityInput || !quantityInput.isConnected) {
                if (!rowInputExists(rowName)) {
                    if (attempt < MAX_ROW_RETRIES) {
                        NotificationService.warn(`Product row ${rowName} disappeared before quantity input. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                        continue;
                    }
                    NotificationService.warn(`Product row ${rowName} disappeared before quantity input. Skipping GTIN ${gtin}.`);
                    skipped += 1;
                    processed = true;
                    break;
                }
                NotificationService.warn(`Quantity input not found for ${quantityInputName}.`);
                skipped += 1;
                processed = true;
                break;
            }

            await bringIntoView(quantityInput);
            if (!quantityInput.isConnected) {
                if (attempt < MAX_ROW_RETRIES) {
                    NotificationService.warn(`Quantity input for ${quantityInputName} disappeared after scroll. Retrying ${attempt}/${MAX_ROW_RETRIES}.`);
                    continue;
                }
                NotificationService.warn(`Quantity input for ${quantityInputName} disappeared after scroll. Skipping GTIN ${gtin}.`);
                skipped += 1;
                processed = true;
                break;
            }

            setReactInputValue(quantityInput, quantity);
            insertedCount += 1;
            processed = true;
            break;
        }

        if (!processed) {
            NotificationService.warn(`Exhausted retries for GTIN ${gtin}. Skipping item.`);
            skipped += 1;
        }
    }

    NotificationService.info(`Вставлено сыров: ${insertedCount}`);

    const clipboardCount = items.length;
    const notInsertedCount = clipboardCount - insertedCount;

    if (notInsertedCount > 0) {
        NotificationService.warn(`Не было вставлено сыров: ${notInsertedCount}. В буфере было: ${clipboardCount}, реально вставлено: ${insertedCount}`);
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
            onClick: copyCheeseGTIN,
            size: { width: '150px', height: '40px' },
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
            lockScroll: true,
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
                updateButtonState(button);
            }
            if (button.parentElement !== wrapper) {
                wrapper.appendChild(button);
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
