console.log('DateAutofill extension enabled');

function data_pars(data) {
    const lines = data.replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '').split(/\r?\n/);
    let codes = {};
    for (const line of lines) {
        const elems = line.trim().split(/\s+/);
        if (elems.length < 2 || !/^(\d{2})\.(\d{2})\.(\d{4})$/.test(elems[1])) {
            continue;
        }
        codes[elems[0]] = elems[1];
    }
    return codes;
}

async function getDataFromClipboard() {
    const text = await navigator.clipboard.readText();
    return data_pars(text);
}

function createFile(codes) {
    const worksheet = XLSX.utils.aoa_to_sheet(codes.map(item => [item]));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const blob = new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return new File([blob], "codes.xlsx", { type: blob.type });
}

function setReactInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, value);

    ['input', 'change', 'blur'].forEach(evt =>
        input.dispatchEvent(new Event(evt, { bubbles: true }))
    );
}

async function waitForButton(container, text, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const btn = Array.from(container.getElementsByTagName('button')).find(b => b.textContent.includes(text));
        if (btn) return btn;
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
}

async function AddDates() {
    const data = await getDataFromClipboard();
    const codes = Object.keys(data);
    for (let index = 0; index < codes.length; ++index) {
        const code = codes[index];
        const matchingDiv = Array.from(document.querySelectorAll('div')).find(div => div.textContent.includes(code));
        const line = matchingDiv.parentElement.parentElement.parentElement;
        let data_index = line.getAttribute('data-index');
        setReactInputValue(line.querySelector(`input[name="codes[${data_index}].connectDate"]`), data[code]);
    }
}

async function AddCodes() {
    const load_file_button = Array.from(this.parentElement.getElementsByTagName('button')).find(btn => btn.textContent.includes('Загрузить файл'));
    if (!load_file_button) {
        return
    }
    load_file_button.click();
    const codes = await getDataFromClipboard();
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(createFile(Object.keys(codes)));
    const input = document.querySelector('input[type="file"]');
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const footer = document.getElementsByClassName('CisDialog-Footer')[0];
    const load_button = await waitForButton(footer, 'Загрузить');
    if (!load_button) {
        return
    }
    load_button.click();
    const add_button = await waitForButton(footer, 'Добавить');
    if (!add_button) {
        return
    }
    add_button.click();
    this.textContent = "Вставить даты";
    this.onclick = AddDates;
}

function getButton() {
    const button = document.createElement("button");
    button.textContent = "Вставить коды";
    button.setAttribute('tabindex', 0);
    button.setAttribute('type', 'button');
    button.setAttribute('id', 'autofill-button');
    button.onclick = AddCodes;
    return button;
}

async function addButton() {
    const autocompleteRoot = document.querySelector('div.MuiAutocomplete-root[productgroupids="15"][documenttypecode="231"]');
    if (autocompleteRoot && !document.querySelector('#autofill-button')) {
        const codes_list_input_container = autocompleteRoot.parentElement.parentElement;
        let other_button = codes_list_input_container.getElementsByTagName('button')[0];
        if (other_button) {
            const new_button = getButton();
            codes_list_input_container.appendChild(new_button);

            function syncClass() {
                new_button.className = other_button.className;
            }

            syncClass();
            let observerButton = new MutationObserver(() => syncClass());
            observerButton.observe(other_button, { attributes: true, attributeFilter: ['class'] });
            const observerContainer = new MutationObserver(() => {
                const new_other = container.getElementsByTagName('button')[0];
                if (new_other && new_other !== other_button) {
                    other_button = new_other;
                    syncClass();
                    observerButton.disconnect();
                    observerButton = new MutationObserver(() => syncClass());
                    observerButton.observe(other_button, { attributes: true, attributeFilter: ['class'] });
                }
            });
            observerContainer.observe(container, { childList: true, subtree: true });
        }
    }
}

const observer = new MutationObserver(addButton);
observer.observe(document.body, { childList: true, subtree: true });

addButton();
