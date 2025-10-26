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

  const btn = document.createElement("button");
  btn.id = "paste-dates-btn";
  btn.textContent = "Вставить даты";

  Object.assign(btn.style, {
    marginLeft: "10px",
    padding: "6px 12px",
    background: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer"
  });

  btn.onclick = async () => {
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

  // Вставляем контейнер
  const uploadBtn = Array.from(document.querySelectorAll("button"))
    .find(btn => btn.textContent.trim() === "Загрузить файл");

  if (!uploadBtn) {
    setTimeout(addPasteButtonNearUpload, 1500);
    return;
  }

  const parent = uploadBtn.closest(".MuiStack-root.css-shayf4") || uploadBtn.parentElement;

  if (parent) {
    parent.appendChild(btn);
  }
}

// MutationObserver для SPA: следим за динамическими изменениями DOM
const observer = new MutationObserver(addButtonContainer);
observer.observe(document.body, { childList: true, subtree: true });

// Попытка вставить сразу
addButtonContainer();
