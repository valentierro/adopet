/**
 * Gera pins em 48x48 para o mapa:
 * - map_pin_small.png (pets)
 * - pin_ong_small.png (ONGs)
 * - petshop_small.png (parceiros comerciais)
 * Uso: cd apps/mobile && node scripts/resize-map-pin.js
 * Requer: pnpm add -D sharp
 */
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..');
const SIZE = 48;

const SIZE_PARTNER = 64; // parceiros (ONG, comercial) um pouco maiores que pets (48)

const TASKS = [
  {
    input: path.join(DIR, 'assets/brand/icon/app_icon_light.png'),
    output: path.join(DIR, 'assets/brand/icon/map_pin_small.png'),
    size: SIZE,
  },
  {
    input: path.join(DIR, 'assets/pin_ong.png'),
    output: path.join(DIR, 'assets/brand/icon/pin_ong_small.png'),
    size: SIZE_PARTNER,
  },
  {
    input: path.join(DIR, 'assets/petshop.png'),
    output: path.join(DIR, 'assets/brand/icon/petshop_small.png'),
    size: SIZE_PARTNER,
  },
];

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Instale sharp: pnpm add -D sharp (em apps/mobile)');
  process.exit(1);
}

async function run() {
  for (const { input, output, size = SIZE } of TASKS) {
    if (!fs.existsSync(input)) {
      console.warn('Arquivo não encontrado, pulando:', input);
      continue;
    }
    await sharp(input).resize(size, size).png().toFile(output);
    console.log('Gerado:', output, `(${size}x${size})`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
