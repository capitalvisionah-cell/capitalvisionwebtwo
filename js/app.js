/* =============================================================
   CAPITAL VISION — Lógica de interactividad general
   Cursor personalizado, navegación, scroll reveals, modal y forms
   ============================================================= */

(() => {
    'use strict';

    /* -------------------------------------------------------------
       Utilidades
       ------------------------------------------------------------- */
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* -------------------------------------------------------------
       1. CURSOR PERSONALIZADO (anillo + punto con seguimiento suave)
       ------------------------------------------------------------- */
    const ring = $('#cursor-ring');
    const dot = $('#cursor-dot');

    if (ring && dot && !isTouch) {
        // Posiciones actuales y objetivo
        let targetX = window.innerWidth / 2;
        let targetY = window.innerHeight / 2;
        let ringX = targetX, ringY = targetY;
        let dotX = targetX, dotY = targetY;
        let cursorRaf = null;

        const ringLerp = 0.2;
        const dotLerp = 0.6;
        const EPS = 0.1; // umbral para detener el rAF cuando ya está estable

        // OPTIMIZACIÓN: usar translate3d para forzar capa de GPU y detener
        // el bucle cuando el cursor ya alcanzó su destino (ahorra ~60 rAFs/seg).
        function animateCursor() {
            ringX += (targetX - ringX) * ringLerp;
            ringY += (targetY - ringY) * ringLerp;
            dotX += (targetX - dotX) * dotLerp;
            dotY += (targetY - dotY) * dotLerp;

            ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;

            const dRing = Math.abs(targetX - ringX) + Math.abs(targetY - ringY);
            const dDot = Math.abs(targetX - dotX) + Math.abs(targetY - dotY);
            if (dRing < EPS && dDot < EPS) {
                cursorRaf = null;
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

        // Estados hover por atributo data-cursor
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

        // Estado activo (mouse down)
        window.addEventListener('mousedown', () => ring.classList.add('is-active'));
        window.addEventListener('mouseup', () => ring.classList.remove('is-active'));

        // Ocultar al salir de la ventana
        window.addEventListener('mouseleave', () => {
            ring.style.opacity = '0';
            dot.style.opacity = '0';
        });
        window.addEventListener('mouseenter', () => {
            ring.style.opacity = '1';
            dot.style.opacity = '1';
        });
    } else {
        // En táctil ocultamos los elementos del cursor
        if (ring) ring.style.display = 'none';
        if (dot) dot.style.display = 'none';
    }

    /* -------------------------------------------------------------
       2. NAVBAR: cambio al hacer scroll + menú móvil
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
    // OPTIMIZACIÓN: throttle con rAF y evita togglear si el estado no cambió
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

    // Cerrar menú móvil al hacer click en un enlace
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
                    // pequeño retraso escalonado para efecto cascada
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => entry.target.classList.add('is-visible'), delay);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        revealEls.forEach(el => io.observe(el));
    } else {
        // Fallback
        revealEls.forEach(el => el.classList.add('is-visible'));
    }

    /* -------------------------------------------------------------
       4. EFECTO "GLOW SIGUE AL MOUSE" en cards de servicios
       ------------------------------------------------------------- */
    // OPTIMIZACIÓN: rAF-throttle del seguimiento del mouse en cards
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
            const offset = 80; // espacio para navbar
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    /* -------------------------------------------------------------
       6. MODAL DE COTIZACIÓN (planes)
       ------------------------------------------------------------- */
    const modal = $('#quote-modal');
    const modalPlanName = $('#modal-plan-name');
    const modalClose = $('#modal-close');
    const planButtons = $$('.plan-btn');
    const quoteForm = $('#quote-form');
    const quoteSuccess = $('#quote-success');

    function openModal(planName) {
        if (!modal) return;
        if (modalPlanName) modalPlanName.textContent = planName;
        modal.classList.add('is-active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // resetear estado
        quoteForm?.classList.remove('hidden');
        quoteSuccess?.classList.add('hidden');
        quoteForm?.reset();
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('is-active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    planButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            openModal(btn.dataset.plan || 'Básico');
        });
    });

    modalClose?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) closeModal();
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('is-active')) {
            closeModal();
        }
    });

    /* -------------------------------------------------------------
       7. SUBMIT del formulario del modal y de contacto
       ------------------------------------------------------------- */
    quoteForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = quoteForm.phone.value.trim();
        if (!phone) return;

        // Aquí se integraría una API real. Por ahora simulamos éxito visual.
        console.log('Cotización solicitada:', { plan: modalPlanName?.textContent, phone });

        quoteForm.classList.add('hidden');
        quoteSuccess?.classList.remove('hidden');

        // Cierre automático tras 2.5s
        setTimeout(closeModal, 2800);
    });

    const contactForm = $('#contact-form');
    const contactSuccess = $('#contact-success');

    contactForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = contactForm.phone.value.trim();
        if (!phone) return;
        console.log('Solicitud de contacto:', { phone });
        contactSuccess?.classList.remove('hidden');
        contactForm.reset();
        // Ocultar el éxito tras unos segundos
        setTimeout(() => contactSuccess?.classList.add('hidden'), 4000);
    });

    /* -------------------------------------------------------------
       8. PARALLAX en el hero — throttled con rAF para máximo rendimiento.
          Sin esto, el handler corre en cada evento (muchos por segundo)
          forzando reflow. Con rAF se sincroniza al refresh rate.
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
       9. LOG inicial
       ------------------------------------------------------------- */
    console.log('%cCapital Vision', 'color:#ff6600;font-weight:bold;font-size:18px;letter-spacing:.2em;');
    console.log('%cDesarrollo web premium · capitalvision.com', 'color:#888;');
})();
