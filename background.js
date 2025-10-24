chrome.action.onClicked.addListener(async (tab) => {
  // Проверяем, на нужном ли сайте
  if (tab.url.includes("beer.crpt.ru/request/connect-tap/create")) {
    console.log("Выполняю content.js на нужной странице");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } else {
    console.log("Вы не на нужной странице");
  }
});
