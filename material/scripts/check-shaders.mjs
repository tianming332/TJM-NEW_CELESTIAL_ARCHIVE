import { execFileSync } from 'node:child_process';
const shaders = ['crystal', 'space', 'composite', 'caustic-trace', 'caustic-splat'];
for (const name of shaders) {
  const result = JSON.parse(execFileSync(process.execPath, ['node_modules/vgpu/bin/vgpu.js', 'check', `src/${name}.wgsl`], {encoding:'utf8',maxBuffer:8*1024*1024}));
  if (result.severity === 'error' || result.diagnostics?.some(item=>item.severity==='error') || result.validation?.ok !== true) {
    console.error(JSON.stringify(result,null,2));
    process.exit(1);
  }
  console.log(`PASS ${name}.wgsl (including imported modules)`);
}
