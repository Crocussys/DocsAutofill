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
  container.style.position = "fixed";
  container.style.top = "100px";
  container.style.right = "20px";
  container.style.zIndex = "9999";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "flex-end";
  container.style.gap = "10px";

  const btn = document.createElement("button");
  btn.id = "my-autofill-btn";
  btn.innerText = "Вставить даты из буфера";

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
      const dateFields = Array.from(document.querySelectorAll('input[name^="codes"][name$=".connectDate"]'));

      lines.forEach((line, index) => {
        if (index >= dateFields.length) return;

        const match = line.match(/^(\d{2}\.\d{2}\.\d{4})/);
        if (match) {
          setReactInputValue(dateFields[index], match[1]);
        }
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
