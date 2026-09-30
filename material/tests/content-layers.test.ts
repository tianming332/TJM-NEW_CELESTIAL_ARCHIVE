import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the actual UI synchronizer without starting the GPU renderer.
const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('main.ts', source, ts.ScriptTarget.ES2022, true);
const declaration = parsed.statements.find(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'syncContentLayers');
assert.ok(declaration);
const synchronizer = ts.transpileModule(declaration.getText(parsed), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const hiddenClasses = new Set<string>();
  const state = { focusMode: false };
  const nodes = Object.fromEntries(
    ['#materialStory', '#focusToggle', '#typeRail', '#materialInspector', '.stage-copy']
      .map(selector => {
        const attributes: Record<string, string> = {};
        const classes = new Set<string>();
        return [selector, {
          inert: false,
          attributes,
          classes,
          setAttribute(name: string, value: string) { attributes[name] = value; },
          classList: { toggle(name: string, enabled: boolean) {
            if (enabled) classes.add(name); else classes.delete(name);
          } },
        }];
      }),
  );
  const context = {
    state,
    document: { body: { classList: { contains: (name: string) => hiddenClasses.has(name) } } },
    $: (selector: string) => nodes[selector],
  };
  return { hiddenClasses, state, nodes, sync: () => runInNewContext(`${synchronizer}\nsyncContentLayers();`, context) };
}

test('the selected material card is enabled and accessible by default', () => {
  const { sync, nodes } = fixture();
  sync();
  assert.equal(nodes['#materialInspector'].inert, false);
  assert.equal(nodes['#materialInspector'].attributes['aria-hidden'], 'false');
});

test('the card layer hides and restores only the card', () => {
  const { sync, nodes, hiddenClasses } = fixture();
  hiddenClasses.add('hide-inspector');
  sync();
  assert.equal(nodes['#materialInspector'].inert, true);
  assert.equal(nodes['#materialInspector'].attributes['aria-hidden'], 'true');
  assert.equal(nodes['#typeRail'].inert, false);
  assert.equal(nodes['#materialStory'].inert, false);
  assert.equal(nodes['.stage-copy'].classes.has('all-content-hidden'), false);
  hiddenClasses.delete('hide-inspector');
  sync();
  assert.equal(nodes['#materialInspector'].inert, false);
  assert.equal(nodes['#materialInspector'].attributes['aria-hidden'], 'false');
});

test('quick-focus does not undo a manually hidden card when expanded again', () => {
  const { sync, nodes, hiddenClasses, state } = fixture();
  hiddenClasses.add('hide-inspector');
  state.focusMode = true;
  sync();
  assert.equal(nodes['#typeRail'].inert, true);
  assert.equal(nodes['#materialInspector'].inert, true);
  state.focusMode = false;
  sync();
  assert.equal(nodes['#typeRail'].inert, false);
  assert.equal(nodes['#materialInspector'].inert, true);
  assert.equal(nodes['#materialInspector'].attributes['aria-hidden'], 'true');
});

test('quick-focus restores an enabled card and keeps its accessibility state in sync', () => {
  const { sync, nodes, state } = fixture();
  state.focusMode = true;
  sync();
  assert.equal(nodes['#materialInspector'].attributes['aria-hidden'], 'true');
  state.focusMode = false;
  sync();
  assert.equal(nodes['#materialInspector'].inert, false);
  assert.equal(nodes['#materialInspector'].attributes['aria-hidden'], 'false');
});

test('a visible right card does not prevent hiding the entire left panel', () => {
  const { sync, nodes, hiddenClasses } = fixture();
  for (const name of ['story', 'type-summary', 'type-list']) hiddenClasses.add(`hide-${name}`);
  sync();
  assert.equal(nodes['.stage-copy'].classes.has('all-content-hidden'), true);
  assert.equal(nodes['#materialInspector'].inert, false);
});

test('the new layer control targets the card and supplies all three translations', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const control = html.match(/<button\b[^>]*data-layer="inspector"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(control);
  assert.match(control, /aria-controls="materialInspector"/);
  assert.match(control, /aria-pressed="true"/);
  assert.match(control, /data-i18n="layerInspector"/);
  assert.equal((source.match(/layerInspector:/g) || []).length, 3);
});
