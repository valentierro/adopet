/**
 * Gera assets/brand/icon/map_pin_small.png (48x48) a partir de app_icon_light.png.
 * Uso: a partir de apps/mobile: node scripts/resize-map-pin.js
 * Requer: pnpm add -D sharp (ou npm install --save-dev sharp)
 */
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..');
const INPUT = path.join(DIR, 'assets/brand/icon/app_icon_light.png');
const OUTPUT = path.join(DIR, 'assets/brand/icon/map_pin_small.png');
const SIZE = 48;

if (!fs.existsSync(INPUT)) {
  console.error('Arquivo não encontrado:', INPUT);
  process.exit(1);
}

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Instale sharp: pnpm add -D sharp (em apps/mobile)');
  process.exit(1);
}

sharp(INPUT)
  .resize(SIZE, SIZE)
  .png()
  .toFile(OUTPUT)
  .then(() => console.log('Gerado:', OUTPUT))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
