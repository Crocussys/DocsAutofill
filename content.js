async function pasteDatesToConnectFields() {
  try {
    const clip = await navigator.clipboard.readText();
    if (!clip.trim()) {
      alert("Буфер обмена пустой!");
      return;
    }

    const lines = clip.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    const parsed = lines.map(line => {
      const match = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!match) return null;
      let [_, d, m, y] = match;
      return `${d.padStart(2, "0")}${m.padStart(2, "0")}${y}`;
    }).filter(Boolean);

    if (parsed.length === 0) {
      alert("Не удалось найти даты в буфере обмена.");
      return;
    }

    const inputs = document.querySelectorAll('input[name^="codes["][name$=".connectDate"]');

    if (inputs.length === 0) {
      console.error("Не найдено полей connectDate на странице.");
      return;
    }

    let filled = 0;
    for (let i = 0; i < inputs.length && i < parsed.length; i++) {
      const input = inputs[i];
      const date = parsed[i];
      input.value = date;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
    }

  } catch (err) {
    console.error("Ошибка при вставке дат:", err);
  }
}

// Добавляем кнопку
function addPasteButton() {
  if (document.getElementById("paste-dates-btn")) return;

  const container = document.querySelector("div.MuiStack-root.css-shayf4");

  if (!container) {
    console.warn("Контейнер .MuiStack-root.css-shayf4 не найден, пробуем позже...");
    setTimeout(addPasteButton, 1500);
    return;
  }

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

  btn.addEventListener("click", pasteDatesToConnectFields);

  container.appendChild(btn);
}

window.addEventListener("load", () => {
  setTimeout(addPasteButton, 1000);
});
