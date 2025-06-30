// Optional: Highlight focused input fields
document.addEventListener("focusin", function (e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    e.target.style.outline = "2px solid #00f";
  }
});
