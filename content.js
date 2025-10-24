function addButtonContainer() {
  // Проверяем, чтобы контейнер не создавался повторно
  if (document.querySelector("#my-button-container")) return;

  // Создаём новый div
  const container = document.createElement("div");
  container.id = "my-button-container";
  container.style.margin = "10px 0";
  container.style.display = "flex";
  container.style.alignItems = "center";

  // Создаём кнопку
  const btn = document.createElement("button");
  btn.id = "my-autofill-btn";
  btn.innerText = "Вставить даты";
  btn.style.padding = "6px 12px";
  btn.style.cursor = "pointer";

  // Добавляем обработчик кнопки
  btn.onclick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Буфер пустой!");

      const lines = text.trim().split("\n");
      const dateFields = document.querySelectorAll('input[name^="codes"][name$=".connectDate"]');

      lines.forEach((line, index) => {
        if (index >= dateFields.length) return;

        const match = line.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
        if (match) {
          const formatted = match[1] + match[2] + match[3];
          dateFields[index].value = formatted;
        }
      });

    } catch (e) {
      console.error(e);
      alert("Не удалось прочитать буфер обмена");
    }
  };

  container.appendChild(btn);

  const beforeDiv = document.querySelector("div.MuiTableHead-root.HeaderRow.MuiBox-root.css-1o4pfy6");
  const afterDiv = document.querySelector("div.ReactVirtualized__Grid.ReactVirtualized__List");

  if (beforeDiv && afterDiv) {
    beforeDiv.parentNode.insertBefore(container, afterDiv);
  } else {
    console.error("Не найдено место вставки для кнопки");
  }
}

// MutationObserver для SPA: следим за изменением DOM
const observer = new MutationObserver(addButtonContainer);
observer.observe(document.body, { childList: true, subtree: true });

// Попытка вставить сразу
addButtonContainer();
