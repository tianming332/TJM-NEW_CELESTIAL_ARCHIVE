import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crystalTypes } from '../src/crystal-types.ts';

test('crystal labels follow the requested correction without reordering STL clusters', () => {
  assert.deepEqual(crystalTypes.map(type => type.label.zh), [
    '单斜晶体', '等轴晶体', '六方晶体', '三方晶体',
    '三斜晶体', '四方晶体', '正方晶体', '斜方晶体',
  ]);
  assert.deepEqual(crystalTypes.map(type => type.code), [
    'MONOCLINIC', 'ISOMETRIC', 'HEXAGONAL', 'TRIGONAL',
    'TRICLINIC', 'TETRAGONAL', 'SQUARE', 'ORTHORHOMBIC',
  ]);
  assert.deepEqual(crystalTypes.map(type => type.label.en), [
    'Monoclinic', 'Isometric', 'Hexagonal', 'Trigonal',
    'Triclinic', 'Tetragonal', 'Square', 'Orthorhombic',
  ]);
  assert.deepEqual(crystalTypes.map(type => type.label.ja), [
    '単斜晶系', '等軸晶系', '六方晶系', '三方晶系',
    '三斜晶系', '正方晶系', '正方結晶', '斜方晶系',
  ]);
  assert.equal(new Set(crystalTypes.map(type => type.id)).size, 8);
  assert.equal(new Set(crystalTypes.map(type => type.code)).size, 8);
  for (const lang of ['zh', 'ja', 'en'] as const) {
    assert.equal(new Set(crystalTypes.map(type => type.label[lang])).size, 8);
  }
  crystalTypes.forEach((type, index) => {
    assert.equal(type.source, `8晶体.stl · CLUSTER ${String(index + 1).padStart(2, '0')}`);
  });
});

test('source colors remain attached to their original model slots', () => {
  assert.deepEqual(crystalTypes.map(type => type.color), [
    '#8b60c8', '#52a9d5', '#4e6fc7', '#f0c635',
    '#d95b5f', '#47aa51', '#9da43e', '#a3684f',
  ]);
});

test('each named glyph uses the reference outer silhouette, with an upright square for Square', () => {
  assert.deepEqual(Object.fromEntries(crystalTypes.map(type => [type.id, type.shape])), {
    monoclinic: 'polygon(51% 0,76% 0,76% 100%,24% 100%)', // Tall, asymmetric trapezoid.
    isometric: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', // Diamond.
    hexagonal: 'polygon(25% 7%,75% 7%,100% 50%,75% 93%,25% 93%,0 50%)',
    trigonal: 'polygon(0 8%,100% 8%,50% 92%)', // Downward-pointing triangle.
    triclinic: 'polygon(77% 0,89% 100%,11% 100%)', // Asymmetric triangle.
    tetragonal: 'polygon(10% 0,90% 0,90% 100%,10% 100%)', // Upright rectangle.
    square: 'polygon(0 0,100% 0,100% 100%,0 100%)',
    orthorhombic: 'polygon(48% 0,96% 0,52% 100%,4% 100%)', // Slanted parallelogram.
  });
  assert.equal(new Set(crystalTypes.map(type => type.shape)).size, 8);
});

test('downloadable manifest and data drawer agree with the shared UI labels', () => {
  const manifest = JSON.parse(readFileSync(new URL('../models/model-manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.items.map(({ cluster, id, label }) => ({ cluster, id, label })),
    crystalTypes.map((type, index) => ({ cluster: index + 1, id: type.id, label: type.label.zh })));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const modelList = html.match(/<ol class="model-list">([\s\S]*?)<\/ol>/)?.[1];
  assert.ok(modelList);
  assert.deepEqual([...modelList.matchAll(/<li>(.*?)<\/li>/g)].map(match => match[1]),
    crystalTypes.map((type, index) => `8晶体.stl / CLUSTER ${String(index + 1).padStart(2, '0')} · ${type.code}`));
});
