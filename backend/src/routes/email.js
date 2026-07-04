const express = require("express");
const router = express.Router();

let transporter = null;
const emailConfigured =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

if (emailConfigured) {
  const nodemailer = require("nodemailer");
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log("📧 خدمة الإيميل مفعّلة (SMTP مضبوط)");
} else {
  console.log("📧 خدمة الإيميل غير مفعّلة — SMTP_HOST/SMTP_USER/SMTP_PASS غير مضبوطة بـ .env (اختياري، التطبيق يشتغل بدونها عادي)");
}

// إرسال التذكرة (QR كصورة base64) لإيميل المستخدم — best effort، ما يوقف أي شيء لو فشل
router.post("/send-ticket", async (req, res) => {
  if (!emailConfigured) {
    return res.status(503).json({ sent: false, reason: "SMTP غير مضبوط بالسيرفر" });
  }

  const { to, tokenId, qrDataUrl } = req.body;
  if (!to || !tokenId || !qrDataUrl) {
    return res.status(400).json({ error: "to, tokenId, qrDataUrl كلها مطلوبة" });
  }

  try {
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject: `تذكرتك #${tokenId} 🎫`,
      html: `
        <div style="font-family: sans-serif; text-align: center;">
          <h2>تم شراء تذكرتك بنجاح</h2>
          <p>رقم التذكرة: <strong>#${tokenId}</strong></p>
          <p>اعرض رمز QR المرفق عند بوابة الدخول</p>
          <img src="cid:ticketqr" style="width:180px;height:180px;" />
        </div>
      `,
      attachments: [
        { filename: `ticket-${tokenId}.png`, content: Buffer.from(base64Data, "base64"), cid: "ticketqr" },
      ],
    });

    res.json({ sent: true });
  } catch (err) {
    console.error("فشل إرسال الإيميل:", err.message);
    res.status(500).json({ sent: false, error: err.message });
  }
});

module.exports = router;
