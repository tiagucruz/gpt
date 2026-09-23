// Verificação de integração. Usa Playwright instalado externamente ao projeto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
require('./server.cjs');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(() => document.querySelector('#loading').hidden);
  assert.equal(await page.locator('#stage-error').isVisible(), false, 'A cena deve carregar');
  await page.getByRole('button', { name: 'Pausar rotação', exact: true }).click();
  await page.screenshot({ path: 'entrega/01-orbita.png', fullPage: true });
  const firstSeed = await page.locator('#seed').inputValue();
  const firstPalette = await page.locator('#palette-swatches').innerHTML();
  await page.getByRole('button', { name: 'Gerar nova escultura' }).click();
  assert.notEqual(await page.locator('#seed').inputValue(), firstSeed);
  assert.notEqual(await page.locator('#palette-swatches').innerHTML(), firstPalette);
  await page.locator('#seed').fill(firstSeed);
  await page.locator('#seed').press('Enter');
  assert.equal(await page.locator('#palette-swatches').innerHTML(), firstPalette, 'A semente deve recriar a paleta');
  await page.locator('#density').evaluate(el => { el.value = '1080'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('#point-count').textContent === '1.080');
  await page.locator('#density').evaluate(el => { el.value = '600'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('#point-count').textContent === '600');
  await page.locator('[data-preset="espiral"]').click();
  await page.getByRole('button', { name: 'Gerar nova escultura' }).click();
  await page.screenshot({ path: 'entrega/02-espiral.png', fullPage: true });
  assert.match(await page.locator('#artwork-title').textContent(), /Fluxo infinito/);
  await page.locator('[data-preset="esfera"]').click();
  await page.getByRole('button', { name: 'Gerar nova escultura' }).click();
  await page.screenshot({ path: 'entrega/03-esfera.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const downloadPath = path.resolve('entrega/escultura-exportada.png');
  await download.saveAs(downloadPath);
  assert.ok(fs.statSync(downloadPath).size > 10000, 'O PNG deve conter a cena');
  const buffer = fs.readFileSync(downloadPath);
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  await page.getByRole('button', { name: 'Sobre o projeto' }).click();
  assert.equal(await page.locator('#about-dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#about-dialog').isVisible(), false);
  await page.locator('#fullscreen').click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.locator('#fullscreen').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  const math = await page.evaluate(async () => {
    const { generateGeometry, paletteForSeed } = await import('./geometry.js');
    for (const style of ['orbita', 'espiral', 'esfera']) {
      for (const count of [240, 600, 1080]) {
        for (const distortion of [0, 100]) {
          const params = { style, seed: 'reproducible', count, distortion };
          const a = generateGeometry(params), b = generateGeometry(params);
          if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('Semente não reproduzível');
          if (a.positions.length !== count) throw new Error('Quantidade incorreta');
          if (!a.positions.flat().every(Number.isFinite)) throw new Error('Coordenadas inválidas');
          if (!a.connections.every(([x, y]) => x >= 0 && y >= 0 && x < count && y < count && x !== y)) throw new Error('Conexões inválidas');
          if (new Set(a.connections.map(([x, y]) => [x, y].sort((a,b) => a-b).join(':'))).size !== a.connections.length) throw new Error('Conexões duplicadas');
        }
      }
    }
    return { combinations: 18, palette: paletteForSeed('FORMA-0081') };
  });
  console.log('MATEMÁTICA', JSON.stringify(math));
  for (let i = 0; i < 10; i++) await page.locator('#generate').click();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto('http://127.0.0.1:4173');
  await mobile.waitForFunction(() => document.querySelector('#loading').hidden);
  assert.equal(await mobile.getByRole('button', { name: 'Retomar rotação' }).isVisible(), true);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Sem rolagem horizontal no celular');
  await mobile.screenshot({ path: 'entrega/04-mobile.png', fullPage: true });
  assert.deepEqual(errors, [], 'Sem erros no navegador');
  console.log('PASSOU: cena, 18 combinações matemáticas, sementes, paletas, densidade, estilos, 10 gerações, PNG, diálogo, tela cheia, celular e movimento reduzido.');
  await browser.close();
  process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });
