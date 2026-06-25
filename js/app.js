/* =============================================================
   CAPITAL VISION — Lógica de interactividad general
   Cursor (rAF + translate3d GPU), navegación, scroll reveals,
   modal con flujo de conversión vía WhatsApp.
   ============================================================= */

(() => {
    'use strict';

    /* -------------------------------------------------------------
       Constantes globales del negocio
       ------------------------------------------------------------- */
    // Número de WhatsApp Capital Vision (Guatemala — código de país 502)
    // Nota: el teléfono de llamada directa (tel:) es distinto — ver footer
    const WHATSAPP_NUMBER = '50258549829';

    /* -------------------------------------------------------------
       Utilidades
       ------------------------------------------------------------- */
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /**
     * Construye y abre el enlace de WhatsApp con mensaje codificado.
     * Centralizado para evitar duplicar lógica entre el modal y el form.
     */
    function openWhatsApp(message) {
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        // _blank en escritorio → nueva pestaña; en móvil → app de WhatsApp
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    /* -------------------------------------------------------------
       1. CURSOR PERSONALIZADO
          · Sigue el ratón con interpolación (lerp) suave.
          · requestAnimationFrame + translate3d para forzar capa GPU
            (60 FPS sin ghosting incluso bajo carga).
          · Se detiene automáticamente cuando ya alcanzó el destino,
            ahorrando ciclos cuando el ratón está quieto.
          · Oculto en táctiles (hidden lg:block desde HTML).
       ------------------------------------------------------------- */
    const ring = $('#cursor-ring');
    const dot = $('#cursor-dot');

    if (ring && dot && !isTouch) {
        let targetX = window.innerWidth / 2;
        let targetY = window.innerHeight / 2;
        let ringX = targetX, ringY = targetY;
        let dotX = targetX, dotY = targetY;
        let cursorRaf = null;

        // Factores de interpolación: más bajo = más arrastre/elasticidad
        const ringLerp = 0.2;
        const dotLerp = 0.6;
        const EPS = 0.1; // umbral para detener el bucle

        function animateCursor() {
            ringX += (targetX - ringX) * ringLerp;
            ringY += (targetY - ringY) * ringLerp;
            dotX += (targetX - dotX) * dotLerp;
            dotY += (targetY - dotY) * dotLerp;

            // translate3d activa aceleración por GPU (composite layer)
            ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;

            const dRing = Math.abs(targetX - ringX) + Math.abs(targetY - ringY);
            const dDot = Math.abs(targetX - dotX) + Math.abs(targetY - dotY);
            if (dRing < EPS && dDot < EPS) {
                cursorRaf = null; // dormir hasta el próximo mousemove
                return;
            }
            cursorRaf = requestAnimationFrame(animateCursor);
        }

        window.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            if (cursorRaf === null) {
                cursorRaf = requestAnimationFrame(animateCursor);
            }
        }, { passive: true });

        // Estados hover por atributo data-cursor (link/button/card/text)
        const hoverTargets = $$('[data-cursor]');
        hoverTargets.forEach(el => {
            const kind = el.dataset.cursor;
            el.addEventListener('mouseenter', () => {
                ring.classList.add(`is-hover-${kind}`);
                dot.classList.add(`is-hover-${kind}`);
            });
            el.addEventListener('mouseleave', () => {
                ring.classList.remove(`is-hover-${kind}`);
                dot.classList.remove(`is-hover-${kind}`);
            });
        });

        window.addEventListener('mousedown', () => ring.classList.add('is-active'));
        window.addEventListener('mouseup', () => ring.classList.remove('is-active'));

        window.addEventListener('mouseleave', () => {
            ring.style.opacity = '0';
            dot.style.opacity = '0';
        });
        window.addEventListener('mouseenter', () => {
            ring.style.opacity = '1';
            dot.style.opacity = '1';
        });
    }

    /* -------------------------------------------------------------
       2. NAVBAR — cambio de estilo al hacer scroll (rAF-throttled)
       ------------------------------------------------------------- */
    const navbar = $('#navbar');
    let navTicking = false;
    let navScrolled = false;

    function checkNav() {
        const shouldBeScrolled = window.scrollY > 30;
        if (shouldBeScrolled !== navScrolled) {
            navScrolled = shouldBeScrolled;
            navbar?.classList.toggle('is-scrolled', shouldBeScrolled);
        }
        navTicking = false;
    }
    checkNav();
    window.addEventListener('scroll', () => {
        if (!navTicking) {
            requestAnimationFrame(checkNav);
            navTicking = true;
        }
    }, { passive: true });

    // Menú móvil
    const menuToggle = $('#menu-toggle');
    const mobileMenu = $('#mobile-menu');

    menuToggle?.addEventListener('click', () => {
        mobileMenu?.classList.toggle('hidden');
    });

    $$('.mobile-link').forEach(a => {
        a.addEventListener('click', () => mobileMenu?.classList.add('hidden'));
    });

    /* -------------------------------------------------------------
       3. REVEAL ON SCROLL (IntersectionObserver)
       ------------------------------------------------------------- */
    const revealEls = $$('.reveal');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => entry.target.classList.add('is-visible'), delay);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        revealEls.forEach(el => io.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('is-visible'));
    }

    /* -------------------------------------------------------------
       4. Glow que sigue al cursor en cards de servicios (rAF-throttled)
       ------------------------------------------------------------- */
    $$('.service-card').forEach(card => {
        let cardTicking = false;
        let mx = 0, my = 0;
        const apply = () => {
            card.style.setProperty('--mx', `${mx}%`);
            card.style.setProperty('--my', `${my}%`);
            cardTicking = false;
        };
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            mx = ((e.clientX - rect.left) / rect.width) * 100;
            my = ((e.clientY - rect.top) / rect.height) * 100;
            if (!cardTicking) {
                requestAnimationFrame(apply);
                cardTicking = true;
            }
        }, { passive: true });
    });

    /* -------------------------------------------------------------
       5. SCROLL SUAVE para anclas internas
       ------------------------------------------------------------- */
    $$('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const target = document.querySelector(targetId);
            if (!target) return;
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    /* -------------------------------------------------------------
       6. BOTONES DE PLAN → Redirect DIRECTO a WhatsApp
          · Sin modal, sin pedir número del cliente.
          · Mensaje predeterminado según el plan elegido.
       ------------------------------------------------------------- */
    const planButtons = $$('.plan-btn');

    planButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const plan = btn.dataset.plan || 'Básico';
            const message = plan === 'Empresarial'
                ? 'Hola, estoy interesado en cotizar con el plan empresarial'
                : 'Hola, estoy interesado en hacer una cotizacion con el plan basico';
            openWhatsApp(message);
        });
    });

    /* -------------------------------------------------------------
       7. FORMULARIO DE CONTACTO (footer)
          También redirige a WhatsApp con un mensaje genérico.
          No requiere input del usuario.
       ------------------------------------------------------------- */
    const contactForm = $('#contact-form');
    const contactSuccess = $('#contact-success');

    contactForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        contactSuccess?.classList.remove('hidden');
        setTimeout(() => {
            openWhatsApp('Hola Capital Vision, me gustaría más información');
            contactForm?.reset();
            setTimeout(() => contactSuccess?.classList.add('hidden'), 2000);
        }, 300);
    });

    /* -------------------------------------------------------------
       9. PARALLAX del hero (rAF-throttled, solo escritorio)
       ------------------------------------------------------------- */
    const heroContent = $('#inicio .relative.z-10');
    if (heroContent && !isTouch) {
        let ticking = false;
        let lastY = 0;
        const vh = window.innerHeight;

        const updateParallax = () => {
            const y = lastY;
            if (y < vh) {
                heroContent.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
                heroContent.style.opacity = String(Math.max(0, 1 - y / (vh * 0.8)));
            }
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            lastY = window.scrollY;
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }, { passive: true });
    }

    /* -------------------------------------------------------------
       10. LOG inicial
       ------------------------------------------------------------- */
    console.log('%cCapital Vision', 'color:#ff6600;font-weight:bold;font-size:18px;letter-spacing:.2em;');
    console.log('%cDesarrollo web premium · capitalvision.com', 'color:#888;');
})();
