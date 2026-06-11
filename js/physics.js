/* =============================================================
   CAPITAL VISION — Física del Hero "Antigravity"
   Implementado con Matter.js + render personalizado en Canvas
   ============================================================= */

(() => {
    'use strict';

    /* -------------------------------------------------------------
       Detección de dispositivo y configuración base
       ------------------------------------------------------------- */
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    // Alias de Matter.js para legibilidad
    const { Engine, World, Bodies, Body, Mouse, MouseConstraint, Events, Composite } = Matter;

    /* -------------------------------------------------------------
       Referencias y configuración del canvas
       ------------------------------------------------------------- */
    const canvas = document.getElementById('physics-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });

    // Dimensiones lógicas y de píxel (HiDPI)
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2); // límite de 2 para rendimiento

    /**
     * Ajusta el tamaño del canvas teniendo en cuenta el dpr.
     */
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();

    /* -------------------------------------------------------------
       Motor de físicas
       ------------------------------------------------------------- */
    const engine = Engine.create({
        // Gravedad sutil hacia abajo
        gravity: { x: 0, y: 0.6, scale: 0.001 },
        enableSleeping: true // permite que los cuerpos "duerman" cuando estén quietos (ahorra CPU)
    });
    const world = engine.world;

    /* -------------------------------------------------------------
       Paredes invisibles (mantienen los cuerpos dentro del canvas)
       ------------------------------------------------------------- */
    const wallOpts = { isStatic: true, restitution: 0.6, render: { visible: false } };
    let walls = [];

    function buildWalls() {
        // Remover paredes antiguas
        walls.forEach(w => World.remove(world, w));
        walls = [
            Bodies.rectangle(width / 2, height + 30, width, 60, wallOpts),   // piso
            Bodies.rectangle(width / 2, -30, width, 60, wallOpts),           // techo
            Bodies.rectangle(-30, height / 2, 60, height, wallOpts),         // izquierda
            Bodies.rectangle(width + 30, height / 2, 60, height, wallOpts)   // derecha
        ];
        World.add(world, walls);
    }
    buildWalls();

    /* -------------------------------------------------------------
       Cuerpos interactivos: paleta de marca, formas variadas
       ------------------------------------------------------------- */
    const palette = {
        orange:    '#ff6600',
        orangeDeep:'#cc4f00',
        orangeSoft:'#ff8533',
        white:     '#ffffff',
        outline:   'rgba(255,255,255,0.15)'
    };

    // Etiquetas tecnológicas que aparecerán dentro de los cuerpos
    const techLabels = ['Web', 'UI', 'UX', 'Code', 'API', 'CMS', 'SEO', 'DEV', '< / >'];

    const bodies = [];

    /**
     * Crea un cuerpo decorativo con metadatos para su render.
     */
    function createDecorBody(type, x, y) {
        const restitution = 0.78; // rebote elástico
        const friction = 0.02;
        const frictionAir = 0.02;

        let body;
        const baseOpts = { restitution, friction, frictionAir, density: 0.0015 };

        if (type === 'circle') {
            const r = 22 + Math.random() * 28;
            body = Bodies.circle(x, y, r, baseOpts);
            body.renderMeta = {
                kind: 'circle',
                radius: r,
                style: Math.random() < 0.5 ? 'fill' : 'ring',
                color: Math.random() < 0.7 ? palette.orange : palette.white
            };
        } else if (type === 'square') {
            const s = 50 + Math.random() * 50;
            body = Bodies.rectangle(x, y, s, s, baseOpts);
            body.renderMeta = {
                kind: 'square',
                size: s,
                style: Math.random() < 0.4 ? 'outline' : 'fill',
                color: Math.random() < 0.6 ? palette.orange : palette.outline,
                label: techLabels[Math.floor(Math.random() * techLabels.length)]
            };
        } else if (type === 'pill') {
            const w = 100 + Math.random() * 80;
            const h = 38;
            body = Bodies.rectangle(x, y, w, h, { ...baseOpts, chamfer: { radius: h / 2 } });
            body.renderMeta = {
                kind: 'pill',
                width: w,
                height: h,
                color: palette.orange,
                label: techLabels[Math.floor(Math.random() * techLabels.length)]
            };
        } else if (type === 'tri') {
            const s = 50 + Math.random() * 30;
            body = Bodies.polygon(x, y, 3, s, baseOpts);
            body.renderMeta = {
                kind: 'tri',
                size: s,
                color: palette.orange,
                style: 'outline'
            };
        } else {
            // hex
            const s = 35 + Math.random() * 30;
            body = Bodies.polygon(x, y, 6, s, baseOpts);
            body.renderMeta = {
                kind: 'hex',
                size: s,
                color: palette.orange,
                style: 'fill'
            };
        }

        // Empujón inicial aleatorio para que entren en escena con vida
        Body.setVelocity(body, {
            x: (Math.random() - 0.5) * 3,
            y: (Math.random() - 0.5) * 2
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);

        return body;
    }

    /**
     * Poblar el lienzo con cuerpos. Reducido en móvil para rendimiento.
     */
    function populate() {
        const count = isMobile ? 10 : 18;
        const types = ['circle', 'square', 'pill', 'tri', 'hex'];

        for (let i = 0; i < count; i++) {
            const t = types[Math.floor(Math.random() * types.length)];
            const x = 100 + Math.random() * (width - 200);
            const y = 100 + Math.random() * (height * 0.6);
            const b = createDecorBody(t, x, y);
            bodies.push(b);
            World.add(world, b);
        }
    }
    populate();

    /* -------------------------------------------------------------
       Interacción con el mouse: arrastrar y lanzar
       ------------------------------------------------------------- */
    const mouse = Mouse.create(canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: 0.18,
            damping: 0.05,
            render: { visible: false }
        }
    });

    World.add(world, mouseConstraint);

    // Trick: permite que la página siga scrolleando aunque pasemos por el canvas
    canvas.addEventListener('wheel', (e) => {
        window.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }, { passive: true });

    /* -------------------------------------------------------------
       Repulsión por proximidad del cursor (efecto "antigravity")
       ------------------------------------------------------------- */
    const repelRadius = isMobile ? 90 : 130;
    const repelForce = 0.0008;

    Events.on(engine, 'beforeUpdate', () => {
        // Cuando el ratón se mueve cerca de un cuerpo (sin arrastrarlo), lo empuja
        if (mouseConstraint.body) return; // si ya está arrastrando, no aplicar repulsión
        const mx = mouse.position.x;
        const my = mouse.position.y;

        bodies.forEach(b => {
            const dx = b.position.x - mx;
            const dy = b.position.y - my;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < repelRadius) {
                const factor = (1 - dist / repelRadius) * repelForce;
                Body.applyForce(b, b.position, {
                    x: (dx / dist) * factor * b.mass,
                    y: (dy / dist) * factor * b.mass
                });
            }
        });
    });

    /* -------------------------------------------------------------
       RENDER personalizado en Canvas (más bonito que el render default)
       ------------------------------------------------------------- */
    /* ---------------------------------------------------------
       OPTIMIZACIÓN: Pre-cacheo de gradientes y "halos" pre-renderizados
       en sprites offscreen. Evita generar gradientes y shadowBlur por
       frame (operaciones extremadamente costosas en Canvas).
       --------------------------------------------------------- */
    const spriteCache = new Map();

    /**
     * Crea (una sola vez) un sprite offscreen con la forma + halo.
     * Luego solo hacemos drawImage por frame, que es muy rápido.
     */
    function buildSprite(key, size, drawFn) {
        if (spriteCache.has(key)) return spriteCache.get(key);
        const pad = 24; // margen para el halo
        const totalSize = Math.ceil(size + pad * 2);
        const off = document.createElement('canvas');
        off.width = totalSize * dpr;
        off.height = totalSize * dpr;
        const octx = off.getContext('2d');
        octx.scale(dpr, dpr);
        octx.translate(totalSize / 2, totalSize / 2);
        drawFn(octx);
        spriteCache.set(key, { canvas: off, size: totalSize });
        return spriteCache.get(key);
    }

    function ensureSpriteFor(body) {
        const m = body.renderMeta;
        if (m.sprite) return m.sprite;

        let key, drawFn, footprint;

        switch (m.kind) {
            case 'circle':
                if (m.style === 'fill') {
                    key = `circle-fill-${Math.round(m.radius)}-${m.color}`;
                    footprint = m.radius * 2;
                    drawFn = (c) => {
                        const grad = c.createRadialGradient(-m.radius * 0.3, -m.radius * 0.3, 0, 0, 0, m.radius);
                        grad.addColorStop(0, m.color === palette.white ? '#fff' : palette.orangeSoft);
                        grad.addColorStop(1, m.color === palette.white ? '#bbb' : palette.orangeDeep);
                        c.fillStyle = grad;
                        c.shadowColor = m.color === palette.white ? 'rgba(255,255,255,0.3)' : 'rgba(255,102,0,0.6)';
                        c.shadowBlur = 24;
                        c.beginPath();
                        c.arc(0, 0, m.radius, 0, Math.PI * 2);
                        c.fill();
                    };
                } else {
                    key = `circle-ring-${Math.round(m.radius)}-${m.color}`;
                    footprint = m.radius * 2;
                    drawFn = (c) => {
                        c.strokeStyle = m.color;
                        c.lineWidth = 1.5;
                        c.shadowColor = 'rgba(255,102,0,0.4)';
                        c.shadowBlur = 12;
                        c.beginPath();
                        c.arc(0, 0, m.radius, 0, Math.PI * 2);
                        c.stroke();
                        c.shadowBlur = 0;
                        c.fillStyle = m.color;
                        c.beginPath();
                        c.arc(0, 0, 3, 0, Math.PI * 2);
                        c.fill();
                    };
                }
                break;

            case 'square': {
                const half = m.size / 2;
                key = `square-${m.style}-${Math.round(m.size)}-${m.label}-${m.color}`;
                footprint = m.size;
                drawFn = (c) => {
                    if (m.style === 'fill') {
                        c.fillStyle = m.color === palette.orange ? palette.orange : '#1a1a1a';
                        c.shadowColor = 'rgba(255,102,0,0.5)';
                        c.shadowBlur = 18;
                        roundRect(c, -half, -half, m.size, m.size, 8);
                        c.fill();
                    } else {
                        c.strokeStyle = palette.orange;
                        c.lineWidth = 1.5;
                        c.shadowColor = 'rgba(255,102,0,0.4)';
                        c.shadowBlur = 14;
                        roundRect(c, -half, -half, m.size, m.size, 8);
                        c.stroke();
                    }
                    if (m.label) {
                        c.shadowBlur = 0;
                        c.fillStyle = m.style === 'fill' && m.color === palette.orange ? '#000' : '#fff';
                        c.font = '600 11px "Space Grotesk", sans-serif';
                        c.textAlign = 'center';
                        c.textBaseline = 'middle';
                        c.fillText(m.label, 0, 0);
                    }
                };
                break;
            }

            case 'pill': {
                const halfW = m.width / 2;
                const halfH = m.height / 2;
                key = `pill-${Math.round(m.width)}-${m.label}`;
                footprint = Math.max(m.width, m.height);
                drawFn = (c) => {
                    c.fillStyle = palette.orange;
                    c.shadowColor = 'rgba(255,102,0,0.55)';
                    c.shadowBlur = 20;
                    roundRect(c, -halfW, -halfH, m.width, m.height, halfH);
                    c.fill();
                    c.shadowBlur = 0;
                    c.fillStyle = '#000';
                    c.font = '700 12px "Space Grotesk", sans-serif';
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    c.fillText(m.label, 0, 0);
                };
                break;
            }

            case 'tri': {
                key = `tri-${Math.round(m.size)}`;
                footprint = m.size * 2;
                drawFn = (c) => {
                    drawPolygon(c, 3, m.size);
                    c.strokeStyle = palette.orange;
                    c.lineWidth = 1.5;
                    c.shadowColor = 'rgba(255,102,0,0.5)';
                    c.shadowBlur = 14;
                    c.stroke();
                };
                break;
            }

            case 'hex': {
                key = `hex-${Math.round(m.size)}`;
                footprint = m.size * 2;
                drawFn = (c) => {
                    drawPolygon(c, 6, m.size);
                    const grad = c.createLinearGradient(-m.size, -m.size, m.size, m.size);
                    grad.addColorStop(0, palette.orangeSoft);
                    grad.addColorStop(1, palette.orangeDeep);
                    c.fillStyle = grad;
                    c.shadowColor = 'rgba(255,102,0,0.5)';
                    c.shadowBlur = 18;
                    c.fill();
                };
                break;
            }
        }

        m.sprite = buildSprite(key, footprint, drawFn);
        return m.sprite;
    }

    /**
     * Renderiza el cuerpo dibujando su sprite cacheado.
     * Esto es ~10x más rápido que generar gradientes/shadowBlur en cada frame.
     */
    function drawBody(body) {
        const m = body.renderMeta;
        if (!m) return;
        const sprite = ensureSpriteFor(body);
        const { x, y } = body.position;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);
        // Dibujar sprite centrado (compensa el padding del sprite)
        const s = sprite.size;
        ctx.drawImage(sprite.canvas, -s / 2, -s / 2, s, s);
        ctx.restore();
    }

    /**
     * Utilidad: rectángulo con esquinas redondeadas.
     */
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * Utilidad: traza un polígono regular sin renderizar.
     */
    function drawPolygon(ctx, sides, radius) {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    /* -------------------------------------------------------------
       LOOP de animación (controlado y eficiente)
       ------------------------------------------------------------- */
    let rafId = null;
    let isRunning = false;
    let lastTime = performance.now();

    /* OPTIMIZACIÓN: paso fijo de simulación a 60fps para estabilidad
       y evitar el warning de Matter.js cuando delta > 16.67ms.
       Esto también evita "explosiones" físicas en lag spikes. */
    const FIXED_DT = 1000 / 60;

    function loop(now) {
        if (!isRunning) return;

        // delta acumulado pero capado: previene saltos enormes después de pausas
        let elapsed = Math.min(now - lastTime, 50);
        lastTime = now;

        // Si elapsed > FIXED_DT * 2, dividir en sub-pasos
        const steps = Math.min(2, Math.ceil(elapsed / FIXED_DT));
        const stepDt = elapsed / steps;
        for (let i = 0; i < steps; i++) {
            Engine.update(engine, stepDt);
        }

        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < bodies.length; i++) {
            drawBody(bodies[i]);
        }

        rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (isRunning) return;
        isRunning = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
    }

    // Iniciar
    start();

    /* -------------------------------------------------------------
       OPTIMIZACIONES:
       - Pausar la simulación cuando el Hero no está visible
       - Reescalar al cambiar tamaño de ventana
       ------------------------------------------------------------- */
    const hero = document.getElementById('inicio');
    if ('IntersectionObserver' in window && hero) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    start();
                } else {
                    stop();
                }
            });
        }, { threshold: 0.05 });
        observer.observe(hero);
    }

    // Reescalado responsive
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resizeCanvas();
            buildWalls();
        }, 150);
    });

    // Pausar al cambiar de pestaña
    document.addEventListener('visibilitychange', () => {
        document.hidden ? stop() : start();
    });

    /* -------------------------------------------------------------
       EXPORT (uso interno, debug opcional)
       ------------------------------------------------------------- */
    window.CapitalVisionPhysics = {
        engine,
        bodies,
        start,
        stop
    };
})();
