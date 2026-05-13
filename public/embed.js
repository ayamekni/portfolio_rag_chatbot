(() => {
  const BOT_URL = "https://aya-portfolio-chatbot.vercel.app";
  const W = 400, H = 520;

  // Colors
  const accentGradient = "linear-gradient(90deg, #667eea, #764ba2, #f093fb)";
  const glass = "rgba(15, 18, 40, 0.9)";

  // === IFRAME ===
  const iframe = document.createElement("iframe");
  iframe.src = BOT_URL;

  Object.assign(iframe.style, {
    position: "fixed",
    bottom: "90px",
    right: "26px",
    width: W + "px",
    height: H + "px",
    border: "none",
    borderRadius: "20px",
    background: "transparent",       // ✅ NO COLOR BLOCK
    boxShadow: "none",               // ✅ NO GLOW BOX
    backdropFilter: "none",          // ✅ REMOVE BLUR
    transition: "all 0.35s ease",
    transform: "translateY(30px) scale(0.95)",
    opacity: "0",
    display: "none",
    zIndex: "9999",
  });

  // === FLOATING BUTTON ===
  const button = document.createElement("button");
  button.textContent = "💬";
  button.title = "Chat with Aya";

  Object.assign(button.style, {
    position: "fixed",
    bottom: "24px",
    right: "26px",
    width: "62px",
    height: "62px",
    borderRadius: "50%",
    border: "none",
    background: accentGradient,
    color: "#fff",
    fontSize: "26px",
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(118,75,162,0.45)",
    transition: "all 0.25s ease",
    zIndex: "10000",
    animation: "chatPulse 2.5s infinite",
  });

  const style = document.createElement("style");
  style.textContent = `
    @keyframes chatPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
  `;
  document.head.appendChild(style);

  // === NOTIFICATION BADGE ===
  const badge = document.createElement("div");
  badge.textContent = "1";

  Object.assign(badge.style, {
    position: "fixed",
    bottom: "72px",
    right: "72px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "#ff3b3b",
    color: "white",
    fontSize: "12px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 8px rgba(255,0,0,0.7)",
    zIndex: "10001",
  });

  // === LOGIC ===
  let open = false;

  button.onclick = () => {
    open = !open;

    if (open) {
      iframe.style.display = "block";

      requestAnimationFrame(() => {
        iframe.style.opacity = "1";
        iframe.style.transform = "translateY(0) scale(1)";
      });

      button.textContent = "×";
      button.style.background = glass;
      button.style.color = "#f093fb";
      button.style.animation = "none";

      if (badge.parentNode) badge.remove();

    } else {
      iframe.style.opacity = "0";
      iframe.style.transform = "translateY(30px) scale(0.95)";

      setTimeout(() => {
        iframe.style.display = "none";
      }, 350);

      button.textContent = "💬";
      button.style.background = accentGradient;
      button.style.color = "#fff";
      button.style.animation = "chatPulse 2.5s infinite";
    }
  };

  // === APPEND TO PAGE ===
  document.body.appendChild(button);
  document.body.appendChild(iframe);
  document.body.appendChild(badge);
})();
