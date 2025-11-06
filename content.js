console.log('DateAutofill extension enabled');

function data_pars(data) {
    const lines = data.replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '').split(/\r?\n/);
    let codes = [];
    let dates = [];
    for (const line of lines) {
        const elems = line.trim().split(/\s+/);
        if (elems.length < 2) {
            throw "Incorrect data";
        }
        codes.push(elems[0]);
        dates.push(elems[1]);
    }
    return [codes, dates];
}

async function getDataFromClipboard() {
    const text = await navigator.clipboard.readText();
    return data_pars(text);
}

function setReactInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, value);

    ['input', 'change', 'blur'].forEach(evt =>
        input.dispatchEvent(new Event(evt, { bubbles: true }))
    );
}

function waitForAttribute(element, attributeName, expectedValue) {
    return new Promise(resolve => {
        if (element.getAttribute(attributeName) === expectedValue) {
            return resolve(element);
        }
        const observer2 = new MutationObserver(() => {
            if (element.getAttribute(attributeName) === expectedValue) {
                observer2.disconnect();
                resolve(element);
            }
        });
        observer2.observe(element, { attributes: true });
    });
}

function waitForAttributeToDisappear(element, attributeName) {
    return new Promise(resolve => {
        if (!element.hasAttribute(attributeName)) {
            return resolve(element);
        }
        const observer3 = new MutationObserver(() => {
            if (!element.hasAttribute(attributeName)) {
                observer3.disconnect();
                resolve(element);
            }
        });
        observer3.observe(element, { attributes: true });
    });
}

async function ButtonFunc() {
    let codes_input = document.querySelector('div.MuiAutocomplete-root[productgroupids="15"][documenttypecode="231"]').querySelector('input[role="combobox"][aria-autocomplete="list"]');
    if (!codes_input) {
        console.log('Code input not founded');
        return;
    }
    try {
        const [codes, dates] = await getDataFromClipboard();
        for (let index = 0; index < codes.length; ++index) {
            setReactInputValue(codes_input, codes[index]);
            await waitForAttribute(codes_input, 'aria-expanded', true);
            codes_input.parentElement.lastChild.click();
            setReactInputValue(document.querySelector('input[name="codes[${index}].connectDate"]'), dates[index]);
            codes_input = document.querySelector('div.MuiAutocomplete-root[productgroupids="15"][documenttypecode="231"]').querySelector('input[role="combobox"][aria-autocomplete="list"]');
        }
    } catch (e) {
        console.log(e);
        return;
    }
}

function getButton() {
    const button = document.createElement("button");
    button.textContent = "Вставить коды";
    button.setAttribute('class', 'MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeLarge MuiButton-textSizeLarge MuiButton-disableElevation MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeLarge MuiButton-textSizeLarge MuiButton-disableElevation css-5pqc4n');
    button.setAttribute('tabindex', 0);
    button.setAttribute('type', 'button');
    button.setAttribute('id', 'autofill-button');
    button.onclick = ButtonFunc;
    return button;
}

async function addButton() {
    const codes_input = document.querySelector('div.MuiAutocomplete-root[productgroupids="15"][documenttypecode="231"]').querySelector('input[role="combobox"][aria-autocomplete="list"]');
    if (!codes_input) {
        return;
    }
    await waitForAttributeToDisappear(codes_input, 'disabled');
    if (document.querySelector('#autofill-button')) {
        return;
    }
    codes_input.parentElement.parentElement.parentElement.parentElement.parentElement.appendChild(getButton());
}

const observer = new MutationObserver(addButton);
observer.observe(document.body, { childList: true, subtree: true });

addButton();
