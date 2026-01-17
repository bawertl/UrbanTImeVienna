
    // Jahr im Footer
    document.getElementById("year").textContent = new Date().getFullYear();

    // ===== Modal Galerie (mehrere Bilder pro Uhr) =====
    const modal = document.getElementById("galleryModal");
    const mainImg = document.getElementById("galleryMain");
    const titleEl = document.getElementById("galleryTitle");
    const metaEl = document.getElementById("galleryMeta");
    const thumbsEl = document.getElementById("galleryThumbs");
    const closeBtn = document.getElementById("galleryClose");
    const prevBtn = document.getElementById("galleryPrev");
    const nextBtn = document.getElementById("galleryNext");
    const orderInstaBtn = document.getElementById("orderInstaBtn");
    const orderFormBtn = document.getElementById("orderFormBtn");
    const orderNote = document.getElementById("orderNote");

    // Instagram DM-Link (anpassen, falls dein Username anders ist)
    const IG_DM_LINK = "https://ig.me/m/urbantimevienna";

    
    function openInNewTab(url){
      // Use a real anchor-click to keep the current page stable
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function fillOrderFormFromSelection(){
      const modelEl = document.getElementById("of_model");
      const msgEl = document.getElementById("of_message");

      const file = basename(currentImages[currentIndex] || "");
      const variantNo = currentIndex + 1;
      const hasVariants = (currentImages.length || 0) > 1;

      const modelText = hasVariants ? `${currentTitle} – Variante ${variantNo}` : `${currentTitle}`;
      if(modelEl) modelEl.value = modelText;

      const defaultMsg =
`Bitte Preis, Lieferzeit und Verfügbarkeit senden.

Falls möglich, hätte ich gerne auch ein Detail-Video oder zusätzliche Fotos.
Vielen Dank!`;

      // Nachricht bleibt clean: Referenzen (Modell/Variante/Bild) werden separat mitgesendet.
      if(msgEl && !msgEl.value.trim()){
        msgEl.value = defaultMsg;
      }

      updateOrderFormVariantPreview();
    }

    function updateOrderFormVariantPreview(){
      const wrap = document.getElementById("selectedVariantPreview");
      const img = document.getElementById("selectedVariantImg");
      const cap = document.getElementById("selectedVariantCaption");
      if(!wrap || !img) return;

      const src = currentImages[currentIndex] || "";
      if(!src){
        wrap.style.display = "none";
        return;
      }

      const variantNo = currentIndex + 1;
      const hasVariants = (currentImages.length || 0) > 1;

      img.src = src;
      img.alt = hasVariants ? `${currentTitle} – Variante ${variantNo}` : `${currentTitle}`;

      if(cap){
        cap.textContent = hasVariants ? `${currentTitle} · Variante ${variantNo}` : `${currentTitle}`;
      }

      wrap.style.display = "block";
    }

let currentImages = [];
    let currentIndex = 0;
    let currentTitle = "Uhr";

    function basename(path){
      return (path || "").split("?")[0].split("#")[0].split("/").pop();
    }

    function copyText(text){
      if(navigator.clipboard && navigator.clipboard.writeText){
        return navigator.clipboard.writeText(text);
      }
      return new Promise((resolve, reject) => {
        try{
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          ok ? resolve() : reject();
        }catch(e){ reject(e); }
      });
    }

    
    
    async function getImageBlobFromSrc(src){
      return new Promise((resolve, reject) => {
        try{
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try{
              const c = document.createElement("canvas");
              c.width = img.naturalWidth || img.width;
              c.height = img.naturalHeight || img.height;
              const ctx = c.getContext("2d");
              ctx.drawImage(img, 0, 0);
              c.toBlob((blob) => {
                if(blob) resolve(blob);
                else reject(new Error("toBlob failed"));
              }, "image/png");
            }catch(e){ reject(e); }
          };
          img.onerror = (e) => reject(e);
          img.src = src;
        }catch(e){ reject(e); }
      });
    }

    async function copyTextAndMaybeImage(text, imageSrc){
      let textCopied = false;
      try{
        await copyText(text);
        textCopied = true;
      }catch(e){
        textCopied = false;
      }

      if(!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem)){
        return { textCopied, imageCopied: false };
      }

      try{
        const blob = await getImageBlobFromSrc(imageSrc);
        const items = [
          new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }) }),
          new ClipboardItem({ [blob.type || "image/png"]: blob })
        ];
        await navigator.clipboard.write(items);
        return { textCopied: true, imageCopied: true };
      }catch(e){
        return { textCopied, imageCopied: false };
      }
    }


    function updateOrderText(){
      const src = currentImages[currentIndex] || "";
      const file = basename(src);
      const variantNo = currentIndex + 1;
      const hasVariants = (currentImages.length || 0) > 1;

      const msg = `Bestellanfrage: ${currentTitle}
Variante: ${hasVariants ? variantNo : "-"}
Bild: ${file}

Bitte Preis, Lieferzeit und Verfügbarkeit senden.`;

      orderInstaBtn.href = IG_DM_LINK;
      orderInstaBtn.setAttribute("aria-label", `Instagram DM öffnen – ${currentTitle}`);
      orderInstaBtn.textContent = "Bestellen: Instagram DM";

      if(orderFormBtn){
        orderFormBtn.setAttribute("aria-label", `Zum Formular – ${currentTitle}`);
      }

      orderNote.textContent = "Beim Klick wird der Modelltext kopiert – in Instagram einfach einfügen.";

      orderInstaBtn.onclick = async (e) => {
        e.preventDefault();

        const srcNow = currentImages[currentIndex] || "";
        orderNote.textContent = "Kopiere Modell…";

        const res = await copyTextAndMaybeImage(msg, srcNow);

        if(res.imageCopied){
          orderNote.textContent = "Text + Bild kopiert ✅ In Instagram einfach einfügen (Strg+V).";
        }else if(res.textCopied){
          orderNote.textContent = "Text kopiert ✅ Öffne Instagram… (Bild kannst du im Modal per Hover vergrößern)";
        }else{
          orderNote.textContent = "Kopieren nicht möglich – bitte Text/Screenshot manuell senden.";
        }

        openInNewTab(IG_DM_LINK);
      };

      if(orderFormBtn){
        orderFormBtn.onclick = (e) => {
          e.preventDefault();
          fillOrderFormFromSelection();
          closeGallery();
          const sec = document.getElementById("bestellformular");
          if(sec){
            sec.scrollIntoView({behavior:"smooth", block:"start"});
            setTimeout(() => {
              const f = document.getElementById("of_name") || document.getElementById("of_email");
              if(f) f.focus({preventScroll:true});
            }, 500);
          }
        };
      }
      updateOrderFormVariantPreview();
    }

// Hover-Zoom auf das große Bild (kein Klick, kein neuer Tab) — robust (Mouse + Cursor-Position)
    (function(){
      const media = document.querySelector(".modal-media");
      if(!media || !mainImg) return;

      function setVars(e){
        // Wichtig: Position relativ zum Container berechnen (der bleibt unverändert),
        // nicht relativ zum bereits skalierten <img>, sonst wirkt der Zoom "fix".
        const rect = media.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        // Clamp 0..100
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        mainImg.style.setProperty("--zoom-x", x.toFixed(2) + "%");
        mainImg.style.setProperty("--zoom-y", y.toFixed(2) + "%");
      }

      function resetVars(){
        mainImg.style.setProperty("--zoom-x", "50%");
        mainImg.style.setProperty("--zoom-y", "50%");
      }

      // Pointer Events: funktioniert zuverlässig, auch wenn matchMedia(pointer:fine) falsch meldet.
      mainImg.addEventListener("pointerenter", (e) => {
        if(e.pointerType && e.pointerType !== "mouse") return; // kein Zoom auf Touch
        media.classList.add("zooming");
        setVars(e);
      });

      mainImg.addEventListener("pointermove", (e) => {
        if(!media.classList.contains("zooming")) return;
        setVars(e);
      });

      mainImg.addEventListener("pointerleave", () => {
        media.classList.remove("zooming");
        resetVars();
      });

      // Falls Pointer-Cancel (z.B. Fensterwechsel)
      mainImg.addEventListener("pointercancel", () => {
        media.classList.remove("zooming");
        resetVars();
      });

      resetVars();
    })();

function setIndex(i){
      if(!currentImages.length) return;
      currentIndex = (i + currentImages.length) % currentImages.length;
      mainImg.src = currentImages[currentIndex];
      mainImg.alt = `${currentTitle} – Bild ${currentIndex + 1}`;
      // Active Thumb
      [...thumbsEl.children].forEach((btn, idx) => {
        btn.classList.toggle("active", idx === currentIndex);
      });
      updateOrderText();
    }

    function openGallery(card){
      const images = (card.dataset.images || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      if(!images.length) return;

      currentImages = images;

      const title = (card.querySelector("h3")?.textContent || "Uhr").trim();
      const meta = (card.querySelector(".tag")?.textContent || "").trim();

      currentTitle = title;

      titleEl.textContent = title;
      metaEl.textContent = meta;

      thumbsEl.innerHTML = "";
      images.forEach((src, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "thumb-btn";
        btn.setAttribute("aria-label", `Bild ${idx + 1} anzeigen`);

        const img = document.createElement("img");
        img.src = src;
        img.alt = `${title} – Bild ${idx + 1}`;
        img.loading = "lazy";

        btn.appendChild(img);
        btn.addEventListener("click", () => setIndex(idx));
        thumbsEl.appendChild(btn);
      });

      setIndex(0);

      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeGallery(){
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";

      // Hover-Zoom Reset (falls aktiv)
      document.querySelector(".modal-media")?.classList.remove("zooming");
      // Wichtig: Kein inline transform-origin setzen (würde Cursor-Follow-Zoom blockieren)
      mainImg.style.removeProperty("transform-origin");
      mainImg.style.setProperty("--zoom-x","50%");
      mainImg.style.setProperty("--zoom-y","50%");
    }

    // Klick/Keyboard auf Produktkarten
    // WICHTIG: Die Galerie soll NUR öffnen, wenn man auf das Bild (Thumbnail) klickt.
    // "Technische Details" (<details>/<summary>) darf NICHT die Galerie/Popup öffnen.
    document.querySelectorAll(".product-card").forEach(card => {
      card.addEventListener("click", (e) => {
        // Wenn der User auf "Bestellanfrage" klickt, öffnen wir trotzdem die Galerie
        // (damit man ein Modell auswählen kann), statt nur zum Formular zu springen.
        const orderBtn = e.target.closest("a.order-btn");
        if(orderBtn){
          e.preventDefault();
          e.stopPropagation();
          openGallery(card);
          return;
        }

        const t = (e.target && e.target.nodeType === 1)
          ? e.target
          : (e.target && e.target.parentElement ? e.target.parentElement : null);

        // Klick auf Links/Buttons/Details soll NICHT die Galerie öffnen
        if(t && t.closest("a,button,details,summary")) return;

        // Galerie nur öffnen, wenn auf das Bild (Thumbnail) geklickt wird
        if(!t || !t.closest(".thumb")) return;

        openGallery(card);
      });

      card.addEventListener("keydown", (e) => {
        const t = (e.target && e.target.nodeType === 1)
          ? e.target
          : (e.target && e.target.parentElement ? e.target.parentElement : null);
        if(t && t.closest("details,summary")) return;
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openGallery(card);
        }
      });
    });

    // Details/Summary sollen NIE die Galerie öffnen (Mobile zuverlässig)
    document.querySelectorAll(".product-card details, .product-card details *").forEach(el => {
      el.addEventListener("click", (e) => e.stopPropagation());
      el.addEventListener("keydown", (e) => e.stopPropagation());
    });

    // Modal Controls
    closeBtn.addEventListener("click", closeGallery);
    prevBtn.addEventListener("click", () => setIndex(currentIndex - 1));
    nextBtn.addEventListener("click", () => setIndex(currentIndex + 1));

    // Swipe (Mobile): links/rechts wischen zum Wechseln
    const mediaEl = document.querySelector('.modal-media');
    let swipeActive = false;
    let sx = 0, sy = 0;

    mediaEl?.addEventListener('pointerdown', (e) => {
      if(!modal.classList.contains('open')) return;
      if(e.pointerType !== 'touch') return;
      swipeActive = true;
      sx = e.clientX;
      sy = e.clientY;
    }, {passive: true});

    mediaEl?.addEventListener('pointerup', (e) => {
      if(!swipeActive) return;
      swipeActive = false;
      if(e.pointerType !== 'touch') return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      // Horizontale Wischgeste nur, wenn deutlich stärker als vertikal
      if(Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2){
        if(dx < 0) setIndex(currentIndex + 1);
        else setIndex(currentIndex - 1);
      }
    }, {passive: true});

    mediaEl?.addEventListener('pointercancel', () => { swipeActive = false; }, {passive: true});

    // Klick auf Overlay schließt
    modal.addEventListener("click", (e) => {
      if(e.target === modal) closeGallery();
    });

    // Keyboard: ESC/Arrows
    document.addEventListener("keydown", (e) => {
      if(!modal.classList.contains("open")) return;
      if(e.key === "Escape") closeGallery();
      if(e.key === "ArrowLeft") setIndex(currentIndex - 1);
      if(e.key === "ArrowRight") setIndex(currentIndex + 1);
    });


    // ===== Bestellformular: E-Mail + Copy =====
    const ORDER_TO_EMAIL = "urbantimevienna@gmail.com";

    // --- Versand ohne Mailprogramm (Google Apps Script Webhook) ---
    // Wichtig: Diese beiden Werte müssen zu deinem Apps Script passen.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFppgJ02rlkF34bMitHHSkPVxDREqywXZk18PGddRR_mmQsjN9Kqhvrcz5MIwLsJKP/exec";
const APPS_SCRIPT_TOKEN = "uTv_2026!9xA#kP3zQ1";

    // Optional (nur für die lokale HTML-Vorschau / Copy-Text):
    const BRAND_NAME = "Urban Time Vienna";

    function buildOrderText(){
      const model = (document.getElementById("of_model")?.value || "").trim();
      const name = (document.getElementById("of_name")?.value || "").trim();
      const email = (document.getElementById("of_email")?.value || "").trim();
      const street = (document.getElementById("of_street")?.value || "").trim();
      const postal = (document.getElementById("of_postal")?.value || "").trim();
      const city = (document.getElementById("of_city")?.value || "").trim();
      const country = (document.getElementById("of_country")?.value || "").trim();
      const deliveryMethod = (document.getElementById("of_delivery")?.value || "").trim();
      const paymentMethod = (document.getElementById("of_payment")?.value || "").trim();

    
      const instagram = (document.getElementById("of_instagram")?.value || "").trim();
      const phone = (document.getElementById("of_phone")?.value || "").trim();
      const message = (document.getElementById("of_message")?.value || "").trim();

      const imgSrc = document.getElementById("selectedVariantImg")?.getAttribute("src") || "";
      const imgFile = basename(imgSrc);

      const lines = [];
      lines.push("Bestellanfrage (Webformular)");
      lines.push("");
      if(model) lines.push(`Modell: ${model}`);
      if(deliveryMethod) lines.push(`Lieferung/Abholung: ${deliveryMethod}`);
      if(paymentMethod) lines.push(`Zahlungsmethode: ${paymentMethod}`);
      if(imgFile) lines.push(`Bildreferenz: ${imgFile}`);
      lines.push("");
      if(message) lines.push(message);
      lines.push("");
      lines.push("---");
      lines.push("Kontaktdaten:");
      if(name) lines.push(`Name: ${name}`);
      if(email) lines.push(`E-Mail: ${email}`);
      if(street || postal || city || country){
        lines.push("Adresse:");
        if(street) lines.push(street);
        if(postal || city) lines.push(`${postal} ${city}`.trim());
        if(country) lines.push(country);
      }
      if(instagram) lines.push(`Instagram: ${instagram}`);
      if(phone) lines.push(`Telefon: ${phone}`);
      return lines.join("\n");
    }

    function setFormNote(text){
      const n = document.getElementById("formNote");
      if(n) n.textContent = text;
    }
function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, (ch) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[ch]));
}

function formatDateTimeVienna(date){
  try{
    return date.toLocaleString("de-AT", {
      timeZone: "Europe/Vienna",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }catch(e){
    return date.toLocaleString();
  }
}

function toAbsoluteUrl(path){
  if(!path) return "";
  if(/^https?:\/\//i.test(path)) return path;
  if(!SITE_BASE_URL) return "";
  const base = SITE_BASE_URL.replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  return `${base}/${p}`;
}

function buildReceiptHtml({ mode }){
  // mode: "admin" | "customer"
  const dt = new Date();
  const dtText = formatDateTimeVienna(dt);

  const model = (document.getElementById("of_model")?.value || "").trim();
  const name = (document.getElementById("of_name")?.value || "").trim();
  const email = (document.getElementById("of_email")?.value || "").trim();
  const instagram = (document.getElementById("of_instagram")?.value || "").trim();
  const phone = (document.getElementById("of_phone")?.value || "").trim();
  const message = (document.getElementById("of_message")?.value || "").trim();

  const imgSrc = document.getElementById("selectedVariantImg")?.getAttribute("src") || "";
  const absImg = toAbsoluteUrl(imgSrc);
  const absLogo = toAbsoluteUrl(BRAND_LOGO_PATH);

  const title = mode === "customer" ? "Bestellbestätigung (Anfrage)" : "Neue Bestellanfrage";
  const intro = mode === "customer"
    ? `Danke für deine Anfrage! Wir melden uns so schnell wie möglich mit Preis, Lieferzeit und Verfügbarkeit.`
    : `Es ist eine neue Anfrage über das Webformular eingegangen.`;

  const safe = (s) => escapeHtml(s).replace(/\n/g, "<br>");
  const show = (label, value) => value ? `<tr><td style="padding:6px 0; color:#666; width:180px;">${label}</td><td style="padding:6px 0;">${safe(value)}</td></tr>` : "";

  const watchImg = absImg
    ? `<div style="margin:18px 0 6px 0;">
         <img src="${escapeHtml(absImg)}" alt="Ausgewählte Uhr" style="max-width:100%; border-radius:12px; border:1px solid #eee;">
       </div>`
    : `<div style="margin:18px 0 6px 0; padding:12px; border:1px solid #eee; border-radius:12px; color:#666;">
         Bildreferenz: ${escapeHtml(basename(imgSrc))}
       </div>`;

  const logoBlock = absLogo
    ? `<img src="${escapeHtml(absLogo)}" alt="${escapeHtml(BRAND_NAME)}" style="height:40px; display:block;">`
    : `<div style="font-weight:800; letter-spacing:.08em; font-size:14px;">${escapeHtml(BRAND_NAME)}</div>`;

  const customerNote = mode === "customer"
    ? `<div style="margin-top:18px; padding:12px 14px; background:#f7f7f7; border-radius:12px; color:#555;">
         Hinweis: Das ist eine Bestätigung deiner Anfrage (noch keine Rechnung / kein Kaufabschluss).
       </div>`
    : "";

  const contactRows = mode === "admin"
    ? (show("Name", name) + show("E‑Mail", email) + show("Instagram", instagram) + show("Telefon", phone))
    : (show("Name", name) + show("E‑Mail", email));

  return `
  <div style="font-family:Arial, Helvetica, sans-serif; background:#f3f4f6; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e9e9e9;">
      <div style="padding:18px 22px; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div>${logoBlock}</div>
        <div style="text-align:right; color:#666; font-size:12px;">
          <div>${escapeHtml(dtText)}</div>
          <div style="margin-top:4px;">${escapeHtml(title)}</div>
        </div>
      </div>

      <div style="padding:22px;">
        <h2 style="margin:0 0 10px 0; font-size:18px;">${escapeHtml(title)}</h2>
        <p style="margin:0 0 14px 0; color:#444; line-height:1.5;">${escapeHtml(intro)}</p>

        <div style="margin:16px 0; padding:14px 16px; border:1px solid #eee; border-radius:12px;">
          <div style="font-weight:700; margin-bottom:6px;">Bestelldetails</div>
          <div style="color:#333;">${escapeHtml(model || "—")}</div>
          ${watchImg}
        </div>

        ${message ? `<div style="margin:16px 0; padding:14px 16px; border:1px solid #eee; border-radius:12px;">
          <div style="font-weight:700; margin-bottom:6px;">Nachricht</div>
          <div style="color:#333; line-height:1.5;">${safe(message)}</div>
        </div>` : ""}

        <div style="margin:16px 0; padding:14px 16px; border:1px solid #eee; border-radius:12px;">
          <div style="font-weight:700; margin-bottom:6px;">Kontaktdaten</div>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            ${contactRows}
          </table>
        </div>

        ${customerNote}

        <div style="margin-top:22px; color:#888; font-size:12px; line-height:1.4;">
          <div>${escapeHtml(BRAND_NAME)} • Webformular</div>
        </div>
      </div>
    </div>
  </div>
  `;
}

    const orderForm = document.getElementById("orderForm");
    const copyBtn = document.getElementById("orderCopyBtn");

    function getSelectedMeta(){
      const imgSrc = document.getElementById("selectedVariantImg")?.getAttribute("src") || "";
      const imageUrl = imgSrc ? new URL(imgSrc, window.location.href).href : "";

      // Caption ist am verlässlichsten (wird in updateOrderFormVariantPreview gesetzt)
      const capText = (document.getElementById("selectedVariantCaption")?.textContent || "").trim();

      const hasVariants = (currentImages.length || 0) > 1;
      const variantNo = hasVariants ? String(currentIndex + 1) : "";

      // Best effort: Modellname aus aktuellem Titel
      const modelBase = (currentTitle || "").trim();
      const imageLabel = capText || (modelBase ? (variantNo ? `${modelBase} · Variante ${variantNo}` : modelBase) : "");

      return { imageUrl, variantNo, imageLabel };
    }

    if(orderForm){
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if(!orderForm.checkValidity()){
      orderForm.reportValidity();
      return;
    }

    const model = (document.getElementById("of_model")?.value || "").trim();
    const customerEmail = (document.getElementById("of_email")?.value || "").trim();
    const customerName = (document.getElementById("of_name")?.value || "").trim();

    const deliveryMethod = (document.getElementById("of_delivery")?.value || "").trim();
    const paymentMethod  = (document.getElementById("of_payment")?.value || "").trim();

    const street = (document.getElementById("of_street")?.value || "").trim();
    const postal = (document.getElementById("of_postal")?.value || "").trim();
    const city = (document.getElementById("of_city")?.value || "").trim();
    const country = (document.getElementById("of_country")?.value || "").trim();

    const instagram = (document.getElementById("of_instagram")?.value || "").trim();
    const phone = (document.getElementById("of_phone")?.value || "").trim();
    const message = (document.getElementById("of_message")?.value || "").trim();

    // Für die PDF/Email (ein Feld als Fallback)
    const address = [
      street,
      `${postal} ${city}`.trim(),
      country
    ].filter(Boolean).join("\n");

    const { imageUrl, variantNo, imageLabel } = getSelectedMeta();

    const btn = document.getElementById("orderEmailBtn");
    if(btn){
      btn.disabled = true;
      btn.textContent = "Sende…";
    }
    setFormNote("Sende Anfrage…");

    try{
      if(!APPS_SCRIPT_URL){
        setFormNote("Apps Script URL fehlt – bitte eintragen.");
        if(btn){ btn.disabled = false; btn.textContent = "Anfrage per E‑Mail senden"; }
        return;
      }

      const payload = {
        token: APPS_SCRIPT_TOKEN,
        // Kunde
        name: customerName,
        email: customerEmail,
        instagram,
        phone,
        deliveryMethod,
        paymentMethod,
        // Adresse (getrennt + zusammen)
        street,
        postal,
        city,
        country,
        address,
        // Uhr/Variante
        model,
        variant: variantNo,
        imageLabel,
        imageUrl,
        // Nachricht
        message,
      };

      // Wichtig: text/plain + no-cors => kein OPTIONS/Preflight, funktioniert stabil auf Netlify
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      setFormNote("Anfrage gesendet ✅ Du bekommst eine Bestätigung per E‑Mail.");
      if(btn){ btn.textContent = "Gesendet ✅"; }
    }catch(err){
      console.error(err);
      setFormNote("Senden fehlgeschlagen. Bitte versuche es erneut oder nutze 'Text kopieren'.");
      if(btn){
        btn.disabled = false;
        btn.textContent = "Anfrage per E‑Mail senden";
      }
    }
  });
}

    if(copyBtn){
      copyBtn.addEventListener("click", async () => {
        const body = buildOrderText();
        try{
          await copyText(body);
          setFormNote("Text kopiert ✅ (Du kannst ihn z.B. in Instagram oder E‑Mail einfügen)");
        }catch(e){
          setFormNote("Kopieren nicht möglich – bitte Text manuell markieren und kopieren.");
        }
      });
    }

  