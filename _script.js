
    // Jahr im Footer
    document.getElementById("year").textContent = new Date().getFullYear();

    // Sprache erkennen
    const LANG = (document.documentElement.lang || "de").toLowerCase().startsWith("en") ? "en" : "de";
    const I18N = {
      de: {
        orderInsta: "Bestellen: Instagram DM",
        orderForm: "Anfrage per Formular",
        noteCopy: "Beim Klick wird der Modelltext kopiert – einfach in Instagram einfügen.",
        noteCopied: "✅ Modelltext kopiert – in Instagram einfügen.",
        noteBlocked: "Hinweis: Kopieren wurde blockiert. Bitte Text manuell kopieren.",
        popupBlocked: "Pop-up blockiert: Bitte Pop-ups erlauben (Instagram öffnet sich in neuem Tab).",
        selectMovement: "Uhrwerk wählen",
        movement: "Uhrwerk",
        price: "Preis",
        subject: "Bestellanfrage – Urban Time Vienna",
        hello: "Hallo, ich möchte dieses Modell bestellen.",
        modelWord: "Modell",
        imageWord: "Bild",
        hint: "Hinweis: Kaufablauf mit 300 € Anzahlung + Rest per Nachnahme.",
        formPrefill: "Hallo, ich interessiere mich für dieses Modell. Bitte sende mir Preis, Lieferzeit und Verfügbarkeit."
      },
      en: {
        orderInsta: "Order: Instagram DM",
        orderForm: "Request via form",
        noteCopy: "On click, the model text is copied — just paste it into Instagram.",
        noteCopied: "✅ Model text copied — paste it into Instagram.",
        noteBlocked: "Note: Copying was blocked. Please copy the text manually.",
        popupBlocked: "Pop-up blocked: Please allow pop-ups (Instagram opens in a new tab).",
        selectMovement: "Select movement",
        movement: "Movement",
        price: "Price",
        subject: "Order request – Urban Time Vienna",
        hello: "Hi, I'd like to order this model.",
        modelWord: "Model",
        imageWord: "Image",
        hint: "Note: Order process with €300 deposit + remaining amount cash on delivery.",
        formPrefill: "Hi, I'm interested in this model. Please send me price, delivery time and availability."
      }
    };
    const T = I18N[LANG];


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
    // Empfänger für Formular-E-Mail (bitte auf deine Adresse setzen)
    const ORDER_EMAIL = "";


    
    // Hover-Zoom auf dem großen Bild (Mouse): Zoom folgt dem Mauszeiger (robust via Pointer Events)
    const modalMedia = document.querySelector('#galleryModal .modal-media');
    if(modalMedia && mainImg){
      const setVars = (ev) => {
        const rect = mainImg.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
        mainImg.style.setProperty('--zoom-x', x.toFixed(2) + '%');
        mainImg.style.setProperty('--zoom-y', y.toFixed(2) + '%');
      };
      const resetVars = () => {
        mainImg.style.setProperty('--zoom-x', '50%');
        mainImg.style.setProperty('--zoom-y', '50%');
      };

      mainImg.addEventListener('pointerenter', (ev) => {
        if(ev.pointerType && ev.pointerType !== 'mouse') return;
        modalMedia.classList.add('zooming');
        setVars(ev);
      });
      mainImg.addEventListener('pointermove', (ev) => {
        if(!modalMedia.classList.contains('zooming')) return;
        setVars(ev);
      });
      mainImg.addEventListener('pointerleave', () => {
        modalMedia.classList.remove('zooming');
        resetVars();
      });
      mainImg.addEventListener('pointercancel', () => {
        modalMedia.classList.remove('zooming');
        resetVars();
      });

      resetVars();
    }

;

      modalMedia.addEventListener('mousemove', setOriginFromEvent);
      modalMedia.addEventListener('mouseenter', setOriginFromEvent);
      modalMedia.addEventListener('mouseleave', () => {
        mainImg.style.setProperty('--zoom-x', '50%');
        mainImg.style.setProperty('--zoom-y', '50%');
      });
    }

let currentImages = [];
    let currentIndex = 0;
    let currentMovements = [];
    let selectedMovement = null;
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


        
    function getSelectedMovement(){
      if(selectedMovement) return selectedMovement;
      if(Array.isArray(currentMovements) && currentMovements.length){
        selectedMovement = currentMovements[0];
        return selectedMovement;
      }
      return null;
    }

    function renderMovementPicker(){
      const picker = document.getElementById("movementPicker");
      if(!picker) return;

      if(!Array.isArray(currentMovements) || !currentMovements.length){
        picker.innerHTML = "";
        picker.style.display = "none";
        selectedMovement = null;
        return;
      }
      picker.style.display = "";
      const sel = getSelectedMovement();

      const title = `<div class="mp-title">${T.selectMovement}</div>`;
      const items = currentMovements.map((m, idx) => {
        const code = String(m.code || "").trim();
        const price = Number(m.price || 0);
        const id = `mv_${code}`;
        const checked = sel && String(sel.code) === code ? "checked" : (idx===0 ? "checked" : "");
        const label = `${code} · ${price} €`;
        return `
          <label class="mp-item" for="${id}">
            <input type="radio" name="movement" id="${id}" value="${code}" ${checked}>
            <span class="mp-label">${label}</span>
          </label>
        `;
      }).join("");

      picker.innerHTML = title + `<div class="mp-grid">${items}</div>`;

      picker.querySelectorAll('input[name="movement"]').forEach(inp => {
        inp.addEventListener("change", () => {
          const code = inp.value;
          const found = currentMovements.find(x => String(x.code) === String(code));
          selectedMovement = found || null;
          updateOrderText();
        });
      });
    }


        function updateOrderText(){
  const total = currentImages.length || 0;
  const num = (currentIndex || 0) + 1;
  const file = basename(currentImages[currentIndex] || "");

  // Button labels (immer gleich, Modell steht im kopierten Text)
  orderInstaBtn.textContent = T.orderInsta;
  orderFormBtn.textContent = T.orderForm;

  orderInstaBtn.setAttribute("aria-label", `${T.orderInsta} – ${currentTitle} – ${num}/${total}`);
  orderFormBtn.setAttribute("aria-label", `${T.orderForm} – ${currentTitle} – ${num}/${total}`);

  orderNote.textContent = T.noteCopy;

  const mv = getSelectedMovement();
  const mvLine = mv ? `${T.movement}: ${mv.code}` : "";
  const priceLine = mv ? `${T.price}: ${mv.price} €` : "";

  const msg = `Urban Time Vienna – ${currentTitle}
${T.modelWord}: ${num}/${total}
${mvLine}
${priceLine}
${T.imageWord}: ${file}

${T.hello}`;

  // Instagram DM: Text (und optional Bild) kopieren + IG in neuem Tab öffnen
  orderInstaBtn.onclick = async (e) => {
    e.preventDefault();

    try{
      await copyText(msg);
      const imgUrl = currentImages[currentIndex];
      if (imgUrl) {
        try { await copyImageToClipboard(imgUrl); } catch (_) {}
      }
      orderNote.textContent = T.noteCopied;
    }catch(err){
      console.warn("Clipboard copy failed:", err);
      orderNote.textContent = T.noteBlocked;
    }

    const w = window.open(IG_DM_LINK, "_blank", "noopener,noreferrer");
    if(!w){
      // Kein Redirect der aktuellen Seite – nur Hinweis
      orderNote.textContent = T.popupBlocked;
    }
  };

  // Formular: Modal schließen + Formular vorbefüllen + hinscrollen
  orderFormBtn.onclick = (e) => {
    e.preventDefault();
    closeGallery();

    const imgUrl = currentImages[currentIndex] || "";
    prefillOrderForm(currentTitle, num, total, file, imgUrl);

    const sec = document.getElementById("bestellformular");
    if(sec) sec.scrollIntoView({behavior:"smooth"});
  };
}


function openGallery(card){
      const images = (card.dataset.images || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const mediaStage = document.getElementById("mediaStage");

      currentImages = images;

      // Wenn keine Bilder vorhanden sind, öffnen wir trotzdem das Pop-up (ohne Galerie)
      const hasImages = images.length > 0;
      if(mediaStage){
        mediaStage.style.display = hasImages ? "" : "none";
      }
      if(thumbsEl){
        thumbsEl.style.display = hasImages ? "" : "none";
        thumbsEl.innerHTML = "";
      }
      if(prevBtn) prevBtn.style.display = hasImages ? "" : "none";
      if(nextBtn) nextBtn.style.display = hasImages ? "" : "none";
      if(mainImg){
        mainImg.style.display = hasImages ? "" : "none";
        mainImg.src = hasImages ? images[0] : "";
      }


      const title = (card.querySelector("h3")?.textContent || "Uhr").trim();
      const meta = (card.querySelector(".tag")?.textContent || "").trim();

      currentTitle = title;

      titleEl.textContent = title;
      metaEl.textContent = meta;

      // Uhrwerk/Preise aus dem Card-Dataset
      try{
        currentMovements = JSON.parse(card.dataset.movements || "[]") || [];
      }catch(_){
        currentMovements = [];
      }
      selectedMovement = null;
      renderMovementPicker();

      if(hasImages){
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
      }

      if(hasImages){
        setIndex(0);
      } else {
        // Kein Bild: sicherstellen, dass kein altes Bild angezeigt wird
        if(mainImg) mainImg.src = "";
      }

      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeGallery(){
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    // Galerie NUR über Klick aufs Bild (Thumbnail) öffnen.
    // Wichtig: Auf manchen Geräten feuert ein Klick auf <summary> trotzdem einen Card-Click.
    // Deshalb binden wir den Gallery-Click ausschließlich an .thumb.
    document.querySelectorAll(".product-card").forEach(card => {
      const thumb = card.querySelector(".thumb");
      if(thumb){
        thumb.addEventListener("click", (e) => {
          e.stopPropagation();
          openGallery(card);
        });
      }



      // Klick irgendwo auf der Karte öffnet ebenfalls das Pop-up (außer auf interaktiven Elementen)
      card.addEventListener("click", (e) => {
        const t = (e.target && e.target.nodeType === 1) ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
        if(t && t.closest("details,summary,a,button")) return;
        openGallery(card);
      });
      // Optional: Enter/Space auf der Karte öffnet ebenfalls (für Tastatur)
      card.addEventListener("keydown", (e) => {
        const t = (e.target && e.target.nodeType === 1) ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
        if(t && t.closest("details,summary,a,button")) return;
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openGallery(card);
        }
      });
    });

    // Details/Summary: nur auf/zu klappen, niemals Gallery triggern
    document.querySelectorAll(".product-card details, .product-card details *").forEach(el => {
      el.addEventListener("click", (e) => e.stopPropagation(), true);
      el.addEventListener("pointerdown", (e) => e.stopPropagation(), true);
      el.addEventListener("touchstart", (e) => e.stopPropagation(), true);
      el.addEventListener("keydown", (e) => e.stopPropagation(), true);
    });

    // Modal Controls
    closeBtn.addEventListener("click", closeGallery);
    prevBtn.addEventListener("click", () => setIndex(currentIndex - 1));
    nextBtn.addEventListener("click", () => setIndex(currentIndex + 1));

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
  


    // ===== Bestellformular =====
    const orderForm = document.getElementById("orderForm");
    const ofModel = document.getElementById("of_model");
    const ofName = document.getElementById("of_name");
    const ofEmail = document.getElementById("of_email");
    const ofPhone = document.getElementById("of_phone");
    const ofMsg = document.getElementById("of_message");
    const ofTerms = document.getElementById("of_terms");
    const formNote = document.getElementById("formNote");
    const copyBtn = document.getElementById("orderCopyBtn");
    const emailBtn = document.getElementById("orderEmailBtn");

    function buildInquiryText(){
      const model = (ofModel?.value || "").trim();
      const name = (ofName?.value || "").trim();
      const email = (ofEmail?.value || "").trim();
      const phone = (ofPhone?.value || "").trim();
      const message = (ofMsg?.value || "").trim();
      const imgRef = orderForm?.dataset?.imageRef || "";

      const mv = (orderForm?.dataset?.movement || "").trim();
      const price = (orderForm?.dataset?.price || "").trim();

      const LBL = (LANG === "en") ? {
        model: "Model",
        movement: "Movement",
        price: "Price",
        imageRef: "Image reference",
        customer: "Customer",
        email: "Email",
        phone: "Phone",
        message: "Message",
        hint: T.hint
      } : {
        model: "Modell",
        movement: "Uhrwerk",
        price: "Preis",
        imageRef: "Bild-Referenz",
        customer: "Kunde",
        email: "E-Mail",
        phone: "Telefon",
        message: "Nachricht",
        hint: T.hint
      };

      return [
        `${T.subject}`,
        ``,
        `${LBL.model}: ${model}`,
        mv ? `${LBL.movement}: ${mv}` : ``,
        price ? `${LBL.price}: ${price} €` : ``,
        imgRef ? `${LBL.imageRef}: ${imgRef}` : ``,
        ``,
        `${LBL.customer}: ${name}`,
        `${LBL.email}: ${email}`,
        phone ? `${LBL.phone}: ${phone}` : ``,
        ``,
        `${LBL.message}:`,
        message || "-",
        ``,
        `${LBL.hint}`
      ].filter(Boolean).join("
");
    }

    function prefillOrderForm(title, variantNum, variantTotal, file, src){
      if(!orderForm) return;
      const mv = getSelectedMovement();
      const mvTxt = mv ? ` – ${T.movement} ${mv.code} – ${mv.price} €` : "";
      const modelText = `${title} – Modell ${variantNum}/${variantTotal}${mvTxt}`;
      if(orderForm){ orderForm.dataset.movement = mv ? mv.code : ""; orderForm.dataset.price = mv ? String(mv.price) : ""; }
      if(ofModel) ofModel.value = modelText;
      orderForm.dataset.imageRef = file || (src ? basename(src) : "");
      if(formNote) formNote.textContent = "Formular ist vorausgefüllt ✅ Du kannst es jetzt absenden oder den Text kopieren.";
    }

    async function copyInquiry(){
      const text = buildInquiryText();
      try{
        await copyText(text);
        if(formNote) formNote.textContent = "Text kopiert ✅ Du kannst ihn in E-Mail oder Instagram einfügen.";
        return true;
      }catch(e){
        if(formNote) formNote.textContent = "Kopieren nicht möglich – bitte Text manuell markieren.";
        return false;
      }
    }

    if(copyBtn){
      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        copyInquiry();
      });
    }

    if(orderForm){
      orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Simple validation
        const modelOk = ofModel && ofModel.value.trim().length > 2;
        const nameOk = ofName && ofName.value.trim().length > 2;
        const emailOk = ofEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ofEmail.value.trim());
        const termsOk = ofTerms && ofTerms.checked;

        if(!modelOk || !nameOk || !emailOk || !termsOk){
          if(formNote) formNote.textContent = "Bitte Modell, Name, E‑Mail ausfüllen und die Bestätigung anhaken.";
          return;
        }

        const text = buildInquiryText();
        // Copy text for convenience
        await copyInquiry();

        if(!ORDER_EMAIL){
          if(formNote) formNote.textContent = "E‑Mail-Empfänger ist noch nicht gesetzt – bitte Instagram nutzen oder sag mir deine E‑Mail, dann trage ich sie ein.";
          // Open Instagram as fallback
          const w = window.open(IG_DM_LINK, "_blank", "noopener");
          if(!w){ if(formNote) formNote.textContent = "Pop-up blockiert: Bitte Pop-ups erlauben, damit Instagram in neuem Tab öffnet."; }
          return;
        }

        const subject = encodeURIComponent(`Bestellanfrage – ${ofModel.value.trim()}`);
        const body = encodeURIComponent(text);
        window.location.href = `mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`;
      });
    }

