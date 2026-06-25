/* =============================================================
   CAPITAL VISION — Física del Hero "Antigravity"
   Implementado con Matter.js + render personalizado en Canvas
   ============================================================= */

(() => {
    'use strict';

    /* -------------------------------------------------------------
       MOBILE FIX: en pantallas < 768px DESACTIVAMOS por completo
       el motor de físicas (Matter.js + Canvas). En su lugar dejamos
       un fondo estático con gradiente CSS — esto garantiza que el
       scroll se mantenga 100% fluido en celulares de gama media/baja.
       ------------------------------------------------------------- */
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
        // Ocultar el canvas y aplicar clase de fondo estático sofisticado
        const canvas = document.getElementById('physics-canvas');
        if (canvas) canvas.style.display = 'none';
        const hero = document.getElementById('inicio');
        if (hero) hero.classList.add('hero-static');
        // Exportar API vacía para compatibilidad
        window.CapitalVisionPhysics = { engine: null, bodies: [], start: () => {}, stop: () => {} };
        return; // ← Salida temprana: no inicializamos nada de Matter.js
    }

    /* -------------------------------------------------------------
       DESKTOP: motor completo con interactividad permanente
       ------------------------------------------------------------- */

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
       CAMBIO CRÍTICO: enableSleeping=false → los cuerpos NUNCA quedan
       inactivos, así reaccionan siempre al cursor incluso después del
       impacto inicial. Garantiza interactividad permanente.
       ------------------------------------------------------------- */
    const engine = Engine.create({
        gravity: { x: 0, y: 0.6, scale: 0.001 },
        enableSleeping: false
    });
    const world = engine.world;

    /* -------------------------------------------------------------
       Paredes invisibles (mantienen los cuerpos dentro del canvas)
       ------------------------------------------------------------- */
    const wallOpts = { isStatic: true, restitution: 0.7, render: { visible: false } };
    let walls = [];

    function buildWalls() {
        walls.forEach(w => World.remove(world, w));
        walls = [
            Bodies.rectangle(width / 2, height + 30, width, 60, wallOpts),
            Bodies.rectangle(width / 2, -30, width, 60, wallOpts),
            Bodies.rectangle(-30, height / 2, 60, height, wallOpts),
            Bodies.rectangle(width + 30, height / 2, 60, height, wallOpts)
        ];
        World.add(world, walls);
    }
    buildWalls();

    /* -------------------------------------------------------------
       Cuerpos interactivos
       ------------------------------------------------------------- */
    const palette = {
        orange:    '#ff6600',
        orangeDeep:'#cc4f00',
        orangeSoft:'#ff8533',
        white:     '#ffffff',
        outline:   'rgba(255,255,255,0.15)'
    };

    const techLabels = ['Web', 'UI', 'UX', 'Code', 'API', 'CMS', 'SEO', 'DEV', '< / >'];

    const bodies = [];

    /**
     * Crea un cuerpo decorativo con metadatos para su render.
     * sleepThreshold: -1 refuerza la NO inactividad por seguridad.
     */
    function createDecorBody(type, x, y) {
        const baseOpts = {
            restitution: 0.85,    // rebote más vivo
            friction: 0.02,
            frictionAir: 0.015,   // menos rozamiento para que conserven energía
            density: 0.0015,
            sleepThreshold: -1    // nunca duermen
        };

        let body;

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
            body.renderMeta = { kind: 'tri', size: s, color: palette.orange, style: 'outline' };
        } else {
            const s = 35 + Math.random() * 30;
            body = Bodies.polygon(x, y, 6, s, baseOpts);
            body.renderMeta = { kind: 'hex', size: s, color: palette.orange, style: 'fill' };
        }

        Body.setVelocity(body, {
            x: (Math.random() - 0.5) * 3,
            y: (Math.random() - 0.5) * 2
        });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);

        return body;
    }

    function populate() {
        const count = 18;
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
            stiffness: 0.2,
            damping: 0.05,
            render: { visible: false }
        }
    });

    World.add(world, mouseConstraint);

    // Permitir scroll de página aunque el cursor esté sobre el canvas
    canvas.addEventListener('wheel', (e) => {
        window.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }, { passive: true });

    /* -------------------------------------------------------------
       INTERACTIVIDAD PERMANENTE
       Cada vez que el cursor se acerca, aplicamos:
         (a) repulsión radial proporcional a la distancia
         (b) "tirón aleatorio" sutil para que nunca queden inertes
       Esto garantiza que después del impacto inicial los cuerpos
       sigan respondiendo SIEMPRE a la presencia del cursor.
       ------------------------------------------------------------- */
    const repelRadius = 150;
    const repelForce = 0.0012;

    Events.on(engine, 'beforeUpdate', () => {
        if (mouseConstraint.body) return; // si está arrastrando uno, no aplicamos repulsión global

        const mx = mouse.position.x;
        const my = mouse.position.y;

        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const dx = b.position.x - mx;
            const dy = b.position.y - my;
            const dist = Math.hypot(dx, dy);

            if (dist > 0 && dist < repelRadius) {
                const factor = (1 - dist / repelRadius) * repelForce;
                // Vector de repulsión + componente tangencial leve (giro)
                Body.applyForce(b, b.position, {
                    x: (dx / dist) * factor * b.mass,
                    y: (dy / dist) * factor * b.mass
                });
                // Aplicar un torque mínimo para que rote al alejarse
                Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.02);
            }
        }
    });

    /* -------------------------------------------------------------
       Click sobre cuerpo → "patadita" extra
       Si el usuario hace clic en un bloque, aplica una fuerza
       de impulso radial desde el punto del click.
       ------------------------------------------------------------- */
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            const dx = b.position.x - px;
            const dy = b.position.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist < 90) {
                const f = 0.04 * b.mass;
                Body.applyForce(b, b.position, {
                    x: (dx / (dist || 1)) * f,
                    y: (dy / (dist || 1)) * f - 0.01 * b.mass // empuje extra hacia arriba
                });
            }
        }
    }, { passive: true });

    /* -------------------------------------------------------------
       RENDER: sprites cacheados en canvas offscreen
       Optimización clave: la forma + halo se renderiza UNA VEZ a un
       canvas offscreen y luego solo hacemos drawImage por frame
       (operación GPU-acelerada, mucho más rápida que recalcular
       gradientes y shadowBlur en cada frame).
       ------------------------------------------------------------- */
    const spriteCache = new Map();

    function buildSprite(key, size, drawFn) {
        if (spriteCache.has(key)) return spriteCache.get(key);
        const pad = 24;
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

    function drawBody(body) {
        const m = body.renderMeta;
        if (!m) return;
        const sprite = ensureSpriteFor(body);
        const { x, y } = body.position;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(body.angle);
        const s = sprite.size;
        ctx.drawImage(sprite.canvas, -s / 2, -s / 2, s, s);
        ctx.restore();
    }

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
       LOOP de animación con paso fijo (estable a 60fps)
       ------------------------------------------------------------- */
    let rafId = null;
    let isRunning = false;
    let lastTime = performance.now();
    const FIXED_DT = 1000 / 60;

    function loop(now) {
        if (!isRunning) return;

        let elapsed = Math.min(now - lastTime, 50);
        lastTime = now;

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

    start();

    /* -------------------------------------------------------------
       OPTIMIZACIONES de ciclo de vida
       ------------------------------------------------------------- */
    const hero = document.getElementById('inicio');
    if ('IntersectionObserver' in window && hero) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                entry.isIntersecting ? start() : stop();
            });
        }, { threshold: 0.05 });
        observer.observe(hero);
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Si el resize cruza el breakpoint a móvil, recargamos para aplicar el bypass
            if (window.matchMedia('(max-width: 767px)').matches) {
                window.location.reload();
                return;
            }
            resizeCanvas();
            buildWalls();
        }, 150);
    });

    document.addEventListener('visibilitychange', () => {
        document.hidden ? stop() : start();
    });

    window.CapitalVisionPhysics = { engine, bodies, start, stop };
})();
