
document.addEventListener("DOMContentLoaded", () => {
  const keys = ["autoPause","smartResume","focusMode","focusTimer"];
  const els = {
    autoPause: document.getElementById("autoPause"),
    smartResume: document.getElementById("smartResume"),
    focusMode: document.getElementById("focusMode"),
    focusTimer: document.getElementById("focusTimer"),
    saveBtn: document.getElementById("saveBtn")
  };

  chrome.storage.sync.get({
    autoPause: true, smartResume: true, focusMode: false, focusTimer: 0
  }, (data) => {
    els.autoPause.checked = !!data.autoPause;
    els.smartResume.checked = !!data.smartResume;
    els.focusMode.checked = !!data.focusMode;
    els.focusTimer.value = data.focusTimer || "";
  });


  els.saveBtn.addEventListener("click", () => {
    const newSettings = {
      autoPause: !!els.autoPause.checked,
      smartResume: !!els.smartResume.checked,
      focusMode: !!els.focusMode.checked,
      focusTimer: parseInt(els.focusTimer.value || "0", 10)
    };

    chrome.storage.sync.set(newSettings, () => {

      els.saveBtn.classList.add("success");
      const oldText = els.saveBtn.querySelector(".save-text").textContent;
      els.saveBtn.querySelector(".save-text").textContent = "Saved ✓";


      setTimeout(() => {
        els.saveBtn.classList.remove("success");
        els.saveBtn.querySelector(".save-text").textContent = oldText;
      }, 1200);

    });
  });
});
