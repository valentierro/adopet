/**
 * Gera pins em 80x80 para o mapa (todos do mesmo tamanho):
 * - map_pin_small.png (pets)
 * - pin_ong_small.png (ONGs)
 * - petshop_small.png (parceiros comerciais)
 * Uso: cd apps/mobile && node scripts/resize-map-pin.js
 * Requer: pnpm add -D sharp
 */
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..');
const PIN_SIZE = 80; // todos os pins com o mesmo tamanho (pet, ONG, parceiro comercial)

const TASKS = [
  {
    input: path.join(DIR, 'assets/brand/icon/app_icon_light.png'),
    output: path.join(DIR, 'assets/brand/icon/map_pin_small.png'),
    size: PIN_SIZE,
  },
  {
    input: path.join(DIR, 'assets/pin_ong.png'),
    output: path.join(DIR, 'assets/brand/icon/pin_ong_small.png'),
    size: PIN_SIZE,
  },
  {
    input: path.join(DIR, 'assets/petshop.png'),
    output: path.join(DIR, 'assets/brand/icon/petshop_small.png'),
    size: PIN_SIZE,
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
  for (const { input, output, size = PIN_SIZE } of TASKS) {
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
