function setReactInputValue(input, value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    ['input', 'change', 'blur'].forEach(evt =>
        input.dispatchEvent(new Event(evt, { bubbles: true }))
    );
}

function selectMuiOption(selectId, value) {
    const select = document.getElementById(selectId);
    select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    const interval = setInterval(() => {
        const option = document.querySelector(`li[role="option"][data-value="${value}"]`);
        if (option) {
            option.click();
            clearInterval(interval);
        }
    }, 50);
}
