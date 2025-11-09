console.log('DateAutofill extension enabled');

function data_pars(data) {
    const lines = data.replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '').split(/\r?\n/);
    let codes = {};
    for (const line of lines) {
        const elems = line.trim().split(/\s+/);
        if (!elems[0] || !/^(\d{2})\.(\d{2})\.(\d{4})$/.test(elems[1])) {
            continue;
        }
        codes[elems[0]] = elems[1];
    }
    return codes;
}

async function getDataFromClipboard() {
    const text = await navigator.clipboard.readText();
    return text ? data_pars(text) : {};
}

function createFile(codes) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(codes.map(item => [item]));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const blob = new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array", bookSST: true })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return new File([blob], "codes.xlsx", { type: blob.type });
}

function setReactInputValue(input, value) {
    if (!input) {
        return;
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);

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
        if (!matchingDiv) {
            continue;
        }
        const line = matchingDiv.closest('[data-index]');
        if (!line) {
            continue;
        }
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
}

function getAddCodesButton() {
    const button = document.createElement("button");
    button.textContent = "Вставить коды";
    button.setAttribute('tabindex', 0);
    button.setAttribute('type', 'button');
    button.setAttribute('id', 'add-button');
    button.onclick = AddCodes;
    return button;
}

function getFillDatesButton() {
    const button = document.createElement("button");
    button.textContent = "Вставить даты";
    button.setAttribute('tabindex', 0);
    button.setAttribute('type', 'button');
    button.setAttribute('id', 'fill-button');
    button.onclick = AddDates;
    return button;
}

async function addButton(btn) {
    const autocompleteRoot = document.querySelector('div.MuiAutocomplete-root[productgroupids="15"][documenttypecode="231"]');
    if (autocompleteRoot && !document.getElementById(btn.getAttribute('id'))) {
        const codes_list_input_container = autocompleteRoot.parentElement.parentElement;
        let other_button = codes_list_input_container.getElementsByTagName('button')[0];
        if (other_button) {
            codes_list_input_container.appendChild(btn);

            function syncClass() {
                btn.className = other_button.className;
            }

            syncClass();
            let observerButton = new MutationObserver(() => syncClass());
            observerButton.observe(other_button, { attributes: true, attributeFilter: ['class'] });
            const observerContainer = new MutationObserver(() => {
                const new_other = codes_list_input_container.getElementsByTagName('button')[0];
                if (new_other && new_other !== other_button) {
                    other_button = new_other;
                    syncClass();
                    observerButton.disconnect();
                    observerButton = new MutationObserver(() => syncClass());
                    observerButton.observe(other_button, { attributes: true, attributeFilter: ['class'] });
                }
            });
            observerContainer.observe(codes_list_input_container, { childList: true, subtree: true });
            return;
        }
    }
}

async function init() {
    addButton(getAddCodesButton());
    if (document.querySelector('#redesign-portal')) {
        addButton(getFillDatesButton());
    }
}

const observer = new MutationObserver(init);
observer.observe(document.body, { childList: true, subtree: true });

init();
