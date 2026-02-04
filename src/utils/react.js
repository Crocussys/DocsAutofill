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

    const findSelect = () => {
        const input = document.querySelector(`input[name="${inputName}"]`);
        if (!input) return null;
        return input.closest('.MuiFormControl-root')?.querySelector('[role="combobox"]') ??
            input.parentElement?.querySelector('[role="combobox"]') ??
            null;
    };

    const openSelect = () => {
        const select = findSelect();
        if (!select) {
            attempts += 1;
            if (attempts >= maxAttempts) {
                console.warn(`[DocsAutofill] MUI select not found by name: ${inputName}`);
                return;
            }
            setTimeout(openSelect, 50);
            return;
        }

        select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        let optionAttempts = 0;
        const interval = setInterval(() => {
            const option = document.querySelector(`li[role="option"][data-value="${value}"]`);
            if (option) {
                option.click();
                clearInterval(interval);
                return;
            }
            optionAttempts += 1;
            if (optionAttempts >= maxAttempts) {
                console.warn(`[DocsAutofill] MUI option not found: ${value}`);
                clearInterval(interval);
            }
        }, 50);
    };

    openSelect();
}
