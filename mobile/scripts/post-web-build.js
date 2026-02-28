#!/usr/bin/env node
/**
 * Post-web-build script
 * Runs after `npx expo export -p web` to:
 *  1. Inject PWA manifest + iOS/Android install meta tags into dist/index.html
 *  2. Generate and copy app icons (192x192, 512x512, 180x180) to dist/
 *  3. Copy manifest.json to dist/
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const WEB  = path.join(__dirname, '..', 'web');

// ── 1. Patch index.html ───────────────────────────────────────────────────────
const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Inject app background colour so the body never shows as black on web
if (!html.includes('background-color: #F1F5F9')) {
  html = html.replace(
    'body {\n        overflow: hidden;\n      }',
    'body {\n        overflow: hidden;\n        background-color: #F1F5F9;\n      }'
  );
  fs.writeFileSync(indexPath, html);
  console.log('✔ Injected body background-color into index.html');
}

const PWA_TAGS = `
  <!-- PWA Manifest (enables Add to Home Screen on Android/Chrome) -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS Safari: standalone app behaviour -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="CareNearby" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
  <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

  <!-- Android / generic browser icon -->
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />`;

// Inject before </head>
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${PWA_TAGS}\n</head>`);
  fs.writeFileSync(indexPath, html);
  console.log('✔ Injected PWA meta tags into index.html');
} else {
  console.log('ℹ  PWA meta tags already present in index.html');
}

// ── 2. Copy manifest.json ─────────────────────────────────────────────────────
const manifestSrc = path.join(WEB, 'manifest.json');
const manifestDst = path.join(DIST, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDst);
  console.log('✔ Copied manifest.json to dist/');
} else {
  console.warn('⚠  web/manifest.json not found – skipping');
}

// ── 3. Generate / copy icons ──────────────────────────────────────────────────
const iconSrc192 = path.join(WEB, 'icon-192.png');
const iconSrc512 = path.join(WEB, 'icon-512.png');
const iconSrcApple = path.join(WEB, 'apple-touch-icon.png');

if (fs.existsSync(iconSrc192) && fs.existsSync(iconSrc512)) {
  fs.copyFileSync(iconSrc192, path.join(DIST, 'icon-192.png'));
  fs.copyFileSync(iconSrc512, path.join(DIST, 'icon-512.png'));
  if (fs.existsSync(iconSrcApple)) {
    fs.copyFileSync(iconSrcApple, path.join(DIST, 'apple-touch-icon.png'));
  }
  console.log('✔ Copied icons to dist/');
} else {
  // Icons not found in web/ – generate them on the fly using pngjs
  console.log('ℹ  Generating icons using pngjs ...');
  try {
    const { PNG } = require('pngjs');

    function createIcon(size, outputPath) {
      const png = new PNG({ width: size, height: size });
      const BG    = [0x00, 0x7A, 0xFF]; // #007AFF
      const WHITE = [0xFF, 0xFF, 0xFF];

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (size * y + x) * 4;

          // Rounded-square mask
          const r  = size * 0.22;
          const cx = size / 2, cy = size / 2;
          const dx = Math.abs(x - cx) - (size / 2 - r);
          const dy = Math.abs(y - cy) - (size / 2 - r);
          const dist = Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2);

          if (dist > r + 0.5) {
            png.data[idx] = png.data[idx+1] = png.data[idx+2] = 0xFF;
            png.data[idx+3] = 0;
            continue;
          }

          const pad = Math.floor(size * 0.20);
          const lx = x - pad, ly = y - pad, area = size - pad * 2;
          const stroke = Math.max(2, Math.floor(size * 0.08));
          const halfW = Math.floor(area / 2) - 2;
          let isLetter = false;

          // "C"
          if (lx >= 0 && lx < halfW && ly >= 0 && ly < area) {
            if (lx < stroke) isLetter = true;
            if (ly < stroke && lx < halfW - stroke) isLetter = true;
            if (ly > area - stroke - 1 && lx < halfW - stroke) isLetter = true;
          }
          // "N"
          const nL = halfW + 4;
          if (lx >= nL && lx < area && ly >= 0 && ly < area) {
            if (lx < nL + stroke) isLetter = true;
            if (lx > area - stroke - 1) isLetter = true;
            const progress = (ly) / area;
            const diagX = nL + stroke + Math.floor(progress * (area - nL - stroke * 2));
            if (lx >= diagX && lx < diagX + stroke) isLetter = true;
          }

          const c = isLetter ? WHITE : BG;
          png.data[idx] = c[0]; png.data[idx+1] = c[1];
          png.data[idx+2] = c[2]; png.data[idx+3] = 0xFF;
        }
      }
      fs.writeFileSync(outputPath, PNG.sync.write(png));
    }

    createIcon(192, path.join(DIST, 'icon-192.png'));
    createIcon(512, path.join(DIST, 'icon-512.png'));
    createIcon(180, path.join(DIST, 'apple-touch-icon.png'));
    console.log('✔ Generated icons in dist/');
  } catch (e) {
    console.error('✘ Could not generate icons:', e.message);
  }
}

// ── 4. Copy service worker ────────────────────────────────────────────────────
const swSrc = path.join(WEB, 'sw.js');
const swDst = path.join(DIST, 'sw.js');
if (fs.existsSync(swSrc)) {
  fs.copyFileSync(swSrc, swDst);
  console.log('✔ Copied sw.js to dist/');

  // Inject SW registration script just before </body>
  let html2 = fs.readFileSync(indexPath, 'utf8');
  const SW_SCRIPT = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  </script>`;
  if (!html2.includes('serviceWorker')) {
    html2 = html2.replace('</body>', `${SW_SCRIPT}\n</body>`);
    fs.writeFileSync(indexPath, html2);
    console.log('✔ Injected service worker registration into index.html');
  }
} else {
  console.warn('⚠  web/sw.js not found – skipping service worker');
}

// ── 5. Write vercel.json with SPA rewrite ────────────────────────────────────
const vercelConfig = {
  rewrites: [{ source: '/(.*)', destination: '/' }],
};
fs.writeFileSync(
  path.join(DIST, 'vercel.json'),
  JSON.stringify(vercelConfig, null, 2) + '\n'
);
console.log('✔ Wrote vercel.json with SPA rewrite rule');

// ── 6. Write .vercel/project.json so `vercel --prod` always targets the right project ──
const vercelProjDir = path.join(DIST, '.vercel');
if (!fs.existsSync(vercelProjDir)) fs.mkdirSync(vercelProjDir, { recursive: true });
fs.writeFileSync(
  path.join(vercelProjDir, 'project.json'),
  JSON.stringify({ projectId: 'prj_Y3nh4VxcAbHpLSxzak3CEV7DzAcD', orgId: 'team_3ucuU6nY6h28u3fr1Q6LTU9y' }) + '\n'
);
console.log('✔ Wrote .vercel/project.json (carenearby mobile project)');

console.log('\n✅ Post-web-build complete.');
