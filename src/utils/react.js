function setReactInputValue(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    ['input', 'change', 'blur'].forEach(evt =>
        input.dispatchEvent(new Event(evt, { bubbles: true }))
    );
}

function selectMuiOptionByName(inputName, valueOrOptions) {
    const targetValue = typeof valueOrOptions === 'object' ? valueOrOptions.value : valueOrOptions;
    if (targetValue === undefined || targetValue === null) {
        console.warn(`[DocsAutofill] MUI select value missing for: ${inputName}`);
        return;
    }
    const input = document.querySelector(`input[name="${inputName}"]`);
    if (!input) {
        console.warn(`[DocsAutofill] MUI select input not found: ${inputName}`);
        return;
    }
    setReactInputValue(input, targetValue);
}
