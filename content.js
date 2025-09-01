
(() => {
  let settings = {};
  let saveIntervalId = null;
  let focusTimerId = null;
  let visibilityHandlerAdded = false;
  let videoObserver = null;

  function getVideo() {
    return document.querySelector("video.html5-main-video") || document.querySelector("video");
  }

  function getVideoIdFromUrl(url = location.href) {
    try {
      const u = new URL(url);
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{5,})/);
      if (m) return m[1];
    } catch (e) {}
    return null;
  }

  function showToast(msg, sticky = false, timeout = 3000) {
    const id = "__svc_toast";
    let el = document.getElementById(id);

    if (!el) {
      el = document.createElement("div");
      el.id = id;
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        top: "40px",                   
        transform: "translateX(-50%)",
        background: "rgba(20,20,20,0.95)",
        color: "#fff",
        padding: "10px 18px",
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: "500",
        zIndex: 2147483647,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "opacity 0.3s ease-in-out",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      });
      document.body.appendChild(el);
    }

    el.innerHTML = msg;

    if (sticky) {
      const btn = document.createElement("button");
      btn.textContent = "OK";
      Object.assign(btn.style, {
        marginLeft: "10px",
        padding: "4px 10px",
        border: "none",
        borderRadius: "6px",
        background: "#0f9d58",
        color: "#fff",
        fontSize: "13px",
        cursor: "pointer"
      });
      btn.onclick = () => {
        el.style.opacity = "0";
      };
      el.appendChild(btn);
    }

    el.style.opacity = "1";

    if (!sticky) {
      clearTimeout(el.__fade);
      el.__fade = setTimeout(() => {
        el.style.opacity = "0";
      }, timeout);
    }
  }

  function onVisibilityChange() {
    const v = getVideo();
    if (!v) return;
    if (document.hidden) {
      try { v.pause(); } catch {}
    } else {
      try { v.play().catch(()=>{}); } catch {}
    }
  }

  function startSmartResume() {
    const v = getVideo();
    if (!v) return;
    const id = getVideoIdFromUrl();
    if (!id) return;

    try {
      const saved = parseInt(localStorage.getItem(`svc_resume_${id}`) || "0", 10);
      if (saved > 5 && v.duration && saved < v.duration - 5) {
        v.currentTime = saved;
        showToast(`Resumed at ${Math.floor(saved)}s`);
      }
    } catch (e) {}

    if (saveIntervalId) clearInterval(saveIntervalId);
    saveIntervalId = setInterval(() => {
      const vv = getVideo();
      if (!vv || vv.seeking) return;
      try {
        const t = Math.floor(vv.currentTime || 0);
        const d = Math.floor(vv.duration || 0);
        if (!d) return;
        if (d > 0 && t / d > 0.95) {
          localStorage.removeItem(`svc_resume_${id}`);
          return;
        }
        localStorage.setItem(`svc_resume_${id}`, String(t));
      } catch {}
    }, 2000);
  }

  function stopSmartResume() {
    if (saveIntervalId) {
      clearInterval(saveIntervalId);
      saveIntervalId = null;
    }
  }

  function startFocusTimer(mins) {
    stopFocusTimer();
    const v = getVideo();
    if (!v || !mins || mins <= 0) return;


    showToast(`⏳ Focus timer started for ${mins} minute${mins > 1 ? "s" : ""}`);

    focusTimerId = setTimeout(() => {
      const vv = getVideo();
      if (vv) vv.pause();
      showToast("⏳ Focus time ended — take a break!", true); 
    }, mins * 60 * 1000);
  }

  function stopFocusTimer() {
    if (focusTimerId) { clearTimeout(focusTimerId); focusTimerId = null; }
  }


  function initFeatures() {
    try {
      stopFocusTimer();
      stopSmartResume();
      if (visibilityHandlerAdded) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        visibilityHandlerAdded = false;
      }
    } catch {}

    const video = getVideo();
    if (!video) {
      if (!videoObserver) {
        videoObserver = new MutationObserver((muts, obs) => {
          if (getVideo()) {
            obs.disconnect();
            videoObserver = null;
            initFeatures();
          }
        });
        videoObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
      return;
    }

    if (settings.autoPause) {
      if (!visibilityHandlerAdded) {
        document.addEventListener("visibilitychange", onVisibilityChange);
        visibilityHandlerAdded = true;
      }
    }

    if (settings.smartResume) startSmartResume();
    else stopSmartResume();


    const hideSelectors = [
      "#comments",
      "#related",
      "ytd-merch-shelf-renderer",
      "#secondary",
      "ytd-watch-next-secondary-results-renderer"
    ];

    if (settings.focusMode) {
      hideSelectors.forEach(sel =>
        document.querySelectorAll(sel).forEach(el => el.style.display = "none")
      );
    } else {
      hideSelectors.forEach(sel =>
        document.querySelectorAll(sel).forEach(el => el.style.display = "")
      );
    }

    if (settings.focusTimer && settings.focusTimer > 0) startFocusTimer(settings.focusTimer);
  }

  function loadSettingsAndInit() {
    chrome.storage.sync.get({
      autoPause: true,
      smartResume: true,
      focusMode: false,
      focusTimer: 0
    }, (data) => {
      settings = data;
      initFeatures();
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    let changed = false;
    for (const k in changes) {
      settings[k] = changes[k].newValue;
      changed = true;
    }
    if (changed) initFeatures();
  });

  window.addEventListener("yt-navigate-finish", () => setTimeout(initFeatures, 300));
  window.addEventListener("popstate", () => setTimeout(initFeatures, 400));

  loadSettingsAndInit();
  setTimeout(initFeatures, 800);
})();
