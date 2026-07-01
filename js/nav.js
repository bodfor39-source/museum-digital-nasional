/**
 * nav.js — Navigasi: navbar, hamburger menu, scroll behavior, page transitions
 * Museum Digital Nasional Indonesia
 */

const Nav = (() => {
  let navbar, navLinks, hamburger, navMenu, pageVeil;
  let isMenuOpen = false;

  function init() {
    navbar = document.getElementById("navbar");
    navLinks = document.querySelectorAll(".nav-link");
    hamburger = document.getElementById("hamburger");
    navMenu = document.getElementById("nav-menu");
    pageVeil = document.getElementById("page-veil");

    if (!navbar) return;

    setupScrollBehavior();
    setupHamburger();
    setupNavLinks();
    setupLinkInterceptor(); // Interseptor klik
    setupKeyboardNav();
    
    // Log page view globally if Auth is loaded
    setTimeout(() => {
      if (window.Auth && window.Auth.logActivity) {
        window.Auth.logActivity("navigasi", `Membuka halaman ${document.title}`);
      }
    }, 1500); // Tunda sedikit agar Auth init selesai terlebih dahulu
  }

  // Navbar: transparan saat di atas, solid saat scroll
  function setupScrollBehavior() {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 80) {
        navbar.classList.add("navbar--scrolled");
      } else {
        navbar.classList.remove("navbar--scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // run once on init
  }

  // Hamburger menu untuk mobile
  function setupHamburger() {
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener("click", () => {
      toggleMenu(!isMenuOpen);
    });

    // Tutup menu saat klik di luar
    document.addEventListener("click", (e) => {
      if (isMenuOpen && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        toggleMenu(false);
      }
    });
  }

  function toggleMenu(open) {
    isMenuOpen = open;
    hamburger.setAttribute("aria-expanded", String(open));
    navMenu.classList.toggle("nav-menu--open", open);
    hamburger.classList.toggle("hamburger--active", open);
    document.body.classList.toggle("body--menu-open", open);
  }

  // Smooth scroll & page veil transition saat klik nav link
  function setupNavLinks() {
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");

        // Hanya jika href adalah anchor dalam halaman
        if (href && href.startsWith("#")) {
          e.preventDefault();
          const targetId = href.slice(1);
          const targetEl = document.getElementById(targetId);

          // Tutup menu mobile jika terbuka
          if (isMenuOpen) toggleMenu(false);

          // Update active state
          navLinks.forEach((l) => l.classList.remove("nav-link--active"));
          link.classList.add("nav-link--active");

          if (targetEl) {
            scrollToSection(targetEl);
          }
        }
      });
    });
  }

  function scrollToSection(el) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      el.scrollIntoView();
    } else {
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const targetY = el.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({
        top: targetY,
        behavior: "smooth",
      });
    }
  }

  // Intercept all links to guarantee activity logging before navigation
  function setupLinkInterceptor() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;
      
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || link.target === "_blank") return;

      if (window.Auth && window.Auth.logActivity) {
        e.preventDefault();
        window.Auth.logActivity("navigasi", `Beralih ke: ${href}`);
        setTimeout(() => {
          window.location.href = href;
        }, 150); // Beri waktu 150ms agar LocalStorage tersimpan sempurna
      }
    });
  }

  // Page veil animation — dipakai oleh modul lain
  function triggerVeil(callback) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!pageVeil || prefersReducedMotion) {
      if (typeof callback === "function") callback();
      return;
    }

    pageVeil.classList.add("page-veil--active");

    setTimeout(() => {
      if (typeof callback === "function") callback();
      pageVeil.classList.remove("page-veil--active");
    }, 350);
  }

  // Keyboard navigation
  function setupKeyboardNav() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isMenuOpen) {
        toggleMenu(false);
        hamburger.focus();
      }
    });
  }

  // Intersection observer untuk update active nav link saat scroll
  function setupSectionObserver() {
    const sections = document.querySelectorAll("section[id]");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((link) => {
              const isActive = link.getAttribute("href") === `#${id}`;
              link.classList.toggle("nav-link--active", isActive);
            });
          }
        });
      },
      {
        rootMargin: `-${(navbar?.offsetHeight || 80) + 20}px 0px -60% 0px`,
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  return { init, triggerVeil, scrollToSection, setupSectionObserver };
})();

window.Nav = Nav;
