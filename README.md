# Capital Vision

Sitio web oficial de **Capital Vision** — estudio de desarrollo web premium en Guatemala.

Experiencia interactiva de alta gama con físicas en tiempo real, cursor personalizado, animaciones avanzadas y diseño futurista en negro + naranja eléctrico.

## Stack

- HTML5 + Tailwind CSS (CDN)
- JavaScript Vanilla (ES6+)
- Matter.js para físicas del hero "Antigravity"
- Canvas 2D con sprite cache offscreen para máximo rendimiento

## Estructura

```
.
├── index.html        SPA principal
├── css/styles.css    Estilos de marca y cursor
├── js/app.js         Cursor, navegación, reveals, modal, forms
├── js/physics.js     Motor antigravity con Matter.js
└── vercel.json       Headers y caching para Vercel
```

## Desarrollo local

Cualquier servidor estático sirve:

```bash
python3 -m http.server 5500
# o
npx serve .
```

Luego abre <http://localhost:5500>.

## Despliegue

Conectado a Vercel — cada push a `main` despliega automáticamente.

## Contacto

- 📞 +502 5854-9829 / +502 4587-0828
- 📧 capitalvisionah@gmail.com
