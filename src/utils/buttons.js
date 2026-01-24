/**
 * Создаёт кнопку и возвращает DOM-элемент
 * @param {Function} onClick - функция, выполняемая при нажатии
 * @param {string} text - текст на кнопке
 * @param {{ width?: string, height?: string }} size - размеры кнопки (например: { width: '120px', height: '40px' })
 * @returns {HTMLButtonElement}
 */
function createButton(onClick, text, size = {}) {
    const button = document.createElement('button');

    button.textContent = text;

    button.style.backgroundColor = '#1e88e5';
    button.style.color = '#ffffff';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.padding = '8px 16px';

    if (size.width) button.style.width = size.width;
    if (size.height) button.style.height = size.height;

    if (typeof onClick === 'function') {
        button.addEventListener('click', onClick);
    }

    return button;
}
