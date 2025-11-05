console.log('DateAutofill extension enabled');

function data_pars(data) {
    const lines = data.replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '').replace(/(\r?\n)+/g, '\n').split('\n');
    let codes = [];
    let dates = [];
    for (const line in lines) {
        const elems = line.trim().replace(/ +/g, ' ').split(' ');
        if (elems.length < 2) {
            throw "Incorrect data";
        }
        codes.push(elems[0]);
        dates.push(elems[1]);
    }
    return [codes, dates];
}

function getDataFromClipboard() {
    return data_pars(navigator.clipboard.readText());
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

function ButtonFunc() {
    const codes_input = document.querySelector('input[id="mui-6"]');
    const add_code_button = codes_input.parentElement.lastChild;
    if (!codes_input || !add_code_button) {
        console.log('Code input not founded');
        return;
    }
    const [codes, dates] = getDataFromClipboard();
    for (let index = 0; index < codes.length; ++index) {
        setReactInputValue(codes_input, codes[index]);
        waitForAttribute(codes_input, 'aria-expanded', true);
        add_code_button.click();
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

function addButton() {
    if (document.querySelector('#autofill-button')) {
        return;
    }
    const codes_input = document.querySelector('input[id="mui-6"]');
    if (!codes_input) {
        console.log('Code input not founded');
        return;
    }
    codes_input.parentElement.parentElement.parentElement.parentElement.parentElement.appendChild(getButton());
}

const observer = new MutationObserver(addButton);
observer.observe(document.body, { childList: true, subtree: true });

addButton();
