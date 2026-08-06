/* Tech Savvy Teens — booking flow.

   Rebuilt to follow the live GoDaddy Online Appointments flow step for step,
   as observed on techsavvyteens.com/for-kupuna/ola/services/… :

     1. Service page  — calendar. Only dates the mentors actually work are
                        circled; picking any other date says so instead of
                        showing times. Choosing an open date reveals the
                        timezone, a "Morning" group and the start times.
                        Pick a time -> Continue.
     2. Location step — same page. Shows the chosen slot with a Modify link,
                        the staff member, and "Service will be provided at
                        your location" + address fields. Ends with BOOK.
     3. Cart drawer   — BOOK slides the cart in from the right: the booking,
                        a coupon field, the totals, "Add your details" and
                        "Additional questions", then Confirm Booking.
     4. Thank you     — renders inside the same drawer: order ID, the booking
                        summary and Add to Calendar links.

   The cart is a drawer, not a page, exactly as on the live site — so the
   header cart icon opens it from anywhere.

   Two honest departures, both stated in the UI rather than papered over:
   there is no availability server (open days come from the rules below), and
   no payment processor (sessions are free; the one add-on is invoiced later).
   Confirm Booking therefore hands the request to the mail client, the same
   mechanism the contact form on donate.html already uses. */
(function () {
  "use strict";

  var CART_KEY = "tst-cart";
  var SERVICE_KEY = "tst-service";
  var EMAIL = "support@techsavvyteens.org";
  var TZ_LABEL = "(GMT-10:00) Hawaii";
  var TZ_OFFSET = -10; // Hawaii does not observe DST, so this is fixed.

  /* ------------------------------------------------------------ catalogue --
     Copy is verbatim from the two live service pages. Only the community
     service carries an add-on; the senior one has none, which is why the
     add-on block does not appear on it. */
  var SERVICES = {
    senior: {
      id: "senior",
      name: "One-to-One Tutoring (for Senior Living Centers Only)",
      short: "One-to-One Tutoring",
      audience: "for Senior Living Centers Only",
      categoryLabel: "Senior living centers",
      duration: "2 hrs",
      hours: 2,
      price: 0,
      staff: "Youssef Dakroub",
      image: "assets/images/gallery/service-senior.jpg",
      imageAlt:
        "A Tech Savvy Teen presenting an internet-safety slide to a room of seated kūpuna",
      headline: "Book a One-on-One Tech Support Session",
      intro:
        "Tech Savvy Teens brings two trained teen mentors directly to your location for a 2-hour tech support session — available as a scheduled visit or walk-in. Each session is designed to meet your kūpuna where they are, offering patient, personalized help with internet safety, device basics, telehealth, scam prevention, and more.",
      note:
        "We just ask that you provide a table and 2 chairs per teen mentor so everyone is comfortable and ready to help. Whether you manage a senior living center, community center, or church, we make it easy to bring trusted, youth-led tech support to the people who need it most.",
      addOns: []
    },
    community: {
      id: "community",
      name: "One-to-One Tutoring (Community Centers & Churches Only)",
      short: "One-to-One Tutoring",
      audience: "Community Centers & Churches Only",
      categoryLabel: "Community centers & churches",
      duration: "2 hrs",
      hours: 2,
      price: 0,
      staff: "Youssef Dakroub",
      image: "assets/images/gallery/service-community.jpg",
      imageAlt:
        "Two Tech Savvy Teens volunteers with a microphone at a community centre gathering",
      headline: "Host a Tech Support Session at Your Location",
      intro:
        "Tech Savvy Teens is a program of Kaulike Academy, a Native Hawaiian nonprofit dedicated to learner-driven education and community empowerment. We bring two trained teen mentors to your community center or church for a 2-hour tech support session — perfect for serving kūpuna in your congregation or community who need help with everyday technology.",
      note:
        "Sessions can be scheduled in advance or offered as walk-in support during existing events and gatherings. Our teen mentors provide personalized, one-on-one help with internet safety, device basics, telehealth access, scam prevention, and more — all delivered with patience, care, and aloha. We ask that you provide a table and 2 chairs per teen mentor.",
      addOns: [{ id: "extra-teen", label: "Add additional teen", price: 50 }]
    }
  };

  var EXPECT = [
    "2 teen mentors per session",
    "2 hours of one-on-one support",
    "Sessions available in 30-minute or 1-hour time slots per mentor"
  ];

  /* Both live services offer the same two morning starts. */
  var SLOTS = [
    { value: "10:00", label: "10:00 AM", period: "Morning" },
    { value: "11:00", label: "11:00 AM", period: "Morning" }
  ];

  /* Stands in for the live availability feed. On the live calendar the open
     days run Friday–Monday with roughly a week and a half of notice — the
     mentors are students, so the roster is weekend-shaped. */
  var OPEN_DAYS = [5, 6, 0, 1]; // Fri, Sat, Sun, Mon
  var LEAD_DAYS = 10;
  var HORIZON_MONTHS = 6;

  var STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

  /* --------------------------------------------------------------- utils -- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function money(n) { return "$" + n.toFixed(2); }
  function priceLabel(n) { return n > 0 ? money(n) : "Free"; }

  // Y-M-D strings throughout. Date.toISOString() would shift Hawaiʻi back a day.
  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
  }
  function fromYmd(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var c = new Date(d); c.setDate(c.getDate() + n); return c; }
  function longDate(s) {
    return fromYmd(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  function shortDate(s) {
    return fromYmd(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function timeLabel(v) {
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].value === v) return SLOTS[i].label;
    return v;
  }
  function isBookable(date) {
    var day = startOfDay(date);
    var min = startOfDay(addDays(new Date(), LEAD_DAYS));
    var max = startOfDay(new Date());
    max.setMonth(max.getMonth() + HORIZON_MONTHS);
    if (day < min || day > max) return false;
    return OPEN_DAYS.indexOf(day.getDay()) !== -1;
  }

  /* Hawaii local -> UTC, for the calendar links. */
  function utcStamp(dateStr, timeStr, addHours) {
    var d = fromYmd(dateStr);
    var hm = timeStr.split(":");
    var ms = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(),
      +hm[0] - TZ_OFFSET + (addHours || 0), +hm[1]);
    return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  function isoLocal(dateStr, timeStr, addHours) {
    var hm = timeStr.split(":");
    var h = String(+hm[0] + (addHours || 0)).padStart(2, "0");
    return dateStr + "T" + h + ":" + hm[1] + ":00-10:00";
  }

  /* ---------------------------------------------------------------- cart -- */
  function readCart() {
    try {
      var v = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    paintBadge();
  }
  function itemTotal(item) {
    var svc = SERVICES[item.serviceId];
    if (!svc) return 0;
    return svc.price + (svc.addOns || []).reduce(function (s, a) {
      return s + (item.addOns && item.addOns[a.id] ? a.price : 0);
    }, 0);
  }
  function cartTotal(items) {
    return items.reduce(function (s, i) { return s + itemTotal(i); }, 0);
  }
  function paintBadge() {
    var n = readCart().length;
    $$("[data-cart-count]").forEach(function (node) {
      node.textContent = String(n);
      node.toggleAttribute("hidden", n === 0);
    });
    $$("[data-cart-label]").forEach(function (node) {
      node.textContent = n === 0 ? "Your cart is empty"
        : n === 1 ? "1 booking in your cart" : n + " bookings in your cart";
    });
  }

  /* ------------------------------------------------------------ calendar -- */
  function buildCalendar(mount, state, onPick) {
    mount.textContent = "";

    var head = el("div", "flex items-center justify-between gap-2 pb-4");
    function arrow(dir) {
      var b = el("button", "grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:border-brand-500 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40 disabled:cursor-not-allowed disabled:opacity-30");
      b.type = "button";
      b.innerHTML = '<span class="sr-only">' + (dir < 0 ? "Previous" : "Next") + ' month</span>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="' +
        (dir < 0 ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6") + '"/></svg>';
      return b;
    }
    var prev = arrow(-1), next = arrow(1);
    var title = el("p", "text-base font-bold text-ink",
      state.view.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    title.id = "calendar-month";
    head.appendChild(prev); head.appendChild(title); head.appendChild(next);
    mount.appendChild(head);

    var first = startOfDay(new Date()); first.setDate(1);
    var last = startOfDay(new Date()); last.setMonth(last.getMonth() + HORIZON_MONTHS); last.setDate(1);
    prev.disabled = state.view <= first;
    next.disabled = state.view >= last;
    prev.addEventListener("click", function () {
      state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1);
      buildCalendar(mount, state, onPick);
    });
    next.addEventListener("click", function () {
      state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1);
      buildCalendar(mount, state, onPick);
    });

    var grid = el("div", "grid grid-cols-7 gap-1");
    ["Su","Mo","Tu","We","Th","Fr","Sa"].forEach(function (d) {
      grid.appendChild(el("div", "grid h-9 place-items-center text-xs font-bold uppercase tracking-wide text-ink-muted", d));
    });

    var y = state.view.getFullYear(), m = state.view.getMonth();
    var offset = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    for (var i = 0; i < offset; i++) grid.appendChild(el("div", "h-11"));

    for (var day = 1; day <= days; day++) {
      var date = new Date(y, m, day);
      var key = ymd(date);
      var past = startOfDay(date) < startOfDay(new Date());
      var open = isBookable(date);
      var selected = state.date === key;

      var cell = el("button", "", String(day));
      cell.type = "button";
      // Open days get the circle, exactly like the live calendar. Other future
      // days stay clickable — selecting one explains that it has no times,
      // rather than silently doing nothing.
      // Square box centred in the grid cell, so the marker reads as a circle
      // rather than a pill — the grid columns are wider than a day is tall.
      cell.className = "mx-auto grid h-11 w-11 place-items-center rounded-full text-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40 " +
        (selected ? "bg-brand-700 font-bold text-white shadow-glow"
          : open ? "border border-brand-300 font-bold text-ink hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-surface-3"
          : past ? "text-ink-muted/30 cursor-not-allowed"
          : "text-ink-muted hover:bg-surface-2");
      cell.disabled = past;
      cell.setAttribute("aria-pressed", String(selected));
      cell.setAttribute("aria-label",
        date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) +
        (past ? " — in the past" : open ? "" : " — no available times"));
      if (!past) {
        (function (k) { cell.addEventListener("click", function () { onPick(k); }); })(key);
      }
      grid.appendChild(cell);
    }
    mount.appendChild(grid);
  }

  /* ----------------------------------------------------------- book page -- */
  /* Which service is being booked. The query string is the primary carrier,
     but hosts that serve clean URLs redirect book.html?service=x to /book and
     drop it — so the hash and a session note written when the link was clicked
     both stand in. */
  function resolveService() {
    var id = new URLSearchParams(location.search).get("service");
    if (SERVICES[id]) return id;
    id = location.hash.replace(/^#/, "");
    if (SERVICES[id]) return id;
    try {
      id = sessionStorage.getItem(SERVICE_KEY);
      if (SERVICES[id]) return id;
    } catch (e) {}
    return "senior";
  }

  function initBookPage() {
    if (!$("[data-book-page]")) return;

    var id = resolveService();
    var svc = SERVICES[id];

    var state = { date: "", time: "", view: startOfDay(new Date()), addOns: {} };
    state.view.setDate(1);

    /* --- static service detail (both steps share it) --- */
    $$("[data-svc-name]").forEach(function (n) { n.textContent = svc.name; });
    $$("[data-svc-duration]").forEach(function (n) { n.textContent = svc.duration; });
    $$("[data-svc-price]").forEach(function (n) { n.textContent = priceLabel(svc.price); });
    $$("[data-svc-staff]").forEach(function (n) { n.textContent = svc.staff; });
    $$("[data-svc-headline]").forEach(function (n) { n.textContent = svc.headline; });
    $$("[data-svc-intro]").forEach(function (n) { n.textContent = svc.intro; });
    $$("[data-svc-note]").forEach(function (n) { n.textContent = svc.note; });
    var img = $("[data-svc-image]");
    if (img) { img.src = svc.image; img.alt = svc.imageAlt; }

    var expect = $("[data-svc-expect]");
    if (expect) {
      expect.textContent = "";
      EXPECT.forEach(function (t) {
        var li = el("li", "flex gap-2.5 leading-relaxed");
        var dot = el("span", "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600 dark:bg-accent-400");
        dot.setAttribute("aria-hidden", "true");
        li.appendChild(dot);
        li.appendChild(el("span", "", t));
        expect.appendChild(li);
      });
    }

    var other = $("[data-svc-other]");
    if (other) {
      var o = SERVICES[id === "senior" ? "community" : "senior"];
      other.href = "book.html?service=" + o.id;
      other.textContent = "Booking for a different venue? Switch to " + o.categoryLabel.toLowerCase();
    }

    /* --- step machinery --- */
    var step1 = $("[data-step-when]");
    var step2 = $("[data-step-where]");
    function showStep(n) {
      step1.toggleAttribute("hidden", n !== 1);
      step2.toggleAttribute("hidden", n !== 2);
      $$("[data-step-marker]").forEach(function (m) {
        m.setAttribute("aria-current", m.getAttribute("data-step-marker") === String(n) ? "step" : "false");
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /* --- timezone + slots --- */
    var tz = $("[data-tz]");
    if (tz) tz.textContent = TZ_LABEL;
    var slotWrap = $("[data-slot-panel]");
    var slotMount = $("[data-slots]");
    var slotEmpty = $("[data-slot-empty]");
    var slotHint = $("[data-slot-hint]");
    var continueBtn = $("[data-continue]");

    function paintSlots() {
      var chosen = state.date;
      var open = chosen && isBookable(fromYmd(chosen));
      if (slotHint) slotHint.toggleAttribute("hidden", !!chosen);
      if (slotWrap) slotWrap.toggleAttribute("hidden", !chosen || !open);
      if (slotEmpty) slotEmpty.toggleAttribute("hidden", !chosen || open);
      if (!open) { if (continueBtn) continueBtn.disabled = true; return; }

      slotMount.textContent = "";
      var periods = [];
      SLOTS.forEach(function (s) { if (periods.indexOf(s.period) === -1) periods.push(s.period); });
      periods.forEach(function (p) {
        slotMount.appendChild(el("p", "mt-4 text-center text-sm font-bold text-ink first:mt-0", p));
        var row = el("div", "mt-3 flex flex-wrap justify-center gap-3");
        SLOTS.filter(function (s) { return s.period === p; }).forEach(function (s) {
          var b = el("button", "", s.label);
          b.type = "button";
          var on = state.time === s.value;
          b.className = "min-w-32 rounded-xl border-2 px-6 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40 " +
            (on ? "border-brand-700 bg-brand-700 text-white shadow-glow"
                : "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-700");
          b.setAttribute("aria-pressed", String(on));
          b.addEventListener("click", function () {
            state.time = s.value;
            paintSlots();
          });
          row.appendChild(b);
        });
        slotMount.appendChild(row);
      });
      if (continueBtn) continueBtn.disabled = !state.time;
    }

    var calMount = $("[data-calendar]");
    function onPickDate(key) {
      state.date = key;
      state.time = "";
      buildCalendar(calMount, state, onPickDate);
      paintSlots();
    }
    if (calMount) buildCalendar(calMount, state, onPickDate);

    /* --- add-ons (community service only, as on the live site) --- */
    var addOnBlock = $("[data-addon-block]");
    if (addOnBlock) {
      if (!svc.addOns.length) {
        addOnBlock.hidden = true;
      } else {
        var mount = $("[data-addons]", addOnBlock);
        mount.textContent = "";
        svc.addOns.forEach(function (a) {
          state.addOns[a.id] = false;
          var wrap = el("label", "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-500");
          var left = el("span", "flex items-center gap-3");
          var box = document.createElement("input");
          box.type = "checkbox";
          box.className = "h-5 w-5 shrink-0 rounded border-line text-brand-700 focus:ring-4 focus:ring-ring-brand/30";
          box.addEventListener("change", function () { state.addOns[a.id] = box.checked; });
          left.appendChild(box);
          left.appendChild(el("span", "font-bold text-ink", a.label));
          wrap.appendChild(left);
          wrap.appendChild(el("span", "shrink-0 font-bold text-accent-700 dark:text-accent-400", money(a.price)));
          mount.appendChild(wrap);
        });
      }
    }

    /* --- step 1 -> 2 --- */
    if (continueBtn) {
      continueBtn.addEventListener("click", function () {
        if (!state.date || !state.time) return;
        $$("[data-chosen-slot]").forEach(function (n) {
          n.textContent = longDate(state.date) + ", " + timeLabel(state.time);
        });
        showStep(2);
      });
    }
    var modify = $("[data-modify]");
    if (modify) modify.addEventListener("click", function () { showStep(1); });

    /* --- state dropdown --- */
    var stateSel = $("#state");
    if (stateSel) {
      STATES.forEach(function (s) {
        var o = document.createElement("option");
        o.textContent = s;
        if (s === "Hawaii") o.selected = true;
        stateSel.appendChild(o);
      });
    }

    /* --- step 2: BOOK -> add to cart -> open drawer --- */
    var form = $("[data-location-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        var d = new FormData(form);
        var items = readCart();
        items.push({
          id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          serviceId: svc.id,
          date: state.date,
          time: state.time,
          addOns: JSON.parse(JSON.stringify(state.addOns)),
          address1: d.get("address1") || "",
          address2: d.get("address2") || "",
          city: d.get("city") || "",
          state: d.get("state") || "",
          zip: d.get("zip") || ""
        });
        writeCart(items);
        openDrawer();
      });
    }
  }

  /* -------------------------------------------------------- cart drawer -- */
  var drawer, drawerBody, lastFocus;

  function addressLine(i) {
    return [i.address1, i.address2, i.city, (i.state || "") + " " + (i.zip || "")]
      .map(function (s) { return (s || "").trim(); })
      .filter(Boolean)
      .join(", ");
  }

  function buildDrawer() {
    if (drawer) return;
    drawer = el("div", "fixed inset-0 z-[90]");
    drawer.setAttribute("data-cart-drawer", "");
    drawer.hidden = true;
    drawer.innerHTML =
      '<div data-drawer-backdrop class="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"></div>' +
      '<aside role="dialog" aria-modal="true" aria-label="Your cart" ' +
      'class="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface shadow-hero">' +
      '<div class="flex items-center justify-between gap-4 border-b border-line px-5 py-4">' +
      '<p class="font-display text-xl text-ink">Your cart</p>' +
      '<button type="button" data-drawer-close class="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:border-brand-500 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40">' +
      '<span class="sr-only">Close cart</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="h-5 w-5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button></div>' +
      '<div data-drawer-body class="flex-1 overflow-y-auto px-5 py-6"></div>' +
      "</aside>";
    document.body.appendChild(drawer);
    drawerBody = $("[data-drawer-body]", drawer);

    $("[data-drawer-backdrop]", drawer).addEventListener("click", closeDrawer);
    $("[data-drawer-close]", drawer).addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !drawer.hidden) closeDrawer();
      if (e.key !== "Tab" || drawer.hidden) return;
      var f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea', drawer)
        .filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }

  function openDrawer() {
    buildDrawer();
    renderCart();
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add("overflow-hidden");
    var f = $("button, input", drawer);
    if (f) f.focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.hidden = true;
    document.documentElement.classList.remove("overflow-hidden");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderCart() {
    var items = readCart();
    drawerBody.textContent = "";

    if (!items.length) {
      var empty = el("div", "py-10 text-center");
      var icon = el("div", "mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-ink-muted");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>';
      empty.appendChild(icon);
      empty.appendChild(el("h3", "mt-6 font-display text-xl text-ink", "Cart is empty"));
      empty.appendChild(el("p", "mx-auto mt-3 max-w-xs leading-relaxed text-ink-muted",
        "Looks like you just haven't found the right thing yet."));
      var browse = el("a", "mt-7 inline-flex items-center justify-center rounded-full bg-brand-700 px-7 py-3.5 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300", "Browse services");
      browse.href = "for-kupuna.html#book";
      empty.appendChild(browse);
      drawerBody.appendChild(empty);
      return;
    }

    /* --- booked items --- */
    items.forEach(function (i) {
      var svc = SERVICES[i.serviceId];
      if (!svc) return;
      var row = el("div", "flex gap-3 border-b border-line pb-5");
      var thumb = el("img", "h-16 w-16 shrink-0 rounded-xl object-cover");
      thumb.src = svc.image; thumb.alt = ""; thumb.setAttribute("aria-hidden", "true"); thumb.loading = "lazy";
      row.appendChild(thumb);

      var mid = el("div", "min-w-0 flex-1");
      mid.appendChild(el("p", "text-sm font-bold leading-snug text-ink", svc.name));
      mid.appendChild(el("p", "mt-1 text-sm text-ink-muted", svc.staff));
      mid.appendChild(el("p", "text-sm text-ink-muted", shortDate(i.date) + ", " + timeLabel(i.time)));
      if (addressLine(i)) mid.appendChild(el("p", "mt-1 text-xs leading-relaxed text-ink-muted", addressLine(i)));
      (svc.addOns || []).forEach(function (a) {
        if (i.addOns && i.addOns[a.id]) {
          mid.appendChild(el("p", "mt-1 text-xs font-bold text-accent-700 dark:text-accent-400",
            "+ " + a.label + " " + money(a.price)));
        }
      });
      row.appendChild(mid);

      var right = el("div", "flex shrink-0 flex-col items-end gap-3");
      right.appendChild(el("p", "text-sm font-bold uppercase text-ink", priceLabel(itemTotal(i))));
      var del = el("button", "grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-surface-2 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40");
      del.type = "button";
      del.innerHTML = '<span class="sr-only">Remove this booking</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
      del.addEventListener("click", function () {
        writeCart(readCart().filter(function (x) { return x.id !== i.id; }));
        renderCart();
      });
      right.appendChild(del);
      row.appendChild(right);
      drawerBody.appendChild(row);
    });

    /* --- coupon --- */
    var coupon = el("div", "border-b border-line py-5");
    coupon.appendChild(el("p", "text-sm font-bold text-ink", "Have a coupon code?"));
    var cRow = el("div", "mt-3 flex gap-2");
    var cInput = document.createElement("input");
    cInput.type = "text";
    cInput.placeholder = "Enter Code";
    cInput.className = "min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-ring-brand/25";
    cInput.setAttribute("aria-label", "Coupon code");
    var cBtn = el("button", "shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-surface-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40 dark:text-brand-300", "Apply");
    cBtn.type = "button";
    var cMsg = el("p", "mt-2 text-sm text-ink-muted");
    cMsg.hidden = true;
    cBtn.addEventListener("click", function () {
      cMsg.hidden = false;
      cMsg.textContent = cInput.value.trim()
        ? "That code isn't recognised. Sessions are already free — codes only apply to add-ons."
        : "Enter a code first.";
    });
    cRow.appendChild(cInput); cRow.appendChild(cBtn);
    coupon.appendChild(cRow); coupon.appendChild(cMsg);
    drawerBody.appendChild(coupon);

    /* --- totals --- */
    var total = cartTotal(items);
    var tot = el("dl", "space-y-2 border-b border-line py-5 text-sm");
    function line(label, value, strong) {
      var d = el("div", "flex justify-between gap-4");
      d.appendChild(el("dt", strong ? "font-bold text-ink" : "text-ink-muted", label));
      d.appendChild(el("dd", strong ? "font-bold text-ink" : "text-ink-muted", value));
      tot.appendChild(d);
    }
    line("Subtotal", money(total));
    line("Total", money(total));
    line("Due now", money(0), true);
    drawerBody.appendChild(tot);
    if (total > 0) {
      drawerBody.appendChild(el("p", "pt-3 text-xs leading-relaxed text-ink-muted",
        "Nothing is charged on this site. Add-ons are invoiced by Kaulike Academy once your booking is confirmed."));
    }

    /* --- details form --- */
    var form = document.createElement("form");
    form.className = "pt-6";
    form.noValidate = false;
    form.innerHTML =
      '<h3 class="text-base font-bold text-ink">Add your details</h3>' +
      '<div class="mt-4 grid grid-cols-2 gap-3">' +
      field("firstName", "First Name", "text", true, "given-name") +
      field("lastName", "Last Name", "text", true, "family-name") +
      "</div>" +
      '<div class="mt-3">' + field("email", "Email", "email", true, "email") + "</div>" +
      '<div class="mt-3">' + field("phone", "Phone Number", "tel", false, "tel") + "</div>" +
      '<h3 class="mt-7 text-base font-bold text-ink">Additional questions</h3>' +
      '<label for="tst-questions" class="mt-2 block text-sm leading-relaxed text-ink-muted">If you have any questions, please add them here and we will email you shortly. Mahalo. <span class="text-accent-700 dark:text-accent-400">*</span></label>' +
      '<textarea id="tst-questions" name="questions" rows="4" required class="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-ring-brand/25"></textarea>' +
      '<button type="submit" class="mt-6 w-full rounded-full bg-brand-700 px-6 py-4 text-base font-bold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300">Confirm Booking</button>' +
      '<p class="mt-3 text-center text-xs leading-relaxed text-ink-muted">Confirming opens your email app with the request ready to send to ' + EMAIL + '. A coordinator replies within 3 business days.</p>' +
      '<a href="for-kupuna.html#book" class="mt-4 block text-center text-sm font-bold text-brand-700 underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40 dark:text-brand-300">Book More Services</a>';

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      confirmBooking(new FormData(form), items);
    });
    drawerBody.appendChild(form);
  }

  function field(name, label, type, required, autocomplete) {
    return '<div>' +
      '<label for="tst-' + name + '" class="block text-xs font-bold text-ink">' + label +
      (required ? ' <span class="text-accent-700 dark:text-accent-400">*</span>' : "") + "</label>" +
      '<input id="tst-' + name + '" name="' + name + '" type="' + type + '"' +
      (required ? " required" : "") + ' autocomplete="' + autocomplete + '" ' +
      'class="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-ring-brand/25">' +
      "</div>";
  }

  /* ------------------------------------------------------------ confirm -- */
  function orderId() {
    var hex = "";
    for (var i = 0; i < 16; i++) hex += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
    return "C-" + hex;
  }

  function confirmBooking(data, items) {
    var ref = orderId();
    var lines = items.map(function (i, n) {
      var svc = SERVICES[i.serviceId];
      var extras = (svc.addOns || []).filter(function (a) { return i.addOns && i.addOns[a.id]; })
        .map(function (a) { return "    Add-on: " + a.label + " " + money(a.price); }).join("\n");
      return "Booking " + (n + 1) + "\n" +
        "    Service: " + svc.name + "\n" +
        "    Staff member: " + svc.staff + "\n" +
        "    Time: " + longDate(i.date) + ", " + timeLabel(i.time) + " HST (" + svc.duration + ")\n" +
        "    Location: " + addressLine(i) + "\n" +
        (extras ? extras + "\n" : "") +
        "    Subtotal: " + priceLabel(itemTotal(i));
    }).join("\n\n");

    var body = "BOOKING REQUEST " + ref + "\n\n" +
      "Name: " + (data.get("firstName") || "") + " " + (data.get("lastName") || "") + "\n" +
      "Email: " + (data.get("email") || "") + "\n" +
      "Phone: " + (data.get("phone") || "—") + "\n" +
      "Questions: " + (data.get("questions") || "—") + "\n\n" +
      lines + "\n\nTotal: " + priceLabel(cartTotal(items)) + "\nDue now: " + money(0) + "\n";

    // A real anchor click hands the request to the mail client without
    // unloading the page, so the thank-you panel below still renders.
    var a = document.createElement("a");
    a.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Booking request " + ref) +
      "&body=" + encodeURIComponent(body);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    writeCart([]);
    renderThankYou(ref, items, data);
  }

  function calendarLinks(item) {
    var svc = SERVICES[item.serviceId];
    var title = "Tech Savvy Teens — " + svc.name;
    var loc = addressLine(item);
    var details = svc.headline + ". Staff member: " + svc.staff + ".";
    var g = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(title) +
      "&dates=" + utcStamp(item.date, item.time, 0) + "/" + utcStamp(item.date, item.time, svc.hours) +
      "&details=" + encodeURIComponent(details) +
      "&location=" + encodeURIComponent(loc);
    var o = "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
      "&subject=" + encodeURIComponent(title) +
      "&startdt=" + encodeURIComponent(isoLocal(item.date, item.time, 0)) +
      "&enddt=" + encodeURIComponent(isoLocal(item.date, item.time, svc.hours)) +
      "&body=" + encodeURIComponent(details) +
      "&location=" + encodeURIComponent(loc);
    return { google: g, outlook: o };
  }

  function renderThankYou(ref, items, data) {
    drawerBody.textContent = "";
    var wrap = el("div", "text-center");

    var tick = el("div", "mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400");
    tick.setAttribute("aria-hidden", "true");
    tick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8"><path d="M20 6L9 17l-5-5"/></svg>';
    wrap.appendChild(tick);

    wrap.appendChild(el("h3", "mt-5 font-display text-2xl text-ink", "Thank you!"));
    wrap.appendChild(el("p", "mt-4 text-sm text-ink-muted", "Order ID: " + ref));
    wrap.appendChild(el("p", "mt-3 text-sm leading-relaxed text-ink-muted",
      "Send the email your mail app just opened and a coordinator will confirm within 3 business days."));
    wrap.appendChild(el("p", "mt-6 text-sm font-bold text-ink",
      items.length === 1 ? "1 Booking" : items.length + " Bookings"));

    items.forEach(function (i) {
      var svc = SERVICES[i.serviceId];
      var card = el("div", "mt-4 rounded-2xl border border-line p-5 text-left");
      card.appendChild(el("p", "text-sm font-bold leading-snug text-ink", svc.name));
      var dl = el("dl", "mt-4 space-y-2.5 text-sm");
      function row(k, v) {
        var d = el("div", "flex justify-between gap-4");
        d.appendChild(el("dt", "shrink-0 text-ink-muted", k));
        d.appendChild(el("dd", "text-right font-bold text-ink", v));
        dl.appendChild(d);
      }
      row("Staff Member", svc.staff);
      row("Time", shortDate(i.date) + ", " + timeLabel(i.time) + " HST");
      row("Location", addressLine(i) || "—");
      card.appendChild(dl);

      var links = calendarLinks(i);
      card.appendChild(el("p", "mt-5 text-sm text-ink-muted", "Add to Calendar"));
      var row2 = el("div", "mt-2 flex gap-3");
      [["Google", links.google], ["Outlook", links.outlook]].forEach(function (p) {
        var a = el("a", "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-brand-500 hover:text-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40", p[0]);
        a.href = p[1];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        row2.appendChild(a);
      });
      card.appendChild(row2);
      wrap.appendChild(card);
    });

    var close = el("button", "mt-8 w-full rounded-full bg-ink px-6 py-4 text-base font-bold text-surface transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring-brand/40", "Close Cart");
    close.type = "button";
    close.addEventListener("click", closeDrawer);
    wrap.appendChild(close);

    drawerBody.appendChild(wrap);
  }

  /* --------------------------------------------------------------- boot -- */
  function boot() {
    paintBadge();
    $$("[data-cart-open]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        openDrawer();
      });
    });

    // Remember which service was clicked, so book.html still knows even if the
    // host strips the query string on its way there.
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href*="book.html?service="]');
      if (!a) return;
      var m = a.getAttribute("href").match(/service=([a-z]+)/);
      if (m && SERVICES[m[1]]) {
        try { sessionStorage.setItem(SERVICE_KEY, m[1]); } catch (err) {}
      }
    });

    initBookPage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
