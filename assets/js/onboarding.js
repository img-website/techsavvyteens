/* Tech Savvy Teens — onboarding popup.

   A two-column sign-up modal: a branded panel on the left, a validated form on
   the right. On success the backend queues the request for admin review and we
   send the visitor to thank-you.html; the admin later approves and the login
   credentials are emailed/SMSed to them (see onboarding_flow_api_docs2.md).

   Progressive enhancement, matching booking.js: the modal and its trigger are
   built in JS, so with this file blocked nothing half-rendered is left behind.

   The mobile field uses intl-tel-input (vendored under assets/vendor), which
   gives real country flags, IP-based auto country selection, per-country
   placeholders and per-country validation. The library is loaded lazily the
   first time the modal opens.

   Integration knobs
   -----------------
   • API base URL — set window.TST_ONBOARDING_API_BASE before this script loads,
     e.g.  <script>window.TST_ONBOARDING_API_BASE="https://api.example.com"</script>
     Falls back to the constant below. If it is ever left empty the modal runs in
     DEMO mode (no network call, straight to the thank-you page).
   • Open it from anywhere by putting  data-onboarding-open  on any button/link.
     A "Sign Up" button is also injected into the header automatically. */
(function () {
  "use strict";

  /* ---- the one line the backend team asked us to wire up ---- */
  var API_BASE =
    (typeof window !== "undefined" && window.TST_ONBOARDING_API_BASE) ||
    "http://138.68.68.183:5011";
  var SUBMIT_PATH = "/api/v1/onboarding/submit";
  var EMAIL_KEY = "tst-onboarding-email"; // handed to thank-you.html for a nicer line

  /* ---- vendored intl-tel-input ---- */
  var ITI_BASE = "assets/vendor/intl-tel-input/";
  var ITI_CSS = ITI_BASE + "css/intlTelInput.min.css";
  var ITI_JS = ITI_BASE + "js/intlTelInputWithUtils.min.js";
  // Injected AFTER the library CSS so it wins the cascade; maps the plugin's own
  // custom properties onto the site palette so it themes in light and dark.
  var ITI_THEME =
    ".iti{width:100%;display:block}" +
    ":root{--iti-border-color:var(--ui-line);--iti-dropdown-bg:var(--ui-surface);" +
    "--iti-hover-color:var(--ui-surface-2);--iti-dialcode-color:var(--ui-ink-muted);" +
    "--iti-arrow-color:var(--ui-ink-muted);--iti-selected-country-bg:transparent}" +
    ".iti__dropdown-content{z-index:120;color:var(--ui-ink);border:1px solid var(--ui-line);" +
    "border-radius:.85rem;box-shadow:var(--shadow-lift);overflow:hidden}" +
    ".iti__search-input{color:var(--ui-ink);background:var(--ui-surface);border-bottom:1px solid var(--ui-line)}" +
    ".iti__country-name{color:var(--ui-ink)}.iti__dial-code{color:var(--ui-ink-muted)}" +
    ".iti__country.iti__highlight{background:var(--ui-surface-2)}" +
    ".iti__selected-country:focus-visible{outline:none;box-shadow:0 0 0 4px var(--ui-ring)}";

  var NAME_MIN = 2, NAME_MAX = 100, DESC_MAX = 1000;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* --------------------------------------------------------------- utils -- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function itiOpen() { return !!document.querySelector(".iti__dropdown-content"); }

  var modal, form, els = {}, lastFocus, submitting = false, iti = null;

  /* -------------------------------------------------- trigger injection -- */
  function injectTrigger() {
    var actions = $("[data-cart-open]");
    actions = actions ? actions.parentNode : null;
    if (actions && !$("[data-onboarding-open]", document.querySelector("header") || document)) {
      var btn = el(
        "button",
        "hidden rounded-full bg-brand-700 px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:inline-block",
        "Sign Up"
      );
      btn.type = "button";
      btn.setAttribute("data-onboarding-open", "");
      var support = actions.querySelector('a[href*="paypal.com"]');
      actions.insertBefore(btn, support || actions.querySelector("[data-nav-toggle]") || null);
    }

    var mobileList = $("#mobile-nav ul");
    if (mobileList && !$("[data-onboarding-open]", mobileList)) {
      var li = el("li", "pt-2");
      var mbtn = el(
        "button",
        "block w-full rounded-xl bg-brand-700 px-4 py-3 text-center text-base font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300",
        "Sign Up"
      );
      mbtn.type = "button";
      mbtn.setAttribute("data-onboarding-open", "");
      li.appendChild(mbtn);
      mobileList.appendChild(li);
    }
  }

  /* ------------------------------------------------------------ fields ---- */
  function fieldShell(id, label, required, hint) {
    return (
      '<div class="mb-4">' +
      '<label for="' + id + '" class="block text-sm font-bold text-ink">' + label +
      (required ? ' <span class="text-accent-700 dark:text-accent-400" aria-hidden="true">*</span>' : "") +
      "</label>" +
      (hint ? '<p class="mt-0.5 text-xs text-ink-muted">' + hint + "</p>" : "")
    );
  }
  var inputCls =
    "mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink placeholder:text-ink-muted/60 " +
    "transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-ring-brand/25 " +
    "aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 aria-[invalid=true]:focus:ring-red-500/25";
  var errCls = "mt-1.5 hidden text-sm font-semibold text-red-600 dark:text-red-400";

  function buildForm() {
    var html =
      '<div data-ob-banner role="alert" class="mb-4 hidden rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300"></div>' +

      fieldShell("ob-name", "Full name", true) +
      '<input id="ob-name" name="name" type="text" autocomplete="name" required minlength="' + NAME_MIN + '" maxlength="' + NAME_MAX + '" ' +
      'placeholder="e.g. Rahul Sharma" class="' + inputCls + '" aria-describedby="ob-name-err">' +
      '<p id="ob-name-err" class="' + errCls + '"></p></div>' +

      fieldShell("ob-email", "Email address", true) +
      '<input id="ob-email" name="email" type="email" autocomplete="email" required inputmode="email" ' +
      'placeholder="you@example.com" class="' + inputCls + '" aria-describedby="ob-email-err">' +
      '<p id="ob-email-err" class="' + errCls + '"></p></div>' +

      fieldShell("ob-mobile", "Mobile number", false) +
      // intl-tel-input enhances this input: flag dropdown, IP auto-country,
      // placeholder and validation all come from the library.
      '<input id="ob-mobile" name="mobile" type="tel" autocomplete="tel" class="' + inputCls + '" aria-describedby="ob-mobile-err">' +
      '<p id="ob-mobile-err" class="' + errCls + '"></p></div>' +

      fieldShell("ob-description", "Why do you want to join?", false) +
      '<textarea id="ob-description" name="description" rows="3" maxlength="' + DESC_MAX + '" ' +
      'placeholder="I would love to join Tech Savvy…" class="' + inputCls + ' resize-none" aria-describedby="ob-description-err ob-description-count"></textarea>' +
      '<div class="mt-1 flex items-start justify-between gap-3">' +
      '<p id="ob-description-err" class="' + errCls + ' !mt-0"></p>' +
      '<p id="ob-description-count" class="ml-auto shrink-0 text-xs tabular-nums text-ink-muted">0 / ' + DESC_MAX + "</p></div>" +

      '<button type="submit" data-ob-submit class="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-6 py-4 text-base font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0">' +
      '<span data-ob-spinner class="hidden h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>' +
      '<span data-ob-submit-label>Submit application</span></button>' +

      '<p class="mt-3 text-center text-xs leading-relaxed text-ink-muted">No account is created yet. After an admin approves your request, your login is emailed to you. It is always free.</p>';

    form = document.createElement("form");
    form.noValidate = true;
    form.setAttribute("novalidate", "");
    form.innerHTML = html;

    els.name = $("#ob-name", form);
    els.email = $("#ob-email", form);
    els.mobile = $("#ob-mobile", form);
    els.description = $("#ob-description", form);
    els.banner = $("[data-ob-banner]", form);
    els.submit = $("[data-ob-submit]", form);
    els.spinner = $("[data-ob-spinner]", form);
    els.submitLabel = $("[data-ob-submit-label]", form);
    els.count = $("#ob-description-count", form);

    wireValidation();
    return form;
  }

  /* --------------------------------------------------- phone (intl-tel) -- */
  function loadITI() {
    return new Promise(function (resolve, reject) {
      if (window.intlTelInput) return resolve();
      if (!document.getElementById("iti-css")) {
        var link = document.createElement("link");
        link.id = "iti-css";
        link.rel = "stylesheet";
        link.href = ITI_CSS;
        document.head.appendChild(link);
        var style = document.createElement("style");
        style.id = "iti-theme";
        style.textContent = ITI_THEME;
        document.head.appendChild(style);
      }
      var s = document.createElement("script");
      s.src = ITI_JS;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(); };
      document.head.appendChild(s);
    });
  }

  function setupPhone() {
    loadITI().then(function () {
      if (!window.intlTelInput || !els.mobile || iti) return;
      iti = window.intlTelInput(els.mobile, {
        initialCountry: "auto",
        geoIpLookup: function (success, failure) {
          fetch("https://ipapi.co/json/")
            .then(function (r) { return r.json(); })
            .then(function (d) { success(((d && d.country_code) || "us").toLowerCase()); })
            .catch(function () { failure(); });
        },
        separateDialCode: false,    // one field, so an autofilled/pasted +dial code can't double up
        strictMode: true,           // enforces the per-country digit pattern as you type
        autoPlaceholder: "polite",  // placeholder comes from the library, per country
        countryOrder: ["us", "in"],
        dropdownContainer: document.body // so the list isn't clipped by the modal's scroll
      });
      els.mobile.addEventListener("countrychange", function () {
        if (touched.mobile) validateMobile(false);
      });
    }).catch(function () {
      /* Library blocked — the plain tel input still validates and submits. */
    });
  }

  /* -------------------------------------------------------- validation --- */
  var touched = {};

  function setError(input, msg) {
    var err = document.getElementById(input.id + "-err");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (err) { err.textContent = msg; err.classList.remove("hidden"); }
    } else {
      input.removeAttribute("aria-invalid");
      if (err) { err.textContent = ""; err.classList.add("hidden"); }
    }
    return !msg;
  }

  function validateName(show) {
    var v = els.name.value.trim();
    var msg = "";
    if (!v) msg = "Please enter your full name.";
    else if (v.length < NAME_MIN) msg = "Name must be at least " + NAME_MIN + " characters.";
    else if (v.length > NAME_MAX) msg = "Name must be " + NAME_MAX + " characters or fewer.";
    if (show || touched.name) setError(els.name, msg);
    return !msg;
  }
  function validateEmail(show) {
    var v = els.email.value.trim();
    var msg = "";
    if (!v) msg = "Please enter your email address.";
    else if (!EMAIL_RE.test(v)) msg = "Please enter a valid email address.";
    if (show || touched.email) setError(els.email, msg);
    return !msg;
  }
  function validateMobile(show) {
    var raw = els.mobile.value.trim();
    var msg = "";
    if (raw) {
      if (iti && typeof iti.isValidNumber === "function") {
        if (!iti.isValidNumber()) msg = "Please enter a valid mobile number for the selected country.";
      } else {
        var digits = raw.replace(/[\s\-().+]/g, "");
        if (!/^\d{6,15}$/.test(digits)) msg = "Please enter a valid mobile number.";
      }
    }
    if (show || touched.mobile) setError(els.mobile, msg);
    return !msg;
  }
  function validateDescription(show) {
    var v = els.description.value;
    var msg = v.length > DESC_MAX ? "Please keep it under " + DESC_MAX + " characters." : "";
    if (show || touched.description) setError(els.description, msg);
    return !msg;
  }

  function validateAll() {
    var okN = validateName(true);
    var okE = validateEmail(true);
    var okM = validateMobile(true);
    var okD = validateDescription(true);
    return okN && okE && okM && okD;
  }

  function wireValidation() {
    [
      ["name", els.name, validateName],
      ["email", els.email, validateEmail],
      ["mobile", els.mobile, validateMobile],
      ["description", els.description, validateDescription]
    ].forEach(function (m) {
      var key = m[0], node = m[1], fn = m[2];
      node.addEventListener("blur", function () { touched[key] = true; fn(false); });
      node.addEventListener("input", function () { if (touched[key]) fn(false); });
    });

    els.description.addEventListener("input", function () {
      var n = els.description.value.length;
      els.count.textContent = n + " / " + DESC_MAX;
      els.count.classList.toggle("text-red-600", n > DESC_MAX);
    });

    form.addEventListener("submit", onSubmit);
  }

  function banner(msg) {
    if (!els.banner) return;
    if (msg) { els.banner.textContent = msg; els.banner.classList.remove("hidden"); }
    else { els.banner.textContent = ""; els.banner.classList.add("hidden"); }
  }

  /* ------------------------------------------------------------ submit ---- */
  function setBusy(on) {
    submitting = on;
    els.submit.disabled = on;
    els.submit.setAttribute("aria-busy", String(on));
    els.spinner.classList.toggle("hidden", !on);
    els.submitLabel.textContent = on ? "Submitting…" : "Submit application";
  }

  function buildPayload() {
    var payload = { name: els.name.value.trim(), email: els.email.value.trim() };
    var raw = els.mobile.value.trim();
    if (raw) {
      var dial = (iti && iti.getSelectedCountryData && iti.getSelectedCountryData().dialCode) || "";
      var e164 = (iti && iti.getNumber && iti.getNumber()) || "";
      // national significant number, e.g. "9876543210" — matches the API docs
      payload.mobile = (e164 && dial) ? e164.replace(/^\+/, "").slice(dial.length) : raw.replace(/[\s\-().+]/g, "");
      payload.countryCode = dial ? "+" + dial : "+1";
    }
    var description = els.description.value.trim();
    if (description) payload.description = description;
    return payload;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    banner("");
    if (!validateAll()) {
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var payload = buildPayload();
    try { sessionStorage.setItem(EMAIL_KEY, payload.email); } catch (err) {}

    setBusy(true);

    if (!API_BASE) {
      if (window.console) console.warn("[onboarding] No API base set — running in demo mode.");
      window.setTimeout(function () { window.location.href = "thank-you.html"; }, 700);
      return;
    }

    fetch(API_BASE.replace(/\/+$/, "") + SUBMIT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .then(function (r) {
        if (r.ok && r.body && r.body.success !== false) {
          window.location.href = "thank-you.html";
          return;
        }
        banner((r.body && r.body.message) ||
          "We couldn't submit your request. Please check your details and try again.");
        setBusy(false);
      })
      .catch(function () {
        banner("We couldn't reach the server. Please check your connection and try again.");
        setBusy(false);
      });
  }

  /* ------------------------------------------------------------- modal ---- */
  function buildModal() {
    if (modal) return;
    modal = el("div", "fixed inset-0 z-[95]");
    modal.setAttribute("data-onboarding-modal", "");
    modal.hidden = true;

    modal.innerHTML =
      '<div data-onboarding-backdrop class="absolute inset-0 bg-brand-950/70 backdrop-blur-sm"></div>' +
      '<div class="absolute inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">' +
        '<div role="dialog" aria-modal="true" aria-labelledby="ob-title" ' +
        'class="animate-pop relative my-auto grid w-full max-w-4xl overflow-hidden rounded-3xl bg-surface shadow-hero md:grid-cols-2">' +

          '<button type="button" data-onboarding-close ' +
          'class="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-surface/80 text-ink shadow-card backdrop-blur transition hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40">' +
          '<span class="sr-only">Close sign-up form</span>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="h-5 w-5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
          "</button>" +

          '<div class="relative hidden flex-col justify-between overflow-hidden bg-brand-950 p-8 text-white md:flex lg:p-10">' +
            '<div aria-hidden="true" class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_75%)]"></div>' +
            '<div aria-hidden="true" class="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"></div>' +
            '<div class="relative">' +
              '<img src="assets/images/logos/tst-logo-light.png" alt="Tech Savvy Teens" width="900" height="247" class="h-10 w-auto">' +
              '<h2 class="mt-8 font-display text-3xl leading-tight lg:text-4xl">Join Tech Savvy Teens</h2>' +
              '<p class="mt-4 leading-relaxed text-brand-100">One short form is all it takes to get started. Two generations, one mission — bridging the digital divide across Hawaiʻi.</p>' +
              '<ul class="mt-8 space-y-4">' +
                bullet("Free to apply — it takes under a minute.") +
                bullet("An admin reviews every request personally.") +
                bullet("Once approved, we email your login ID &amp; password.") +
                bullet("Sign in to the Tech Savvy app and you're in.") +
              "</ul>" +
            "</div>" +
            '<p class="relative mt-8 text-sm font-semibold text-brand-200">Made with aloha in Honolulu, Hawaiʻi 🤙</p>' +
          "</div>" +

          '<div data-ob-scroll class="flex max-h-[92vh] flex-col overflow-y-auto p-6 sm:p-8">' +
            '<div class="mb-5 flex items-center gap-3 md:hidden">' +
              '<img src="assets/images/logos/tst-logo-dark.png" alt="Tech Savvy Teens" width="900" height="247" class="h-9 w-auto dark:hidden">' +
              '<img src="assets/images/logos/tst-logo-light.png" alt="" aria-hidden="true" width="900" height="247" class="hidden h-9 w-auto dark:block">' +
            "</div>" +
            '<h3 id="ob-title" class="font-display text-2xl text-ink">Create your account</h3>' +
            '<p class="mt-2 text-sm leading-relaxed text-ink-muted">Fill in your details below. Fields marked <span class="font-bold text-accent-700 dark:text-accent-400">*</span> are required.</p>' +
            '<div data-ob-form-mount class="mt-6"></div>' +
          "</div>" +

        "</div>" +
      "</div>";

    document.body.appendChild(modal);
    $("[data-ob-form-mount]", modal).appendChild(buildForm());
    setupPhone();

    $("[data-onboarding-backdrop]", modal).addEventListener("click", closeModal);
    $("[data-onboarding-close]", modal).addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      // While the country dropdown is open, let it own the keyboard.
      if (itiOpen()) return;
      if (e.key === "Escape" && !submitting) { closeModal(); return; }
      if (e.key !== "Tab") return;
      var f = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])', modal)
        .filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }

  function bullet(text) {
    return (
      '<li class="flex gap-3">' +
      '<span aria-hidden="true" class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 text-white"><path d="M20 6L9 17l-5-5"/></svg>' +
      "</span>" +
      '<span class="leading-snug text-brand-50">' + text + "</span></li>"
    );
  }

  function openModal() {
    buildModal();

    var mnav = document.getElementById("mobile-nav");
    if (mnav && !mnav.hidden) {
      mnav.hidden = true;
      var nt = $("[data-nav-toggle]");
      if (nt) nt.setAttribute("aria-expanded", "false");
    }

    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add("overflow-hidden");
    if (els.name) els.name.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove("overflow-hidden");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* --------------------------------------------------------------- boot -- */
  function boot() {
    injectTrigger();
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-onboarding-open]");
      if (!t) return;
      e.preventDefault();
      openModal();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
