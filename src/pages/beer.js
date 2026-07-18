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
            elems.length >= 2 &&
            /^(\d{2})\.(\d{2})\.(\d{4})$/.test(elems[1])
        ) {
            result.push({
                gtin: elems[0],
                date: elems[1]
            });
        } else {
            NotificationService.error(`Неизвестный формат строки: ${line}`);
            return null;
        }
    }

    NotificationService.debug(`Распознано кодов: ${result.length}`);

    return result;
}

function createFile(codes) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(codes.map(item => [item]));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const blob = new Blob(
        [XLSX.write(workbook, { bookType: "xlsx", type: "array", bookSST: true })],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );
    return new File([blob], "codes.xlsx", { type: blob.type });
}

async function addCodes() {
    const codes = await getDataFromClipboard(dataPars);

    if (!codes) {
        NotificationService.error('Не удалось получить коды из буфера');
        return;
    }

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

    if (!load_file_button) {
        NotificationService.error('Кнопка "Загрузить файл" не найдена');
        return;
    }

    load_file_button.click();
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(createFile(codes.map(item => item.gtin)));

    const input = document.querySelector('input[type="file"]');

    if (!input) {
        NotificationService.error('Input файла не найден');
        return;
    }

    input.files = dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const footer = document.getElementsByClassName('CisDialog-Footer')[0];

    const load_button = await waitForButtonByText(footer, 'Загрузить', 5000, false);

    if (!load_button) {
        NotificationService.error('Кнопка "Загрузить" не найдена');
        return;
    }

    load_button.click();

    const add_button = await waitForButtonByText(footer, 'Добавить', 5000, false);

    if (!add_button) {
        NotificationService.error('Кнопка "Добавить" не найдена');
        return;
    }

    add_button.click();

    await waitForCodes(codes);
}

async function addCodeFromInput(item) {
    const input = document.querySelector('input[name="codes"]');

    if (!input) {
        NotificationService.error('Поле добавления кода не найдено');
        return;
    }

    setReactInputValue(input, item.gtin);

    const option = await waitForElement('.MuiAutocomplete-option', 5000);

    if (!option) {
        NotificationService.error(`Вариант для ${item.gtin} не найден`);
        return;
    }

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

        if (!row) {
            NotificationService.error(`Строка ${item.gtin} не найдена`);
            continue;
        }

        const index = row.dataset.index;

        const input = document.querySelector(
            `input[name="codes[${index}].connectDate"]`
        );

        if (!input) {
            NotificationService.error(`Поле даты для ${item.gtin} не найдено`);
            continue;
        }

        setReactInputValue(input, item.date);
    }
}

function addButton(btn) {
    const inscription = Array.from(document.querySelectorAll('h3'))
        .find(h => h.innerText === 'Список кодов');

    if (!inscription) return false;

    const container = inscription.parentElement.querySelector('.MuiStack-root');
    if (!container) return false;

    container.appendChild(btn);
}

function init() {
    const observer = new MutationObserver(() => {
        if (!document.getElementById('add-button')) {
            const btn = createButton(addCodes, 'Вставить коды');
            btn.id = 'add-button';

            addButton(btn);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    const btn = createButton(addCodes, 'Вставить коды');
    btn.id = 'add-button';
    addButton(btn);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}