/***********************
 * Urban Time Vienna – Order / Contact Form Webhook (Google Apps Script)
 *
 * Empfängt JSON per POST (vom Website-Formular) und sendet:
 *  1) Admin-Mail an ADMIN_EMAIL (inkl. Logo + Inline-Uhrbild + PDF)
 *  2) Bestätigung an Kunden (inkl. Logo + Inline-Uhrbild + PDF)
 *
 * Setup:
 * 1) script.google.com -> Neues Projekt (im Konto urbantimevienna@gmail.com)
 * 2) Datei "Code.gs" durch diesen Code ersetzen
 * 3) Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4) Web-App URL in der Website in APPS_SCRIPT_URL eintragen
 ***********************/

// Muss 1:1 mit APPS_SCRIPT_TOKEN in deiner index.html übereinstimmen
const SECRET_TOKEN = "uTv_2026!9xA#kP3zQ1";

// Admin-Empfänger (du)
const ADMIN_EMAIL  = "urbantimevienna@gmail.com";

// Branding
const BRAND_NAME   = "Urban Time Vienna";
const FROM_NAME    = "Urban Time Vienna";
const WEBSITE_URL  = "https://statuesque-crepe-0d2a25.netlify.app/";
const INSTAGRAM_URL = "https://www.instagram.com/urbantimevienna";

// Logo-Datei (liegt nach Deploy im Root deiner Website, z.B. /utv-logo.png)
const LOGO_URL = "https://statuesque-crepe-0d2a25.netlify.app/utv-logo.png";

// Zahlung
const DEPOSIT_AMOUNT_EUR = 300;
const BANK_NAME = "Bank Austria";
const BANK_IBAN = "AT89 1200 0100 0604 7442";
const BANK_BIC  = "BKAUATWWXXX";
const BANK_BENEFICIARY = "Stefan Schütz";

// PayPal (Käuferschutz)
// Trage hier deine PayPal-Info ein (Name/PayPal-Mail oder PayPal.me-Link)
const PAYPAL_RECIPIENT = "DEIN_PAYPAL_NAME_ODER_MAIL";

// OPTIONAL: Wenn du in Gmail "Senden als" Alias eingerichtet hast (z.B. info@deinedomain.at), kannst du den hier eintragen:
// const FROM_ALIAS = "info@urbanokay.de";
const FROM_ALIAS = "";

// Healthcheck
function doGet(){
  return jsonResponse({ ok:true, service:"Urban Time Vienna Webhook" });
}

function doPost(e){
  try{
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const data = JSON.parse(raw || "{}");

    // Security check
    if(!data.token || data.token !== SECRET_TOKEN){
      return jsonResponse({ ok:false, error:"Unauthorized" });
    }

    const ts = new Date();
    const orderNo = getNextOrderNumber(ts);

    // Customer
    const customerName  = (data.name || "").trim();
    const customerEmail = (data.email || "").trim();
    const instagram     = (data.instagram || "").trim();
    const phone         = (data.phone || "").trim();

    // Address (separat + fallback)
    const street  = (data.street  || "").trim();
    const postal  = (data.postal  || "").trim();
    const city    = (data.city    || "").trim();
    const country = (data.country || "").trim();
    const address = (data.address || "").trim();

    // Choice
    const deliveryMethod = (data.deliveryMethod || "").trim(); // "Versand (Nachnahme)" | "Abholung"
    const paymentMethod  = (data.paymentMethod || "").trim();  // "Überweisung" | "PayPal (Käuferschutz)" | ...
    const language = normalizeLang(data.language || data.lang || data.locale || "de");

    // Watch
    const model      = (data.model || "").trim();
    const variant    = (data.variant || "").trim();
    const imageLabel = (data.imageLabel || "").trim();
    const imageUrl   = (data.imageUrl || "").trim();

    const message = (data.message || "").trim();

    // Inline watch image
    const inlineWatch = buildInlineImage(imageUrl);

    // Logo inline (optional)
    const logoBlob = fetchBlobSafe(LOGO_URL, "utv-logo.png");

    // PDF
    const pdfBlob = HtmlService
      .createHtmlOutput(buildPdfHtml({
        ts, orderNo,
        customerName, customerEmail, instagram, phone,
        street, postal, city, country, address,
        deliveryMethod,
        paymentMethod,
        model, variant, imageLabel, imageUrl,
        message
      }))
      .getAs("application/pdf")
      .setName(makePdfName(orderNo, model, variant, ts));

    // Inline images map
    const inlineImages = {};
    if(logoBlob) inlineImages.logo = logoBlob;
    if(inlineWatch && inlineWatch.blob) inlineImages.watchimg = inlineWatch.blob;

    // Attachments
    const adminAttachments = [pdfBlob];
    const customerAttachments = [pdfBlob];
    if(inlineWatch && inlineWatch.blob){
      adminAttachments.push(inlineWatch.blob);
      customerAttachments.push(inlineWatch.blob);
    }

    // Subjects
    const subjectAdmin = `Neue Bestellung ${orderNo}${model ? " – " + model : ""}`;
    const subjectCustomer = (language === "en")
      ? `Order confirmation – ${BRAND_NAME} | Order number ${orderNo}`
      : `Bestellbestätigung – ${BRAND_NAME} | Bestellnummer ${orderNo}`;

    // HTML bodies
    const adminHtml = buildAdminEmailHtml({
      ts, orderNo,
      customerName, customerEmail, instagram, phone,
      street, postal, city, country, address,
      deliveryMethod,
      paymentMethod,
      model, variant, imageLabel, imageUrl,
      message,
      hasInlineImage: !!(inlineWatch && inlineWatch.blob),
      hasLogo: !!logoBlob
    });

    sendEmailSafe({
      to: ADMIN_EMAIL,
      subject: subjectAdmin,
      htmlBody: adminHtml,
      replyTo: customerEmail || ADMIN_EMAIL,
      attachments: adminAttachments,
      inlineImages: Object.keys(inlineImages).length ? inlineImages : null
    });

    // Customer confirmation
    if(customerEmail){
      const customerHtml = (language === "en" ? buildCustomerEmailHtmlEN : buildCustomerEmailHtml)({
        ts, orderNo,
        customerName, customerEmail,
        street, postal, city, country, address,
        deliveryMethod,
        paymentMethod,
        model, variant, imageLabel, imageUrl,
        hasInlineImage: !!(inlineWatch && inlineWatch.blob),
        hasLogo: !!logoBlob
      });

      sendEmailSafe({
        to: customerEmail,
        subject: subjectCustomer,
        htmlBody: customerHtml,
        replyTo: ADMIN_EMAIL,
        attachments: customerAttachments,
        inlineImages: Object.keys(inlineImages).length ? inlineImages : null
      });
    }

    return jsonResponse({ ok:true, orderNo });

  }catch(err){
    return jsonResponse({ ok:false, error:String(err) });
  }
}

/***************
 * Order number (fortlaufend)
 ***************/
function getNextOrderNumber(ts){
  const props = PropertiesService.getScriptProperties();
  const key = "ORDER_COUNTER";
  const current = parseInt(props.getProperty(key) || "0", 10);
  const next = current + 1;
  props.setProperty(key, String(next));

  const year = (ts || new Date()).getFullYear();
  const padded = String(next).padStart(6, "0");
  return `UTV-${year}-${padded}`;
}

/***************
 * Mail sender (Alias-Fallback)
 ***************/
function sendEmailSafe(opts){
  const base = {
    to: opts.to,
    subject: opts.subject,
    htmlBody: opts.htmlBody,
    replyTo: opts.replyTo || ADMIN_EMAIL,
    name: FROM_NAME,
    attachments: opts.attachments || undefined,
    inlineImages: opts.inlineImages || undefined
  };

  if(FROM_ALIAS){
    // GmailApp erlaubt "from" nur, wenn Alias in Gmail verifiziert ist
    base.from = FROM_ALIAS;
  }

  GmailApp.sendEmail(base.to, base.subject, "Bitte HTML anzeigen aktivieren.", base);
}

/***************
 * Fetch helper
 ***************/
function fetchBlobSafe(url, filename){
  if(!url || !/^https?:\/\//i.test(url)) return null;
  try{
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions:true, followRedirects:true });
    const code = resp.getResponseCode();
    if(code >= 200 && code < 300){
      return resp.getBlob().setName(filename || "file");
    }
  }catch(e){}
  return null;
}

/***************
 * Inline image builder for watch
 ***************/
function buildInlineImage(imageUrl){
  const blob = fetchBlobSafe(imageUrl, "selected-watch.jpg");
  if(!blob) return null;
  return { blob };
}

/***************
 * Admin email HTML
 ***************/
function buildAdminEmailHtml(p){
  const dt = Utilities.formatDate(p.ts, "Europe/Vienna", "dd.MM.yyyy HH:mm");
  const addr = formatAddress(p);

  const logoBlock = p.hasLogo
    ? `<img src="cid:logo" alt="${escapeHtml(BRAND_NAME)}" style="height:44px;display:block" />`
    : `<div style="font-size:18px;font-weight:800;letter-spacing:.3px;">${escapeHtml(BRAND_NAME)}</div>`;

  const watchBlock = p.hasInlineImage
    ? `<div style="margin-top:12px;">
         <div style="font-weight:700;margin-bottom:6px;">Ausgewähltes Modellfoto</div>
         <img src="cid:watchimg" style="max-width:420px;border-radius:12px;border:1px solid #eee;display:block"/>
         <div style="color:#666;font-size:12px;margin-top:6px;">(Bild ist zusätzlich als Anhang dabei.)</div>
       </div>`
    : (p.imageUrl ? `<div style="margin-top:10px;font-size:12px;color:#666;">Bild-URL: ${escapeHtml(p.imageUrl)}</div>` : "");

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <div style="max-width:720px;margin:0 auto;border:1px solid #eee;border-radius:14px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid #eee;background:#fafafa">
        ${logoBlock}
        <div style="color:#666;font-size:12px;margin-top:6px;">Neue Bestellung • ${dt}</div>
      </div>

      <div style="padding:16px">
        <div style="font-size:16px;font-weight:800;margin-bottom:8px;">Bestellnummer: ${escapeHtml(p.orderNo)}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:12px;border:1px solid #eee;border-radius:12px">
            <div style="font-weight:700;margin-bottom:6px;">Kunde</div>
            <div><b>Name:</b> ${escapeHtml(p.customerName)}</div>
            <div><b>E-Mail:</b> ${escapeHtml(p.customerEmail)}</div>
            ${p.instagram ? `<div><b>Instagram:</b> ${escapeHtml(p.instagram)}</div>` : ``}
            ${p.phone ? `<div><b>Telefon:</b> ${escapeHtml(p.phone)}</div>` : ``}
          </div>

          <div style="padding:12px;border:1px solid #eee;border-radius:12px">
            <div style="font-weight:700;margin-bottom:6px;">Auswahl</div>
            <div><b>Modell:</b> ${escapeHtml(p.model || "-")}</div>
            <div><b>Variante:</b> ${escapeHtml(p.variant || "-")}</div>
            <div><b>Bildlabel:</b> ${escapeHtml(p.imageLabel || "-")}</div>
            <div><b>Lieferung/Abholung:</b> ${escapeHtml(p.deliveryMethod || "-")}</div>
            <div><b>Zahlungsmethode:</b> ${escapeHtml(p.paymentMethod || "-")}</div>
          </div>
        </div>

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Lieferadresse</div>
          <div style="white-space:pre-wrap">${addr.replace(/<br\s*\/?\s*>/g, "\n")}</div>
        </div>

        ${p.message ? `
        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Nachricht</div>
          <div style="white-space:pre-wrap">${escapeHtml(p.message)}</div>
        </div>` : ``}

        ${watchBlock}

        <div style="margin-top:14px;color:#666;font-size:12px">
          PDF-Bestätigung ist im Anhang.
        </div>
      </div>
    </div>
  </div>`;
}

/***************
 * Customer email HTML (Sie-Form, professionell)
 ***************/
function buildCustomerEmailHtml(p){
  const dt = Utilities.formatDate(p.ts, "Europe/Vienna", "dd.MM.yyyy HH:mm");
  const addr = formatAddress(p);
  const salutation = p.customerName ? `Sehr geehrte/r ${escapeHtml(p.customerName)},` : `Sehr geehrte Damen und Herren,`;

  const logoBlock = p.hasLogo
    ? `<img src="cid:logo" alt="${escapeHtml(BRAND_NAME)}" style="height:44px;display:block" />`
    : `<div style="font-size:18px;font-weight:800;letter-spacing:.3px;">${escapeHtml(BRAND_NAME)}</div>`;

  const watchBlock = p.hasInlineImage
    ? `<div style="margin-top:14px;">
         <div style="font-weight:700;margin-bottom:8px;">Ausgewähltes Modell</div>
         <img src="cid:watchimg" style="max-width:420px;border-radius:12px;border:1px solid #eee;display:block"/>
         <div style="color:#666;font-size:12px;margin-top:6px;">Hinweis: Das Foto ist zusätzlich als Anhang dabei.</div>
       </div>`
    : (p.imageUrl ? `<div style="margin-top:10px;font-size:12px;color:#666;">Bild-URL: ${escapeHtml(p.imageUrl)}</div>` : "");

  const deliveryLine = p.deliveryMethod
    ? `<div><b>Ausgewählte Option:</b> ${escapeHtml(p.deliveryMethod)}</div>`
    : ``;

  const paymentLine = p.paymentMethod
    ? `<div><b>Zahlungsmethode:</b> ${escapeHtml(p.paymentMethod)}</div>`
    : ``;

  const restPayment = (p.deliveryMethod || "").toLowerCase().includes("abholung")
    ? `Der <b>Restbetrag</b> wird bei <b>Abholung</b> beglichen. Bitte antworten Sie auf diese E-Mail mit einem gewünschten Abholtermin (Datum/Uhrzeit).`
    : `Der <b>Restbetrag</b> wird bei Zustellung per <b>Nachnahme</b> direkt an den Zusteller bezahlt. <span style="color:#666;font-size:12px;">(Je nach Versanddienstleister können zusätzliche Nachnahmegebühren anfallen.)</span>`;

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <div style="max-width:720px;margin:0 auto;border:1px solid #eee;border-radius:14px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid #eee;background:#fafafa">
        ${logoBlock}
        <div style="color:#666;font-size:12px;margin-top:6px;">Bestellbestätigung • ${dt}</div>
      </div>

      <div style="padding:16px">
        <p style="margin:0 0 10px 0;">${salutation}</p>

        <p style="margin:0 0 12px 0;">
          herzlichen Dank für Ihre Bestellung bei <b>${escapeHtml(BRAND_NAME)}</b>.
          Wir bestätigen den Eingang Ihrer Bestellung.
        </p>

        <div style="padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:8px;">Ihre Bestellnummer</div>
          <div style="font-size:16px;font-weight:800;">${escapeHtml(p.orderNo)}</div>
        </div>

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:8px;">Bestelldetails</div>
          <div><b>Modell:</b> ${escapeHtml(p.model || "-")}</div>
          ${deliveryLine}
          ${paymentLine}
        </div>

        ${watchBlock}

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Wichtiger Hinweis (Lieferadresse)</div>
          <div style="white-space:pre-wrap">${addr.replace(/<br\s*\/?\s*>/g, "\n")}</div>
          <div style="color:#666;font-size:12px;margin-top:6px;">
            Bitte prüfen Sie Ihre Lieferadresse auf Vollständigkeit und Richtigkeit. Sollte eine Korrektur nötig sein, antworten Sie bitte so schnell wie möglich auf diese E-Mail.
          </div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Bearbeitungs- & Lieferzeit</div>
          <div>Die Bearbeitungszeit beträgt <b>bis zu 14 Werktage</b> <b>ab Zahlungseingang der Anzahlung</b>.</div>
        </div>

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:8px;">Anzahlung (${DEPOSIT_AMOUNT_EUR} €)</div>
          <div>Für die Reservierung und Vorbereitung Ihrer Bestellung ist eine <b>Anzahlung in Höhe von ${DEPOSIT_AMOUNT_EUR} €</b> erforderlich.</div>
          <div style="margin-top:6px;"><b>Ohne Eingang der Anzahlung</b> kann die Bestellung nicht versendet bzw. zur Abholung bereitgestellt werden.</div>

          ${buildDepositPaymentHtml(p)}
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Restbetrag</div>
          <div>${restPayment}</div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Versand & Sendungsnummer</div>
          <div>Sobald Ihre Bestellung versendet wurde, erhalten Sie automatisch eine E-Mail mit Ihrer <b>Sendungsnummer (Tracking)</b>.</div>
        </div>

        <div style="margin-top:14px;color:#666;font-size:12px">
          Bei Fragen können Sie jederzeit auf diese E-Mail antworten.
        </div>

        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee;color:#444;font-size:13px">
          <div style="font-weight:800;">${escapeHtml(BRAND_NAME)}</div>
          <div>E-Mail: <a href="mailto:${escapeHtml(ADMIN_EMAIL)}">${escapeHtml(ADMIN_EMAIL)}</a></div>
          <div>Website: <a href="${escapeHtml(WEBSITE_URL)}">${escapeHtml(BRAND_NAME)}</a></div>
          <div>Instagram: <a href="${escapeHtml(INSTAGRAM_URL)}">@urbantimevienna</a></div>
        </div>
      </div>
    </div>
  </div>`;
}

/***************
 * Customer email HTML (EN)
 ***************/
function buildCustomerEmailHtmlEN(p){
  const dt = Utilities.formatDate(p.ts, "Europe/Vienna", "dd.MM.yyyy HH:mm");
  const addr = formatAddress(p);
  const greeting = p.customerName ? `Hello ${escapeHtml(p.customerName)},` : `Hello,`;

  const logoBlock = p.hasLogo
    ? `<img src="cid:logo" alt="${escapeHtml(BRAND_NAME)}" style="height:44px;display:block" />`
    : `<div style="font-size:18px;font-weight:800;letter-spacing:.3px;">${escapeHtml(BRAND_NAME)}</div>`;

  const watchBlock = p.hasInlineImage
    ? `<div style="margin-top:14px;">
         <div style="font-weight:700;margin-bottom:8px;">Selected model</div>
         <img src="cid:watchimg" style="max-width:420px;border-radius:12px;border:1px solid #eee;display:block"/>
         <div style="color:#666;font-size:12px;margin-top:6px;">Note: The photo is also attached.</div>
       </div>`
    : (p.imageUrl ? `<div style="margin-top:10px;font-size:12px;color:#666;">Image URL: ${escapeHtml(p.imageUrl)}</div>` : "");

  const deliveryLine = p.deliveryMethod ? `<div><b>Delivery / pickup:</b> ${escapeHtml(p.deliveryMethod)}</div>` : ``;
  const paymentLine  = p.paymentMethod ? `<div><b>Payment method:</b> ${escapeHtml(p.paymentMethod)}</div>` : ``;

  const restPayment = (p.deliveryMethod || "").toLowerCase().includes("abholung")
    ? `The <b>remaining amount</b> is paid on <b>pickup</b>. Please reply to this email with your preferred pickup time (date/time).`
    : `The <b>remaining amount</b> is paid <b>cash on delivery</b> to the courier. <span style="color:#666;font-size:12px;">(Cash-on-delivery fees may apply depending on the carrier.)</span>`;

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
    <div style="max-width:720px;margin:0 auto;border:1px solid #eee;border-radius:14px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid #eee;background:#fafafa">
        ${logoBlock}
        <div style="color:#666;font-size:12px;margin-top:6px;">Order confirmation • ${dt}</div>
      </div>

      <div style="padding:16px">
        <p style="margin:0 0 10px 0;">${greeting}</p>

        <p style="margin:0 0 12px 0;">
          Thank you for your order with <b>${escapeHtml(BRAND_NAME)}</b>. We confirm receipt of your order.
        </p>

        <div style="padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:8px;">Your order number</div>
          <div style="font-size:16px;font-weight:800;">${escapeHtml(p.orderNo)}</div>
        </div>

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:8px;">Order details</div>
          <div><b>Model:</b> ${escapeHtml(p.model || "-")}</div>
          ${deliveryLine}
          ${paymentLine}
        </div>

        ${watchBlock}

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Important (shipping address)</div>
          <div style="white-space:pre-wrap">${addr.replace(/<br\s*\/?\s*>/g, "\n")}</div>
          <div style="color:#666;font-size:12px;margin-top:6px;">
            Please check your address for completeness and correctness. If any correction is needed, reply to this email as soon as possible.
          </div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Processing & delivery time</div>
          <div>Processing takes up to <b>14 business days</b> <b>after the deposit has been received</b>.</div>
        </div>

        <div style="margin-top:12px;padding:12px;border:1px solid #eee;border-radius:12px;">
          <div style="font-weight:700;margin-bottom:8px;">Deposit (${DEPOSIT_AMOUNT_EUR} €)</div>
          <div>A <b>deposit of ${DEPOSIT_AMOUNT_EUR} €</b> is required to reserve and prepare your order.</div>
          <div style="margin-top:6px;"><b>Without the deposit</b>, the order cannot be shipped or prepared for pickup.</div>
          ${buildDepositPaymentHtml(p, "en")}
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Remaining amount</div>
          <div>${restPayment}</div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:6px;">Shipping & tracking</div>
          <div>Once your order has been shipped, you will automatically receive an email with your <b>tracking number</b>.</div>
        </div>

        <div style="margin-top:14px;color:#666;font-size:12px">
          If you have any questions, simply reply to this email.
        </div>

        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee;color:#444;font-size:13px">
          <div style="font-weight:800;">${escapeHtml(BRAND_NAME)}</div>
          <div>Email: <a href="mailto:${escapeHtml(ADMIN_EMAIL)}">${escapeHtml(ADMIN_EMAIL)}</a></div>
          <div>Website: <a href="${escapeHtml(WEBSITE_URL)}">${escapeHtml(BRAND_NAME)}</a></div>
          <div>Instagram: <a href="${escapeHtml(INSTAGRAM_URL)}">@urbantimevienna</a></div>
        </div>
      </div>
    </div>
  </div>`;
}

/***************
 * PDF HTML (Summary)
 ***************/
function buildPdfHtml(p){
  const dt = Utilities.formatDate(p.ts, "Europe/Vienna", "dd.MM.yyyy HH:mm");
  const addrPlain = formatAddressPlain(p);

  return `
  <div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.4">
    <h1 style="margin:0 0 6px 0;font-size:18px;">${escapeHtml(BRAND_NAME)}</h1>
    <div style="color:#666;margin-bottom:8px;">Bestellbestätigung • ${dt}</div>
    <div style="margin-bottom:12px;"><b>Bestellnummer:</b> ${escapeHtml(p.orderNo)}</div>
    <hr style="border:none;border-top:1px solid #ddd;margin:10px 0 12px 0"/>

    <h2 style="font-size:14px;margin:0 0 8px 0;">Bestelldetails</h2>
    <div><b>Modell:</b> ${escapeHtml(p.model || "-")}</div>
    <div><b>Variante:</b> ${escapeHtml(p.variant || "-")}</div>
    <div><b>Lieferung/Abholung:</b> ${escapeHtml(p.deliveryMethod || "-")}</div>
    <div><b>Zahlungsmethode:</b> ${escapeHtml(p.paymentMethod || "-")}</div>
    <div style="margin-top:10px;"><b>Bild:</b> ${escapeHtml(p.imageLabel || p.imageUrl || "-")}</div>

    <h2 style="font-size:14px;margin:14px 0 8px 0;">Kundendaten</h2>
    <div><b>Name:</b> ${escapeHtml(p.customerName)}</div>
    <div><b>E-Mail:</b> ${escapeHtml(p.customerEmail)}</div>
    ${p.instagram ? `<div><b>Instagram:</b> ${escapeHtml(p.instagram)}</div>` : ``}
    ${p.phone ? `<div><b>Telefon:</b> ${escapeHtml(p.phone)}</div>` : ``}

    <h2 style="font-size:14px;margin:14px 0 8px 0;">Adresse</h2>
    <pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(addrPlain || p.address || "")}</pre>

    ${p.message ? `
      <h2 style="font-size:14px;margin:14px 0 8px 0;">Nachricht</h2>
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(p.message)}</pre>
    ` : ``}

    <h2 style="font-size:14px;margin:14px 0 8px 0;">Anzahlung</h2>
    <div>Anzahlung: <b>${DEPOSIT_AMOUNT_EUR} €</b></div>
    <div style="white-space:pre-wrap;margin-top:6px;">${escapeHtml(buildDepositPaymentPlain(p))}</div>

    <div style="margin-top:18px;color:#666;font-size:11px;">
      ${escapeHtml(BRAND_NAME)} • ${escapeHtml(WEBSITE_URL)}
    </div>
  </div>`;
}

/***************
 * Utils
 ***************/
function jsonResponse(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function makePdfName(orderNo, model, variant, ts){
  const dt = Utilities.formatDate(ts, "Europe/Vienna", "yyyyMMdd_HHmm");
  const m = safeFile(model || "order");
  const v = safeFile(variant || "");
  return `${orderNo}_${dt}_${m}${v ? "_" + v : ""}.pdf`;
}

function safeFile(s){
  return (s || "").toString().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g,"");
}

function formatAddress(p){
  // prefer separated fields; fallback to p.address
  const parts = [];
  if(p.street) parts.push(escapeHtml(p.street));
  const cityLine = [p.postal, p.city].filter(Boolean).join(" ").trim();
  if(cityLine) parts.push(escapeHtml(cityLine));
  if(p.country) parts.push(escapeHtml(p.country));

  if(parts.length) return parts.join("<br/>");
  return escapeHtml(p.address || "");
}

function formatAddressPlain(p){
  const parts = [];
  if(p.street) parts.push(p.street);
  const cityLine = [p.postal, p.city].filter(Boolean).join(" ").trim();
  if(cityLine) parts.push(cityLine);
  if(p.country) parts.push(p.country);
  if(parts.length) return parts.join("\n");
  return (p.address || "");
}

function isPayPalMethod(method){
  return /paypal/i.test(String(method || ""));
}

function normalizeLang(v){
  const s = String(v || "").trim().toLowerCase();
  if(s.startsWith("en")) return "en";
  return "de";
}

// HTML block for deposit payment details (bank or PayPal)
// lang: "de" | "en" (default: de)
function buildDepositPaymentHtml(p, lang){
  const L = normalizeLang(lang || "de");
  const method = String(p.paymentMethod || "").trim();
  // Verwendungszweck soll NUR die Bestellnummer sein
  const purpose = escapeHtml(p.orderNo || "");
  if(isPayPalMethod(method)){
    return `
      <div style="margin-top:10px;">
        <div style="font-weight:700;margin-bottom:6px;">${L === "en" ? "PayPal (buyer protection)" : "PayPal (Käuferschutz)"}</div>
        <div><b>PayPal:</b> ${escapeHtml(PAYPAL_RECIPIENT)}</div>
        <div><b>${L === "en" ? "Reference" : "Verwendungszweck"}:</b> ${purpose}</div>
      </div>
    `;
  }

  return `
    <div style="margin-top:10px;">
      <div style="font-weight:700;margin-bottom:6px;">${L === "en" ? "Bank transfer for deposit" : "Bankverbindung für die Anzahlung"}</div>
      <div><b>${L === "en" ? "Beneficiary" : "Empfänger"}:</b> ${escapeHtml(BANK_BENEFICIARY)}</div>
      <div><b>Bank:</b> ${escapeHtml(BANK_NAME)}</div>
      <div><b>IBAN:</b> ${escapeHtml(BANK_IBAN)}</div>
      <div><b>BIC:</b> ${escapeHtml(BANK_BIC)}</div>
      <div><b>${L === "en" ? "Reference" : "Verwendungszweck"}:</b> ${purpose}</div>
    </div>
  `;
}

function buildDepositPaymentPlain(p){
  const method = String(p.paymentMethod || "").trim();
  const purpose = p.orderNo || "";
  if(isPayPalMethod(method)){
    return [
      "PayPal (Käuferschutz)",
      `PayPal: ${PAYPAL_RECIPIENT}`,
      `Verwendungszweck: ${purpose}`
    ].join("\n");
  }
  return [
    "Bankverbindung für die Anzahlung",
    `Empfänger: ${BANK_BENEFICIARY}`,
    `Bank: ${BANK_NAME}`,
    `IBAN: ${BANK_IBAN}`,
    `BIC: ${BANK_BIC}`,
    `Verwendungszweck: ${purpose}`
  ].join("\n");
}

function escapeHtml(str){
  return (str || "").toString().replace(/[&<>"']/g, (ch) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[ch]));
}
