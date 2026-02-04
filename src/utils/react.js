function setReactInputValue(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    ['input', 'change', 'blur'].forEach(evt =>
        input.dispatchEvent(new Event(evt, { bubbles: true }))
    );
}

function selectMuiOptionByName(inputName, value) {
    const maxAttempts = 40;
    let attempts = 0;
    const targetValue = String(value);

    const findInput = () => document.querySelector(`input[name="${inputName}"]`);

    const trySelect = () => {
        const input = findInput();
        if (!input) {
            attempts += 1;
            if (attempts >= maxAttempts) {
                console.warn(`[DocsAutofill] MUI select input not found: ${inputName}`);
                return;
            }
            setTimeout(trySelect, 50);
            return;
        }
        const combobox = input.closest('.MuiFormControl-root')?.querySelector('[role="combobox"]');
        if (!combobox) {
            console.warn(`[DocsAutofill] MUI combobox not found for: ${inputName}`);
            return;
        }

        combobox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        combobox.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        let optionAttempts = 0;
        const interval = setInterval(() => {
            const listboxes = Array.from(document.querySelectorAll('ul[role="listbox"]'));
            let option = null;
            for (const listbox of listboxes) {
                const candidate = listbox.querySelector(`li[role="option"][data-value="${targetValue}"]`);
                if (candidate) {
                    option = candidate;
                    break;
                }
            }
            if (option) {
                option.click();
                clearInterval(interval);
                return;
            }
            optionAttempts += 1;
            if (optionAttempts >= maxAttempts) {
                console.warn(`[DocsAutofill] MUI option not found: ${targetValue}`);
                clearInterval(interval);
            }
        }, 50);
    };

    trySelect();
}
