/* Tech Savvy Teens — shared behaviour.
   Progressive enhancement only: every page is fully readable and navigable
   with this file blocked. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------ theme ---- */
  function initTheme() {
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    if (!toggles.length) return;

    function current() {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }

    function sync() {
      var isDark = current() === "dark";
      toggles.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(isDark));
        btn.setAttribute(
          "aria-label",
          isDark ? "Switch to light theme" : "Switch to dark theme"
        );
      });
    }

    function apply(mode) {
      document.documentElement.classList.toggle("dark", mode === "dark");
      try {
        localStorage.setItem("tst-theme", mode);
      } catch (e) {
        /* storage blocked — the toggle still works for this page view */
      }
      sync();
    }

    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        apply(current() === "dark" ? "light" : "dark");
      });
    });

    // Follow the OS until the visitor makes an explicit choice.
    var os = window.matchMedia("(prefers-color-scheme: dark)");
    var onOsChange = function (e) {
      var stored = null;
      try {
        stored = localStorage.getItem("tst-theme");
      } catch (err) {
        /* ignore */
      }
      if (!stored) {
        document.documentElement.classList.toggle("dark", e.matches);
        sync();
      }
    };
    if (os.addEventListener) os.addEventListener("change", onOsChange);
    else if (os.addListener) os.addListener(onOsChange);

    sync();
  }

  /* --------------------------------------------------- scroll reveal ----- */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.setAttribute("data-revealed", "");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
          window.setTimeout(function () {
            el.setAttribute("data-revealed", "");
          }, delay);
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------------------------------- counters ------ */
  function initCounters() {
    var counters = document.querySelectorAll("[data-count-to]");
    if (!counters.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count-to"));
      if (isNaN(target)) return;
      var format = new Intl.NumberFormat("en-US");

      if (reduceMotion.matches) {
        el.textContent = format.format(target);
        return;
      }

      var duration = 1800;
      var start = null;
      function tick(now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / duration, 1);
        // easeOutExpo — fast start, gentle landing
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = format.format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          run(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------------------------------ mobile nav ----- */
  function initNav() {
    var btn = document.querySelector("[data-nav-toggle]");
    var panel = document.getElementById("mobile-nav");
    if (!btn || !panel) return;

    function isOpen() {
      return btn.getAttribute("aria-expanded") === "true";
    }

    function open() {
      btn.setAttribute("aria-expanded", "true");
      panel.removeAttribute("hidden");
      document.documentElement.classList.add("overflow-hidden");
      var first = panel.querySelector("a, button");
      if (first) first.focus();
    }

    // Standard disclosure behaviour: dismissing the menu always returns focus to
    // the control that opened it. `restore: false` is for cases where focus is
    // already heading somewhere else (following a link, resizing to desktop).
    function close(restore) {
      btn.setAttribute("aria-expanded", "false");
      panel.setAttribute("hidden", "");
      document.documentElement.classList.remove("overflow-hidden");
      if (restore !== false) btn.focus();
    }

    btn.addEventListener("click", function () {
      isOpen() ? close() : open();
    });

    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) close(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close();
      if (e.key !== "Tab" || !isOpen()) return;

      // Keep keyboard focus inside the open menu.
      var f = panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // A resize into the desktop breakpoint should not leave a trapped menu.
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024 && isOpen()) close(false);
    });
  }

  /* ---------------------------------------------------- sticky header ---- */
  function initHeader() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var ticking = false;

    function update() {
      var scrolled = window.scrollY > 12;
      header.toggleAttribute("data-scrolled", scrolled);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------ back to top ---- */
  function initBackToTop() {
    var btn = document.querySelector("[data-back-to-top]");
    if (!btn) return;
    var ticking = false;

    function update() {
      btn.toggleAttribute("data-visible", window.scrollY > 600);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    btn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? "auto" : "smooth"
      });
      var skip = document.querySelector("[data-top-anchor]");
      if (skip) skip.focus();
    });
    update();
  }

  /* ---------------------------------------------------------- marquee ---- */
  // The animation lives on the wrapper and shifts it by -50%, so for a seamless
  // loop the wrapper must hold an EVEN number of identical copies: half of them
  // scroll past while the other half take their place.
  //
  // Two copies is not always enough. Half the copies have to be at least as wide
  // as the viewport, or the strip runs dry on the right mid-scroll (the sponsor
  // logos are ~925px against a ~1900px screen). So size the run to the viewport.
  function fillMarquee(track) {
    var wrapper = track.parentNode;
    var viewport = wrapper.parentNode;
    var copyWidth = track.getBoundingClientRect().width;
    if (!copyWidth) return;

    var viewportWidth = viewport.getBoundingClientRect().width;
    // +1 copy of headroom so a resize doesn't immediately expose a gap
    var perHalf = Math.ceil(viewportWidth / copyWidth) + 1;
    var wanted = perHalf * 2;
    var have = wrapper.children.length;

    for (var i = have; i < wanted; i++) {
      var clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("data-marquee");
      wrapper.appendChild(clone);
    }
  }

  function initMarquee() {
    var tracks = document.querySelectorAll("[data-marquee]");
    if (!tracks.length || reduceMotion.matches) return;

    tracks.forEach(fillMarquee);

    // Widening the window can outrun the copies we made; top them up.
    var timer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        tracks.forEach(fillMarquee);
      }, 200);
    });
  }

  /* ------------------------------------------------------ video facade --- */
  // Swap the poster for the real player only once the visitor asks for it.
  // Embeds from youtube.com (not youtube-nocookie.com, which returned
  // "Error 153 — video player configuration error" for this video).
  function initVideo() {
    document.querySelectorAll("[data-video-facade]").forEach(function (facade) {
      var btn = facade.querySelector("[data-video-play]");
      if (!btn) return;

      btn.addEventListener("click", function () {
        var id = facade.getAttribute("data-video-id");
        if (!id) return;

        var frame = document.createElement("iframe");
        frame.className = "absolute inset-0 h-full w-full";
        frame.src =
          "https://www.youtube.com/embed/" + encodeURIComponent(id) +
          "?rel=0&showinfo=0&controls=1&autoplay=1";
        frame.title = facade.getAttribute("data-video-title") || "Video";
        frame.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.allowFullscreen = true;
        frame.setAttribute("frameborder", "0");

        facade.textContent = "";
        facade.appendChild(frame);
        frame.focus();
      });
    });
  }

  /* --------------------------------------------- bookable services ------- */
  // Category tabs over the booking cards. Progressive enhancement: with JS off
  // every service is simply visible, which is the correct fallback.
  function initServiceFilter() {
    var buttons = document.querySelectorAll("[data-service-filter]");
    var list = document.querySelector("[data-service-list]");
    if (!buttons.length || !list) return;

    var cards = list.querySelectorAll("[data-service]");
    var empty = document.querySelector("[data-service-empty]");

    function apply(filter) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = filter === "all" || card.getAttribute("data-service") === filter;
        card.toggleAttribute("hidden", !match);
        if (match) shown++;
      });
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-service-filter") === filter));
      });
      if (empty) empty.toggleAttribute("hidden", shown > 0);
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        apply(b.getAttribute("data-service-filter"));
      });
    });
  }

  /* ------------------------------------------------------------- boot ---- */
  function boot() {
    initServiceFilter();
    initTheme();
    initReveal();
    initCounters();
    initNav();
    initHeader();
    initBackToTop();
    initMarquee();
    initVideo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
