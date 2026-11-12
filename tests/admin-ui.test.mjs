// Prueba de humo del panel privado en un navegador real, sobre una copia temporal del contenido.
// Se omite si Playwright no está instalado (en CI se instala con `npm i --no-save playwright`).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startLocal, project } from '../admin/local.mjs';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {}

test(
  'el panel permite entrar, abrir un artículo, guardar borrador y salir',
  { skip: !chromium },
  async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'krp-ui-'));
    for (const dir of ['src/content', 'src/data', 'public/images'])
      await fs.cp(path.join(project, dir), path.join(root, dir), { recursive: true });
    const server = await startLocal({
      root,
      env: { ADMIN_USERNAME: 'tester', ADMIN_PASSWORD: 'una-clave-larga-123' },
      port: 0,
    });
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/admin/`);
      await page.fill('input[name=username]', 'tester');
      await page.fill('#login-password', 'una-clave-larga-123');
      await page.click('#login-form button[type=submit]');
      await page.waitForSelector('#workspace:not([hidden])');
      await page.waitForFunction(() => document.querySelectorAll('#files button').length > 10);
      assert.match(await page.textContent('#total-articles'), /^\d+$/);

      await page.fill('#search', 'protocolo umbral');
      await page.click('#files button');
      await page.waitForSelector('#editor-form:not([hidden])');
      assert.ok((await page.inputValue('#title')).length > 0);

      await page.fill('#description', 'Resumen de prueba del panel');
      assert.match(await page.textContent('#dirty'), /Cambios sin guardar/);
      await page.click('#save-draft');
      await page.waitForFunction(() =>
        /Borrador guardado/.test(document.querySelector('#message').textContent),
      );
      assert.match(await page.textContent('#dirty'), /Borrador privado guardado/);

      await page.click('#validate');
      await page.waitForFunction(() =>
        /Validación correcta/.test(document.querySelector('#message').textContent),
      );

      // Eliminar el borrador privado devuelve el artículo a su versión publicada.
      page.on('dialog', (dialog) => dialog.accept());
      await page.click('#delete-draft');
      await page.waitForFunction(() =>
        /Borrador privado eliminado/.test(document.querySelector('#message').textContent),
      );

      // Crear un artículo nuevo abre el editor con el identificador derivado del título.
      await page.click('#new');
      await page.fill('#create-form input[name=name]', 'Artículo de prueba');
      assert.equal(await page.inputValue('#create-form input[name=slug]'), 'articulo-de-prueba');
      await page.click('#create-form button[type=submit]');
      await page.waitForFunction(
        () =>
          document.querySelector('#file-path').textContent ===
          'src/content/lore/articulo-de-prueba.md',
      );
      assert.equal(await page.inputValue('#title'), 'Artículo de prueba');
      await page.fill('#description', 'Descripción de prueba');
      await page.click('#save-draft');
      await page.waitForFunction(() =>
        /Borrador guardado/.test(document.querySelector('#message').textContent),
      );

      // Los archivos de configuración se abren como JSON editable.
      await page.fill('#search', 'portal');
      await page.locator('#files button', { hasText: 'Enlaces y parámetros' }).click();
      await page.waitForSelector('#json-fields:not([hidden])');

      // Las imágenes se listan desde la biblioteca.
      await page.selectOption('#filter', 'media');
      await page.fill('#search', '');
      await page.locator('#files button').first().click();
      await page.waitForSelector('#image-fields:not([hidden])');
      assert.match(await page.getAttribute('#image-preview', 'src'), /^data:image\//);

      await page.click('#logout');
      await page.waitForSelector('#login:not([hidden])');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(root, { recursive: true, force: true });
    }
  },
);
