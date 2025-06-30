// Navigation
const navHome = document.getElementById("nav-home");
const navSettings = document.getElementById("nav-settings");
const viewHome = document.getElementById("view-home");
const viewSettings = document.getElementById("view-settings");

navHome.addEventListener("click", () => {
  navHome.classList.add("active");
  navSettings.classList.remove("active");
  viewHome.classList.remove("hidden");
  viewSettings.classList.add("hidden");
});

navSettings.addEventListener("click", () => {
  navSettings.classList.add("active");
  navHome.classList.remove("active");
  viewSettings.classList.remove("hidden");
  viewHome.classList.add("hidden");
});

// Typing logic
document.getElementById("start").addEventListener("click", async () => {
  const text = document.getElementById("text").value;
  const speed = parseInt(document.getElementById("speed").value, 10) || 50;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: injectTypewriter,
    args: [text, speed]
  });
});

function injectTypewriter(text, speed) {
  const active = document.activeElement;
  if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
    alert("Click into an input or textarea first!");
    return;
  }

  active.value = '';
  let i = 0;

  function typeChar() {
    if (i < text.length) {
      active.value += text.charAt(i);
      i++;
      setTimeout(typeChar, speed);
    }
  }

  typeChar();
}
