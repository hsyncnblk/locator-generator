let highlightBox = null;
let picking = false;

function highlight(el) {
  if (!highlightBox) {
    highlightBox = document.createElement("div");
    highlightBox.style.position = "absolute";
    highlightBox.style.background = "rgba(0, 120, 255, 0.30)";
    highlightBox.style.zIndex = "9999999";
    highlightBox.style.pointerEvents = "none";
    document.body.appendChild(highlightBox);
  }

  const rect = el.getBoundingClientRect();
  highlightBox.style.left = rect.left + window.scrollX + "px";
  highlightBox.style.top = rect.top + window.scrollY + "px";
  highlightBox.style.width = rect.width + "px";
  highlightBox.style.height = rect.height + "px";
}

document.addEventListener("mousemove", (e) => {
  if (picking) highlight(e.target);
});

document.addEventListener("click", (e) => {
  if (!picking) return;
  e.preventDefault();
  e.stopPropagation();

  picking = false;

  const locators = generateLocators(e.target);

  chrome.runtime.sendMessage({
    action: "locatorsFound",
    locators: locators
  });

  if (highlightBox) highlightBox.remove();
}, true);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "activatePicker") {
    picking = true;
  }
});


// LOCATOR GENERATOR

function generateLocators(el) {
  const list = [];

  const add = (score, type, value) => list.push({ score, type, value });

  if (el.id) add(100, "id", `#${el.id}`);

  [...el.attributes].forEach(a => {
    if (a.name.startsWith("data-"))
      add(95, a.name, `[${a.name}="${a.value}"]`);
  });

  if (el.name) add(90, "name", `[name="${el.name}"]`);

  const strongAttrs = ["aria-label", "alt", "title", "placeholder", "role"];
  strongAttrs.forEach(attr => {
    const v = el.getAttribute(attr);
    if (v) add(85, attr, `${el.tagName.toLowerCase()}[${attr}="${v}"]`);
  });

  const t = el.textContent.trim();
  if (t && t.length < 60) {
    add(80, "text", `//*[normalize-space(text())="${t}"]`);
    add(75, "text-contains", `//*[contains(., "${t}")]`);
  }

  if (el.classList.length > 0) {
    const stable = [...el.classList].filter(c => !/\d/.test(c));
    if (stable.length > 0)
      add(70, "class", `${el.tagName.toLowerCase()}.${stable.join(".")}`);
  }

  [...el.attributes].forEach(a => {
    if (!["id", "class"].includes(a.name) && !a.name.startsWith("data-")) {
      add(65, `attr-${a.name}`, `${el.tagName.toLowerCase()}[${a.name}="${a.value}"]`);
    }
  });

  if (el.parentElement) {
    add(40, "parent", `${el.parentElement.tagName.toLowerCase()} ${el.tagName.toLowerCase()}`);
  }

  if (el.previousElementSibling) {
    add(35, "sibling", `//${el.previousElementSibling.tagName.toLowerCase()}/following-sibling::${el.tagName.toLowerCase()}`);
  }

  add(10, "auto-xpath", getFullXPath(el));

  return list.sort((a, b) => b.score - a.score);
}

function getFullXPath(el) {
  if (el.tagName.toLowerCase() === "html") return "/html";
  if (el.tagName.toLowerCase() === "body") return "/html/body";

  const index = Array.from(el.parentNode.children)
    .filter(x => x.tagName === el.tagName)
    .indexOf(el) + 1;

  return getFullXPath(el.parentNode) + "/" + el.tagName.toLowerCase() + `[${index}]`;
}
