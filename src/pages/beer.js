function dataPars(data) {
    try {
        return JSON.parse(data);
    } catch (_) {}

    const result = [];

    const lines = data
        .replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '')
        .split(/\r?\n/);

    for (const line of lines) {
        const elems = line.trim().split(/\s+/);

        if (elems.length === 1) {
            result.push({
                gtin: elems[0]
            });
        } else if (
            elems.length === 2 &&
            /^(\d{2})\.(\d{2})\.(\d{4})$/.test(elems[1])
        ) {
            result.push({
                gtin: elems[0],
                date: elems[1]
            });
        } else {
            return null;
        }
    }

    return result;
}

function createFile(codes) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(codes.map(item => [item]));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const blob = new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array", bookSST: true })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return new File([blob], "codes.xlsx", { type: blob.type });
}

async function addCodes() {
    const codes = await getDataFromClipboard(dataPars);
    if (!codes) return;

    const rows = document.querySelectorAll('div.DataRow');

    if (rows.length === 0) {
        await addCodesFromFile(codes);
    } else {
        for (const item of codes) {
            await addCodeFromInput(item);
        }
    }

    await addDates(codes);
}

async function addCodesFromFile(codes) {
    const load_file_button = findButtonByText('Загрузить файл', false, this.parentElement);
    if (!load_file_button) return;

    load_file_button.click();

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(createFile(codes.map(item => item.gtin)));

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

    await waitForCodes(codes);
}

async function addCodeFromInput(item) {
    const input = document.querySelector('input[name="codes"]');
    if (!input) return;

    setReactInputValue(input, item.gtin);

    const option = await waitForElement('.MuiAutocomplete-option', 5000);
    if (!option) return;

    option.click();

    await waitForCode(item.gtin);
}

async function addDates(codes) {
    for (const item of codes) {
        if (!item.date) continue;

        await waitForCode(item.gtin);

        const rows = Array.from(document.querySelectorAll('div.DataRow'));

        const row = rows.find(row => {
            const cell = row.querySelector('div.DataCell-Content div.MuiBox-root');
            return cell?.textContent === item.gtin;
        });

        if (!row) continue;

        const index = row.dataset.index;

        const input = document.querySelector(
            `input[name="codes[${index}].connectDate"]`
        );

        if (!input) continue;

        setReactInputValue(input, item.date);
    }
}

function init() {
    observer.observe(document.body, { childList: true, subtree: true });

    createButton({
        id: 'add-button',
        text: 'Вставить коды',
        onClick: addCodes,
        title: 'Список кодов'
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
