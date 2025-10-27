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

  const container = document.createElement("div");
  container.id = "my-button-container";
  container.style.position = "absolute";
  container.style.left = "830px";
  container.style.top = "327px";
  container.style.zIndex = "9999";

  const button = document.createElement("button");
  button.textContent = "Вставить даты";
  button.style.padding = "8px 14px";
  button.style.borderRadius = "8px";
  button.style.border = "none";
  button.style.cursor = "pointer";
  button.style.background = "#007bff";
  button.style.color = "white";
  button.style.fontSize = "14px";

  button.onclick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Буфер пустой!");

      const lines = text.trim().split("\n");

      lines.forEach((line, index) => {
        setTimeout(() => {
          const dateFields = Array.from(document.querySelectorAll('input[name^="codes"][name$=".connectDate"]'));
          if (index >= dateFields.length) return;

          const match = line.match(/^(\d{2}\.\d{2}\.\d{4})/);
          if (match) {
            setReactInputValue(dateFields[index], match[1]);
          }
        }, index * 1); // небольшая задержка для React
      });

    } catch (e) {
      console.error(e);
      alert("Не удалось прочитать буфер обмена");
    }
  };

  container.appendChild(button);
  document.body.appendChild(container);
}

// MutationObserver для SPA: следим за динамическими изменениями DOM
const observer = new MutationObserver(addButtonContainer);
observer.observe(document.body, { childList: true, subtree: true });

// Попытка вставить сразу
addButtonContainer();
