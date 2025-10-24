console.log("content.js подключен!");

function addButtonContainer() {
  // Проверяем, чтобы контейнер не создавался повторно
  if (document.querySelector("#my-button-container")) return;

// Создаём контейнер
  const container = document.createElement("div");
  container.id = "my-button-container";
  container.style.margin = "10px 0";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "flex-start";
  container.style.gap = "10px";

  // Создаём кнопку
  const btn = document.createElement("button");
  btn.id = "my-autofill-btn";
  btn.innerText = "Вставить даты из буфера";

  // Стили для кнопки
  btn.style.padding = "6px 14px";
  btn.style.cursor = "pointer";
  btn.style.backgroundColor = "#FFD700";
  btn.style.border = "1px solid #E6C200";
  btn.style.borderRadius = "6px";
  btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "500";
  btn.style.color = "#333";
  btn.style.transition = "background-color 0.2s, transform 0.1s";

  // Эффект наведения
  btn.onmouseover = () => btn.style.backgroundColor = "#FFE033";
  btn.onmouseout = () => btn.style.backgroundColor = "#FFD700";
  btn.onmousedown = () => btn.style.transform = "scale(0.97)";
  btn.onmouseup = () => btn.style.transform = "scale(1)";

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
          const input = dateFields[index];
          input.value = match[1];

          // Триггерим события, чтобы React обновил состояние
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      });

    } catch (e) {
      console.error(e);
      alert("Не удалось прочитать буфер обмена");
    }
  };

  container.appendChild(btn);

  const beforeDiv = document.querySelector("div.MuiTableHead-root.HeaderRow.MuiBox-root");
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
