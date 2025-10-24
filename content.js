console.log("content.js подключен!");

// Функция для корректной вставки значения в React-поле
function setReactInputValue(input, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(input, value);

  ['input', 'change', 'blur'].forEach(evt =>
    input.dispatchEvent(new Event(evt, { bubbles: true }))
  );
}

// Функция для добавления кнопки
function addButtonContainer() {
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
  btn.innerText = "Вставить даты";

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

  // Обработчик кнопки
  btn.onclick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Буфер пустой!");

      const lines = text.trim().split("\n");

      // Вставляем все даты с небольшим сдвигом, чтобы React успел обновить input
      lines.forEach((line, index) => {
        setTimeout(() => {
          const dateFields = Array.from(document.querySelectorAll('input[name^="codes"][name$=".connectDate"]'));
          if (index >= dateFields.length) return;

          const match = line.match(/^(\d{2}\.\d{2}\.\d{4})/);
          if (match) {
            setReactInputValue(dateFields[index], match[1]);
          }
        }, index * 2); // 2ms задержка на каждый input
      });

    } catch (e) {
      console.error(e);
      alert("Не удалось прочитать буфер обмена");
    }
  };

  container.appendChild(btn);
  document.body.appendChild(container);
}

// MutationObserver для SPA: следим за динамическими изменениями DOM
const observer = new MutationObserver(addButtonContainer);
observer.observe(document.body, { childList: true, subtree: true });

// Попытка вставить сразу
addButtonContainer();
