function setReactInputValue(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    ['input', 'change', 'blur'].forEach(evt =>
        input.dispatchEvent(new Event(evt, { bubbles: true }))
    );
}

async function selectMuiOptionByName(inputName, value) {
    const maxAttempts = 60;
    const delayMs = 50;
    const targetValue = String(value);
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const findElements = () => {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (!input) {
            return { input: null, combobox: null, labelId: null };
        }
        const root = input.closest('.MuiFormControl-root') ?? input.parentElement;
        const combobox = root?.querySelector('[role="combobox"]') ?? null;
        const label = root?.querySelector('label') ?? null;
        return { input, combobox, labelId: label?.id ?? null };
    };

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const { input, combobox, labelId } = findElements();
        if (!input || !combobox) {
            await sleep(delayMs);
            continue;
        }
        if (combobox.getAttribute('aria-disabled') === 'true' || combobox.classList.contains('Mui-disabled')) {
            await sleep(delayMs);
            continue;
        }

        combobox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        combobox.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        let listbox = null;
        for (let i = 0; i < maxAttempts; i += 1) {
            if (labelId) {
                listbox = document.querySelector(`ul[role="listbox"][aria-labelledby="${labelId}"]`);
            }
            if (!listbox) {
                const listboxes = Array.from(document.querySelectorAll('ul[role="listbox"]'));
                listbox = listboxes.find(ul => ul.querySelector(`li[role="option"][data-value="${targetValue}"]`)) || null;
            }
            if (listbox) break;
            await sleep(delayMs);
        }

        if (!listbox) {
            await sleep(delayMs);
            continue;
        }

        const option = listbox.querySelector(`li[role="option"][data-value="${targetValue}"]`);
        if (!option) {
            await sleep(delayMs);
            continue;
        }
        option.click();

        for (let i = 0; i < maxAttempts; i += 1) {
            const current = document.querySelector(`input[name="${inputName}"]`);
            if (current?.value === targetValue) {
                return true;
            }
            await sleep(delayMs);
        }
    }

    console.warn(`[DocsAutofill] MUI option not found or not set: ${inputName}=${targetValue}`);
    return false;
}
