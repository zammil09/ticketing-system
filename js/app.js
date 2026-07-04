// ===== اختيار الدور: User أو Event Owner (كما في السكيتش) =====
document.getElementById("role-user-btn").addEventListener("click", () => enterApp("user"));
document.getElementById("role-owner-btn").addEventListener("click", () => enterApp("owner"));

let currentRole = null;
let viewHistory = [];

function enterApp(role) {
  currentRole = role;
  viewHistory = [];

  document.getElementById("role-select").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("back-btn").classList.remove("hidden");

  document.getElementById("nav-user").classList.toggle("hidden", role !== "user");
  document.getElementById("nav-owner").classList.toggle("hidden", role !== "owner");

  showView(role === "user" ? "browse" : "create-event", { addToHistory: false });
}

// ===== التنقل بين الصفحات =====
document.querySelectorAll("nav button[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

async function showView(viewName, opts = {}) {
  const { addToHistory = true } = opts;

  if (typeof html5QrScanner !== "undefined" && html5QrScanner && viewName !== "checkin") {
    await stopQrScanner();
  }

  const current = document.querySelector(".view:not(.hidden)");
  if (addToHistory && current) {
    const currentId = current.id.replace("view-", "");
    if (currentId !== viewName) viewHistory.push(currentId);
  }

  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById("view-" + viewName).classList.remove("hidden");

  document.querySelectorAll("nav button[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  if (viewName === "browse") await renderBrowseEvents();
  if (viewName === "my-tickets") await renderMyTickets();
  if (viewName === "my-events") await renderMyEvents();
}

// ===== زر الرجوع: يرجع لآخر صفحة، ولو ما فيه تاريخ يرجع لشاشة اختيار الدور =====
document.getElementById("back-btn").addEventListener("click", async () => {
  if (viewHistory.length > 0) {
    const previous = viewHistory.pop();
    await showView(previous, { addToHistory: false });
  } else {
    document.getElementById("app").classList.add("hidden");
    document.getElementById("back-btn").classList.add("hidden");
    document.getElementById("role-select").classList.remove("hidden");
  }
});

// =========================================================
// صفحات وسيطة/نهائية مشتركة — تُستخدم لتدفّق "إنشاء فعالية" و"شراء تذكرة"
// =========================================================

// steps: [{ id: "approve", label: "الموافقة على الدفع" }, ...]
function showProcessing(title, steps) {
  document.getElementById("processing-title").textContent = title;

  const list = document.getElementById("processing-steps");
  list.innerHTML = steps
    .map(
      (s, i) => `
      <li class="step pending" data-step="${s.id}">
        <span class="step-marker">${i + 1}</span>
        <span class="step-label">${s.label}</span>
      </li>`
    )
    .join("");

  showView("processing", { addToHistory: true });
}

// status: "active" | "done" | "error"
function setStepStatus(stepId, status) {
  const el = document.querySelector(`#processing-steps .step[data-step="${stepId}"]`);
  if (!el) return;
  el.classList.remove("pending", "active", "done", "error");
  el.classList.add(status);
  el.querySelector(".step-marker").textContent = status === "done" ? "✓" : status === "error" ? "✕" : el.querySelector(".step-marker").textContent;
}

// bodyHtml: محتوى كامل حر (يبنيه events.js أو tickets.js حسب نوع العملية)
function showSuccess(bodyHtml) {
  document.getElementById("success-body").innerHTML = bodyHtml;
  showView("success", { addToHistory: false }); // ما نضيفها للتاريخ عشان "رجوع" ما يرجع لصفحة تحميل فاضية
  attachSuccessNavHandlers();
}

// أي زر بصفحة النجاح فيه data-nav="اسم_الصفحة" يوديك لها مباشرة (مسح تاريخ الرجوع العالق)
function attachSuccessNavHandlers() {
  document.querySelectorAll("#success-body [data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      viewHistory = [];
      showView(btn.dataset.nav, { addToHistory: false });
    });
  });
}
