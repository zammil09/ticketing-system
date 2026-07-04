// ===== شراء تذكرة: approve ثم buyTicket، بصفحة وسيطة ونهائية كاملتين =====
async function buyTicket(eventId, btn) {
  const eventCard = btn.closest(".ticket-stub");
  const eventName = eventCard?.querySelector("h3")?.textContent || "الفعالية";

  showProcessing("جاري إتمام عملية الشراء", [
    { id: "approve", label: "الموافقة على سحب المبلغ (Approve)" },
    { id: "buy", label: "تنفيذ الشراء وسك التذكرة" },
  ]);

  try {
    const ev = await contracts.registry.methods.getEvent(eventId).call();

    setStepStatus("approve", "active");
    await contracts.usdc.methods
      .approve(CONTRACT_ADDRESSES.MARKETPLACE, ev.price)
      .send({ from: currentAccount });
    setStepStatus("approve", "done");

    setStepStatus("buy", "active");
    const receipt = await contracts.marketplace.methods
      .buyTicket(eventId)
      .send({ from: currentAccount });
    setStepStatus("buy", "done");

    const tokenId = receipt.events?.TicketPurchased?.returnValues?.tokenId;
    showPurchaseSuccessPage(tokenId, eventName, receipt.transactionHash);
  } catch (err) {
    console.error(err);
    showSuccess(`
      <p class="eyebrow">حدث خطأ</p>
      <h2>❌ فشلت عملية الشراء</h2>
      <p class="meta" style="max-width:400px;">${err.message || err}</p>
      <div class="success-actions">
        <button data-nav="browse">الرجوع للفعاليات</button>
      </div>
    `);
  }
}

function showPurchaseSuccessPage(tokenId, eventName, txHash) {
  showSuccess(`
    <p class="eyebrow">تم الشراء بنجاح</p>
    <h2>🎉 تذكرتك جاهزة</h2>
    <div class="ticket-stub success-stub">
      <div class="stub-main">
        <h3>${eventName}</h3>
        <p class="meta mono">#${tokenId}</p>
        <span class="badge available">صالحة</span>
      </div>
      <div class="stub-perf"></div>
      <div class="stub-side">
        <canvas id="success-qr" class="qr-canvas qr-large"></canvas>
      </div>
    </div>
    <div class="success-actions">
      <button id="download-qr-btn">⬇️ تنزيل QR كصورة</button>
      <button class="secondary" data-nav="my-tickets">عرض كل تذاكري</button>
      <button class="secondary" data-nav="browse">تصفح فعاليات أخرى</button>
    </div>
    <p id="email-status" class="email-status"></p>
    <p style="font-size:11px;word-break:break-all;color:#8a8370;margin-top:10px;">Tx: ${txHash}</p>
  `);

  QRCode.toCanvas(document.getElementById("success-qr"), String(tokenId), { width: 140, margin: 1 });

  document.getElementById("download-qr-btn").addEventListener("click", () => {
    downloadCanvasAsImage(document.getElementById("success-qr"), `ticket-${tokenId}.png`);
  });

  sendTicketEmail(tokenId);
}

function downloadCanvasAsImage(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function sendTicketEmail(tokenId) {
  const statusEl = document.getElementById("email-status");
  try {
    const userRes = await fetch(`${BACKEND_URL}/users/${currentAccount}`);
    if (!userRes.ok) return;
    const user = await userRes.json();
    if (!user.email) return;

    const qrCanvas = document.getElementById("success-qr");
    const qrDataUrl = qrCanvas.toDataURL("image/png");

    const res = await fetch(`${BACKEND_URL}/email/send-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: user.email, tokenId, qrDataUrl }),
    });

    if (statusEl) statusEl.textContent = res.ok ? `📧 أُرسلت نسخة إلى ${user.email}` : "";
  } catch (err) {
    console.warn("تعذّر إرسال الإيميل (اختياري):", err.message);
  }
}

// ===== تذاكري: من الـ backend أولاً (سريع)، ولو ما اشتغل نرجع نقرأ من السلسلة مباشرة =====
async function renderMyTickets() {
  const container = document.getElementById("tickets-list");
  container.innerHTML = "جاري التحميل...";

  const tickets = await fetchMyTicketsFromBackend().catch(() => null) || await fetchMyTicketsFromChain();

  container.innerHTML = "";
  if (tickets.length === 0) {
    container.innerHTML = "<p>لا تملك أي تذاكر بعد.</p>";
    return;
  }

  tickets.forEach((t) => {
    const card = document.createElement("div");
    card.className = "ticket-stub";
    card.innerHTML = `
      <div class="stub-main">
        <p class="eyebrow">تذكرة</p>
        <h3>${t.eventName}</h3>
        <p class="meta mono">#${t.tokenId}</p>
      </div>
      <div class="stub-perf"></div>
      <div class="stub-side">
        ${t.checkedIn
          ? `<p class="stamp used">مستخدمة</p>`
          : `<canvas class="qr-canvas" data-token="${t.tokenId}"></canvas>
             <p class="stamp valid">صالحة</p>
             <button class="download-btn" data-token="${t.tokenId}">⬇️ تنزيل</button>`
        }
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".qr-canvas").forEach((canvas) => {
    QRCode.toCanvas(canvas, canvas.dataset.token, { width: 84, margin: 1 });
  });

  container.querySelectorAll(".download-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const canvas = container.querySelector(`canvas[data-token="${btn.dataset.token}"]`);
      downloadCanvasAsImage(canvas, `ticket-${btn.dataset.token}.png`);
    });
  });
}

// ===== الطريقة السريعة: من الـ backend (استعلام واحد بدل عشرات الاستدعاءات) =====
async function fetchMyTicketsFromBackend() {
  const res = await fetch(`${BACKEND_URL}/tickets/owner/${currentAccount}`);
  if (!res.ok) throw new Error("backend response not ok");
  const rows = await res.json();
  return rows.map((r) => ({
    tokenId: r.token_id,
    eventName: r.event_name,
    checkedIn: r.checked_in,
  }));
}

// ===== الطريقة الاحتياطية: قراءة مباشرة من السلسلة (كما بالخطوة ٢ الأصلية) =====
async function fetchMyTicketsFromChain() {
  const logs = await contracts.ticketNFT.getPastEvents("Transfer", {
    filter: { to: currentAccount },
    fromBlock: 0,
    toBlock: "latest",
  });

  const tokenIds = [...new Set(logs.map((l) => l.returnValues.tokenId))];

  const tickets = [];
  for (const tokenId of tokenIds) {
    const owner = await contracts.ticketNFT.methods.ownerOf(tokenId).call();
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) continue;

    const info = await contracts.ticketNFT.methods.ticketInfo(tokenId).call();
    const ev = await contracts.registry.methods.getEvent(info.eventId).call();

    tickets.push({ tokenId, eventName: ev.name, checkedIn: info.checkedIn });
  }
  return tickets;
}
