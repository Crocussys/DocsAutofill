function addButton() {
  // Находим нужный контейнер
  const container = document.querySelector("div.MuiStack-root");
  if (!container) return;

  // Проверяем, чтобы кнопка не добавлялась повторно
  if (document.querySelector("#my-autofill-btn")) return;

  // Создаём кнопку
  const btn = document.createElement("button");
  btn.id = "my-autofill-btn";
  btn.innerText = "Вставить даты";
  btn.style.marginLeft = "10px";
  btn.style.padding = "6px 12px";
  btn.style.cursor = "pointer";

  // Добавляем обработчик нажатия
  btn.onclick = async () => {
    try {
      // Читаем текст из буфера обмена
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Буфер пустой!");

      // Разбиваем строки
      const lines = text.trim().split("\n");

      // Находим все поля дат
      const dateFields = document.querySelectorAll('input[name^="codes"][name$=".connectDate"]');

      lines.forEach((line, index) => {
        if (index >= dateFields.length) return; // не переписываем лишние поля

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
}

// MutationObserver для отслеживания изменений DOM
const observer = new MutationObserver(() => {
  addButton();
});

// Начинаем следить за телом документа
observer.observe(document.body, { childList: true, subtree: true });

// Пытаемся добавить кнопку сразу
addButton();
