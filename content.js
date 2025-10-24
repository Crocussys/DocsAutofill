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
  container.style.margin = "10px 0";
  container.style.display = "flex";
  container.style.alignItems = "center";
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

  container.appendChild(btn);

  // Вставляем контейнер
  const parentDiv = document
    .querySelector("#redesign-portal form")
    ?.querySelector("div")
    ?.querySelector("div")
    ?.querySelector("div");

  if (parentDiv) {
    const secondChild = parentDiv.children[1];
    if (secondChild) {
      parentDiv.insertBefore(container, secondChild);
    } else {
      parentDiv.appendChild(container);
    }
  }
}

// MutationObserver для SPA: следим за динамическими изменениями DOM
const observer = new MutationObserver(addButtonContainer);
observer.observe(document.body, { childList: true, subtree: true });

// Попытка вставить сразу
addButtonContainer();
