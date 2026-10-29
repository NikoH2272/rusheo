(() => {
  gsap.registerPlugin(ScrollTrigger);

  gsap.defaults({ ease: "power3.out" });

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {

    // ── Hero entrance ─────────────────────────────────────────
    gsap.timeline()
      .from("#navbar",         { y: -60, autoAlpha: 0, duration: 0.5, ease: "power2.out" })
      .from(".hero-kicker",    { y: -24, autoAlpha: 0, duration: 0.55 }, 0.25)
      .from(".hero-title",     { y: 64,  autoAlpha: 0, duration: 0.75 }, 0.35)
      .from(".hero-desc",      { y: 32,  autoAlpha: 0, duration: 0.6  }, 0.55)
      .from(".hero-meta > *",  { y: 18,  autoAlpha: 0, stagger: 0.1, duration: 0.5 }, 0.7)
      .from(".hero-cta a",     { y: 18,  autoAlpha: 0, stagger: 0.15, duration: 0.5 }, 0.8)
      .from(".hero-mascot img",{ scale: 0.72, autoAlpha: 0, rotation: -10, duration: 1, ease: "back.out(1.3)" }, 0.3);

    // ── Stats strip ───────────────────────────────────────────
    gsap.from(".stat-item", {
      scrollTrigger: { trigger: "#stats", start: "top 85%" },
      y: 44, autoAlpha: 0, stagger: 0.1, duration: 0.55,
    });

    // ── Section heads (label + accent-line + title + sub) ─────
    gsap.utils.toArray(".section-head").forEach((el) => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 87%" },
      });

      const label = el.querySelector(".section-label");
      const line  = el.querySelector(".accent-line");
      const title = el.querySelector(".section-title");
      const sub   = el.querySelector(".section-sub, p");

      if (label) tl.from(label, { x: -20, autoAlpha: 0, duration: 0.45 });
      if (line)  tl.from(line,  { scaleX: 0, transformOrigin: "left center", duration: 0.4 }, "<0.15");
      if (title) tl.from(title, { y: 32, autoAlpha: 0, duration: 0.6 }, "<0.05");
      if (sub)   tl.from(sub,   { y: 20, autoAlpha: 0, duration: 0.5 }, "-=0.3");
    });

    // ── Rules blocks ──────────────────────────────────────────
    gsap.from(".rules-block", {
      scrollTrigger: { trigger: ".rules-grid", start: "top 88%" },
      y: 32, autoAlpha: 0, stagger: 0.15, duration: 0.6,
    });

    // ── Training banner ───────────────────────────────────────
    gsap.from(".train-banner", {
      scrollTrigger: { trigger: ".train-banner", start: "top 88%" },
      y: 30, autoAlpha: 0, duration: 0.65,
    });

    // ── Footer ────────────────────────────────────────────────
    gsap.from(".footer-brand, .footer-col", {
      scrollTrigger: { trigger: "#footer", start: "top 92%" },
      y: 20, autoAlpha: 0, stagger: 0.08, duration: 0.5, ease: "power2.out",
    });

  });
})();
