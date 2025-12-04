document.getElementById("pick").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "activatePicker" });
  });
});

// Mesaj dinle
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "locatorsFound") {
    const result = document.getElementById("result");
    result.innerHTML = "";

    msg.locators.forEach(loc => {
      const div = document.createElement("div");
      div.className = "locator";

      div.innerHTML = `
        <b>[${loc.score}] ${loc.type}</b><br/>
        <code>${loc.value}</code><br/>
        <button class="copy-btn">Kopyala</button>
      `;

      div.querySelector(".copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(loc.value);
      });

      result.appendChild(div);
    });
  }
});
