/**
 * Создаёт кнопку и возвращает DOM-элемент
 * @param {Function} onClick - функция, выполняемая при нажатии
 * @param {string} text - текст на кнопке
 * @param {{ width?: string, height?: string }} size - размеры кнопки (например: { width: '120px', height: '40px' })
 * @returns {HTMLButtonElement}
 */
function createButton(onClick, text, size = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-docsautofill-type', 'DocsAutofill_button');

    button.textContent = text;

    button.style.backgroundColor = '#1e88e5';
    button.style.color = '#ffffff';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.padding = '8px 16px';

    if (size.width) button.style.width = size.width;
    if (size.height) button.style.height = size.height;

    if (typeof onClick === 'function') {
        button.addEventListener('click', onClick);
    }

    return button;
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

function placeButton(container, element, insertAfter) {
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
}

function findButtonByText(text, exact = true, root = document) {
    const buttons = Array.from(root.querySelectorAll('button'));
    return buttons.find(button => {
        const label = button.textContent?.trim() ?? '';
        if (exact) {
            return label === text;
        }
        return label.includes(text);
    }) ?? null;
}

async function waitForButtonByText(container, text, timeoutMs = 5000, exact = false, pollMs = 100) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (!container || !container.isConnected) {
            return null;
        }
        const button = findButtonByText(text, exact, container);
        if (button) {
            return button;
        }
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    return null;
}
