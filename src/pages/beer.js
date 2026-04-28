function dataPars(data) {
    const lines = data.replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '').split(/\r?\n/);
    let codes = {};
    for (const line of lines) {
        const elems = line.trim().split(/\s+/);
        if (!elems[0] || !/^(\d{2})\.(\d{2})\.(\d{4})$/.test(elems[1])) continue;
        codes[elems[0]] = elems[1];
    }
    return codes;
}

function createFile(codes) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(codes.map(item => [item]));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const blob = new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array", bookSST: true })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return new File([blob], "codes.xlsx", { type: blob.type });
}

async function addDates() {
    const data = await getDataFromClipboard(dataPars);
    const codes = Object.keys(data);
    const rows = Array.from(document.querySelectorAll('div.DataRow'));
    const map = new Map();
    for (const row of rows) {
        const codeCell = row.querySelector('div.DataCell-Content div.MuiBox-root');
        if (!codeCell) continue;
        map.set(codeCell.textContent, row.dataset.index);
    }
    for (const code of codes) {
        const data_index = map.get(code);
        if (!data_index) continue;
        const input = document.querySelector(`input[name="codes[${data_index}].connectDate"]`);
        if (!input) continue;
        setReactInputValue(input, data[code]);
    }
}

async function addCodes() {
    const load_file_button = findButtonByText('Загрузить файл', false, this.parentElement);
    if (!load_file_button) return;

    load_file_button.click();
    const codes = await getDataFromClipboard(dataPars);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(createFile(Object.keys(codes)));
    const input = document.querySelector('input[type="file"]');
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const footer = document.getElementsByClassName('CisDialog-Footer')[0];
    const load_button = await waitForButtonByText(footer, 'Загрузить', 5000, false);
    if (!load_button) return;
    load_button.click();

    const add_button = await waitForButtonByText(footer, 'Добавить', 5000, false);
    if (!add_button) return;
    add_button.click();
}

function getAddCodesButton() {
    const btn = document.createElement("button");
    btn.textContent = "Вставить коды";
    btn.setAttribute('tabindex', "0");
    btn.setAttribute('type', 'button');
    btn.setAttribute('id', 'add-button');
    btn.onclick = addCodes;
    return btn;
}

function getFillDatesButton() {
    const btn = document.createElement("button");
    btn.textContent = "Вставить даты";
    btn.setAttribute('tabindex', "0");
    btn.setAttribute('type', 'button');
    btn.setAttribute('id', 'fill-button');
    btn.onclick = addDates;
    return btn;
}

function addButton(btn) {
    const inscription = Array.from(document.querySelectorAll('h3')).find(h => h.innerText === 'Список кодов');
    const container = inscription.parentElement.querySelector('.MuiStack-root');
    const otherButton = container.getElementsByTagName('button')[0];
    if (!otherButton) {
        console.warn('[DateAutofill] Кнопки не найдены')
        return;
    }

    container.appendChild(btn);

    function syncClass() {
        btn.className = otherButton.className;
    }

    syncClass();

    let observerBtn = new MutationObserver(syncClass);
    observerBtn.observe(otherButton, { attributes: true, attributeFilter: ['class'] });

    let observerContainer = new MutationObserver(() => {
        const newOther = container.getElementsByTagName('button')[0];
        if (newOther && newOther !== otherButton) {
            observerBtn.disconnect();
            observerBtn = new MutationObserver(syncClass);
            observerBtn.observe(newOther, { attributes: true, attributeFilter: ['class'] });
        }
    });
    observerContainer.observe(container, { childList: true, subtree: true });
}

function init() {
    const observer = new MutationObserver(() => {
        if (!document.getElementById('add-button')) {
            addButton(getAddCodesButton());
        }

        if (document.querySelector('div[role="rowgroup"]') && !document.getElementById('fill-button')) {
            addButton(getFillDatesButton());
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    addButton(getAddCodesButton());
    if (document.querySelector('div[role="rowgroup"]')) {
        addButton(getFillDatesButton());
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

