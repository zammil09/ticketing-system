// ===== بوابة الدخول: يستدعيها المنظّم لمسح/إدخال تذكرة والتحقق من صلاحيتها =====

let html5QrScanner = null;

document.getElementById("scan-start-btn").addEventListener("click", startQrScanner);
document.getElementById("scan-stop-btn").addEventListener("click", stopQrScanner);
document.getElementById("manual-checkin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tokenId = document.getElementById("manual-token-id").value;
  await processCheckIn(tokenId);
  document.getElementById("manual-checkin-form").reset();
});

function startQrScanner() {
  document.getElementById("scan-start-btn").classList.add("hidden");
  document.getElementById("scan-stop-btn").classList.remove("hidden");

  html5QrScanner = new Html5Qrcode("qr-reader");
  html5QrScanner
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 240 },
      async (decodedText) => {
        await stopQrScanner();
        await processCheckIn(decodedText);
      },
      () => {} // تجاهل أخطاء المسح المستمرة (لا يوجد QR بالإطار حالياً)
    )
    .catch((err) => {
      alert("تعذّر تشغيل الكاميرا: " + err);
      resetScanButtons();
    });
}

async function stopQrScanner() {
  if (html5QrScanner) {
    try {
      await html5QrScanner.stop();
      html5QrScanner.clear();
    } catch (e) { /* الكاميرا متوقفة أصلاً */ }
  }
  resetScanButtons();
}

function resetScanButtons() {
  document.getElementById("scan-start-btn").classList.remove("hidden");
  document.getElementById("scan-stop-btn").classList.add("hidden");
}

// ===== المنطق الأساسي: التحقق من التذكرة وتسجيل الدخول =====
async function processCheckIn(tokenId) {
  const resultBox = document.getElementById("checkin-result");
  resultBox.className = "checkin-result";
  resultBox.textContent = "جاري التحقق...";

  try {
    // 1) هل التذكرة موجودة أصلاً؟
    let owner;
    try {
      owner = await contracts.ticketNFT.methods.ownerOf(tokenId).call();
    } catch {
      return showCheckinResult("invalid", "تذكرة غير موجودة", `Token #${tokenId}`);
    }

    const info = await contracts.ticketNFT.methods.ticketInfo(tokenId).call();
    const ev = await contracts.registry.methods.getEvent(info.eventId).call();

    // 2) هل الفعالية تابعة لهذا المنظّم؟
    if (ev.organizer.toLowerCase() !== currentAccount.toLowerCase()) {
      return showCheckinResult("invalid", "تذكرة لفعالية ليست لك", ev.name);
    }

    // 3) هل استُخدمت من قبل؟
    if (info.checkedIn) {
      return showCheckinResult("used", "⚠️ مستخدمة سابقاً", `${ev.name} — Token #${tokenId} — المالك: ${owner.slice(0,6)}...`);
    }

    // 4) تسجيل الدخول فعلياً على السلسلة
    await contracts.ticketNFT.methods.checkIn(tokenId).send({ from: currentAccount });
    showCheckinResult("valid", "✅ دخول مسموح", `${ev.name} — Token #${tokenId}`);
  } catch (err) {
    console.error(err);
    showCheckinResult("invalid", "خطأ بالتحقق", err.message || String(err));
  }
}

function showCheckinResult(status, title, subtitle) {
  const resultBox = document.getElementById("checkin-result");
  resultBox.className = "checkin-result " + status;
  resultBox.innerHTML = `<strong>${title}</strong><br /><span>${subtitle}</span>`;
}
