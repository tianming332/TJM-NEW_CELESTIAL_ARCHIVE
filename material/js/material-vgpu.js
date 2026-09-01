let Jt = class extends Error {
  code;
  severity;
  fix;
  where;
  cause;
  detail;
  constructor(e) {
    super(e.message, { cause: e.cause }), this.name = "VGPUError", this.code = e.code, this.severity = e.severity ?? "error", this.fix = e.fix, this.where = e.where, this.cause = e.cause, this.detail = e.detail;
  }
};
class W extends Jt {
  constructor(e) {
    super({ ...e, severity: "error" }), this.name = "ValidationError";
  }
}
function os(t) {
  return new Jt({
    code: "VGPU-FEATURE-UNSUPPORTED",
    message: `Adapter does not support requested feature(s): ${t.map((e) => `"${e}"`).join(", ")}.`,
    fix: "Remove the unsupported name(s) from init({ requiredFeatures: [...] }) or run on an adapter that supports them; gate optional code paths on device.features after init.",
    where: "init"
  });
}
function as(t, e) {
  if (!t)
    return;
  const n = (e ?? []).filter((r) => !t.has(r));
  if (n.length)
    throw os(n);
}
const cs = {
  map_read: 1,
  map_write: 2,
  copy_src: 4,
  copy_dst: 8,
  index: 16,
  vertex: 32,
  uniform: 64,
  storage: 128,
  indirect: 256,
  query_resolve: 512
};
function Je(t) {
  const e = globalThis.GPUBufferUsage;
  return t.reduce((n, r) => n | ls(r, e), 0);
}
function ls(t, e) {
  const n = t.toUpperCase();
  return e?.[n] ?? cs[t];
}
function Sn() {
  return globalThis.GPUMapMode?.READ ?? 1;
}
const us = {
  copy_src: 1,
  copy_dst: 2,
  texture_binding: 4,
  storage_binding: 8,
  render_attachment: 16
};
function ds(t) {
  const e = globalThis.GPUTextureUsage;
  return t.reduce((n, r) => n | fs(r, e), 0);
}
function fs(t, e) {
  const n = t.toUpperCase();
  return e?.[n] ?? us[t];
}
function zr(t) {
  return "__vgpuMockBytes" in t;
}
function En(t) {
  return "__vgpuMockBytes" in t;
}
let ps = 1;
function $t(t) {
  return Object.freeze({ kind: t, id: ps++ });
}
class Lt {
  callbacks = /* @__PURE__ */ new Set();
  destroyed = !1;
  onDestroy(e, n) {
    return this.destroyed ? (n(e), () => {
    }) : (this.callbacks.add(n), () => {
      this.callbacks.delete(n);
    });
  }
  emit(e) {
    if (this.destroyed)
      return !1;
    this.destroyed = !0;
    const n = [...this.callbacks];
    this.callbacks.clear();
    for (const r of n)
      r(e);
    return !0;
  }
}
class le {
  device;
  gpu;
  options;
  ownership;
  destroySignal = new Lt();
  identity = $t("buffer");
  destroyed = !1;
  constructor(e, n, r, i = "owned") {
    this.device = e, this.gpu = n, this.options = r, this.ownership = i, Object.defineProperty(this, "assertUsable", { value: (s) => this.#e(s) });
  }
  get resourceIdentity() {
    return this.identity;
  }
  onDestroy(e) {
    return this.destroySignal.onDestroy(this, e);
  }
  #e(e = "Buffer") {
    if (this.destroyed)
      throw new W({
        code: "VGPU-BUFFER-DISPOSED",
        message: "Buffer is destroyed.",
        where: e,
        fix: "Wrap or create a live GPUBuffer before using it."
      });
    this.device.assertUsable(e);
  }
  write(e, n = 0) {
    this.#e("Buffer.write"), this.ownership === "external" && this.validateExternalOperation("write", n, e.byteLength, "copy_dst");
    try {
      this.device.queue.writeBuffer(this.gpu, n, e);
    } catch (r) {
      throw this.ownership !== "external" ? r : et("Buffer.write", "The external GPUBuffer rejected the write operation.", r);
    }
  }
  async read(e, n = 0) {
    this.#e("Buffer.read"), this.ownership === "external" && this.validateExternalOperation("read", n, e, "copy_src");
    try {
      const r = await this.device.readback.read(this.gpu, e, n);
      return this.#e("Buffer.read"), r;
    } catch (r) {
      throw r instanceof W || this.ownership !== "external" ? r : et("Buffer.read", "The external GPUBuffer rejected the read operation.", r);
    }
  }
  destroy() {
    this.destroyed || (this.destroyed = !0, this.destroySignal.emit(this), this.ownership === "owned" && !zr(this.gpu) && this.gpu.destroy());
  }
  dispose() {
    this.destroy();
  }
  validateExternalOperation(e, n, r, i) {
    if (!(Number.isSafeInteger(n) && n >= 0 && n % 4 === 0 && Number.isSafeInteger(r) && r >= 0 && r % 4 === 0 && n <= this.options.size && r <= this.options.size - n))
      throw et(`Buffer.${e}`, "External buffer offsets and lengths must be non-negative, 4-byte aligned, and within the buffer size.");
    if ((this.gpu.usage & Je([i])) === 0)
      throw et(`Buffer.${e}`, `External buffer is missing ${i.toUpperCase()} usage.`);
  }
}
function et(t, e, n) {
  return new W({
    code: "VGPU-EXTERNAL-BUFFER-VALIDATION",
    message: e,
    where: t,
    cause: n,
    fix: "Use a buffer with the required usage flags and an aligned in-range operation."
  });
}
function hs(t) {
  if (bs(t))
    throw ys();
  const e = { version: 1, mappings: [] }, n = {
    version: 1,
    modules: [{ path: "<runtime>", text: t }],
    diagnostics: [],
    sourceMap: e,
    cacheKey: ms(t)
  };
  return {
    kind: "wgsl",
    wgsl: t,
    source: { text: t, path: "<runtime>", imports: [] },
    ast: n,
    sourceMap: e,
    diagnostics: [],
    cacheKey: n.cacheKey,
    entryPoints: gs(t),
    stats: { lines: t.split(/\r?\n/).length, bytes: new TextEncoder().encode(t).byteLength, bindGroups: 0 }
  };
}
function ms(t) {
  let e = 2166136261;
  for (let n = 0; n < t.length; n++)
    e = Math.imul(e ^ t.charCodeAt(n), 16777619);
  return { default: `vgpu-wgsl-1:${(e >>> 0).toString(16).padStart(8, "0")}` };
}
function gs(t) {
  const e = [], n = /@(vertex|fragment|compute)\s+fn\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const r of t.matchAll(n))
    e.push(r[2]);
  return e;
}
function bs(t) {
  const e = t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trimStart();
  return e.startsWith("import ") || e.startsWith("import{");
}
function ys() {
  const t = new Error("Runtime WGSL strings cannot contain import statements. Use a build-time loader or @vgpu/wgsl/runtime.");
  return t.name = "VGPUWGSLRuntimeImportError", t.code = "VGPU-WGSL-RUNTIME-IMPORT", t.severity = "error", t.source = "wgsl", t;
}
const Tn = Je(["copy_dst", "map_read"]);
class xs {
  device;
  constructor(e) {
    this.device = e;
  }
  async read(e, n, r) {
    if (zr(e))
      return e.__vgpuMockBytes.slice(r, r + n).buffer;
    const i = this.device.createBuffer({
      size: n,
      usage: Tn
    });
    try {
      const s = this.device.createCommandEncoder();
      s.copyBufferToBuffer(e, r, i, 0, n), this.device.queue.submit([s.finish()]), await i.mapAsync(Sn());
      const a = i.getMappedRange().slice(0);
      return In(i), a;
    } finally {
      Cn(i);
    }
  }
  async readTexture(e, n, r) {
    const [i, s] = n, a = yt(r, "Readback.readTexture"), o = a.bytesPerPixel, c = ws(i * o, 256), l = c * s, d = this.device.createBuffer({ size: l, usage: Tn });
    let u;
    try {
      const p = this.device.createCommandEncoder();
      p.copyTextureToBuffer({ texture: e }, { buffer: d, bytesPerRow: c, rowsPerImage: s }, { width: i, height: s }), this.device.queue.submit([p.finish()]), await d.mapAsync(Sn());
      const m = new Uint8Array(d.getMappedRange());
      u = new Uint8Array(i * s * o);
      for (let b = 0; b < s; b++) {
        const g = b * c, $ = b * i * o;
        u.set(m.subarray(g, g + i * o), $);
      }
      In(d);
    } finally {
      Cn(d);
    }
    return a.swizzle === "bgra-to-rgba" && Ur(u), u;
  }
  destroy() {
  }
}
function In(t) {
  try {
    t.unmap();
  } catch {
  }
}
function Cn(t) {
  try {
    t.destroy();
  } catch {
  }
}
function ws(t, e) {
  return Math.ceil(t / e) * e;
}
const $n = {
  r8unorm: { bytesPerPixel: 1, components: 1, componentType: "unorm8" },
  rg8unorm: { bytesPerPixel: 2, components: 2, componentType: "unorm8" },
  rgba8unorm: { bytesPerPixel: 4, components: 4, componentType: "unorm8" },
  "rgba8unorm-srgb": { bytesPerPixel: 4, components: 4, componentType: "unorm8" },
  bgra8unorm: { bytesPerPixel: 4, components: 4, componentType: "unorm8", swizzle: "bgra-to-rgba" },
  "bgra8unorm-srgb": { bytesPerPixel: 4, components: 4, componentType: "unorm8", swizzle: "bgra-to-rgba" },
  r16float: { bytesPerPixel: 2, components: 1, componentType: "float16" },
  rg16float: { bytesPerPixel: 4, components: 2, componentType: "float16" },
  rgba16float: { bytesPerPixel: 8, components: 4, componentType: "float16" },
  r32float: { bytesPerPixel: 4, components: 1, componentType: "float32" },
  rg32float: { bytesPerPixel: 8, components: 2, componentType: "float32" },
  rgba32float: { bytesPerPixel: 16, components: 4, componentType: "float32" }
};
function yt(t, e) {
  const n = $n[t];
  if (n)
    return n;
  throw new W({
    code: "VGPU-CORE-UNSUPPORTED-FORMAT",
    message: `Texture.read does not support format ${t}. Supported formats: ${Object.keys($n).join(", ")}.`,
    where: e
  });
}
function vs(t, e, n = "Texture.readFloats") {
  const r = yt(e, n), i = r.bytesPerPixel / r.components, s = Math.floor(t.byteLength / i), a = new Float32Array(s), o = new DataView(t.buffer, t.byteOffset, t.byteLength);
  for (let c = 0; c < s; c++)
    r.componentType === "unorm8" ? a[c] = o.getUint8(c) / 255 : r.componentType === "float16" ? a[c] = Ss(o.getUint16(c * 2, !0)) : a[c] = o.getFloat32(c * 4, !0);
  return a;
}
function Ss(t) {
  const e = t & 32768 ? -1 : 1, n = t >> 10 & 31, r = t & 1023;
  return n === 0 ? e * r * 2 ** -24 : n === 31 ? r === 0 ? e * Number.POSITIVE_INFINITY : Number.NaN : e * (r + 1024) * 2 ** (n - 25);
}
function Es(t, e, n) {
  const r = t.slice(0, e[0] * e[1] * n.bytesPerPixel);
  return n.swizzle === "bgra-to-rgba" && Ur(r), r;
}
function Ur(t) {
  for (let e = 0; e < t.length; e += 4) {
    const n = t[e];
    t[e] = t[e + 2], t[e + 2] = n;
  }
}
function Ts(t) {
  return { size: t, usage: Je(["copy_src", "copy_dst"]) };
}
class Is {
  gpu;
  guard;
  constructor(e, n = () => {
  }) {
    this.gpu = e, this.guard = n;
  }
  writeBuffer(e, n, r) {
    this.guard("Queue.writeBuffer"), this.gpu.writeBuffer(e, n, r);
  }
  async flush() {
    this.guard("Queue.flush"), await this.gpu.onSubmittedWorkDone?.(), this.guard("Queue.flush");
  }
}
class Cs {
  gpu;
  resolved;
  constructor(e, n) {
    this.gpu = e, this.resolved = n;
  }
  dispose() {
  }
  get kind() {
    return this.resolved.kind;
  }
  get source() {
    return this.resolved.source;
  }
  get code() {
    return this.resolved.wgsl;
  }
  get entryPoints() {
    return this.resolved.entryPoints;
  }
  get stats() {
    return this.resolved.stats;
  }
}
const $s = /* @__PURE__ */ Symbol.for("vgpu/Texture"), Ls = /* @__PURE__ */ Symbol.for("vgpu/Texture/resizeLock");
class Me {
  device;
  ownership;
  [$s] = !0;
  destroySignal = new Lt();
  identity = $t("texture");
  currentGpu;
  currentOptions;
  defaultView = null;
  resizeLock;
  destroyed = !1;
  constructor(e, n, r, i = "owned") {
    this.device = e, this.ownership = i, this.currentGpu = n, this.currentOptions = r, Object.defineProperty(this, Ls, {
      value: (s) => {
        this.resizeLock = s;
      }
    });
  }
  get gpu() {
    return this.currentGpu;
  }
  get options() {
    return this.currentOptions;
  }
  get size() {
    return this.options.size;
  }
  get format() {
    return this.options.format;
  }
  get usage() {
    return this.options.usage;
  }
  get mipLevelCount() {
    return this.options.mipLevelCount ?? 1;
  }
  get sampleCount() {
    return this.options.sampleCount ?? 1;
  }
  get dimension() {
    return this.options.dimension ?? "2d";
  }
  get viewFormats() {
    return this.options.viewFormats ?? [];
  }
  get label() {
    return this.options.label;
  }
  get resourceIdentity() {
    return this.identity;
  }
  onDestroy(e) {
    return this.destroySignal.onDestroy(this, e);
  }
  get view() {
    return this.assertAlive(), this.defaultView ??= this.createView(), this.defaultView;
  }
  createView(e) {
    return this.assertAlive("Texture.createView"), this.gpu.createView(e);
  }
  resize(e) {
    if (this.assertAlive(), this.ownership === "external")
      throw new W({
        code: "VGPU-CORE-EXTERNAL-TEXTURE",
        message: "Texture wraps an externally owned GPUTexture and cannot be resized.",
        where: "Texture.resize"
      });
    if (this.resizeLock)
      throw new W({
        code: "VGPU-CORE-TEXTURE-RESIZE-LOCKED",
        message: this.resizeLock,
        where: "Texture.resize"
      });
    const n = this.options.size[2] ?? 1, r = e[2] ?? n;
    if (this.options.size[0] === e[0] && this.options.size[1] === e[1] && n === r)
      return !1;
    const i = e[2] === void 0 && this.options.size[2] === void 0 ? [e[0], e[1]] : [e[0], e[1], r], s = { ...this.options, size: i }, a = this.gpu;
    return this.currentGpu = this.device.gpu.createTexture(Nr(s)), this.currentOptions = s, this.defaultView = null, a.destroy(), !0;
  }
  /**
   * Raw, unpadded texel bytes in this texture's own format (row stride padding removed).
   * `byteLength` is `width * height * bytesPerPixel(format)`; `bgra*` bytes are swizzled to RGBA order.
   * Use `readFloats()` for float formats to get decoded component values.
   */
  async read() {
    this.assertAlive("Texture.read");
    const e = yt(this.options.format, "Texture.read");
    if (En(this.gpu))
      return Es(this.gpu.__vgpuMockBytes, this.options.size, e);
    const n = await this.device.readback.readTexture(this.gpu, this.options.size, this.options.format);
    return this.assertAlive("Texture.read"), n;
  }
  /**
   * Texel components decoded to f32, row-major, `width * height * components(format)` long.
   * `float16`/`float32` formats keep their HDR values (no clamping); `unorm8` formats are
   * normalized to `[0, 1]` without srgb gamma conversion.
   */
  async readFloats() {
    return yt(this.options.format, "Texture.readFloats"), vs(await this.read(), this.options.format);
  }
  destroy() {
    this.destroyed || (this.destroyed = !0, this.defaultView = null, this.destroySignal.emit(this), this.ownership !== "external" && (En(this.gpu) || this.gpu.destroy()));
  }
  dispose() {
    this.destroy();
  }
  assertAlive(e = "Texture") {
    if (this.destroyed)
      throw new W({ code: "VGPU-CORE-TEXTURE-DESTROYED", message: "Texture is destroyed", where: e });
    this.device.assertUsable?.(e);
  }
}
function Nr(t) {
  const e = {
    label: t.label,
    size: { width: t.size[0], height: t.size[1], depthOrArrayLayers: t.size[2] ?? 1 },
    format: t.format,
    usage: ds(t.usage)
  };
  return t.mipLevelCount !== void 0 && (e.mipLevelCount = t.mipLevelCount), t.sampleCount !== void 0 && (e.sampleCount = t.sampleCount), t.dimension !== void 0 && (e.dimension = t.dimension), t.viewFormats !== void 0 && (e.viewFormats = [...t.viewFormats]), e;
}
class Ps {
  gpu;
  adapterInfo;
  queue;
  /** @internal — use Buffer.read() and Texture.read() instead */
  readback;
  isCompatibilityMode;
  scopes = [];
  ownership;
  state = "alive";
  lossInfo;
  observeLoss = !0;
  constructor(e, n = null, r = "owned", i = {}) {
    this.gpu = e, this.adapterInfo = n, Object.defineProperty(this, "assertUsable", { value: (o) => this.#e(o) }), this.ownership = typeof r == "string" ? r : "owned";
    const s = typeof r == "string" ? i : r;
    this.isCompatibilityMode = s.isCompatibilityMode ?? !1, this.queue = new Is(e.queue, (o) => this.#e(o)), this.readback = new xs(e);
    const a = e.lost;
    a && typeof a.then == "function" && Promise.resolve(a).then((o) => {
      !this.observeLoss || this.state !== "alive" || (this.lossInfo = o, this.state = "lost");
    }, () => {
    });
  }
  get limits() {
    return this.#e("Device.limits"), this.gpu.limits;
  }
  get features() {
    return this.#e("Device.features"), this.gpu.features;
  }
  createShader(e) {
    this.#e("Device.createShader");
    const n = typeof e == "string" ? hs(e) : e;
    return new Cs(this.gpu.createShaderModule({ code: n.wgsl }), n);
  }
  createTexture(e) {
    return this.#e("Device.createTexture"), new Me(this, this.gpu.createTexture(Nr(e)), e);
  }
  createBuffer(e) {
    this.#e("Device.createBuffer");
    const n = ks(e);
    n && this.captureError(n);
    const r = n ? Ts(Math.max(4, e.size || 4)) : As(e);
    return new le(this, this.gpu.createBuffer(r), e);
  }
  /** Wraps a caller-owned GPUBuffer without taking ownership of its native lifetime. */
  wrapBuffer(e) {
    if (this.#e("Device.wrapBuffer"), !Ms(e))
      throw new W({
        code: "VGPU-EXTERNAL-BUFFER-INVALID",
        message: "Device.wrapBuffer requires a GPUBuffer with finite size and usage properties.",
        where: "Device.wrapBuffer",
        fix: "Pass a live GPUBuffer created for this GPUDevice."
      });
    const n = {
      size: e.size,
      usage: Ds(e.usage),
      ...e.label ? { label: e.label } : {}
    };
    return new le(this, e, n, "external");
  }
  pushErrorScope(e) {
    this.#e("Device.pushErrorScope"), this.scopes.push([]), this.gpu.pushErrorScope?.(e);
  }
  async popErrorScope() {
    this.#e("Device.popErrorScope");
    const e = this.scopes.pop(), n = await this.gpu.popErrorScope?.();
    return this.#e("Device.popErrorScope"), e?.[0] ?? Fs(n) ?? null;
  }
  #e(e) {
    if (this.state === "alive")
      return;
    if (this.state === "disposed")
      throw new W({
        code: "VGPU-DEVICE-DISPOSED",
        message: "The GPU device wrapper has been disposed.",
        where: e,
        fix: "Create a new Gpu instance before performing more work."
      });
    const n = this.lossInfo?.reason, r = this.lossInfo?.message;
    throw new W({
      code: "VGPU-DEVICE-LOST",
      message: `The GPU device was lost${n ? ` (${n})` : ""}${r ? `: ${r}` : "."}`,
      where: e,
      cause: this.lossInfo
    });
  }
  destroy() {
    if (this.state === "disposed")
      return;
    const e = this.state === "lost";
    this.state = "disposed", this.observeLoss = !1, this.scopes.length = 0, this.readback.destroy(), this.ownership === "owned" && !e && this.gpu.destroy();
  }
  dispose() {
    this.destroy();
  }
  captureError(e) {
    const n = this.scopes.at(-1);
    if (n)
      n.push(e);
    else
      throw e;
  }
}
function ks(t) {
  return !Number.isFinite(t.size) || t.size <= 0 ? Ln("Buffer size must be greater than zero.") : t.usage.length === 0 ? Ln("Buffer usage must not be empty.") : null;
}
function Ln(t) {
  return new W({ code: "VGPU-CORE-INVALID-USAGE", message: t, where: "Device.createBuffer" });
}
function As(t) {
  return { label: t.label, size: t.size, usage: Je(t.usage) };
}
function Fs(t) {
  return t ? new W({ code: "VGPU-CORE-VALIDATION", message: t.message, where: "GPUDevice.popErrorScope", cause: t }) : null;
}
function Ms(t) {
  if (typeof t != "object" && typeof t != "function" || t === null)
    return !1;
  const e = t;
  return Number.isSafeInteger(e.size) && (e.size ?? -1) >= 0 && Number.isSafeInteger(e.usage) && (e.usage ?? -1) >= 0 && typeof e.destroy == "function";
}
const Rs = ["map_read", "map_write", "copy_src", "copy_dst", "index", "vertex", "uniform", "storage", "indirect", "query_resolve"];
function Ds(t) {
  return Rs.filter((e) => (t & Je([e])) !== 0);
}
const Or = /* @__PURE__ */ new WeakMap(), Gs = /* @__PURE__ */ new WeakMap();
function zs(t, e) {
  return Or.set(t, Us(e)), t;
}
function je(t) {
  return Or.get(t);
}
function Br(t) {
  return Gs.get(t);
}
function Us(t) {
  return { entries: t.entries.map((e) => ({ ...e })) };
}
let v = class extends Jt {
};
function Ns(t, e, n, r, i, s) {
  const a = e === "vertex" ? "Vertex" : "Fragment", o = e === "vertex" ? "VERTEX" : "FRAGMENT", c = `maxStorageBuffersIn${a}Stage`;
  return new v({
    code: `VGPU-LIMIT-STORAGE-${o}`,
    message: `${a} entry '${n}' in '${t}' uses ${r} storage buffer(s), but device limit ${c} is ${i}.`,
    fix: e === "vertex" ? `Request init({ requiredLimits: { ${c}: ${r} } }) if the adapter supports it, or move vertex data to geometry(gpu, ...) vertex streams.` : `Request init({ requiredLimits: { ${c}: ${r} } }) if the adapter supports it, or reduce fragment storage buffers.`,
    where: `${t}.pipelineLayout`,
    detail: { stage: e, entryPoint: n, count: r, limit: i, bindings: s.map(({ name: l, group: d, binding: u }) => ({ name: l, group: d, binding: u })) }
  });
}
function Os(t, e, n, r, i) {
  return new v({
    code: "VGPU-SET-TEXTURE-FILTERABILITY",
    message: `${r} (${n}) cannot satisfy filtering texture '${e.name}' @group(${e.group}) @binding(${e.binding}).`,
    fix: "Use a filterable format; request float32-filterable for rgba32float when supported; or use textureLoad without a sampler.",
    where: `${t}.set`,
    detail: { format: n, group: e.group, binding: e.binding, bindingName: e.name, resourceName: r, samplerName: i?.name, samplerGroup: i?.group, samplerBinding: i?.binding }
  });
}
function Bs(t, e) {
  const n = yo(t, e);
  return new v({
    code: "VGPU-R1-BINDING-NEVER-SET",
    message: `Unset \`${e.name}\` @group(${e.group}) @binding(${e.binding}) in '${t}'. Fix: ${n}; or ${t}.group(${e.group}, bindGroup).`,
    where: `${t}.draw`
  });
}
function Vr(t, e) {
  const n = e === "lib" ? "lib-owned by its first JS set()" : "user-owned by its first resource set()", r = e === "lib" ? `Fix: pass a resource from the start: wave.set({ ${t}: new Uniform(gpu.device, { size: 4 }) }).` : `Fix: pass JS values from the first set(): wave.set({ ${t}: jsValue }).`;
  return new v({
    code: "VGPU-R1-OWNERSHIP-FLIP",
    message: `\`${t}\` is ${n}; ownership cannot change. ${r}`,
    where: "set"
  });
}
function Vs(t, e) {
  return new v({
    code: "VGPU-R4-GROUP-CLAIMED",
    message: `group ${e} of '${t}' is claimed; set() cannot update it.`,
    fix: `Call set() first, or build from ${t}.layout(${e}); pass dynamic offsets to p.draw().`,
    where: `${t}.set`
  });
}
function _s(t, e, n, r) {
  return new v({
    code: "VGPU-R4-GROUP-INCOMPATIBLE",
    message: `claimed group ${e} in '${t}' is incompatible: ${n}.`,
    fix: `Build from ${t}.layout(${e}, { dynamicOffsets? }) then call ${t}.group(${e}, bindGroup).`,
    where: `${t}.group`,
    cause: r
  });
}
function Le(t, e, n) {
  return new v({
    code: "VGPU-R4-GROUP-VALIDATION",
    message: `WebGPU rejected claimed group ${e} in '${t}'.`,
    fix: `Build from ${t}.layout(${e}); pass offsets via p.draw(draw, { offsets: { ${e}: [...] } }).`,
    where: `${t}.draw`,
    cause: n,
    detail: { drawLabel: t, group: e }
  });
}
function Pn(t, e) {
  return new v({
    code: "VGPU-BLEND-INVALID",
    message: `Invalid blend '${String(e)}' in '${t}'.`,
    fix: 'Use "alpha", "additive", "premultiplied", or { color, alpha? } components.',
    where: "draw"
  });
}
function kn(t, e) {
  return new v({
    code: "VGPU-BLEND-CONSTANT-INVALID",
    message: `Invalid blendConstant in '${t}': ${e}`,
    fix: 'Use [r, g, b, a] finite numbers with a blend whose color or alpha uses "constant"/"one-minus-constant"; omit it to keep the pass default (0, 0, 0, 0).',
    where: "draw"
  });
}
function An(t, e) {
  return new v({
    code: "VGPU-WRITEMASK-INVALID",
    message: `Invalid writeMask ${e} in '${t}'.`,
    fix: "Use an array of r/g/b/a; omit it for all channels.",
    where: "draw"
  });
}
function Ot(t, e, n = "draw") {
  return new v({
    code: "VGPU-COLORS-INVALID",
    message: `Invalid colors in '${t}': ${e}`,
    fix: "Use one { blend?, writeMask? } or null entry per color attachment of the target, aligned by index; omit colors to apply the top-level blend/writeMask to every attachment.",
    where: n
  });
}
function js(t, e) {
  return new v({
    code: "VGPU-CULL-INVALID",
    message: `Invalid cull '${String(e)}' in '${t}'.`,
    fix: 'Use "none", "front", or "back"; omit it for no culling.',
    where: "draw"
  });
}
function Ws(t, e) {
  return new v({
    code: "VGPU-FRONTFACE-INVALID",
    message: `Invalid frontFace '${String(e)}' in '${t}'.`,
    fix: 'Use "ccw" or "cw"; omit it for counter-clockwise.',
    where: "draw"
  });
}
function Fn(t, e) {
  return new v({
    code: "VGPU-UNCLIPPED-DEPTH-INVALID",
    message: `Invalid unclippedDepth in '${t}': ${e}`,
    fix: 'Use a boolean. unclippedDepth: true needs the "depth-clip-control" device feature — request it with init({ requiredFeatures: ["depth-clip-control"] }) on an adapter that supports it. Omit the option to keep depth clipping.',
    where: "draw"
  });
}
function J(t, e) {
  return new v({
    code: "VGPU-DEPTH-INVALID",
    message: `Invalid depth in '${t}': ${e}`,
    fix: 'Use false or { write?, compare?, bias?, biasSlopeScale?, biasClamp? }; omit it for { write: true, compare: "less-equal" }.',
    where: "draw"
  });
}
function Ee(t, e, n = "draw") {
  return new v({
    code: "VGPU-STENCIL-INVALID",
    message: `Invalid stencil in '${t}': ${e}`,
    fix: `Use { front?, back?, readMask?, writeMask?, ref? } with GPUCompareFunction/GPUStencilOperation faces and u32 masks, against a target whose depth format has a stencil aspect (depth: "depth24plus-stencil8"); omit it for WebGPU's pass-through defaults.`,
    where: n
  });
}
function dt(t, e, n = "draw") {
  return new v({
    code: "VGPU-MULTISAMPLE-INVALID",
    message: `Invalid multisample in '${t}': ${e}`,
    fix: "Use { alphaToCoverage?, mask? }: alphaToCoverage needs a target created with msaa: true, and mask must be an integer in [0, 0xFFFFFFFF] (bits above the target's sampleCount are ignored). Omit multisample for full-coverage defaults.",
    where: n
  });
}
function tt(t, e, n = "draw") {
  return new v({
    code: "VGPU-CONSTANTS-INVALID",
    message: `Invalid constants in '${t}': ${e}`,
    fix: "Key WGSL `override` constants by name, or by the decimal string of N when the declaration has @id(N); values are finite numbers or booleans, converted to the override's WGSL type (bool/i32/u32/f32/f16). Every override without a default value must be provided. Omit constants to keep the WGSL defaults.",
    where: n
  });
}
function ft(t, e, n = "draw") {
  return new v({
    code: "VGPU-ENTRY-INVALID",
    message: `Invalid entry in '${t}': ${e}`,
    fix: "Name an entry point declared in the shader with the matching stage — { vertex?, fragment? } strings for draw, one @compute name string for compute. Omit entry (or a field) to use the first entry point of that stage.",
    where: n
  });
}
function ve(t, e, n) {
  return new v({
    code: "VGPU-INDIRECT-INVALID",
    message: `Invalid indirect in '${t}': ${e}`,
    fix: "Pass a storage buffer created with storage(gpu, bytes, { indirect: true }) — bare, or as { buffer, offset? } with a 4-aligned byte offset — sized so the GPU-read arguments fit: 16 bytes for drawIndirect, 20 for drawIndexedIndirect, 12 for dispatchWorkgroupsIndirect. Omit indirect to use CPU-side counts.",
    where: n
  });
}
function qs() {
  return new v({
    code: "VGPU-PASS-PRESERVE-MSAA",
    message: "clear:false cannot preserve MSAA; use a non-MSAA target.",
    fix: "Use non-MSAA for accumulation.",
    where: "Frame.pass"
  });
}
function Mn(t, e = "expected a number in [0, 1].", n = 'Use 1 (default), or 0 with depth: { compare: "greater" } for reversed-Z.') {
  return new v({
    code: "VGPU-PASS-CLEARDEPTH-INVALID",
    message: `clearDepth received ${String(t)}; ${e}`,
    fix: n,
    where: "Frame.pass"
  });
}
function Q(t) {
  return new v({
    code: "VGPU-PASS-VIEWPORT-INVALID",
    message: `Invalid viewport: ${t}`,
    fix: "Use { x?, y?, width, height, minDepth?, maxDepth? } finite numbers within device limits; omit it for the full target.",
    where: "Frame.pass"
  });
}
function At(t) {
  return new v({
    code: "VGPU-PASS-SCISSOR-INVALID",
    message: `Invalid scissor: ${t}`,
    fix: "Use [x, y, width, height] non-negative integers with x + width and y + height within the target's current pixel size; omit it for the full target.",
    where: "Frame.pass"
  });
}
function Hs() {
  return new v({
    code: "VGPU-PASS-PRESERVE-CLEARDEPTH",
    message: "clear:false preserves depth; clearDepth cannot apply.",
    fix: "Remove clearDepth, or let the pass clear.",
    where: "Frame.pass"
  });
}
function Rn(t) {
  return new v({
    code: "VGPU-PASS-CLEARSTENCIL-INVALID",
    message: `clearStencil ${t}`,
    fix: `Use an integer in [0, 0xFFFFFFFF] on a target whose depth format has a stencil aspect, e.g. depth: "depth24plus-stencil8"; the value is masked to the stencil aspect's bit width.`,
    where: "Frame.pass"
  });
}
function Ks() {
  return new v({
    code: "VGPU-PASS-PRESERVE-CLEARSTENCIL",
    message: "clear:false preserves stencil; clearStencil cannot apply.",
    fix: "Remove clearStencil, or let the pass clear.",
    where: "Frame.pass"
  });
}
function me(t, e, n = "Frame.pass") {
  return new v({
    code: "VGPU-PASS-DEPTH-READONLY",
    message: `depthReadOnly ${t}`,
    fix: e,
    where: n
  });
}
function Ys() {
  return new v({
    code: "VGPU-PASS-DEPTH-READONLY-MSAA",
    message: `depthReadOnly cannot read an MSAA target's depth: multisampled depth is stored with storeOp "discard", so a read-only pass tests against discarded contents.`,
    fix: "Use a non-MSAA target for read-only depth, or drop depthReadOnly and let the pass own its depth.",
    where: "Frame.pass"
  });
}
function Xs(t, e, n = "timer") {
  return new v({
    code: "VGPU-TIMER-INVALID",
    message: `Invalid timer use: ${t}`,
    fix: e,
    where: n
  });
}
function Js(t, e, n = "visibility") {
  return new v({
    code: "VGPU-VIS-INVALID",
    message: `Invalid visibility use: ${t}`,
    fix: e,
    where: n
  });
}
function Qs() {
  return new v({
    code: "VGPU-QUERY-NO-VISIBILITY",
    message: "occlusion() needs the pass to be opened with a visibility instance; the render pass has no occlusionQuerySet to write into.",
    fix: "Open the pass with f.pass({ target, visibility: vis }, ...) using the visibility(gpu) instance that created the query handle.",
    where: "FramePass.occlusion"
  });
}
function Zs() {
  return new v({
    code: "VGPU-QUERY-NESTED",
    message: "occlusion() cannot nest inside an active occlusion() body; WebGPU allows one active occlusion query per pass at a time.",
    fix: "Encode each occlusion scope sequentially: p.occlusion(a, ...); p.occlusion(b, ...).",
    where: "FramePass.occlusion"
  });
}
function Bt(t = "Frame.pass") {
  return new v({
    code: "VGPU-TARGET-REQUIRED",
    message: "Target required. Fix: pass surface(gpu, canvas) or target(gpu, { size }) as { target }.",
    where: t
  });
}
function X(t, e, n, r) {
  return new v({ code: t, message: `${t}: ${n}`, fix: r, where: e });
}
function U(t, e) {
  return X("VGPU-MESH-LAYOUT-INVALID", t, e, "Fix attributes/formats/offsets; use non-numeric names and 4-aligned stride <= 2048.");
}
function Dn(t, e) {
  return X("VGPU-MESH-LIMIT-EXCEEDED", t, e, "Use <= 8 buffers and <= 16 attributes (or the device limits).");
}
function Gn(t, e) {
  return X("VGPU-MESH-LOCATION-CONFLICT", t, `Duplicate geometry @location(${e}).`, "Use unique locations, or omit them for name matching.");
}
function _r(t, e) {
  return X("VGPU-MESH-DATA-MISALIGNED", t, e, "Fix: repack data, set matching stride, or give raw buffers an explicit count.");
}
function Pe(t, e) {
  return X("VGPU-MESH-RANGE-INVALID", t, e, "Use index ranges for indexed geometries, vertex ranges otherwise, within geometry counts.");
}
function Te(t, e) {
  return X("VGPU-MESH-WRITE-RANGE", t, e, "Write within the buffer byteLength, or create a larger geometry.");
}
function eo(t, e, n = []) {
  return X("VGPU-MESH-ATTRIBUTE-UNMATCHED", t, `Geometry attribute '${e}' has no shader input.`, `Use shader name${n.length ? ` (${n.join(",")})` : ""} or { location:n }.`);
}
function to(t, e, n) {
  return X("VGPU-MESH-ATTRIBUTE-UNMATCHED", t, `Geometry attribute '${e}' matches locations ${n.join(",")}.`, "Rename inputs or set { location:n }.");
}
function no(t, e, n = []) {
  return X("VGPU-MESH-INPUT-MISSING", t, `Geometry lacks shader input '${e}'.`, `Add/remove it. Geometry attributes: ${n.join(",") || "none"}.`);
}
function ro(t, e, n, r) {
  return X("VGPU-MESH-FORMAT-MISMATCH", t, `Attribute '${e}' ${n} != shader ${r}.`, "Match the float/sint/uint shader base type; widths may differ.");
}
function io(t) {
  return new v({
    code: "VGPU-PIPELINE-LAYOUT-GAP",
    message: `Pipeline bind group ${t} is missing.`,
    fix: "Use consecutive @group() indices starting at 0.",
    where: "pipeline layout"
  });
}
function Oe(t, e, n) {
  return new v({
    code: "VGPU-COMPILE-FAILED",
    message: "WebGPU pipeline compilation failed.",
    fix: "Check WGSL, vertex layouts, and target signature.",
    where: t,
    cause: e,
    detail: n ? { signature: n } : void 0
  });
}
function zn(t) {
  return new v({
    code: "VGPU-COMPILE-DISPOSED",
    message: "GPU disposed during pipeline compilation.",
    where: t
  });
}
function nt(t, e) {
  return new v({
    code: "VGPU-COMPILE-SIGNATURE-INVALID",
    message: `Invalid TargetSignature: ${e}`,
    fix: "Pass { colors, depth?, sampleCount?:1|4 } or a Target.",
    where: t
  });
}
function so(t) {
  return new v({
    code: "VGPU-TARGET-DEPTH-STENCIL-ONLY",
    message: `depth received '${t}'; stencil-only depth targets are not supported yet.`,
    fix: 'Use a format with a depth aspect such as "depth24plus" or "depth24plus-stencil8".',
    where: "target"
  });
}
function jr() {
  return new v({
    code: "VGPU-TARGET-SIZE-REQUIRED",
    message: "Target size required. Fix: target(gpu, { size: [w,h] }); update surface-derived targets in onResize.",
    where: "target"
  });
}
function Wr(t) {
  return new v({
    code: "VGPU-SURFACE-NOT-IN-FRAME",
    message: "Surface targets are only available inside frame(gpu).",
    fix: "surface passes must run inside frame(gpu, ...); precompile against an offscreen target(gpu, ...) instead",
    where: t
  });
}
function oo() {
  return new v({
    code: "VGPU-SURFACE-CONTEXT",
    message: "Canvas WebGPU context failed. Fix: check navigator.gpu and remove any existing 2d/webgl context.",
    where: "surface"
  });
}
function ao(t) {
  return new v({
    code: "VGPU-SURFACE-DUPLICATE",
    message: `Canvas already has surface${t ? ` '${t}'` : ""}. Fix: reuse or dispose it.`,
    where: "surface"
  });
}
function co(t) {
  return new v({
    code: "VGPU-SURFACE-DISPOSED",
    message: `Surface '${t ?? "surface"}' is disposed. Fix: call surface(gpu, canvas).`,
    where: "surface"
  });
}
function lo() {
  return new v({
    code: "VGPU-SURFACE-AUTORESIZE-UNSUPPORTED",
    message: "autoResize needs clientWidth. Fix: call surface.resize([w,h]) for OffscreenCanvas; onResize still fires.",
    where: "surface"
  });
}
function uo(t) {
  return new v({
    code: "VGPU-SURFACE-RESIZE-REENTRANT",
    message: `Cannot resize this surface${t ? ` '${t}'` : ""} in onResize. Fix: resize derived targets only.`,
    where: "surface.resize"
  });
}
function fo(t) {
  return new v({
    code: "VGPU-CLEAR-COLOR-INVALID",
    message: `Invalid ${t}: expected four finite numbers.`,
    fix: "Assign [r, g, b, a] or a GPUColor object ({ r, g, b, a }).",
    where: t
  });
}
function po(t) {
  return new v({
    code: "VGPU-CLOCK-DELTA-INVALID",
    message: `clock.advance() received ${String(t)}; expected a finite, non-negative number of seconds.`,
    fix: "Pass the elapsed seconds, e.g. clock(gpu).advance(1 / 60); use frame(gpu) alone to advance with wall-clock time.",
    where: "clock.advance"
  });
}
function qr() {
  return new v({
    code: "VGPU-FRAME-REENTRANT",
    message: "Nested frame(gpu) is invalid. Fix: queue work for the next frame.",
    where: "frame"
  });
}
function Un(t) {
  return new v({
    code: "VGPU-FRAME-CANCELED",
    message: "the frame was canceled; its command encoder was dropped and nothing more can be encoded or submitted on it.",
    fix: "Open a new frame(gpu) for further work; cancel() is the last operation on a frame.",
    where: t
  });
}
function ho(t) {
  return new v({
    code: "VGPU-FRAME-PASS-ACTIVE",
    message: "the frame cannot be canceled while a pass callback is active.",
    fix: "Return from the frame.pass(...) callback first, then call frame.cancel(); this keeps pass descriptor resources alive until the pass is closed.",
    where: t
  });
}
function mo(t) {
  return new v({
    code: "VGPU-FRAME-SUBMITTED",
    message: "the frame was already submitted; submitted GPU work cannot be canceled.",
    fix: "Call cancel() only on a frame you decided not to submit; the frame you did submit needs no cleanup.",
    where: t
  });
}
function ee(t, e, n) {
  return new v({
    code: "VGPU-R1-BINDING-INCOMPATIBLE-RESOURCE",
    message: `binding \`${t.name}\` @group(${t.group}) @binding(${t.binding}) needs ${e}.`,
    fix: n,
    where: "set"
  });
}
function B(t, e, n) {
  return new v({ code: "VGPU-RING1-UNSUPPORTED", message: e, fix: n, where: t });
}
function rt(t) {
  return go(t) && t.version !== 1 ? new v({
    code: "VGPU-SHADER-SOURCE-INVALID",
    message: `VGPU-SHADER-SOURCE-INVALID: unsupported ShaderSource v${String(t.version)}; expected v1. Fix: update vgpu or regenerate it.`,
    where: "shader source"
  }) : new v({
    code: "VGPU-SHADER-SOURCE-INVALID",
    message: `VGPU-SHADER-SOURCE-INVALID: expected WGSL or { version, wgsl }, got ${bo(t)}. Fix: configure @vgpu/wgsl loader-vite or loader-webpack.`,
    where: "shader source"
  });
}
function go(t) {
  return typeof t == "object" && t !== null && "version" in t;
}
function bo(t) {
  if (typeof t != "object" || t === null)
    return typeof t;
  try {
    const e = JSON.stringify(t);
    return e.length > 80 ? `${e.slice(0, 77)}...` : e;
  } catch {
    return "object";
  }
}
function yo(t, e) {
  switch (e.kind) {
    case "sampler":
      return `${t}.set({${e.name}:sampler(gpu)})`;
    case "texture":
      return `${t}.set({${e.name}:scene.color})`;
    case "buffer":
      return e.addressSpace === "uniform" ? `${t}.set({${e.name}:{ /* values */ }})` : `${t}.set({${e.name}:buffer})`;
    default:
      return `${t}.set({${e.name}:resource})`;
  }
}
const Nn = ["scheduler", "resource", "service"];
function Qe(t) {
  return { name: t };
}
const Hr = /* @__PURE__ */ new WeakMap();
function xo(t) {
  const e = Hr.get(t);
  if (!e)
    throw new v({
      code: "VGPU-GPU-FOREIGN",
      message: "This object was not created by init(); it has no vgpu kernel.",
      fix: "Pass the gpu returned by init() from vgpu, vgpu/node or vgpu/mock.",
      where: "gpu"
    });
  return e;
}
class wo {
  device;
  #e = /* @__PURE__ */ new Map();
  #t = new Map(Nn.map((e) => [e, /* @__PURE__ */ new Set()]));
  #n = /* @__PURE__ */ new Set();
  #r = /* @__PURE__ */ new Set();
  #s = /* @__PURE__ */ new Set();
  #i = !1;
  constructor(e) {
    this.device = e;
  }
  get disposed() {
    return this.#i;
  }
  service(e, n) {
    const r = this.#e.get(e);
    if (r !== void 0)
      return r;
    const i = n(this);
    return this.#e.set(e, i), i;
  }
  peekService(e) {
    return this.#e.get(e);
  }
  own(e, n) {
    const r = this.#t.get(e);
    return r.add(n), () => {
      r.delete(n);
    };
  }
  addErrorListener(e) {
    return this.#n.add(e), () => {
      this.#n.delete(e);
    };
  }
  reportError(e) {
    if (this.#i)
      return Promise.resolve();
    const n = Promise.resolve().then(() => {
      const r = [...this.#n];
      if (!r.length) {
        console.error(e);
        return;
      }
      for (const i of r)
        try {
          i(e);
        } catch (s) {
          console.error(s);
        }
    });
    return this.trackDelivery(n);
  }
  trackDelivery(e) {
    const n = Promise.resolve(e).then(() => {
    }, (r) => {
      console.error(r);
    });
    return this.#r.add(n), n.finally(() => this.#r.delete(n)), n;
  }
  registerSettledSource(e) {
    return this.#s.add(e), () => {
      this.#s.delete(e);
    };
  }
  async settled() {
    const e = [
      ...this.#r,
      ...[...this.#s].flatMap((n) => n())
    ];
    await Promise.allSettled(e);
  }
  dispose() {
    if (!this.#i) {
      this.#i = !0;
      for (const e of Nn) {
        const n = this.#t.get(e);
        for (const r of [...n])
          r();
        n.clear();
      }
      this.#e.clear(), this.#s.clear(), this.#n.clear(), this.device.dispose();
    }
  }
}
function vo(t) {
  const e = new wo(t), n = {
    device: t,
    gpu: t.gpu,
    get disposed() {
      return e.disposed;
    },
    onError: (r) => e.addErrorListener(r),
    settled: () => e.settled(),
    dispose: () => {
      e.dispose();
    }
  };
  return Hr.set(n, e), n;
}
async function So(t, e = {}, n) {
  return vo(await Eo(t, e, n));
}
async function Eo(t, e, n) {
  return e.adapter || n ? (e.adapter ?? n()).requestDevice(e) : To(e);
}
async function To(t) {
  const n = await globalThis.navigator.gpu?.requestAdapter({ powerPreference: t.powerPreference });
  if (!n)
    throw B("init", "navigator.gpu.requestAdapter() returned null.");
  as(n.features, t.requiredFeatures);
  const r = await n.requestDevice({ requiredFeatures: t.requiredFeatures, requiredLimits: t.requiredLimits });
  return new Ps(r, n.info ?? null);
}
function z(t, e) {
  t.assertUsable(e);
}
function On(t, e) {
  t.assertUsable(e);
}
const Kr = /* @__PURE__ */ Symbol("vgpu.bindingResource");
function Io(t) {
  return typeof (typeof t == "object" && t !== null ? t[Kr] : void 0) == "function" ? t : void 0;
}
const ke = /* @__PURE__ */ Symbol("vgpu.geometry.layoutResolver");
function de(t, e) {
  const n = xo(t);
  if (n.disposed)
    throw Yr(e);
  return n;
}
function Yr(t) {
  return new v({
    code: "VGPU-GPU-DISPOSED",
    message: `${t}() ran after gpu.dispose(); the device and everything it owned are gone.`,
    fix: "Create resources before disposing the gpu, or init() a new one.",
    where: t
  });
}
function Co(t, e, n, r) {
  const i = t.own("resource", () => n(e));
  return r?.(i), e;
}
class $o {
  vertexCount;
  indexCount;
  instanceCount;
  vertexBuffers;
  indexBuffer;
  indexFormat;
  vertexBufferLayouts;
  topology;
  stripIndexFormat;
  buffers;
  #e;
  #t;
  #n;
  #r = /* @__PURE__ */ new Map();
  #s = /* @__PURE__ */ new Set();
  #i = !1;
  constructor(e, n) {
    const r = "geometry";
    if (n.buffers.length > 8)
      throw Dn(r, `${n.buffers.length} vertex buffers exceed limit 8.`);
    let i = 0;
    const s = /* @__PURE__ */ new Set(), a = n.buffers.map((p, m) => {
      const b = Mo(e, p, `${r}.buffers[${m}]`);
      i += b.attributes.length;
      for (const g of b.attributes)
        if (g.location !== void 0) {
          if (s.has(g.location))
            throw Gn(`${r}.buffers[${m}]`, g.location);
          s.add(g.location);
        }
      return b;
    }), o = e.gpu.limits.maxVertexAttributes;
    if (i > o)
      throw Dn(r, `${i} attributes exceed device limit ${o}.`);
    const c = n.topology ?? "triangle-list";
    if (!Go.has(c))
      throw U(r, `Invalid topology: ${String(c)}.`);
    const l = Ro(e, n, r), d = Vn(a, "vertex"), u = Vn(a, "instance");
    _n(a, "vertex", n.vertexCount ?? d, r), _n(a, "instance", n.instanceCount ?? u, r), Ft(r, "vertexCount", n.vertexCount, d), Ft(r, "instanceCount", n.instanceCount, u), Ft(r, "indexCount", n.indexCount, l.count), this.topology = c, this.stripIndexFormat = c.endsWith("strip") ? l.format : void 0, this.#n = a, this.vertexBufferLayouts = Object.freeze(a.map((p) => p.layout)), this.vertexBuffers = Object.freeze(a.map((p) => p.gpu)), this.buffers = Object.freeze(a.map((p, m) => new Lo(`${r}.buffers[${m}]`, p))), this.vertexCount = n.vertexCount ?? d, this.instanceCount = n.instanceCount ?? u, this.indexBuffer = l.gpu, this.indexFormat = l.format, this.indexCount = n.indexCount ?? l.count, this.#e = l.owned, this.#t = l.byteLength, Do(this);
  }
  /** @internal Resolves named attributes for one reflected vertex entry point. */
  [ke](e, n) {
    if (this.#i)
      throw U(n, "Geometry is destroyed; create a live geometry.");
    const r = e.map((l) => `${l.name}:${l.location}:${pt(l.type)}`).join("|"), i = this.#r.get(r);
    if (i)
      return i;
    const s = /* @__PURE__ */ new Set(), a = this.#n.flatMap((l) => l.attributes.map((d) => d.name)), o = this.#n.map((l) => {
      const d = [...l.layout.attributes], u = l.attributes.map((p, m) => {
        const b = p.location === void 0 ? e.filter((w) => w.name === p.name) : [];
        if (p.location === void 0 && b.length === 0)
          throw eo(n, p.name, e.map((w) => w.name));
        if (b.length > 1)
          throw to(n, p.name, b.map((w) => w.location));
        const g = p.location ?? b[0].location;
        if (s.has(g))
          throw Gn(n, g);
        s.add(g);
        const $ = e.find((w) => w.location === g);
        if ($ && No(p.format) !== pt($.type))
          throw ro(n, p.name, p.format, pt($.type));
        return Object.freeze({ ...d[m], shaderLocation: g });
      });
      return Object.freeze({ arrayStride: l.layout.arrayStride, ...l.layout.stepMode ? { stepMode: l.layout.stepMode } : {}, attributes: Object.freeze(u) });
    });
    for (const l of e)
      if (!s.has(l.location))
        throw no(n, l.name, a);
    const c = Object.freeze(o);
    return this.#r.set(r, c), c;
  }
  /** Creates a frozen range view sharing this geometry's buffers and layout identity. */
  slice(e = {}) {
    return new Po(this, e);
  }
  /** Updates bytes in vertex buffer stream 0 without resizing it. */
  write(e, n = 0) {
    const r = this.buffers[0];
    if (!r)
      throw Te("geometry.write", "No vertex buffer 0; add one before writing.");
    r.write(e, n);
  }
  /** Updates bytes in the owned index buffer without resizing it. */
  writeIndices(e, n = 0) {
    if (this.#i)
      throw Te("geometry.writeIndices", "Geometry is destroyed; create a new geometry before writing.");
    if (!this.#e || this.#t === void 0)
      throw Te("geometry.writeIndices", "No owned index buffer; write caller-owned buffers directly.");
    Jr("geometry.writeIndices", this.#t, e.byteLength, n), this.#e.write(e, n);
  }
  /** Destroys buffers owned by this geometry; caller-owned buffers are untouched. */
  destroy() {
    if (!this.#i) {
      this.#i = !0;
      for (const e of this.buffers)
        e.destroyOwned();
      this.#e?.destroy();
      for (const e of [...this.#s])
        e();
      this.#s.clear();
    }
  }
  /**
   * @internal Ownership hook: runs once, right after `destroy()` freed the buffers, so the owner
   * that registered this geometry with the kernel can drop its teardown registration.
   */
  onDestroy(e) {
    return this.#i ? (e(), () => {
    }) : (this.#s.add(e), () => {
      this.#s.delete(e);
    });
  }
}
class Lo {
  where;
  inner;
  gpu;
  stride;
  stepMode;
  #e = { destroyed: !1 };
  constructor(e, n) {
    this.where = e, this.inner = n, this.gpu = n.gpu, this.stride = n.stride, this.stepMode = n.stepMode, Object.freeze(this);
  }
  write(e, n = 0) {
    if (this.#e.destroyed)
      throw Te(this.where, "Geometry is destroyed; create a new geometry before writing.");
    if (!this.inner.owned || this.inner.byteLength === void 0)
      throw Te(this.where, "Caller-owned buffer; write it directly.");
    Jr(this.where, this.inner.byteLength, Xr(e), n), this.inner.owned.write(e, n);
  }
  destroyOwned() {
    this.#e.destroyed = !0, this.inner.owned?.destroy();
  }
}
class Po {
  geometry;
  vertexCount;
  indexCount;
  instanceCount;
  vertexBuffers;
  indexBuffer;
  indexFormat;
  vertexBufferLayouts;
  topology;
  stripIndexFormat;
  firstIndex;
  baseVertex;
  firstVertex;
  [ke](e, n) {
    return this.geometry[ke](e, n);
  }
  constructor(e, n) {
    if (this.geometry = e, this.vertexBuffers = e.vertexBuffers, this.indexBuffer = e.indexBuffer, this.indexFormat = e.indexFormat, this.vertexBufferLayouts = e.vertexBufferLayouts, this.topology = e.topology, this.stripIndexFormat = e.stripIndexFormat, e.indexBuffer) {
      if (n.firstVertex !== void 0 || n.vertexCount !== void 0)
        throw Pe("geometry.slice", "Indexed slice needs firstIndex/indexCount/baseVertex; omit vertex range fields.");
      const r = n.firstIndex ?? 0, i = e.indexCount ?? 0, s = n.indexCount ?? i - r;
      ce("geometry.slice", "firstIndex", r, i), ce("geometry.slice", "indexCount", s, i - r), ce("geometry.slice", "baseVertex", n.baseVertex ?? 0, Number.MAX_SAFE_INTEGER), this.firstIndex = r, this.indexCount = s, this.baseVertex = n.baseVertex ?? 0, this.vertexCount = e.vertexCount;
    } else {
      if (n.firstIndex !== void 0 || n.indexCount !== void 0 || n.baseVertex !== void 0)
        throw Pe("geometry.slice", "Non-indexed slice needs firstVertex/vertexCount; omit index range fields.");
      const r = n.firstVertex ?? 0, i = e.vertexCount ?? 0, s = n.vertexCount ?? i - r;
      ce("geometry.slice", "firstVertex", r, i), ce("geometry.slice", "vertexCount", s, i - r), this.firstVertex = r, this.vertexCount = s, this.indexCount = e.indexCount;
    }
    ce("geometry.slice", "instanceCount", n.instanceCount ?? e.instanceCount ?? 0, Number.MAX_SAFE_INTEGER), this.instanceCount = n.instanceCount ?? e.instanceCount, Object.freeze(this);
  }
}
function ko(t, e) {
  const n = de(t, "geometry"), r = Ao(e) ? e.build(n.device) : e;
  return Fo(n, new $o(n.device, r));
}
function Ao(t) {
  return "build" in t && typeof t.build == "function";
}
function Fo(t, e) {
  return Co(t, e, (n) => n.destroy(), (n) => {
    e.onDestroy(n);
  });
}
function Bn(t) {
  if (t === "unorm10-10-10-2" || t === "unorm8x4-bgra")
    return 4;
  const e = /^(float|uint|sint|unorm|snorm)(8|16|32)(?:x([234]))?$/.exec(t);
  if (!e)
    return 0;
  const [, n, r, i] = e;
  return (r === "32" ? /norm/.test(n) : !i || i === "3" || r === "8" && n === "float") ? 0 : Number(r) / 8 * Number(i ?? 1);
}
function Mo(t, e, n) {
  if (e.data !== void 0 && e.buffer !== void 0)
    throw U(n, "Choose data or buffer, not both.");
  const r = e.stepMode ?? "vertex";
  if (r !== "vertex" && r !== "instance")
    throw U(n, `Invalid stepMode: ${String(r)}.`);
  const i = [], s = [];
  let a = 0;
  for (const [u, p] of Object.entries(e.attributes)) {
    if (/^\d+$/.test(u))
      throw U(n, `Attribute '${u}' is numeric; use a non-numeric name.`);
    const m = typeof p == "string" ? { format: p } : p, b = Bn(m.format);
    if (!b)
      throw U(n, `Unknown GPUVertexFormat '${m.format}'.`);
    const g = m.offset ?? a, $ = Math.min(4, b);
    if (!Number.isInteger(g) || g < 0 || g % $ !== 0)
      throw U(n, `Attribute '${u}' offset ${String(g)} needs ${$}-byte alignment.`);
    if (m.location !== void 0 && (!Number.isInteger(m.location) || m.location < 0 || m.location >= t.gpu.limits.maxVertexAttributes))
      throw U(n, `Location ${String(m.location)} for '${u}' is outside limit ${t.gpu.limits.maxVertexAttributes}.`);
    i.push({ shaderLocation: m.location ?? i.length, offset: g, format: m.format }), s.push({ name: u, format: m.format, location: m.location }), a += b;
  }
  const o = e.stride ?? Uo(a);
  if (!Number.isInteger(o) || o <= 0 || o > 2048 || o % 4 !== 0)
    throw U(n, `Stride ${String(o)} must be 4-aligned in [4,2048].`);
  for (const [u, p] of i.entries()) {
    const m = Bn(p.format);
    if (p.offset + m > o)
      throw U(n, `Attribute '${s[u]?.name}' (${p.offset}+${m}) exceeds stride ${o}.`);
  }
  const c = e.data ? Xr(e.data) : void 0;
  if (c !== void 0 && c % o !== 0)
    throw _r(n, `Data byteLength ${c} is not divisible by stride ${o}.`);
  const l = e.data !== void 0 ? t.createBuffer({ label: e.label, size: Math.max(4, c ?? 0), usage: ["vertex", "copy_dst"] }) : void 0;
  return l && e.data && l.write(e.data), { layout: Object.freeze({ arrayStride: o, ...e.stepMode ? { stepMode: r } : {}, attributes: Object.freeze(i) }), attributes: Object.freeze(s), stride: o, stepMode: r, byteLength: c, gpu: l?.gpu ?? zo(e.buffer, n), owned: l };
}
function Ro(t, e, n) {
  if (e.indices !== void 0 && e.indexBuffer !== void 0)
    throw U(n, "Choose indices or indexBuffer, not both.");
  if (e.indices === void 0) {
    const c = [e.indexBuffer, e.indexFormat, e.indexCount].filter((l) => l !== void 0).length;
    if (c !== 0 && c !== 3)
      throw U(n, "Provide indexBuffer, indexFormat, and indexCount together.");
    if (e.indexFormat !== void 0 && e.indexFormat !== "uint16" && e.indexFormat !== "uint32")
      throw U(n, `Unknown index format '${String(e.indexFormat)}'.`);
    return e.indexCount !== void 0 && ce(n, "indexCount", e.indexCount, Number.MAX_SAFE_INTEGER), { gpu: e.indexBuffer, format: e.indexFormat, count: e.indexCount };
  }
  if (e.indexFormat !== void 0)
    throw U(n, "indices infer format; omit indexFormat.");
  const r = Array.isArray(e.indices) ? new Uint32Array(e.indices) : e.indices, i = r instanceof Uint16Array ? "uint16" : "uint32", s = r.byteLength;
  if (s % (i === "uint16" ? 2 : 4) !== 0)
    throw _r(n, `Index byteLength ${s} is invalid for ${i}.`);
  const a = t.createBuffer({ label: e.label ? `${e.label}.indices` : void 0, size: Math.max(4, s), usage: ["index", "copy_dst"] });
  return a.write(r), { gpu: a.gpu, owned: a, format: i, count: r.length, byteLength: s };
}
function Vn(t, e) {
  let n;
  for (const r of t)
    r.stepMode === e && r.byteLength !== void 0 && (n = Math.min(n ?? 1 / 0, Math.floor(r.byteLength / r.stride)));
  return n;
}
function _n(t, e, n, r) {
  if (n === void 0 && t.some((i) => i.stepMode === e && i.byteLength === void 0))
    throw U(r, `Raw ${e} buffer needs ${e}Count.`);
}
function Ft(t, e, n, r) {
  n !== void 0 && ce(t, e, n, r ?? Number.MAX_SAFE_INTEGER);
}
function Do(t) {
  for (const e of Object.keys(t))
    e !== "destroyed" && Object.defineProperty(t, e, { writable: !1, configurable: !1 });
}
const Go = /* @__PURE__ */ new Set(["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"]);
function zo(t, e) {
  if (!t)
    throw U(e, "Provide geometry buffer data or buffer.");
  return t;
}
function Xr(t) {
  return t.byteLength;
}
function Uo(t) {
  return t + 3 & -4;
}
function Jr(t, e, n, r) {
  if (!Number.isInteger(r) || r < 0 || r % 4 !== 0 || n % 4 !== 0 || r + n > e)
    throw Te(t, `Write size ${n}/offset ${String(r)} must be 4-aligned within ${e} bytes.`);
}
function ce(t, e, n, r) {
  if (!Number.isInteger(n) || n < 0 || n > r)
    throw Pe(t, `${e}=${String(n)} must be an integer in [0,${r}].`);
}
function No(t) {
  return t.startsWith("sint") ? "i32" : t.startsWith("uint") ? "u32" : "f32";
}
function pt(t) {
  return t.kind === "scalar" ? t.name : t.kind === "vector" || t.kind === "matrix" || t.kind === "atomic" ? pt(t.element) : t.kind;
}
class Qr extends Error {
  code;
  line;
  column;
  severity;
  metadata;
  relatedDiagnostics;
  /** Actionable remediation text. Forwarded verbatim from the underlying error when there is one. */
  fix;
  /** Coarse origin of the failure (e.g. `"resolveShader"`), mirroring `@vgpu/core`'s `VGPUError`. */
  where;
  cause;
  constructor(e, n, r = 1, i = 1, s = "error") {
    super(n), this.name = "VGPUError", this.code = e, this.line = r, this.column = i, this.severity = s;
  }
}
function Oo(t, e, n = {}) {
  const r = new Qr(t, e, n.line ?? 1, n.column ?? 1, n.severity ?? "error");
  return n.fix !== void 0 && (r.fix = n.fix), n.where !== void 0 && (r.where = n.where), n.cause !== void 0 && (r.cause = n.cause), n.metadata !== void 0 && (r.metadata = n.metadata), r;
}
function G(t, e, n = 1, r = 1) {
  return new Qr(t, e, n, r);
}
const Bo = /* @__PURE__ */ new Set(["fn", "struct", "const", "alias", "var", "override"]);
function Vo(t) {
  const e = [], n = [], r = [];
  let i = 0, s = !1, a = 0;
  for (; i < t.length; ) {
    const o = t[i];
    if (o.text === "{") {
      a++, i++;
      continue;
    }
    if (o.text === "}") {
      a = Math.max(0, a - 1), i++;
      continue;
    }
    if (Zr(o)) {
      i++;
      continue;
    }
    if (a > 0) {
      i++;
      continue;
    }
    if (o.text === "import") {
      if (s)
        throw G("VGPU-WGSL-IMP-ORDER", "Imports must precede declarations", o.line, o.column);
      const [u, p] = _o(t, i);
      e.push(u), i = p;
      continue;
    }
    if (o.text === "export" && t[i + 1]?.text === "{")
      throw G("VGPU-WGSL-EXP-REEXPORT-CYCLE", "Re-export cycles are not supported", o.line, o.column);
    if (o.text === "@" && t[i + 2]?.text === "export" && t[i + 3]?.text === "@")
      throw G("VGPU-WGSL-EXP-NOTDECL", "Repeated export attributes", o.line, o.column);
    const c = o.text === "export" || o.text === "@" && t[i + 2]?.text === "export", l = c ? jo(t, o.text === "export" ? i + 1 : i + 3) : i, d = t[l];
    if (d && Bo.has(d.text)) {
      const u = Wo(t, l);
      n.push({ name: u, localName: u, kind: d.text }), c && r.push({ name: u, localName: u, kind: d.text }), s = !0;
    }
    i++;
  }
  return { imports: e, exports: r, locals: n };
}
function _o(t, e) {
  let n = e + 1;
  const r = [];
  if (t[n]?.text === "{") {
    for (n++; t[n] && t[n].text !== "}"; ) {
      if (Zr(t[n])) {
        n++;
        continue;
      }
      const a = Rt(t[n]);
      let o = a;
      n++, t[n]?.text === "as" && (o = Rt(t[n + 1]), n += 2), r.push({ imported: a, local: o }), t[n]?.text === "," && n++;
    }
    n++, Mt(t[n], "from"), n++;
  } else if (t[n]?.text === "*")
    Mt(t[n + 1], "as"), r.push({ imported: "*", local: Rt(t[n + 2]), namespace: !0 }), n += 3, Mt(t[n], "from"), n++;
  else throw t[n]?.kind === "string" ? G("VGPU-WGSL-IMP-SIDEEFFECT", "Side-effect imports are not supported", t[n].line, t[n].column) : G("VGPU-WGSL-IMP-DEFAULT", "Default imports are not supported", t[n]?.line, t[n]?.column);
  const i = t[n];
  if (i?.kind !== "string")
    throw G("VGPU-WGSL-RES-NOTFOUND", "Import path must be a string", i?.line, i?.column);
  const s = i.text.slice(1, -1);
  return n++, t[n]?.text === ";" && n++, [{ from: s, bindings: r, start: t[e].start, end: t[n - 1].end }, n];
}
function jo(t, e) {
  for (; t[e]?.text === "@"; ) {
    if (e += 2, t[e]?.text === "(")
      for (; t[e] && t[e].text !== ")"; )
        e++;
    t[e]?.text === ")" && e++;
  }
  return e;
}
function Wo(t, e) {
  let n = e + 1;
  if (t[e]?.text === "var" && t[n]?.text === "<")
    for (; t[n] && t[n].text !== ">"; )
      n++;
  for (; n < t.length; n++)
    if (t[n].kind === "ident")
      return t[n].text;
  throw G("VGPU-WGSL-EXP-NOTDECL", "Exported declaration has no name", t[e]?.line, t[e]?.column);
}
function Mt(t, e) {
  if (t?.text !== e)
    throw G("VGPU-WGSL-IMP-DEFAULT", `Expected ${e}`, t?.line, t?.column);
}
function Rt(t) {
  if (t?.kind !== "ident")
    throw G("VGPU-WGSL-IMP-DEFAULT", "Expected identifier", t?.line, t?.column);
  return t.text;
}
function Zr(t) {
  return t.kind === "lineComment" || t.kind === "blockComment";
}
function qo(t, e) {
  return e === "uniform" || e === "storage" ? "buffer" : t.kind === "sampler" ? "sampler" : t.kind === "texture" ? t.textureKind === "texture_external" ? "externalTexture" : "texture" : "unknown";
}
function Ho(t, e, n, r, i) {
  if (t === "buffer")
    return Ko(e, n, i);
  if (r.kind === "sampler")
    return Yo(r);
  if (r.kind === "texture")
    return r.textureKind === "texture_external" ? { kind: "externalTexture", externalTexture: {} } : r.textureKind.startsWith("texture_storage_") ? Xo(r) : Jo(r);
}
function Ko(t, e, n) {
  return { kind: "buffer", buffer: { type: t === "uniform" ? "uniform" : e === "read" ? "read-only-storage" : "storage", hasDynamicOffset: !1, minBindingSize: n?.size } };
}
function Yo(t) {
  return { kind: "sampler", sampler: { type: t.comparison ? "comparison" : "filtering" } };
}
function Xo(t) {
  return {
    kind: "storageTexture",
    storageTexture: {
      access: Zo(t.access),
      format: t.texelFormat ?? "rgba8unorm",
      viewDimension: ei(t.dimension)
    }
  };
}
function Jo(t) {
  return {
    kind: "texture",
    texture: {
      sampleType: Qo(t),
      viewDimension: ei(t.dimension),
      multisampled: t.dimension === "multisampled_2d" || t.dimension === "depth_multisampled_2d"
    }
  };
}
function Qo(t) {
  if (t.textureKind.startsWith("texture_depth_"))
    return "depth";
  const e = t.sampleType;
  return e?.kind === "scalar" && e.name === "i32" ? "sint" : e?.kind === "scalar" && e.name === "u32" ? "uint" : "unfilterable-float";
}
function ei(t) {
  switch (t) {
    case "1d":
      return "1d";
    case "2d_array":
    case "depth_2d_array":
      return "2d-array";
    case "cube":
    case "depth_cube":
      return "cube";
    case "cube_array":
    case "depth_cube_array":
      return "cube-array";
    case "3d":
      return "3d";
    default:
      return "2d";
  }
}
function Zo(t) {
  return t === "read" ? "read-only" : t === "read_write" ? "read-write" : "write-only";
}
const _ = (1n << 64n) - 1n, he = 11400714785074694791n, Ve = 14029467366897019727n, jn = 1609587929392839161n, ti = 9650029242287828579n, Wn = 2870177450012600261n;
function ea(t, e = 0n) {
  const n = new TextEncoder().encode(t);
  let r = 0, i;
  if (n.length >= 32) {
    let s = e + he + Ve, a = e + Ve, o = e, c = e - he;
    const l = n.length - 32;
    do
      s = Se(s, Be(n, r)), r += 8, a = Se(a, Be(n, r)), r += 8, o = Se(o, Be(n, r)), r += 8, c = Se(c, Be(n, r)), r += 8;
    while (r <= l);
    i = ae(s, 1n) + ae(a, 7n) + ae(o, 12n) + ae(c, 18n), i = it(i, s), i = it(i, a), i = it(i, o), i = it(i, c);
  } else
    i = e + Wn;
  for (i = i + BigInt(n.length) & _; r + 8 <= n.length; )
    i ^= Se(0n, Be(n, r)), i = ae(i, 27n) * he + ti & _, r += 8;
  for (r + 4 <= n.length && (i ^= ta(n, r) * he & _, i = ae(i, 23n) * Ve + jn & _, r += 4); r < n.length; )
    i ^= BigInt(n[r]) * Wn & _, i = ae(i, 11n) * he & _, r++;
  return i ^= i >> 33n, i = i * Ve & _, i ^= i >> 29n, i = i * jn & _, i ^= i >> 32n, i.toString(16).padStart(16, "0");
}
function Se(t, e) {
  return ae(t + e * Ve & _, 31n) * he & _;
}
function it(t, e) {
  return t ^= Se(0n, e), t * he + ti & _;
}
function ae(t, e) {
  return (t << e | t >> 64n - e) & _;
}
function Be(t, e) {
  let n = 0n;
  for (let r = 7; r >= 0; r--)
    n = (n << 8n) + BigInt(t[e + r]);
  return n;
}
function ta(t, e) {
  return BigInt(t[e]) | BigInt(t[e + 1]) << 8n | BigInt(t[e + 2]) << 16n | BigInt(t[e + 3]) << 24n;
}
function na(t) {
  return ea(t);
}
function ra(t) {
  return na(t).slice(0, 8);
}
function ia(t, e) {
  return `_vgsl_${ra(t)}__${e}`;
}
function V(t, e) {
  const n = t.find((s) => s.name === e);
  if (!n)
    return;
  const r = n.args.map((s) => s.text).join(""), i = Number(r.replace(/[ui]$/, ""));
  return Number.isFinite(i) ? i : void 0;
}
function Qt(t) {
  const e = [[]];
  let n = 0, r = 0;
  for (const i of t) {
    if (i.text === "<" ? n++ : i.text === ">" ? n = Math.max(0, n - 1) : i.text === "(" ? r++ : i.text === ")" && (r = Math.max(0, r - 1)), i.text === "," && n === 0 && r === 0) {
      e.push([]);
      continue;
    }
    e[e.length - 1].push(i);
  }
  return e.map(ni).filter((i) => i.length > 0);
}
function ni(t) {
  let e = 0, n = t.length;
  for (; e < n && t[e].text === ","; )
    e++;
  for (; n > e && t[n - 1].text === ","; )
    n--;
  return t.slice(e, n);
}
function sa(t) {
  if (t !== void 0 && ri(t))
    return Number(t.replace(/[ui]$/, ""));
}
function ri(t) {
  return /^(0|[1-9][0-9]*)([ui])?$/.test(t);
}
function ii(t) {
  if (t === "read" || t === "write" || t === "read_write")
    return t;
}
function oa(t) {
  return ["f32", "f16", "i32", "u32", "bool"].find((e) => e === t);
}
function aa(t) {
  return { kind: "scalar", name: t === "f" ? "f32" : t === "h" ? "f16" : t === "i" ? "i32" : "u32" };
}
function si(t) {
  return t === "f16" ? 2 : 4;
}
function ye(t, e) {
  return Math.ceil(e / t) * t;
}
function K(t) {
  const e = ni(t);
  if (e.length === 0)
    throw G("VGPU-WGSL-REFLECT-TYPE", "Expected WGSL type");
  const n = e.map((s) => s.text).join(""), r = ca(n);
  if (r)
    return r;
  if (e[1]?.text === "<") {
    const s = e[0].text, a = Qt(e.slice(2, -1)), o = la(s, a);
    if (o)
      return o;
  }
  const i = ua(n);
  return i || da(n);
}
function ca(t) {
  const e = oa(t);
  if (e)
    return { kind: "scalar", name: e };
  const n = t.match(/^vec([234])([fiuh])$/);
  if (n)
    return { kind: "vector", width: Number(n[1]), element: aa(n[2]) };
  const r = t.match(/^mat([234])x([234])([fh])$/);
  if (r) {
    const i = r[3] === "h" ? { kind: "scalar", name: "f16" } : { kind: "scalar", name: "f32" };
    return { kind: "matrix", columns: Number(r[1]), rows: Number(r[2]), element: i };
  }
}
function la(t, e) {
  if (t === "array") {
    const n = e[1]?.map((i) => i.text).join(""), r = n === void 0 ? void 0 : sa(n);
    return { kind: "array", element: K(e[0] ?? []), count: r, countExpression: n };
  }
  if (t === "atomic")
    return { kind: "atomic", element: K(e[0] ?? []) };
  if (t === "vec2" || t === "vec3" || t === "vec4")
    return { kind: "vector", width: Number(t.slice(3)), element: K(e[0] ?? []) };
  if (/^mat[234]x[234]$/.test(t))
    return { kind: "matrix", columns: Number(t[3]), rows: Number(t[5]), element: K(e[0] ?? []) };
  if (t === "ptr")
    return { kind: "ptr", addressSpace: e[0]?.map((n) => n.text).join("") ?? "", element: K(e[1] ?? []), access: e[2]?.map((n) => n.text).join("") };
  if (t === "sampler")
    return { kind: "sampler", comparison: !1 };
  if (t.startsWith("texture_storage_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(16), texelFormat: e[0]?.map((n) => n.text).join(""), access: ii(e[1]?.map((n) => n.text).join("")) };
  if (t.startsWith("texture_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(8), sampleType: e[0] ? K(e[0]) : void 0 };
}
function ua(t) {
  if (t === "sampler" || t === "sampler_comparison")
    return { kind: "sampler", comparison: t === "sampler_comparison" };
  if (t === "texture_external")
    return { kind: "texture", textureKind: t };
  if (t.startsWith("texture_depth_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(8) };
  if (t.startsWith("texture_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(8) };
}
function da(t) {
  return { kind: "identifier", name: t };
}
function fe(t) {
  if (t?.kind !== "ident" && t?.kind !== "keyword")
    throw G("VGPU-WGSL-REFLECT-PARSE", "Expected identifier", t?.line, t?.column);
  return t.text;
}
function xe(t, e, n) {
  for (let r = e; r < t.length; r++)
    if (t[r].text === n)
      return r;
  throw G("VGPU-WGSL-REFLECT-PARSE", `Expected ${n}`, t[e]?.line, t[e]?.column);
}
function fa(t, e, n, r) {
  for (let i = e; i < n; i++)
    if (t[i].text === r)
      return i;
}
function Pt(t, e, n) {
  let r = 0;
  for (let i = e; i < t.length; i++)
    if ((t[i].text === "{" || t[i].text === "(") && r++, (t[i].text === "}" || t[i].text === ")") && (r = Math.max(0, r - 1)), r === 0 && t[i].text === n)
      return i;
  return t.length;
}
function Zt(t, e) {
  const n = t[e].text, r = n === "(" ? ")" : n === "{" ? "}" : ">";
  let i = 0;
  for (let s = e; s < t.length; s++)
    if (t[s].text === n && i++, t[s].text === r && (i--, i === 0))
      return s;
  throw G("VGPU-WGSL-REFLECT-PARSE", `Unclosed ${n}`, t[e]?.line, t[e]?.column);
}
function en(t, e) {
  const n = [];
  let r = e;
  for (; t[r]?.text === "@"; ) {
    const i = t[r], s = fe(t[r + 1]);
    r += 2;
    let a = [];
    if (t[r]?.text === "(") {
      const o = Zt(t, r);
      a = t.slice(r + 1, o), r = o + 1;
    }
    n.push({ name: s, args: a, token: i });
  }
  return [n, r];
}
function Ie(t) {
  switch (t.kind) {
    case "scalar":
      return t.name;
    case "identifier":
      return t.name;
    case "vector":
      return `vec${t.width}<${Ie(t.element)}>`;
    case "matrix":
      return `mat${t.columns}x${t.rows}<${Ie(t.element)}>`;
    case "array":
      return `array<${Ie(t.element)}${t.count === void 0 ? "" : `,${t.count}`}>`;
    default:
      return t.kind;
  }
}
function pa(t) {
  const e = t.find((r) => r.name === "workgroup_size");
  if (!e)
    return;
  const n = Qt(e.args).map((r) => Number(r.map((i) => i.text).join("")));
  return [n[0] ?? 1, n[1] ?? 1, n[2] ?? 1];
}
function ha(t, e) {
  if (t[e]?.text !== "<")
    return { after: e };
  const n = xe(t, e, ">"), r = Qt(t.slice(e + 1, n)).map((i) => i.map((s) => s.text).join(""));
  return { addressSpace: r[0], access: ii(r[1]), after: n + 1 };
}
function ma(t) {
  const e = [], n = [], r = [], i = [], s = [], a = [], o = t.tokens.filter((d) => d.kind !== "lineComment" && d.kind !== "blockComment");
  let c = 0, l = 0;
  for (; c < o.length; ) {
    const d = o[c];
    if (d.text === "{") {
      l++, c++;
      continue;
    }
    if (d.text === "}") {
      l = Math.max(0, l - 1), c++;
      continue;
    }
    if (l > 0) {
      c++;
      continue;
    }
    const u = c, [p, m] = en(o, c);
    c = m, o[c]?.text === "export" && c++;
    const b = o[c]?.text;
    if (b === "enable") {
      o[c + 1]?.kind === "ident" && a.push(o[c + 1].text), c = Pt(o, c, ";") + 1;
      continue;
    }
    if (b === "struct") {
      const g = ga(t, o, c);
      g.item && e.push(g.item), c = g.next;
      continue;
    }
    if (b === "alias") {
      const g = ba(t, o, c);
      g.item && n.push(g.item), c = g.next;
      continue;
    }
    if (b === "var") {
      const g = ya(t, o, c, p);
      g.item && r.push(g.item), c = g.next;
      continue;
    }
    if (b === "fn") {
      const g = xa(t, o, c, p);
      g.item && i.push(g.item), c = g.next;
      continue;
    }
    if (b === "override") {
      const g = va(o, c, p);
      g.item && s.push(g.item), c = g.next;
      continue;
    }
    c = Math.max(u + 1, c + 1);
  }
  return { structs: e, aliases: n, vars: r, entries: i, overrides: s, features: a };
}
function ga(t, e, n, r) {
  const i = fe(e[n + 1]), s = xe(e, n + 2, "{"), a = Zt(e, s);
  return {
    item: { name: i, originalName: i, mangledName: tn(t, i, "struct"), members: Sa(e.slice(s + 1, a)), path: t.path },
    next: a + 1
  };
}
function ba(t, e, n, r) {
  const i = fe(e[n + 1]), s = xe(e, n + 2, "="), a = Pt(e, s + 1, ";");
  return {
    item: { name: i, originalName: i, mangledName: tn(t, i, "alias"), target: K(e.slice(s + 1, a)), path: t.path },
    next: a + 1
  };
}
function ya(t, e, n, r) {
  const { addressSpace: i, access: s, after: a } = ha(e, n + 1), o = fe(e[a]), c = xe(e, a + 1, ":"), l = Pt(e, c + 1, ";");
  return {
    item: { path: t.path, name: o, mangledName: Ea(r) ? o : tn(t, o, "var"), attrs: r, addressSpace: i, access: s, type: K(e.slice(c + 1, l)) },
    next: l + 1
  };
}
function xa(t, e, n, r) {
  const i = fe(e[n + 1]), s = r.find((c) => c.name === "vertex" || c.name === "fragment" || c.name === "compute")?.name;
  if (!s)
    return { item: void 0, next: n + 1 };
  const a = xe(e, n + 2, "("), o = Zt(e, a);
  return { item: { name: i, mangledName: i, stage: s, workgroupSize: pa(r), path: t.path, params: wa(e.slice(a + 1, o)) }, next: o + 1 };
}
function wa(t) {
  const e = [];
  let n = 0;
  for (; n < t.length; ) {
    const [r, i] = en(t, n);
    if (n = i, !t[n] || t[n].text === ",") {
      n++;
      continue;
    }
    const s = fe(t[n]), a = xe(t, n + 1, ":");
    let o = a + 1, c = 0;
    for (; o < t.length && (t[o].text === "<" && c++, t[o].text === ">" && (c = Math.max(0, c - 1)), !(c === 0 && t[o].text === ",")); )
      o++;
    e.push({ name: s, attrs: r, type: K(t.slice(a + 1, o)) }), n = o + 1;
  }
  return e;
}
function va(t, e, n) {
  const r = fe(t[e + 1]), i = Pt(t, e + 1, ";"), s = fa(t, e + 2, i, "=");
  return { item: { name: r, mangledName: r, id: V(n, "id"), defaultValue: s === void 0 ? void 0 : t.slice(s + 1, i).map((a) => a.text).join("") }, next: i + 1 };
}
function Sa(t) {
  const e = [];
  let n = 0;
  for (; n < t.length; ) {
    const [r, i] = en(t, n);
    if (n = i, !t[n] || t[n].text === "," || t[n].text === ";") {
      n++;
      continue;
    }
    const s = fe(t[n]), a = xe(t, n + 1, ":");
    let o = a + 1, c = 0;
    for (; o < t.length && (t[o].text === "<" && c++, t[o].text === ">" && (c = Math.max(0, c - 1)), !(c === 0 && (t[o].text === "," || t[o].text === ";"))); )
      o++;
    e.push({ name: s, attrs: r, type: K(t.slice(a + 1, o)), align: V(r, "align"), size: V(r, "size") }), n = o + 1;
  }
  return e;
}
function tn(t, e, n) {
  return n === "override" ? e : ia(t.path, e);
}
function Ea(t) {
  return V(t, "group") !== void 0 || V(t, "binding") !== void 0;
}
const Ta = "literal length required for auto layout; use draw.group(n, bg) manual binding", Ia = "VGPUError: `bool` is not host-shareable in uniform/storage. Fix: use `u32` (0 | 1) → struct Params { enabled: u32 }", oi = "use a manual group claim (`draw.group(n, bg)`)";
function Ca(t = 1, e = 1) {
  return G("VGPU-WGSL-REFLECT-ARRAY-LENGTH", Ta, t, e);
}
function ai(t = 1, e = 1) {
  return G("VGPU-WGSL-REFLECT-BOOL-HOST-SHAREABLE", Ia, t, e);
}
function xt(t, e, n = 1, r = 1) {
  return G("VGPU-WGSL-REFLECT-UNKNOWN-TYPE", `type '${t}' is unknown in ${e}; ${oi}`, n, r);
}
function qn(t, e, n = 1, r = 1) {
  return G("VGPU-WGSL-REFLECT-NS-TYPE", `type '${t}' is a namespace-member import; use a named import or manual @group(1+) binding`, n, r);
}
function ci(t, e = 1, n = 1) {
  return G("VGPU-WGSL-REFLECT-NON-HOST-SHAREABLE", `Type ${t} is not host-shareable; ${oi}`, e, n);
}
const Re = "naga-standard";
function $a(t, e, n) {
  const r = /* @__PURE__ */ new Map();
  for (const a of e) {
    const o = /* @__PURE__ */ new Map();
    for (const c of [...a.structs, ...a.aliases])
      o.set(c.originalName, { path: c.path, name: c.originalName, mangledName: c.mangledName, kind: "members" in c ? "struct" : "alias" });
    r.set(a.structs[0]?.path ?? a.aliases[0]?.path ?? a.vars[0]?.path ?? "", o);
  }
  const i = new Map(t.map((a) => [a.path, r.get(a.path) ?? /* @__PURE__ */ new Map()])), s = /* @__PURE__ */ new Map();
  for (const a of t) {
    const o = new Map(i.get(a.path));
    for (const c of a.parsed.imports)
      La(a, c, o, t, i);
    s.set(a.path, o);
  }
  return s;
}
function La(t, e, n, r, i, s) {
  const a = ka(e, t.path, r), o = i.get(a);
  for (const c of e.bindings) {
    if (c.namespace) {
      n.set(c.local, { path: a, name: c.local, mangledName: c.local, kind: "namespace" });
      continue;
    }
    const l = o?.get(c.imported);
    l && n.set(c.local, l);
  }
}
function Pa(t, e) {
  const n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
  for (const s of t) {
    for (const a of s.structs) {
      const o = {
        name: a.name,
        mangledName: a.mangledName,
        members: a.members.map((c) => ({ name: c.name, type: be(c.type, a.path, e), align: c.align, size: c.size }))
      };
      n.set(a.mangledName, o), i.set(a.mangledName, o);
    }
    for (const a of s.aliases) {
      const o = { name: a.name, mangledName: a.mangledName, target: be(a.target, a.path, e) };
      r.set(a.mangledName, o), i.set(a.mangledName, o);
    }
  }
  return { structs: n, aliases: r, byMangled: i };
}
function be(t, e, n, r) {
  switch (t.kind) {
    case "identifier": {
      const i = t.name.indexOf(".");
      if (i > 0) {
        const a = t.name.slice(0, i);
        if (n.get(e)?.get(a)?.kind === "namespace")
          throw qn(t.name);
      }
      const s = n.get(e)?.get(t.name);
      if (s?.kind === "namespace")
        throw qn(t.name);
      if (!s)
        throw xt(t.name, e);
      return { kind: "identifier", name: s.name, mangledName: s.mangledName };
    }
    case "array":
    case "atomic":
    case "vector":
    case "matrix":
    case "ptr":
      return { ...t, element: be(t.element, e, n) };
    case "texture":
      return { ...t, sampleType: t.sampleType ? be(t.sampleType, e, n) : void 0 };
    default:
      return t;
  }
}
function De(t, e) {
  if (!e || t.kind !== "identifier")
    return t;
  const n = e.aliases.get(t.mangledName ?? t.name);
  return n ? De(n.target, e) : t;
}
function Vt(t, e) {
  const n = De(t, e);
  switch (n.kind) {
    case "array":
    case "atomic":
    case "vector":
    case "matrix":
    case "ptr":
      return { ...n, element: Vt(n.element, e) };
    case "texture":
      return { ...n, sampleType: n.sampleType ? Vt(n.sampleType, e) : void 0 };
    default:
      return n;
  }
}
function ka(t, e, n, r) {
  const i = void 0;
  if (i !== void 0 && n.some((l) => l.path === i))
    return i;
  const s = t.from, a = e.slice(0, e.lastIndexOf("/") + 1), o = s.startsWith("/") ? s : Aa(`${a}${s}`);
  return [s, o].find((l) => n.some((d) => d.path === l)) ?? i ?? o;
}
function Aa(t) {
  const e = t.startsWith("/"), n = [];
  for (const r of t.split("/"))
    !r || r === "." || (r === ".." ? n.pop() : n.push(r));
  return `${e ? "/" : ""}${n.join("/")}`;
}
function Ze(t, e, n = Ie(t), r = n, i) {
  const s = i ? Vt(t, i) : t;
  return Fa(s, e, n, r, i);
}
function Fa(t, e, n, r, i) {
  switch (t.kind) {
    case "scalar":
      return Ma(t, e, n, r);
    case "atomic":
      return Ra(t, e, n, r);
    case "vector":
      return Da(t, e, n, r, i);
    case "matrix":
      return Ga(t, e, n, r, i);
    case "array":
      return za(t, e, n, r, i);
    case "identifier":
      return Na(t, e, n, r, i);
    default:
      throw ci(Ie(t));
  }
}
function Ma(t, e, n, r) {
  const i = si(t.name);
  if (t.name === "bool")
    throw ai();
  return { name: n, mangledName: r, addressSpace: e, layoutMode: Re, type: t, align: i, size: i };
}
function Ra(t, e, n, r) {
  return { name: n, mangledName: r, addressSpace: e, layoutMode: Re, type: t, align: 4, size: 4 };
}
function Da(t, e, n, r, i) {
  const a = Ze(t.element, e, n, r, i).size ?? 4, o = t.width === 2 ? a * 2 : a * 4;
  return { name: n, mangledName: r, addressSpace: e, layoutMode: Re, type: t, align: o, size: a * t.width };
}
function Ga(t, e, n, r, i) {
  const s = { kind: "vector", width: t.rows, element: t.element }, a = Ze(s, e, `${n}[]`, `${r}[]`, i), o = ye(a.align, a.size ?? 0);
  return { name: n, mangledName: r, addressSpace: e, layoutMode: Re, type: t, align: a.align, size: o * t.columns, stride: o, element: a };
}
function za(t, e, n, r, i) {
  Ua(t.countExpression);
  const s = Ze(t.element, e, `${n}[]`, `${r}[]`, i), a = ye(He(t.element, e, i), s.size ?? 0);
  return {
    name: n,
    mangledName: r,
    addressSpace: e,
    layoutMode: Re,
    type: t,
    align: He(t, e, i),
    size: t.count === void 0 ? void 0 : a * t.count,
    stride: a,
    element: s,
    runtimeSized: t.count === void 0
  };
}
function Ua(t) {
  if (t !== void 0 && !ri(t))
    throw Ca();
}
function Na(t, e, n, r, i) {
  if (!i)
    throw xt(t.name, "<unknown>");
  const s = i.structs.get(t.mangledName ?? t.name);
  if (!s)
    throw xt(t.name, "<unknown>");
  const a = [];
  let o = 0, c = 1;
  for (const d of s.members) {
    const u = Oa(d, e, o, i);
    a.push(u.member), o = Ba(e, d.type, u.offset, u.member.size ?? 0, i), c = Math.max(c, u.member.align);
  }
  const l = _a(e, c);
  return { name: n, mangledName: r, addressSpace: e, layoutMode: Re, type: t, align: l, size: ye(l, o), members: a };
}
function Oa(t, e, n, r) {
  const i = Ze(t.type, e, t.name, t.name, r), s = Math.max(He(t.type, e, r), t.align ?? 1), a = Math.max(i.size ?? 0, t.size ?? 0), o = ye(s, n);
  return {
    member: { name: t.name, offset: o, align: s, size: a, type: t.type, layout: i, explicitAlign: t.align, explicitSize: t.size },
    offset: o
  };
}
function Ba(t, e, n, r, i) {
  return n + (t === "uniform" && Va(e, i) ? ye(16, r) : r);
}
function Va(t, e) {
  const n = De(t, e);
  return n.kind === "identifier" && e.structs.has(n.mangledName ?? n.name);
}
function _a(t, e) {
  return t === "uniform" ? ye(16, e) : e;
}
function He(t, e, n) {
  const r = n ? De(t, n) : t, i = ht(r, e, n);
  return e === "uniform" && ja(r, n) ? ye(16, i) : i;
}
function ja(t, e) {
  return t.kind === "array" || t.kind === "identifier" && !!e?.structs.get(t.mangledName ?? t.name);
}
function ht(t, e, n) {
  const r = n ? De(t, n) : t;
  switch (r.kind) {
    case "scalar":
      return Wa(r.name);
    case "atomic":
      return 4;
    case "vector":
      return r.width === 2 ? ht(r.element, e, n) * 2 : ht(r.element, e, n) * 4;
    case "matrix":
      return ht({ kind: "vector", width: r.rows, element: r.element }, e, n);
    case "array":
      return He(r.element, e, n);
    case "identifier":
      return qa(r, e, n);
    default:
      throw ci(Ie(r));
  }
}
function Wa(t) {
  if (t === "bool")
    throw ai();
  return si(t);
}
function qa(t, e, n) {
  const r = n?.structs.get(t.mangledName ?? t.name);
  if (!r)
    throw xt(t.name, "<unknown>");
  return Math.max(1, ...r.members.map((i) => Math.max(He(i.type, e, n), i.align ?? 1)));
}
const Ha = /* @__PURE__ */ new Set([
  "alias",
  "break",
  "case",
  "const",
  "const_assert",
  "continue",
  "continuing",
  "default",
  "diagnostic",
  "discard",
  "else",
  "enable",
  "false",
  "fn",
  "for",
  "if",
  "let",
  "loop",
  "override",
  "requires",
  "return",
  "struct",
  "switch",
  "true",
  "var",
  "while"
]), Ka = /* @__PURE__ */ new Set(["import", "export", "from", "as"]), li = /* @__PURE__ */ new Set([...Ha, ...Ka]), Ya = /* @__PURE__ */ new Set([
  "NULL",
  "Self",
  "abstract",
  "active",
  "alignas",
  "alignof",
  "as",
  "asm",
  "asm_fragment",
  "async",
  "attribute",
  "auto",
  "await",
  "become",
  "cast",
  "catch",
  "class",
  "co_await",
  "co_return",
  "co_yield",
  "coherent",
  "column_major",
  "common",
  "compile",
  "compile_fragment",
  "concept",
  "const_cast",
  "consteval",
  "constexpr",
  "constinit",
  "crate",
  "debugger",
  "decltype",
  "delete",
  "demote",
  "demote_to_helper",
  "do",
  "dynamic_cast",
  "enum",
  "explicit",
  "export",
  "extends",
  "extern",
  "external",
  "fallthrough",
  "filter",
  "final",
  "finally",
  "friend",
  "from",
  "fxgroup",
  "get",
  "goto",
  "groupshared",
  "highp",
  "impl",
  "implements",
  "import",
  "inline",
  "instanceof",
  "interface",
  "layout",
  "lowp",
  "macro",
  "macro_rules",
  "match",
  "mediump",
  "meta",
  "mod",
  "module",
  "move",
  "mut",
  "mutable",
  "namespace",
  "new",
  "nil",
  "noexcept",
  "noinline",
  "nointerpolation",
  "non_coherent",
  "noncoherent",
  "noperspective",
  "null",
  "nullptr",
  "of",
  "operator",
  "package",
  "packoffset",
  "partition",
  "pass",
  "patch",
  "pixelfragment",
  "precise",
  "precision",
  "premerge",
  "priv",
  "protected",
  "pub",
  "public",
  "readonly",
  "ref",
  "regardless",
  "register",
  "reinterpret_cast",
  "require",
  "resource",
  "restrict",
  "self",
  "set",
  "shared",
  "sizeof",
  "smooth",
  "snorm",
  "static",
  "static_assert",
  "static_cast",
  "std",
  "subroutine",
  "super",
  "target",
  "template",
  "this",
  "thread_local",
  "throw",
  "trait",
  "try",
  "type",
  "typedef",
  "typeid",
  "typename",
  "typeof",
  "union",
  "unless",
  "unorm",
  "unsafe",
  "unsized",
  "use",
  "using",
  "varying",
  "virtual",
  "volatile",
  "wgsl",
  "where",
  "with",
  "writeonly",
  "yield"
]), Xa = /* @__PURE__ */ new Set(["binding_array"]), Ja = /* @__PURE__ */ new Set([
  "array",
  "atomic",
  "bool",
  "f16",
  "f32",
  "i32",
  "mat2x2",
  "mat2x3",
  "mat2x4",
  "mat3x2",
  "mat3x3",
  "mat3x4",
  "mat4x2",
  "mat4x3",
  "mat4x4",
  "ptr",
  "sampler",
  "sampler_comparison",
  "texture_1d",
  "texture_2d",
  "texture_2d_array",
  "texture_3d",
  "texture_cube",
  "texture_cube_array",
  "texture_depth_2d",
  "texture_depth_2d_array",
  "texture_depth_cube",
  "texture_depth_cube_array",
  "texture_depth_multisampled_2d",
  "texture_external",
  "texture_multisampled_2d",
  "texture_storage_1d",
  "texture_storage_2d",
  "texture_storage_2d_array",
  "texture_storage_3d",
  "u32",
  "vec2",
  "vec2f",
  "vec2h",
  "vec2i",
  "vec2u",
  "vec3",
  "vec3f",
  "vec3h",
  "vec3i",
  "vec3u",
  "vec4",
  "vec4f",
  "vec4h",
  "vec4i",
  "vec4u"
]), Qa = /* @__PURE__ */ new Set([
  "abs",
  "acos",
  "acosh",
  "all",
  "any",
  "arrayLength",
  "asin",
  "asinh",
  "atan",
  "atan2",
  "atanh",
  "ceil",
  "clamp",
  "cos",
  "cosh",
  "countLeadingZeros",
  "countOneBits",
  "countTrailingZeros",
  "cross",
  "degrees",
  "determinant",
  "distance",
  "dot",
  "dot4I8Packed",
  "dot4U8Packed",
  "dpdx",
  "dpdxCoarse",
  "dpdxFine",
  "dpdy",
  "dpdyCoarse",
  "dpdyFine",
  "exp",
  "exp2",
  "extractBits",
  "faceForward",
  "firstLeadingBit",
  "firstTrailingBit",
  "floor",
  "fma",
  "fract",
  "frexp",
  "fwidth",
  "fwidthCoarse",
  "fwidthFine",
  "insertBits",
  "inverseSqrt",
  "ldexp",
  "length",
  "log",
  "log2",
  "max",
  "min",
  "mix",
  "modf",
  "normalize",
  "pack2x16float",
  "pack2x16snorm",
  "pack2x16unorm",
  "pack4x8snorm",
  "pack4x8unorm",
  "pack4xI8",
  "pack4xU8",
  "pack4xI8Clamp",
  "pack4xU8Clamp",
  "pow",
  "quantizeToF16",
  "radians",
  "reflect",
  "refract",
  "reverseBits",
  "round",
  "saturate",
  "select",
  "sign",
  "sin",
  "sinh",
  "smoothstep",
  "sqrt",
  "step",
  "storageBarrier",
  "tan",
  "tanh",
  "textureBarrier",
  "textureDimensions",
  "textureGather",
  "textureGatherCompare",
  "textureLoad",
  "textureNumLayers",
  "textureNumLevels",
  "textureNumSamples",
  "textureSample",
  "textureSampleBaseClampToEdge",
  "textureSampleBias",
  "textureSampleCompare",
  "textureSampleCompareLevel",
  "textureSampleGrad",
  "textureSampleLevel",
  "textureStore",
  "transpose",
  "trunc",
  "unpack2x16float",
  "unpack2x16snorm",
  "unpack2x16unorm",
  "unpack4x8snorm",
  "unpack4x8unorm",
  "unpack4xI8",
  "unpack4xU8",
  "workgroupBarrier"
]), Za = /* @__PURE__ */ new Set([
  "frag_depth",
  "front_facing",
  "global_invocation_id",
  "instance_index",
  "local_invocation_id",
  "local_invocation_index",
  "num_workgroups",
  "position",
  "sample_index",
  "sample_mask",
  "subgroup_invocation_id",
  "subgroup_size",
  "vertex_index",
  "workgroup_id"
]), ec = /* @__PURE__ */ new Set([
  "align",
  "binding",
  "blend_src",
  "builtin",
  "compute",
  "diagnostic",
  "fragment",
  "group",
  "id",
  "interpolate",
  "invariant",
  "location",
  "must_use",
  "size",
  "vertex",
  "workgroup_size"
]), tc = /* @__PURE__ */ new Set(["function", "private", "storage", "uniform", "workgroup"]), nc = /* @__PURE__ */ new Set(["read", "read_write", "write"]), rc = /* @__PURE__ */ new Set([
  "bgra8unorm",
  "r32float",
  "r32sint",
  "r32uint",
  "rg32float",
  "rg32sint",
  "rg32uint",
  "rgba16float",
  "rgba16sint",
  "rgba16uint",
  "rgba32float",
  "rgba32sint",
  "rgba32uint",
  "rgba8sint",
  "rgba8snorm",
  "rgba8uint",
  "rgba8unorm"
]);
[
  ...li,
  ...Ya,
  ...Xa,
  ...Ja,
  ...Qa,
  ...Za,
  ...ec,
  ...tc,
  ...nc,
  ...rc
];
const ic = "VGPU-WGSL-IDENT-NONASCII", sc = "https://github.com/vercel-labs/vgpu/issues/294";
function oc(t, e) {
  const n = [];
  let r = 0, i = 1, s = 1;
  const a = (c, l, d, u, p) => n.push({ kind: c, text: t.slice(l, d), start: l, end: d, line: u, column: p }), o = () => {
    t[r] === `
` ? (i++, s = 1) : s++, r++;
  };
  for (; r < t.length; ) {
    const c = t[r];
    if (/\s/.test(c)) {
      o();
      continue;
    }
    const l = r, d = i, u = s;
    if (c === "/" && t[r + 1] === "/") {
      for (; r < t.length && t[r] !== `
`; )
        o();
      a("lineComment", l, r, d, u);
      continue;
    }
    if (c === "/" && t[r + 1] === "*") {
      let p = 0;
      for (; r < t.length; ) {
        if (t[r] === "/" && t[r + 1] === "*") {
          p++, o(), o();
          continue;
        }
        if (t[r] === "*" && t[r + 1] === "/") {
          if (p--, o(), o(), p === 0) {
            a("blockComment", l, r, d, u);
            break;
          }
          continue;
        }
        o();
      }
      if (p !== 0)
        throw G("VGPU-WGSL-LEX-UNTERM-COMMENT", "Unterminated block comment", d, u);
      continue;
    }
    if (c === '"' || c === "'") {
      const p = c;
      for (o(); r < t.length && t[r] !== p; ) {
        if (t[r] === `
`)
          throw G("VGPU-WGSL-LEX-UNTERM-STRING", "Unterminated string", d, u);
        t[r] === "\\" && o(), o();
      }
      if (r >= t.length)
        throw G("VGPU-WGSL-LEX-UNTERM-STRING", "Unterminated string", d, u);
      o(), a("string", l, r, d, u);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      for (; r < t.length && /[A-Za-z0-9_]/.test(t[r]); )
        o();
      const p = t.slice(l, r);
      a(li.has(p) ? "keyword" : "ident", l, r, d, u);
      continue;
    }
    if (/[0-9]/.test(c) || c === "." && /[0-9]/.test(t[r + 1] ?? "")) {
      for (c === "." && o(); r < t.length; ) {
        const p = t[r];
        if (/[A-Za-z0-9_.]/.test(p)) {
          o();
          continue;
        }
        if ((p === "+" || p === "-") && cc(t[r - 1]) && /[0-9]/.test(t[r + 1] ?? "")) {
          o();
          continue;
        }
        break;
      }
      a("number", l, r, d, u);
      continue;
    }
    if (c.charCodeAt(0) > 127)
      throw ac(t, r, i, s, e);
    o(), a("punct", l, r, d, u);
  }
  return n;
}
function ac(t, e, n, r, i) {
  let s = e;
  for (; s > 0 && Hn(t[s - 1]); )
    s--;
  let a = e + 1;
  for (; a < t.length && Hn(t[a]); )
    a++;
  const o = t.slice(s, a), c = r - (e - s), l = i === void 0 ? "" : ` in ${i}`, d = Oo(ic, `Non-ASCII identifier '${o}'${l} at line ${n} column ${c}; vgpu's WGSL pipeline supports ASCII identifiers only`, { fix: `Rename '${o}' using ASCII letters, digits and '_'. Unicode (XID) identifiers are tracked in ${sc}`, line: n, column: c });
  return d.range = { file: i, start: { line: n, column: c } }, d;
}
function Hn(t) {
  return t.charCodeAt(0) > 127 || /[A-Za-z0-9_]/.test(t);
}
function cc(t) {
  return t === "e" || t === "E" || t === "p" || t === "P";
}
const lc = /^_vgsl_[0-9a-f]{8,16}__[A-Za-z_][A-Za-z0-9_]*$/, uc = /* @__PURE__ */ new Set(["fn", "struct", "const", "alias", "var", "override"]);
function ui(t) {
  return new dc(t).analyze();
}
class dc {
  tokens;
  scopes = [];
  declarations = [];
  references = [];
  functions = [];
  preserved = /* @__PURE__ */ new Map();
  symbolsByScope = /* @__PURE__ */ new Map();
  moduleFallbackReasons = [];
  pendingSymbols = [];
  moduleScopeId;
  constructor(e) {
    this.tokens = e, this.moduleScopeId = this.createScope("module", void 0, void 0, 0);
  }
  analyze() {
    this.collectTopLevel();
    for (const e of this.functions)
      this.walkFunction(e);
    return {
      tokens: this.tokens,
      scopes: this.scopes,
      declarations: this.declarations,
      references: this.references,
      functions: this.functions,
      preservedTokens: [...this.preserved.entries()].map(([e, n]) => ({ tokenIndex: e, reason: n })),
      fallback: { wholeModule: this.moduleFallbackReasons.length > 0, reasons: this.moduleFallbackReasons }
    };
  }
  collectTopLevel() {
    let e = 0;
    for (let n = 0; n < this.tokens.length; n++) {
      const r = this.tokens[n];
      if (!Z(r)) {
        if (r.text === "{") {
          e++;
          continue;
        }
        if (r.text === "}") {
          e--, e < 0 && (this.moduleFallback("unmatched top-level closing brace", n), e = 0);
          continue;
        }
        if (e === 0) {
          if (r.text === "@") {
            n = this.preserveAttribute(n);
            continue;
          }
          if (r.text === "enable" || r.text === "requires" || r.text === "diagnostic" || r.text === "const_assert") {
            n = this.preserveStatement(n, "directive");
            continue;
          }
          if (r.text !== "export") {
            if (r.text === "struct") {
              n = this.collectStruct(n);
              continue;
            }
            if (r.text === "fn") {
              n = this.collectFunction(n);
              continue;
            }
            if (r.text === "const" || r.text === "alias" || r.text === "var" || r.text === "override") {
              n = this.preserveGlobalDeclaration(n);
              continue;
            }
            r.kind === "keyword" && !uc.has(r.text) && this.moduleFallback(`unexpected top-level keyword '${r.text}'`, n);
          }
        }
      }
    }
    e !== 0 && this.moduleFallback("unclosed top-level brace", this.tokens.length - 1), this.scopes[this.moduleScopeId].endToken = Math.max(0, this.tokens.length - 1);
  }
  collectStruct(e) {
    const n = this.nextSig(e);
    if (n === void 0 || this.tokens[n]?.kind !== "ident")
      return this.moduleFallback("struct without name", e), e;
    this.preserveToken(n, "global");
    const r = this.nextSig(n);
    if (r === void 0 || this.tokens[r]?.text !== "{")
      return this.moduleFallback("struct without body", e), n;
    const i = this.findMatching(r, "{", "}");
    if (i === void 0)
      return this.moduleFallback("unclosed struct body", r), r;
    for (let s = r; s <= i; s++)
      this.tokens[s]?.kind === "ident" && this.preserveToken(s, "struct");
    return i;
  }
  collectFunction(e) {
    const n = this.nextSig(e);
    if (n === void 0 || this.tokens[n]?.kind !== "ident")
      return this.moduleFallback("function without name", e), e;
    const r = this.tokens[n].text, i = lc.test(r) && !this.hasEntryAttributeBefore(e);
    this.addDeclaration(r, "function", n, this.moduleScopeId, void 0, i), i || this.preserveToken(n, "global");
    const s = this.nextSig(n);
    if (s === void 0 || this.tokens[s]?.text !== "(")
      return this.moduleFallback("function without parameter list", n), n;
    const a = this.findMatching(s, "(", ")");
    if (a === void 0)
      return this.moduleFallback("unclosed function parameter list", s), s;
    const o = this.findNextText(a + 1, "{");
    if (o === void 0)
      return this.moduleFallback("function without body", a), a;
    this.preserveFunctionSignatureTail(a + 1, o);
    const c = this.findMatching(o, "{", "}");
    if (c === void 0)
      return this.moduleFallback("unclosed function body", o), o;
    const l = this.createScope("function", this.moduleScopeId, this.functions.length, s);
    return this.functions.push({ id: this.functions.length, name: r, nameTokenIndex: n, scopeId: l, bodyStartToken: o, bodyEndToken: c, skipped: !1, fallbackReasons: [] }), this.collectParams(s, a, l, this.functions.length - 1), this.scopes[l].endToken = c, c;
  }
  collectParams(e, n, r, i) {
    for (let s = e + 1; s < n; s++) {
      const a = this.tokens[s];
      if (!Z(a)) {
        if (a.text === "@") {
          s = this.preserveAttribute(s);
          continue;
        }
        if (a.kind === "ident" && this.nextSig(s) !== void 0 && this.tokens[this.nextSig(s)]?.text === ":") {
          this.addDeclaration(a.text, "param", s, r, i, !0);
          const o = this.nextSig(s);
          s = this.preserveTypeFrom(o + 1, [",", ")"], n);
        }
      }
    }
  }
  preserveFunctionSignatureTail(e, n) {
    for (let r = e; r < n; r++) {
      const i = this.tokens[r];
      if (!Z(i)) {
        if (i.text === "@") {
          r = this.preserveAttribute(r);
          continue;
        }
        i.kind === "ident" && this.preserveToken(r, "type");
      }
    }
  }
  preserveGlobalDeclaration(e) {
    let n = e + 1;
    if (this.tokens[e]?.text === "var") {
      const s = this.nextSig(e);
      if (s !== void 0 && this.tokens[s]?.text === "<") {
        const a = this.findMatching(s, "<", ">");
        if (a === void 0)
          return this.moduleFallback("unparseable top-level var template", s), s;
        this.preserveRange(s, a, "type"), n = a + 1;
      }
    }
    const r = this.findNextIdent(n);
    r !== void 0 && (this.preserveToken(r, "global"), this.addDeclaration(this.tokens[r].text, "global", r, this.moduleScopeId, void 0, !1));
    const i = this.findStatementEnd(e);
    for (let s = e; s <= i; s++)
      this.tokens[s]?.kind === "ident" && this.preserveToken(s, "global");
    return i;
  }
  walkFunction(e) {
    const n = [this.moduleScopeId, e.scopeId], r = [], i = (o, c) => {
      const l = this.createScope(o, n[n.length - 1], e.id, c);
      return n.push(l), l;
    }, s = (o) => {
      if (n.length <= 2) {
        this.functionFallback(e, "scope frame underflow", o);
        return;
      }
      const c = n.pop();
      return this.scopes[c].endToken = o, c;
    };
    i("block", e.bodyStartToken);
    let a = 1;
    for (let o = e.bodyStartToken + 1; o < e.bodyEndToken; o++) {
      this.activatePendingSymbols(o);
      const c = this.tokens[o];
      if (Z(c))
        continue;
      if (c.text === "@") {
        o = this.preserveAttribute(o);
        continue;
      }
      if (c.text === ".") {
        const d = this.nextSig(o);
        d !== void 0 && this.tokens[d]?.kind === "ident" && this.preserveToken(d, "member");
        continue;
      }
      if (c.text === "enable" || c.text === "requires" || c.text === "diagnostic") {
        o = this.preserveStatement(o, "directive");
        continue;
      }
      if (c.text === "for") {
        const d = i("for-init", o), u = this.nextSig(o);
        (u === void 0 || this.tokens[u]?.text !== "(") && this.functionFallback(e, "for without parenthesized header", o), r.push({ scopeId: d, headerDepth: 0, awaitingBody: !1 });
        continue;
      }
      const l = r[r.length - 1];
      if (l && l.bodyDepth === void 0 && (c.text === "(" && l.headerDepth++, c.text === ")" && (l.headerDepth--, l.headerDepth <= 0 && (l.awaitingBody = !0))), c.text === "{") {
        a++;
        const d = fc(r, (u) => u.awaitingBody && u.bodyDepth === void 0);
        d && (d.bodyDepth = a), i("block", o);
        continue;
      }
      if (c.text === "}") {
        const d = a;
        for (s(o), a--; r.length > 0 && r[r.length - 1].bodyDepth === d; )
          s(o), r.pop();
        a < 0 && this.functionFallback(e, "unmatched closing brace", o);
        continue;
      }
      if (c.text === ":") {
        o = this.preserveTypeFrom(o + 1, ["=", ";", ",", ")", "{"], e.bodyEndToken);
        continue;
      }
      if (c.text === "-" && this.tokens[this.nextSig(o) ?? -1]?.text === ">") {
        o = this.preserveTypeFrom((this.nextSig(o) ?? o) + 1, ["{"], e.bodyEndToken);
        continue;
      }
      if (c.text === "let" || c.text === "const" || c.text === "var") {
        o = this.collectLocalDeclaration(o, n[n.length - 1], e);
        continue;
      }
      if (c.kind === "ident" && !this.preserved.has(o)) {
        const d = this.resolve(c.text, n);
        d !== void 0 ? this.references.push({ name: c.text, tokenIndex: o, declarationId: d, scopeId: n[n.length - 1], functionId: e.id }) : this.preserveToken(o, "unknown");
      }
    }
    for (; n.length > 2; )
      s(e.bodyEndToken);
  }
  collectLocalDeclaration(e, n, r) {
    const i = this.tokens[e].text;
    let s = e + 1;
    if (i === "var") {
      const c = this.nextSig(e);
      if (c !== void 0 && this.tokens[c]?.text === "<") {
        const l = this.findMatching(c, "<", ">");
        if (l === void 0)
          return this.functionFallback(r, "unparseable var template", c), c;
        this.preserveRange(c, l, "type"), s = l + 1;
      }
    }
    const a = this.findNextIdent(s);
    if (a === void 0 || a >= r.bodyEndToken)
      return this.functionFallback(r, `${i} without identifier`, e), e;
    this.addDeclaration(this.tokens[a].text, i, a, n, r.id, !0, this.findStatementEnd(e));
    const o = this.nextSig(a);
    return o !== void 0 && this.tokens[o]?.text === ":" ? this.preserveTypeFrom(o + 1, ["=", ";", ",", ")"], r.bodyEndToken) : a;
  }
  addDeclaration(e, n, r, i, s, a, o) {
    const c = this.declarations.length;
    return this.declarations.push({ id: c, name: e, kind: n, tokenIndex: r, scopeId: i, functionId: s, safeToRename: a }), o !== void 0 ? this.pendingSymbols.push({ name: e, id: c, scopeId: i, activateAfter: o }) : this.activateSymbol(e, c, i), c;
  }
  activatePendingSymbols(e) {
    for (let n = this.pendingSymbols.length - 1; n >= 0; n--) {
      const r = this.pendingSymbols[n];
      r.activateAfter >= e || (this.activateSymbol(r.name, r.id, r.scopeId), this.pendingSymbols.splice(n, 1));
    }
  }
  activateSymbol(e, n, r) {
    let i = this.symbolsByScope.get(r);
    i || (i = /* @__PURE__ */ new Map(), this.symbolsByScope.set(r, i)), i.has(e) || i.set(e, n);
  }
  resolve(e, n) {
    for (let r = n.length - 1; r >= 0; r--) {
      const i = this.symbolsByScope.get(n[r])?.get(e);
      if (i !== void 0)
        return i;
    }
  }
  preserveAttribute(e) {
    this.preserveToken(e, "attribute");
    const n = this.nextSig(e);
    if (n === void 0)
      return e;
    this.preserveToken(n, "attribute");
    const r = this.nextSig(n);
    if (r === void 0 || this.tokens[r]?.text !== "(")
      return n;
    const i = this.findMatching(r, "(", ")");
    return i === void 0 ? (this.preserveRange(r, r, "attribute"), r) : (this.preserveRange(r, i, "attribute"), i);
  }
  preserveTypeFrom(e, n, r) {
    let i = 0, s = 0, a = 0, o = e - 1;
    for (let c = e; c < r; c++) {
      const l = this.tokens[c];
      if (!Z(l)) {
        if (i === 0 && s === 0 && a === 0 && n.includes(l.text))
          return Math.max(e - 1, c - 1);
        if (l.text === "<")
          i++;
        else if (l.text === ">")
          i = Math.max(0, i - 1);
        else if (l.text === "(")
          s++;
        else if (l.text === ")") {
          if (s === 0 && n.includes(")"))
            return Math.max(e - 1, c - 1);
          s = Math.max(0, s - 1);
        } else l.text === "[" ? a++ : l.text === "]" && (a = Math.max(0, a - 1));
        l.kind === "ident" && this.preserveToken(c, "type"), o = c;
      }
    }
    return o;
  }
  preserveStatement(e, n) {
    const r = this.findStatementEnd(e);
    return this.preserveRange(e, r, n), r;
  }
  preserveRange(e, n, r) {
    for (let i = e; i <= n; i++)
      this.tokens[i] && this.tokens[i].kind !== "lineComment" && this.tokens[i].kind !== "blockComment" && this.preserveToken(i, r);
  }
  preserveToken(e, n) {
    this.preserved.has(e) || this.preserved.set(e, n);
  }
  createScope(e, n, r, i) {
    const s = this.scopes.length;
    return this.scopes.push({ id: s, kind: e, parentId: n, functionId: r, startToken: i }), s;
  }
  nextSig(e) {
    for (let n = e + 1; n < this.tokens.length; n++)
      if (!Z(this.tokens[n]))
        return n;
  }
  findNextIdent(e) {
    for (let n = e; n < this.tokens.length; n++) {
      const r = this.tokens[n];
      if (!Z(r)) {
        if (r.kind === "ident")
          return n;
        if (r.text !== "@")
          return;
      }
    }
  }
  findNextText(e, n) {
    for (let r = e; r < this.tokens.length; r++)
      if (!Z(this.tokens[r]) && this.tokens[r].text === n)
        return r;
  }
  // `<` / `>` are deliberately not tracked here: in a declaration's initializer they are
  // comparison or shift operators, not template brackets, and a net-positive count made this scan
  // overshoot the statement's own `;` (vgpu#251). A WGSL template argument list can never contain
  // `;`, `{` or `}`, so angle depth is not load-bearing for finding a statement end.
  findStatementEnd(e) {
    let n = 0;
    for (let r = e; r < this.tokens.length; r++) {
      const i = this.tokens[r].text;
      if (i === "(")
        n++;
      else if (i === ")")
        n = Math.max(0, n - 1);
      else if (n === 0 && (i === ";" || i === "{" || i === "}"))
        return r;
    }
    return this.tokens.length - 1;
  }
  findMatching(e, n, r) {
    let i = 0;
    for (let s = e; s < this.tokens.length; s++) {
      const a = this.tokens[s].text;
      if (a === n && i++, a === r && (i--, i === 0))
        return s;
    }
  }
  hasEntryAttributeBefore(e) {
    for (let n = e - 1; n >= 0; n--) {
      const r = this.tokens[n];
      if (!Z(r)) {
        if (r.text === ")" || r.kind === "ident" || r.text === "@") {
          const i = r.text;
          if (i === "compute" || i === "vertex" || i === "fragment")
            return !0;
          continue;
        }
        break;
      }
    }
    return !1;
  }
  moduleFallback(e, n) {
    this.moduleFallbackReasons.push(`${e} at token ${n}`);
  }
  functionFallback(e, n, r) {
    e.skipped = !0, e.fallbackReasons.push(`${n} at token ${r}`);
  }
}
function fc(t, e) {
  for (let n = t.length - 1; n >= 0; n--)
    if (e(t[n]))
      return t[n];
}
function Z(t) {
  return t.kind === "lineComment" || t.kind === "blockComment";
}
const pc = /* @__PURE__ */ new Set(["textureSample", "textureSampleBias", "textureSampleLevel", "textureSampleGrad", "textureGather", "textureSampleBaseClampToEdge"]), hc = /* @__PURE__ */ new Set(["textureSampleCompare", "textureSampleCompareLevel", "textureGatherCompare"]);
function mc(t, e, n) {
  const r = /* @__PURE__ */ new Map();
  for (let i = 0; i < t.length; i++) {
    const s = t[i], a = e[i], o = ui(s.tokens), c = /* @__PURE__ */ new Map();
    for (const d of a.vars) {
      const u = V(d.attrs, "group"), p = V(d.attrs, "binding"), m = o.declarations.find((b) => b.kind === "global" && b.name === d.name);
      u !== void 0 && p !== void 0 && m && c.set(m.id, { group: u, binding: p });
    }
    const l = /* @__PURE__ */ new Map();
    for (const d of o.declarations) {
      if (d.kind !== "function")
        continue;
      const u = o.functions.find((p) => p.nameTokenIndex === d.tokenIndex);
      u && l.set(d.id, u.id);
    }
    for (const d of a.entries) {
      const u = o.functions.find((g) => g.name === d.name), p = [];
      let m = o.fallback.wholeModule || !u;
      !m && u && (m = !di(u.id, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Set(), o, c, l, p));
      const b = u ? wc(u.id, o, c, l) : n.map(_t);
      r.set(d, m ? vc(n, b) : Sc(p));
    }
  }
  return r;
}
function di(t, e, n, r, i, s, a) {
  const o = r.functions[t];
  if (!o || o.skipped)
    return !1;
  const c = `${t}|${[...e].map(([u, p]) => `${u}:${p.group}:${p.binding}`).join(",")}`;
  if (n.has(c))
    return !0;
  n.add(c);
  const l = r.references.filter((u) => u.functionId === t), d = new Map(l.map((u) => [u.tokenIndex, u]));
  for (let u = o.bodyStartToken + 1; u < o.bodyEndToken; u++) {
    const p = r.tokens[u]?.text, m = pc.has(p ?? "") ? "filtering" : hc.has(p ?? "") ? "comparison" : void 0, b = d.get(u), g = b && s.get(b.declarationId);
    if (!m && g === void 0)
      continue;
    const $ = xc(r, u);
    if ($ === void 0 || r.tokens[$]?.text !== "(")
      continue;
    const w = yc(r, $);
    if (!w)
      return !1;
    const y = w.map(([S, E]) => gc(S, E, r, i, e));
    if (m) {
      const S = p === "textureGather" && !bc(w[0], r, i, e) ? 1 : 0, E = y[S], C = y[S + 1];
      if (!E || !C)
        return !1;
      a.push({ texture: E, sampler: C, mode: m });
    } else {
      const S = r.declarations.filter((C) => C.kind === "param" && C.functionId === g).sort((C, T) => C.tokenIndex - T.tokenIndex), E = /* @__PURE__ */ new Map();
      for (let C = 0; C < S.length; C++)
        y[C] && E.set(S[C].id, y[C]);
      if (!di(g, E, n, r, i, s, a))
        return !1;
    }
  }
  return !0;
}
function gc(t, e, n, r, i) {
  for (const s of n.references) {
    if (s.tokenIndex < t || s.tokenIndex > e)
      continue;
    const a = r.get(s.declarationId) ?? i.get(s.declarationId);
    if (a)
      return a;
  }
}
function bc(t, e, n, r) {
  const i = e.references.find((s) => s.tokenIndex >= t[0] && s.tokenIndex <= t[1]);
  return i?.tokenIndex === t[0] ? n.get(i.declarationId) ?? r.get(i.declarationId) : void 0;
}
function yc(t, e) {
  const n = [];
  let r = 1, i = 0, s = 0, a = 0, o = e + 1;
  for (let c = e + 1; c < t.tokens.length; c++) {
    const l = t.tokens[c].text;
    if (l === "(")
      r++;
    else if (l === ")") {
      if (r--, r === 0)
        return n.push([o, c - 1]), n;
    } else l === "[" ? i++ : l === "]" ? i-- : l === "{" ? s++ : l === "}" ? s-- : l === "<" ? a++ : l === ">" ? a-- : l === "," && r === 1 && i === 0 && s === 0 && a === 0 && (n.push([o, c - 1]), o = c + 1);
  }
}
function xc(t, e) {
  for (let n = e + 1; n < t.tokens.length; n++)
    if (t.tokens[n].kind !== "lineComment" && t.tokens[n].kind !== "blockComment")
      return n;
}
function wc(t, e, n, r) {
  const i = [t], s = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
  for (; i.length; ) {
    const o = i.pop();
    if (!s.has(o)) {
      s.add(o);
      for (const c of e.references) {
        if (c.functionId !== o)
          continue;
        const l = n.get(c.declarationId);
        l && a.set(`${l.group}:${l.binding}`, l);
        const d = r.get(c.declarationId);
        d !== void 0 && i.push(d);
      }
    }
  }
  return [...a.values()];
}
function vc(t, e) {
  const n = new Set(e.map((a) => `${a.group}:${a.binding}`)), r = t.filter((a) => n.has(`${a.group}:${a.binding}`)), i = r.filter((a) => a.bindingLayout?.kind === "texture" && a.bindingLayout.texture.sampleType === "unfilterable-float" && !a.bindingLayout.texture.multisampled), s = r.filter((a) => a.bindingLayout?.kind === "sampler" && a.bindingLayout.sampler.type === "filtering");
  return i.flatMap((a) => s.map((o) => ({ texture: _t(a), sampler: _t(o), mode: "filtering" })));
}
function _t(t) {
  return { group: t.group, binding: t.binding };
}
function Sc(t) {
  const e = /* @__PURE__ */ new Set();
  return t.filter((n) => {
    const r = `${n.texture.group}:${n.texture.binding}:${n.sampler.group}:${n.sampler.binding}:${n.mode}`;
    return e.has(r) ? !1 : (e.add(r), !0);
  });
}
function Ec(t, e) {
  const n = t.map(ma), r = $a(t, n), i = Pa(n, r), s = [], a = [];
  for (const l of n)
    for (const d of l.vars) {
      const u = V(d.attrs, "group"), p = V(d.attrs, "binding");
      if (u === void 0 || p === void 0)
        continue;
      const m = be(d.type, d.path, r), b = qo(m, d.addressSpace), g = d.addressSpace === "uniform" || d.addressSpace === "storage" ? Ze(m, d.addressSpace, d.name, d.mangledName, i) : void 0;
      g && a.push(g), s.push({
        group: u,
        binding: p,
        name: d.name,
        mangledName: d.mangledName,
        type: m,
        kind: b,
        addressSpace: d.addressSpace,
        access: d.access,
        struct: m.kind === "identifier" ? i.structs.get(m.mangledName ?? m.name) : void 0,
        layout: g,
        bindingLayout: Ho(b, d.addressSpace, d.access, m, g)
      });
    }
  s.sort((l, d) => l.group - d.group || l.binding - d.binding);
  const o = Tc(t, n, s), c = mc(t, n, s);
  return {
    bindings: s,
    entryPoints: n.flatMap((l) => l.entries.map((d) => Ic(d, n.flatMap((u) => u.structs), r, i, o.get(d) ?? s, c.get(d) ?? []))),
    overrides: n.flatMap((l) => l.overrides),
    featuresRequired: [...new Set(n.flatMap((l) => l.features))],
    aliases: [...i.aliases.values()],
    structs: [...i.structs.values()],
    hostShareableLayouts: a
  };
}
function Tc(t, e, n) {
  const r = /* @__PURE__ */ new Map();
  for (let i = 0; i < t.length; i++) {
    const s = t[i], a = e[i], o = ui(s.tokens), c = o.fallback.wholeModule, l = /* @__PURE__ */ new Map();
    for (const u of o.declarations) {
      if (u.kind !== "function")
        continue;
      const p = o.functions.find((m) => m.nameTokenIndex === u.tokenIndex);
      p && l.set(u.id, p.id);
    }
    const d = /* @__PURE__ */ new Map();
    for (const u of a.vars) {
      const p = V(u.attrs, "group"), m = V(u.attrs, "binding");
      if (p === void 0 || m === void 0)
        continue;
      const b = o.declarations.find((g) => g.kind === "global" && g.name === u.name);
      b && d.set(b.id, { group: p, binding: m });
    }
    for (const u of a.entries) {
      const p = o.functions.find(($) => $.name === u.name);
      if (c || !p) {
        r.set(u, n);
        continue;
      }
      const m = [p.id], b = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Map();
      for (; m.length; ) {
        const $ = m.pop();
        if (!b.has($) && (b.add($), !!o.functions[$]))
          for (const w of o.references) {
            if (w.functionId !== $)
              continue;
            const y = d.get(w.declarationId);
            y && g.set(`${y.group}:${y.binding}`, y);
            const S = l.get(w.declarationId);
            S !== void 0 && m.push(S);
          }
      }
      r.set(u, [...g.values()].sort(($, w) => $.group - w.group || $.binding - w.binding));
    }
  }
  return r;
}
function Ic(t, e, n, r, i, s) {
  return {
    name: t.name,
    mangledName: t.mangledName,
    stage: t.stage,
    // `workgroupSize` and `inputs` stay absent rather than `undefined`-valued when they do not
    // apply: an own key valued `undefined` survives structuredClone but is dropped by
    // JSON.stringify, which would make the key set differ across serialization boundaries.
    ...t.workgroupSize ? { workgroupSize: t.workgroupSize } : {},
    bindings: i.map(({ group: a, binding: o }) => ({ group: a, binding: o })),
    samplingPairs: s,
    ...t.stage === "vertex" ? { inputs: Cc(t, e, n, r) } : {}
  };
}
function Cc(t, e, n, r) {
  const i = [];
  for (const s of t.params) {
    if (Kn(s.attrs, "builtin"))
      continue;
    const a = be(s.type, t.path, n), o = V(s.attrs, "location");
    if (o !== void 0) {
      i.push({ name: s.name, location: o, type: a });
      continue;
    }
    const c = De(a, r);
    if (c.kind !== "identifier")
      continue;
    const l = e.find((u) => u.mangledName === (c.mangledName ?? c.name)), d = r.structs.get(c.mangledName ?? c.name);
    if (l)
      for (let u = 0; u < l.members.length; u++) {
        const p = l.members[u];
        if (Kn(p.attrs, "builtin"))
          continue;
        const m = V(p.attrs, "location");
        m !== void 0 && i.push({ name: p.name, location: m, type: d?.members[u]?.type ?? be(p.type, l.path, n) });
      }
  }
  return i;
}
function Kn(t, e) {
  return t.some((n) => n.name === e);
}
function fi(t, e = "<runtime>") {
  const n = oc(t, e), r = Vo(n);
  if (r.imports.length > 0)
    throw G("VGPU-WGSL-REFLECT-SOURCE-IMPORT", "reflectSource() accepts a single raw WGSL string; use resolveShader() for WGSL import graphs.");
  return Ec([{ path: e, source: t, tokens: n, parsed: r }]);
}
function pi() {
  const t = /* @__PURE__ */ new Map();
  return {
    getOrCreate(e, n, r, i) {
      const s = r.map(jt), a = `${e}:${n}:${s.join("|")}`, o = t.get(a);
      if (o)
        return o.bindGroup;
      const c = i();
      return t.set(a, { identities: s, bindGroup: c }), c;
    },
    evictIdentity(e) {
      const n = jt(e);
      for (const [r, i] of t)
        i.identities.includes(n) && t.delete(r);
    },
    clearDraw(e) {
      const n = `${e}:`;
      for (const r of t.keys())
        r.startsWith(n) && t.delete(r);
    },
    dispose() {
      t.clear();
    }
  };
}
function jt(t) {
  return typeof t == "string" || typeof t == "number" ? String(t) : `${t.kind}:${t.id}`;
}
function wt(t, e, n) {
  const r = t[e];
  if (!r)
    throw new v({
      code: "VGPU-REFLECT-ENTRY-METADATA-MISSING",
      message: `Entry point '${t.name}' has no reflected ${e}.`,
      fix: "Pass the reflection from reflectSource()/resolveShader().",
      where: n
    });
  return r;
}
const vt = /* @__PURE__ */ new WeakMap();
function We(t, e) {
  if (!t.gpu.pushErrorScope || !t.gpu.popErrorScope)
    return;
  t.gpu.pushErrorScope("validation");
  const n = vt.get(t.gpu);
  n ? n.push(e) : vt.set(t.gpu, [e]);
}
function j(t) {
  const e = vt.get(t.gpu);
  if (!e?.length || !t.gpu.popErrorScope)
    return;
  const n = e.pop();
  return e.length || vt.delete(t.gpu), { context: n, error: t.gpu.popErrorScope() };
}
function hi(t) {
  const e = [];
  let n = j(t);
  for (; n; )
    e.push(n), n = j(t);
  return e;
}
function $c(t) {
  const e = j(t);
  e && rn(e);
}
function mi(t) {
  for (const e of hi(t))
    rn(e);
}
function O(t) {
  for (const e of t)
    rn(e);
}
function nn(t) {
  return t.gpu.queue.onSubmittedWorkDone?.() ?? Promise.resolve();
}
function gi(t, e = [], n = {}) {
  return Pc(t, e, n.errorSink ?? kc);
}
function St(t, e) {
  return {
    context: t.context,
    error: Lc(t.error, e.error)
  };
}
async function Lc(t, e) {
  const n = await Promise.allSettled([t, e]);
  for (const i of n)
    if (i.status === "fulfilled" && i.value)
      return i.value;
  const r = n.find((i) => i.status === "rejected");
  if (r?.status === "rejected")
    throw r.reason;
  return null;
}
async function Pc(t, e, n) {
  await nn(t);
  for (const r of e)
    try {
      const i = await r.error;
      i && await n(Le(r.context.label, r.context.group, i));
    } catch (i) {
      await n(Le(r.context.label, r.context.group, i));
    }
}
function rn(t) {
  t.error.catch(() => {
  });
}
function kc(t) {
  console.error(t);
}
function bi(t, e, n, r) {
  try {
    e.end();
  } catch (i) {
    const s = hi(t);
    O(n), O(s), n.length = 0;
    const a = s[0]?.context ?? r;
    throw a ? Le(a.label, a.group, i) : i;
  }
}
let Ac = 1;
const Yn = /* @__PURE__ */ new WeakMap();
function Fc(t) {
  return t === null || typeof t != "object" || ArrayBuffer.isView(t) || t instanceof ArrayBuffer || Array.isArray(t) ? !0 : t instanceof le || t instanceof Me ? !1 : !xi(t);
}
function Wt(t) {
  return typeof t != "object" || t === null || Array.isArray(t) || ArrayBuffer.isView(t) || t instanceof ArrayBuffer || t instanceof le || t instanceof Me ? !1 : !xi(t);
}
function Xn(t, e, n) {
  switch (t.bindingLayout?.kind) {
    case "buffer":
      return Mc(t, e, n);
    case "texture":
      return Rc(t, e, n);
    case "sampler":
      return Dc(t, e);
    case "storageTexture":
      throw ee(t, "storage texture", "Pass a storage-compatible texture.");
    case "externalTexture":
      throw ee(t, "external texture", "Pass a compatible GPUExternalTexture.");
    default:
      throw ee(t, "reflected resource", "Fix shader reflection bindingLayout.");
  }
}
function Mc(t, e, n) {
  const r = Io(e);
  if (r)
    return r[Kr](t, n.sourceHint);
  if (e instanceof le)
    return On(e, `${n.sourceHint}.set`), zc(t, e.options.usage), { resource: { buffer: e.gpu }, identity: e.resourceIdentity, unsubscribe: (i) => e.onDestroy(i) };
  if (Nc(e))
    return On(e.buffer, `${n.sourceHint}.set`), { resource: { buffer: e.gpu, offset: 0, size: e.size }, identity: e.buffer.resourceIdentity, unsubscribe: (i) => e.buffer.onDestroy(i) };
  if (vi(e))
    return { resource: e, identity: Ke(e.buffer) };
  if (sn(e))
    return { resource: { buffer: e }, identity: Ke(e) };
  throw ee(t, "buffer", `Pass a compatible Buffer/Uniform: ${t.name}.set({ ${t.name}: gpu.device.createBuffer(...) }).`);
}
function Rc(t, e, n) {
  const r = yi(e);
  if (r) {
    const i = r.color;
    Jn(t, i, n);
    const s = r.onTexturesRecreated?.bind(r);
    return { resource: i.createView(), identity: i.resourceIdentity, unsubscribe: (a) => r.onDestroy(a), onRecreate: s ? (a) => s(a) : void 0 };
  }
  if (e instanceof Me)
    return Uc(t, e.usage), Jn(t, e, n), { resource: e.createView(), identity: e.resourceIdentity, unsubscribe: (i) => e.onDestroy(i) };
  if (wi(e))
    return { resource: e.createView(), identity: e.resourceIdentity ?? Ke(e) };
  if (typeof e == "object" && e !== null)
    return { resource: e, identity: Ke(e) };
  throw ee(t, "texture/target", `Pass a Texture or Target: ${t.name}.set({ ${t.name}: scene.color }) or set({ ${t.name}: scene }).`);
}
function Dc(t, e) {
  if (Gc(e))
    return { resource: e, identity: Ke(e) };
  throw ee(t, "sampler", `Use the cached sampler: set({ ${t.name}: sampler(gpu) }).`);
}
function Gc(t) {
  return typeof t != "object" || t === null || t instanceof le || t instanceof Me ? !1 : !sn(t) && !vi(t) && !wi(t) && !yi(t);
}
function zc(t, e) {
  const n = t.bindingLayout?.kind === "buffer" ? t.bindingLayout.buffer.type : void 0;
  if (n === "uniform" && !e.includes("uniform"))
    throw ee(t, "uniform buffer", "Create with usage: ['uniform','copy_dst'].");
  if ((n === "storage" || n === "read-only-storage") && !e.includes("storage"))
    throw ee(t, "storage buffer", "Create with usage: ['storage','copy_dst'].");
}
function Uc(t, e) {
  if (!e.includes("texture_binding") && !e.includes("render_attachment"))
    throw ee(t, "sampled texture", "Use texture_binding usage or a sampleable Target.");
}
function Jn(t, e, n) {
  if (!(!n.filterableTexture || n.float32Filterable) && (e.format === "r32float" || e.format === "rg32float" || e.format === "rgba32float"))
    throw Os(n.sourceHint, t, e.format, e.label ?? "texture", n.pairedSampler);
}
function yi(t) {
  if (typeof t != "object" || t === null)
    return;
  const e = t;
  if (!(!e.resourceIdentity || !e.color || typeof e.onDestroy != "function"))
    return e;
}
function xi(t) {
  const e = t;
  return "gpu" in e || "bindGroup" in e || "createView" in e || "resourceIdentity" in e;
}
function Ke(t) {
  if (typeof t != "object" || t === null)
    return `value:${String(t)}`;
  let e = Yn.get(t);
  return e || (e = { kind: "external", id: Ac++ }, Yn.set(t, e)), e;
}
function Nc(t) {
  return typeof t == "object" && t !== null && "gpu" in t && "size" in t && "buffer" in t && t.buffer instanceof le;
}
function wi(t) {
  return typeof t == "object" && t !== null && typeof t.createView == "function";
}
function vi(t) {
  return typeof t == "object" && t !== null && "buffer" in t && sn(t.buffer);
}
function sn(t) {
  return typeof t == "object" && t !== null && "size" in t && "usage" in t && typeof t.destroy == "function";
}
function Oc(t, e) {
  Bc(t);
  const n = new ArrayBuffer(t.size);
  return on(new DataView(n), t, 0, e), n;
}
function Bc(t) {
  if (t.size === void 0)
    throw B("set", `No se puede inferir byteLength para layout runtime-sized '${t.name}'.`);
}
function on(t, e, n, r) {
  if (e.members)
    return Vc(t, e.members, n, r);
  _c(t, e, n, r);
}
function Vc(t, e, n, r) {
  const i = r;
  for (const s of e)
    on(t, s.layout, n + s.offset, i?.[s.name]);
}
function _c(t, e, n, r) {
  switch (e.type.kind) {
    case "scalar":
      return an(t, n, e.type.name, r);
    case "vector":
      return jc(t, n, e.type, r);
    case "matrix":
      return Wc(t, e, n, r);
    case "array":
      return qc(t, e, n, r);
    default:
      throw B("set", `No hay writer para layout ${e.type.kind}.`);
  }
}
function an(t, e, n, r) {
  n === "f32" ? t.setFloat32(e, Number(r ?? 0), !0) : n === "i32" ? t.setInt32(e, Number(r ?? 0), !0) : n === "u32" || n === "bool" ? t.setUint32(e, n === "bool" ? r ? 1 : 0 : Number(r ?? 0), !0) : t.setUint16(e, Hc(Number(r ?? 0)), !0);
}
function jc(t, e, n, r) {
  const i = r, s = Si(n.element);
  for (let a = 0; a < n.width; a++)
    an(t, e + a * s, cn(n.element), i?.[a] ?? 0);
}
function Wc(t, e, n, r) {
  const i = e.type, s = r, a = Si(i.element), o = e.stride ?? 16;
  for (let c = 0; c < i.columns; c++)
    for (let l = 0; l < i.rows; l++)
      an(t, n + c * o + l * a, cn(i.element), s?.[c * i.rows + l] ?? 0);
}
function qc(t, e, n, r) {
  const i = r, s = e.stride ?? e.element?.size ?? 0;
  if (!e.element)
    throw B("set", "Array layout sin element layout.");
  for (let a = 0; a < (i?.length ?? 0); a++)
    on(t, e.element, n + a * s, i[a]);
}
function Si(t) {
  return cn(t) === "f16" ? 2 : 4;
}
function cn(t) {
  if (t.kind !== "scalar")
    throw B("set", `Expected scalar, got ${t.kind}`);
  return t.name;
}
function Hc(t) {
  const e = new Float32Array(1), n = new Uint32Array(e.buffer);
  e[0] = t;
  const r = n[0], i = r >> 16 & 32768, s = r & 8388607, a = r >> 23 & 255;
  if (a === 255)
    return i | (s ? 32256 : 31744);
  const o = a - 127 + 15;
  return o >= 31 ? i | 31744 : o <= 0 ? o < -10 ? i : i | (s | 8388608) >> 1 - o + 13 : i | o << 10 | s >> 13;
}
const Qn = /* @__PURE__ */ new WeakMap();
function Kc(t, e) {
  const n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
  for (const s of e) {
    const a = s.stage === "vertex" ? 1 : s.stage === "fragment" ? 2 : 4;
    for (const o of wt(s, "bindings", "visibility")) {
      const c = `${o.group}:${o.binding}`;
      n.set(c, (n.get(c) ?? 0) | a);
    }
    for (const o of wt(s, "samplingPairs", "visibility"))
      o.mode === "filtering" && r.add(`${o.texture.group}:${o.texture.binding}`);
  }
  const i = (s) => n.get(`${s.group}:${s.binding}`) ?? 0;
  return Object.defineProperty(i, "filterable", { value: r }), i;
}
function Ei(t, e, n = ln) {
  return t.flatMap((r) => {
    if (r.group !== e)
      return [];
    const i = n(r);
    return i === 0 ? [] : [{ binding: r.binding, visibility: i, ...Jc(r, n.filterable?.has(`${r.group}:${r.binding}`) ?? !1) }];
  });
}
function Yc(t, e, n, r = ln) {
  const i = /* @__PURE__ */ new Map(), s = n.bindings.filter((o) => r(o) !== 0).map((o) => o.group), a = Math.max(-1, ...s);
  for (let o = 0; o <= a; o++)
    i.set(o, Xc(t, e, n, o, r));
  return i;
}
function Xc(t, e, n, r, i = ln) {
  return Ti(t, `${e}.group${r}.bgl`, Ei(n.bindings, r, i));
}
function Ti(t, e, n) {
  let r = Qn.get(t.gpu);
  r || (r = /* @__PURE__ */ new Map(), Qn.set(t.gpu, r));
  const i = JSON.stringify(n), s = r.get(i);
  if (s)
    return s;
  const a = zs(t.gpu.createBindGroupLayout({ label: e, entries: n }), { entries: n });
  return r.set(i, a), a;
}
function Jc(t, e) {
  const n = t.bindingLayout;
  if (!n)
    throw B("bindGroupLayout", `Binding '${t.name}' does not have a reflected bindingLayout.`);
  return e && n.kind === "texture" && n.texture.sampleType === "unfilterable-float" && !n.texture.multisampled ? { texture: { ...n.texture, sampleType: "float" } } : Qc(n);
}
function Qc(t) {
  switch (t.kind) {
    case "buffer":
      return { buffer: { ...t.buffer } };
    case "sampler":
      return { sampler: { ...t.sampler } };
    case "texture":
      return { texture: { ...t.texture } };
    case "storageTexture":
      return { storageTexture: { ...t.storageTexture } };
    case "externalTexture":
      return { externalTexture: {} };
  }
}
function ln(t) {
  const e = globalThis.GPUShaderStage, n = e?.VERTEX ?? 1, r = e?.FRAGMENT ?? 2, i = e?.COMPUTE ?? 4;
  return t.kind === "buffer" ? n | r | i : r | i;
}
function Zc(t) {
  const e = el(t.reflection), n = [...t.bindGroupLayouts.keys()].sort((h, x) => h - x), r = /* @__PURE__ */ new Map();
  function i(h) {
    const x = [];
    for (const [I, A] of Object.entries(h))
      x.push(...a(I, A));
    return x;
  }
  function s(h) {
    const x = t.bindGroupLayouts.get(h.info.group);
    return !!x && !!je(x)?.entries.some((I) => I.binding === h.info.binding);
  }
  function a(h, x) {
    const I = e.get(h);
    if (I)
      return o(I, h, x);
    const A = tl(h, e, t.label);
    if (!A)
      throw B(`${t.label}.set`, `Binding '${h}' does not exist in '${t.label}'.`);
    return c(A, h, x);
  }
  function o(h, x, I) {
    C(h.info.group);
    const A = Zn(h.info, I);
    er(h, x, A);
    const M = mt(h.identity);
    return A === "lib" ? l(h, sl(h.libValue, I)) : u(h, I), s(h) ? Dt(h, M) : [];
  }
  function c(h, x, I) {
    C(h.info.group);
    const A = Zn(h.info, I);
    if (er(h, x, A), nl(h, x, A), A !== "lib")
      throw B(`${t.label}.set`, `Member '${x}' needs a JS value; set resource '${h.info.name}' instead.`);
    const M = mt(h.identity);
    return l(h, { ...ol(h.libValue), [x]: I }), s(h) ? Dt(h, M) : [];
  }
  function l(h, x) {
    const I = P(h);
    h.libValue = x;
    const A = Oc(I, x);
    h.buffer || T(h, I.size), h.bytes = A, h.buffer.write(A, 0);
  }
  function d(h) {
    const x = je(t.bindGroupLayouts.get(h.group))?.entries.find((M) => M.binding === h.binding), I = t.reflection.entryPoints.flatMap((M) => wt(M, "samplingPairs", t.label)).find((M) => M.mode === "filtering" && M.texture.group === h.group && M.texture.binding === h.binding), A = I && t.reflection.bindings.find((M) => M.group === I.sampler.group && M.binding === I.sampler.binding);
    return { sourceHint: t.label, filterableTexture: x?.texture?.sampleType === "float", float32Filterable: t.device.features.has("float32-filterable"), pairedSampler: A };
  }
  function u(h, x) {
    const I = Xn(h.info, x, d(h.info));
    h.unsubscribe?.(), h.unsubscribeRecreate?.(), h.resource = I.resource, h.identity = I.identity, h.unsubscribe = I.unsubscribe?.(() => {
      h.identity && t.cache.evictIdentity(h.identity);
    }), h.unsubscribeRecreate = I.onRecreate?.(() => p(h, x));
  }
  function p(h, x) {
    const I = mt(h.identity);
    h.identity && t.cache.evictIdentity(h.identity);
    const A = Xn(h.info, x, d(h.info));
    if (h.unsubscribe?.(), h.unsubscribeRecreate?.(), h.resource = A.resource, h.identity = A.identity, h.unsubscribe = A.unsubscribe?.(() => {
      h.identity && t.cache.evictIdentity(h.identity);
    }), h.unsubscribeRecreate = A.onRecreate?.(() => p(h, x)), s(h))
      for (const M of Dt(h, I))
        t.onIdentityChange?.(M);
  }
  function m(h, x, I) {
    b(h), rl(t.label, h, x, I);
    const A = r.has(h) ? `claimed-group:${h}` : void 0;
    return r.set(h, x), A;
  }
  function b(h) {
    const x = t.bindGroupLayouts.get(h);
    if (!x)
      throw B(`${t.label}.layout`, `@group(${h}) does not exist in '${t.label}'.`);
    return x;
  }
  function g() {
    return n.map($);
  }
  function $(h) {
    const x = r.get(h);
    if (x)
      return { group: h, bindGroup: x, offsets: [], claimValidation: w(x, h) };
    const I = new Set(je(b(h))?.entries.map((ne) => ne.binding)), A = t.reflection.bindings.filter((ne) => ne.group === h && I.has(ne.binding)), M = y(A), ze = S(A), we = t.cache.getOrCreate(t.drawId, h, ze, () => t.device.gpu.createBindGroup({
      label: `${t.label}.group${h}`,
      layout: b(h),
      entries: M
    }));
    return { group: h, bindGroup: we, offsets: [] };
  }
  function w(h, x) {
    return Br(h) ? void 0 : { label: t.label, group: x };
  }
  function y(h) {
    return h.map((x) => {
      const I = E(x);
      return { binding: x.binding, resource: I.resource };
    });
  }
  function S(h) {
    return h.map((x) => E(x).identity);
  }
  function E(h) {
    const x = e.get(h.name);
    if (!x?.resource || !x.identity)
      throw Bs(t.label, h);
    return x;
  }
  function C(h) {
    if (r.has(h))
      throw Vs(t.label, h);
  }
  function T(h, x) {
    h.buffer = t.device.createBuffer({ size: x, usage: ["uniform", "copy_dst"], label: `${t.label}.${h.info.name}` }), h.resource = { buffer: h.buffer.gpu, offset: 0, size: x }, h.identity = h.buffer.resourceIdentity, h.unsubscribe = h.buffer.onDestroy(() => t.cache.evictIdentity(h.buffer.resourceIdentity));
  }
  function P(h) {
    if (h.info.kind !== "buffer" || !h.info.layout?.size)
      throw B(`${t.label}.set`, `Binding '${h.info.name}' needs a compatible resource, not JS.`);
    return h.info.layout;
  }
  return {
    get groups() {
      return n;
    },
    set: i,
    claimGroup: m,
    layout: b,
    bindGroups: g,
    bindingState(h) {
      const x = e.get(h);
      if (!(!x?.ownership || !x.resource || !x.identity))
        return { info: x.info, ownership: x.ownership, resource: x.resource, identity: x.identity };
    }
  };
}
function el(t) {
  return new Map(t.bindings.map((e) => [e.name, { info: e, memberOwnership: /* @__PURE__ */ new Map() }]));
}
function tl(t, e, n) {
  let r;
  for (const i of e.values())
    if (i.info.layout?.members?.some((s) => s.name === t)) {
      if (r)
        throw B(`${n}.set`, `Binding member '${t}' is ambiguous in '${n}'; set the complete binding.`);
      r = i;
    }
  return r;
}
function Zn(t, e) {
  return t.bindingLayout?.kind === "buffer" && Fc(e) ? "lib" : "user";
}
function er(t, e, n) {
  if (t.ownership && t.ownership !== n)
    throw Vr(e, t.ownership);
  t.ownership ??= n;
}
function nl(t, e, n) {
  const r = t.memberOwnership.get(e);
  if (r && r !== n)
    throw Vr(e, r);
  t.memberOwnership.set(e, n);
}
function rl(t, e, n, r) {
  const i = Br(n);
  if (!i)
    return;
  const s = je(r);
  if (!s)
    return;
  const a = il(s.entries, i.layout.entries);
  if (a)
    throw _s(t, e, a);
}
function il(t, e) {
  if (t.length !== e.length)
    return `expected ${t.length} bindings and received ${e.length}`;
  const n = tr(t), r = tr(e);
  for (const [i, s] of n) {
    const a = r.get(i);
    if (!a)
      return `missing @binding(${i})`;
    if (nr(s) !== nr(a))
      return `@binding(${i}) does not match the reflected layout`;
  }
}
function tr(t) {
  return new Map(t.map((e) => [e.binding, e]));
}
function nr(t) {
  return JSON.stringify({
    binding: t.binding,
    visibility: t.visibility,
    buffer: t.buffer,
    sampler: t.sampler,
    texture: t.texture,
    storageTexture: t.storageTexture,
    externalTexture: t.externalTexture ? {} : void 0
  });
}
function Dt(t, e) {
  const n = mt(t.identity);
  return !n || e === n ? [] : [{
    group: t.info.group,
    binding: t.info.binding,
    bindingName: t.info.name,
    bindingKind: t.info.kind,
    previousIdentity: e,
    newIdentity: n
  }];
}
function mt(t) {
  return t === void 0 ? void 0 : jt(t);
}
function sl(t, e) {
  return Wt(t) && Wt(e) ? { ...t, ...e } : e;
}
function ol(t) {
  return Wt(t) ? t : {};
}
const al = "rgba8unorm", un = Object.freeze([0, 0, 0, 1]);
function Et(t, e) {
  const n = t, r = Array.isArray(t) ? t : [n?.r, n?.g, n?.b, n?.a];
  if (r.length !== 4 || !r.every((i) => typeof i == "number" && Number.isFinite(i)))
    throw fo(e);
  return dn(t);
}
function dn(t) {
  const e = t;
  return Array.isArray(t) ? [t[0], t[1], t[2], t[3]] : { r: e.r, g: e.g, b: e.b, a: e.a };
}
function gt(t) {
  return t.colors ?? [{ format: t.format ?? al }];
}
function Ii(t) {
  return t.depth === !0 ? "depth24plus" : t.depth || void 0;
}
function Ci(t) {
  const e = t.msaa;
  if (e === !0 || e === 4)
    return 4;
  if (e === void 0 || e === !1)
    return 1;
  const n = jr();
  throw n.code = "VGPU-TARGET-MSAA-INVALID", n.message = `msaa received ${e}; WebGPU 1|4; use true`, n;
}
function cl(t, e) {
  if (!t?.size)
    throw jr();
  const n = Ii(t);
  if (n === "stencil8")
    throw so(n);
  if (Ci(t) === 4)
    for (const r of gt(t))
      ll(r.format, e);
}
function ll(t, e) {
  if (e.isCompatibilityMode && t === "rgba16float")
    throw B("target", "Dawn compatibility mode does not support rgba16float+msaa.", "Use rgba8unorm for MSAA here, or disable msaa.");
}
function ul(t, e, n, r) {
  const i = {
    view: (e ?? t).createView(),
    resolveTarget: e ? t.createView() : void 0,
    loadOp: r ? "load" : "clear",
    storeOp: e ? "discard" : "store"
  };
  return r || (i.clearValue = $i(n)), i;
}
function dl(t, e, n, r, i) {
  if (i) {
    const a = { view: t.createView(), depthReadOnly: !0 };
    return Ye(t.format) && (a.stencilReadOnly = !0), a;
  }
  const s = { view: t.createView(), depthLoadOp: e ? "load" : "clear", depthStoreOp: t.sampleCount > 1 ? "discard" : "store" };
  return e || (s.depthClearValue = n ?? 1), t.format && Ye(t.format) && (s.stencilLoadOp = e ? "load" : "clear", s.stencilStoreOp = t.sampleCount > 1 ? "discard" : "store", e || (s.stencilClearValue = r ?? 0)), s;
}
function Ye(t) {
  return !!t && t.includes("stencil");
}
function $i(t) {
  return Array.isArray(t) ? { r: t[0], g: t[1], b: t[2], a: t[3] } : t;
}
function Li(t, e) {
  return t[0] === e[0] && t[1] === e[1];
}
function kt(t) {
  return typeof t == "object" && t !== null && typeof t.renderPassDescriptor == "function";
}
let fl = 1, pl = 1;
const hl = /* @__PURE__ */ new WeakMap(), ml = /* @__PURE__ */ new WeakMap();
function gl(t) {
  return kt(t) ? {
    colors: t.colors.map((e) => e.format),
    depth: t.depth?.format,
    sampleCount: t.sampleCount
  } : typeof t != "object" || t === null ? { colors: [] } : {
    colors: Array.isArray(t.colors) ? [...t.colors] : t.colors ?? [],
    depth: t.depth,
    sampleCount: t.sampleCount ?? 1
  };
}
function Pi(t) {
  return `${t.colors.join(",")}:${t.depth ?? "none"}:${t.sampleCount ?? 1}`;
}
function bl(t, e) {
  if (!Array.isArray(t.colors) || t.colors.length === 0)
    throw nt(e, "colors must be a non-empty array.");
  const n = t.colors.find((i) => typeof i != "string" || i.length === 0);
  if (n !== void 0)
    throw nt(e, `colors must contain only GPUTextureFormat strings; received ${String(n)}.`);
  if (t.depth !== void 0 && (typeof t.depth != "string" || t.depth.length === 0))
    throw nt(e, "depth must be a GPUTextureFormat string.");
  const r = t.sampleCount ?? 1;
  if (r !== 1 && r !== 4)
    throw nt(e, `sampleCount must be 1 or 4; received ${String(r)}.`);
}
function yl(t) {
  const e = `${or(hl, t.module, () => fl++)}|${or(ml, t.pipelineLayout, () => pl++)}|${Tl(t.vertexBufferLayouts ?? [])}|${Pi(t.signature)}`, n = t.topology || t.stripIndexFormat ? `${e}|${t.topology ?? "triangle-list"}|${t.stripIndexFormat ?? "none"}` : e, r = t.cullMode || t.frontFace ? `${n}|${t.cullMode ?? "none"}|${t.frontFace ?? "ccw"}` : n, i = t.unclippedDepth ? `${r}|unclipped` : r, s = t.depthKey ? `${i}|${t.depthKey}` : i, a = t.stencilKey ? `${s}|${t.stencilKey}` : s, o = t.multisampleKey ? `${a}|${t.multisampleKey}` : a, c = t.constantsKey ? `${o}|${t.constantsKey}` : o, l = t.entryKey ? `${c}|${t.entryKey}` : c;
  return t.fragmentKey ? `${l}|${t.fragmentKey}` : l;
}
function rr(t, e, n, r, i) {
  if (r === void 0)
    return e.find((a) => a.stage === n);
  if (typeof r != "string")
    throw ft(t, `${n} received ${qt(r)}; expected an entry point name string.`, i);
  const s = e.find((a) => a.name === r);
  if (!s)
    throw ft(t, `"${r}" matches no entry point in the shader; available entry points: ${ir(e)}.`, i);
  if (s.stage !== n)
    throw ft(t, `"${r}" is a @${s.stage} entry point, not @${n}; available entry points: ${ir(e)}.`, i);
  return s;
}
function ir(t) {
  return t.length ? t.map((e) => `"${e.name}" (@${e.stage})`).join(", ") : "none";
}
function xl(t, e, n, r) {
  if (e !== void 0 && (typeof e != "object" || e === null || Array.isArray(e)))
    throw tt(t, `received ${qt(e)}; expected { overrideNameOrId: number | boolean }.`, r);
  const i = new Map(n.map((a) => [sr(a), a])), s = {};
  for (const [a, o] of Object.entries(e ?? {})) {
    if (!i.has(a))
      throw tt(t, `"${a}" matches no override in the shader; available overrides: ${wl(n)}.`, r);
    if (typeof o == "boolean") {
      s[a] = o ? 1 : 0;
      continue;
    }
    if (typeof o != "number" || !Number.isFinite(o))
      throw tt(t, `"${a}" received ${qt(o)}; use a finite number or a boolean (WebGPU converts the value to the override's WGSL type, and NaN/Infinity fail that conversion).`, r);
    s[a] = o;
  }
  for (const a of n) {
    const o = sr(a);
    if (a.defaultValue === void 0 && !(o in s))
      throw tt(t, `override '${a.name}' has no default value and must be provided; add constants: { "${o}": value }.`, r);
  }
  return Object.keys(s).length === 0 ? {} : { constants: s, constantsKey: vl(s) };
}
function sr(t) {
  return t.id !== void 0 ? String(t.id) : t.name;
}
function wl(t) {
  return t.length ? t.map((e) => e.id !== void 0 ? `"${e.id}" (@id of ${e.name})` : `"${e.name}"`).join(", ") : "none";
}
function vl(t) {
  return `cn~${Object.entries(t).sort(([e], [n]) => e < n ? -1 : e > n ? 1 : 0).map(([e, n]) => `${e}=${n}`).join("~")}`;
}
function qt(t) {
  if (typeof t == "string")
    return `"${t}"`;
  try {
    return JSON.stringify(t) ?? String(t);
  } catch {
    return String(t);
  }
}
function ki(t) {
  const e = /* @__PURE__ */ new Map();
  return {
    get(n, r) {
      let i = e.get(n);
      return i || (i = t.gpu.createShaderModule({ label: r, code: n }), e.set(n, i)), i;
    },
    dispose() {
      e.clear();
    }
  };
}
function Ai(t) {
  const e = /* @__PURE__ */ new Map();
  return {
    get(n) {
      const r = Il(n);
      let i = e.get(r);
      return i || (i = t.gpu.createPipelineLayout({ bindGroupLayouts: Cl(n) }), e.set(r, i)), i;
    },
    dispose() {
      e.clear();
    }
  };
}
function Fi(t, e = {}) {
  return new Sl(t, e);
}
class Sl {
  device;
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Set();
  #n;
  #r;
  #s = !1;
  constructor(e, n) {
    this.device = e, this.#n = n.errorSink ?? (() => {
    }), this.#r = n.registerSettledSource?.(() => [...this.#t]);
  }
  getReady(e) {
    return this.#e.get(e)?.pipeline;
  }
  getSync(e, n, r) {
    this.#o(r.where);
    const i = this.#e.get(e);
    if (i?.pipeline)
      return i.pipeline;
    const s = i ?? {};
    i || this.#e.set(e, s);
    const a = this.#i(e, s, n, r);
    if (!a) {
      s.pending || this.#e.delete(e);
      return;
    }
    return s.pipeline = a, s.pending?.resolve(a), s.pending = void 0, a;
  }
  getAsync(e, n, r) {
    this.#o(r.where);
    const i = this.#e.get(e);
    if (i?.pipeline)
      return Promise.resolve(i.pipeline);
    if (i?.pending)
      return i.pending.promise;
    const s = {}, a = El();
    s.pending = a, this.#e.set(e, s);
    let o;
    try {
      o = n();
    } catch (c) {
      const l = Oe(r.where, c, r.signature);
      return a.reject(l), this.#e.delete(e), a.promise;
    }
    return this.#c(o), o.then((c) => {
      this.#e.get(e) !== s || s.pipeline || s.pending !== a || (s.pipeline = c, s.pending = void 0, a.resolve(c));
    }, (c) => {
      this.#e.get(e) !== s || s.pipeline || s.pending !== a || (s.pending = void 0, this.#e.delete(e), a.reject(Oe(r.where, c, r.signature)));
    }), a.promise;
  }
  dispose() {
    if (this.#s)
      return;
    this.#s = !0;
    const e = zn("gpu.dispose");
    for (const n of this.#e.values())
      n.pending?.reject(e);
    this.#e.clear(), this.#t.clear(), this.#r?.();
  }
  #i(e, n, r, i) {
    const s = this.device.gpu, a = typeof s.pushErrorScope == "function" && typeof s.popErrorScope == "function";
    a && s.pushErrorScope("validation");
    try {
      const o = r();
      return a && this.#a(e, n, i), o;
    } catch (o) {
      a && this.#u();
      const c = Oe(i.where, o, i.signature);
      this.#n(c);
      return;
    }
  }
  #a(e, n, r) {
    const i = this.device.gpu.popErrorScope().then((s) => {
      if (!s)
        return;
      const a = Oe(r.where, s, r.signature);
      return this.#e.get(e) === n && this.#e.delete(e), this.#n(a);
    }, (s) => {
      const a = Oe(r.where, s, r.signature);
      return this.#e.get(e) === n && this.#e.delete(e), this.#n(a);
    });
    this.#c(i);
  }
  #u() {
    const e = this.device.gpu.popErrorScope?.();
    e && e.catch(() => {
    });
  }
  #o(e) {
    if (this.#s)
      throw zn(e);
  }
  #c(e) {
    this.#t.add(e), e.catch(() => {
    }).then(() => this.#t.delete(e), () => this.#t.delete(e));
  }
}
function El() {
  let t, e;
  const n = new Promise((r, i) => {
    t = r, e = i;
  });
  return n.catch(() => {
  }), { promise: n, resolve: t, reject: e };
}
function or(t, e, n) {
  let r = t.get(e);
  return r || (r = n(), t.set(e, r)), r;
}
function Tl(t) {
  return JSON.stringify(t.map((e) => ({
    arrayStride: e.arrayStride,
    stepMode: e.stepMode ?? "vertex",
    attributes: [...e.attributes].map((n) => ({
      shaderLocation: n.shaderLocation,
      offset: n.offset,
      format: n.format
    }))
  })));
}
function Il(t) {
  return JSON.stringify([...t.entries()].map(([e, n]) => ({ group: e, entries: Ll(n) })));
}
function Cl(t) {
  const e = Math.max(-1, ...t.keys()), n = [];
  for (let r = 0; r <= e; r++)
    n.push($l(t, r));
  return n;
}
function $l(t, e) {
  const n = t.get(e);
  if (!n)
    throw io(e);
  return n;
}
function Ll(t) {
  return (je(t)?.entries ?? []).map((e) => ({
    binding: e.binding,
    visibility: e.visibility,
    buffer: e.buffer ? { ...e.buffer } : void 0,
    sampler: e.sampler ? { ...e.sampler } : void 0,
    texture: e.texture ? { ...e.texture } : void 0,
    storageTexture: e.storageTexture ? { ...e.storageTexture } : void 0,
    externalTexture: e.externalTexture ? { ...e.externalTexture } : void 0
  }));
}
const Pl = Qe("frame-state");
function fn(t) {
  return t.service(Pl, kl);
}
function kl() {
  const t = /* @__PURE__ */ new Set();
  let e = ar(), n = !1, r = !1;
  const i = {
    time: 0,
    deltaTime: 0,
    frameCount: 0,
    advanceBy(s) {
      i.deltaTime = s, i.time += s, r = !0;
    },
    tick() {
      if (n)
        throw qr();
      n = !0;
      try {
        const s = ar();
        r ? r = !1 : (i.deltaTime = Math.max(0, (s - e) / 1e3), i.time += i.deltaTime), e = s, i.frameCount += 1;
        for (const a of [...t])
          a();
      } finally {
        n = !1;
      }
    },
    onAdvance(s) {
      return t.add(s), () => {
        t.delete(s);
      };
    }
  };
  return i;
}
function ar() {
  return globalThis.performance?.now?.() ?? Date.now();
}
function Al(t, e, n = {}) {
  const r = de(t, "surface"), i = Ml(r), s = i.get(e);
  if (s && !s.disposed)
    throw ao(s.label);
  const a = new Ri(r.device, e, n, (l) => {
    i.get(l.canvas) === l && i.delete(l.canvas), o(), c();
  }), o = fn(r).onAdvance(() => a.applyAutoResize()), c = r.own("resource", () => a.dispose());
  return i.set(e, a), a;
}
const Fl = Qe("surfaces");
function Ml(t) {
  return t.service(Fl, () => /* @__PURE__ */ new Map());
}
let _e = 0, pn = 0;
function Rl() {
  return _e > 0;
}
function Dl() {
  return pn > 0;
}
function Gl() {
  pn += 1;
}
function zl() {
  pn -= 1;
}
function Mi(t) {
  return t instanceof Ri;
}
class Ri {
  device;
  canvas;
  options;
  unregister;
  resourceIdentity = $t("render-target");
  label;
  context;
  autoResize;
  layoutBacked;
  format;
  #e = new Lt();
  #t = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Set();
  #r;
  #s;
  #i = !1;
  #a = !1;
  constructor(e, n, r, i) {
    this.device = e, this.canvas = n, this.options = r, this.unregister = i, this.label = r.label, this.#s = r.clearColor === void 0 ? un : Et(r.clearColor, "surface.clearColor");
    const s = n.getContext("webgpu");
    if (!s)
      throw oo();
    if (this.context = s, this.layoutBacked = Ul(n), r.autoResize === !0 && !this.layoutBacked)
      throw lo();
    this.autoResize = r.autoResize ?? (r.size ? !1 : this.layoutBacked), this.#r = lr(r.dpr), this.format = r.format ?? Ol();
    const a = Nl(n, r, this.layoutBacked, this.#r);
    (r.size || this.layoutBacked) && cr(n, a), s.configure({
      device: e.gpu,
      format: this.format,
      alphaMode: r.alphaMode ?? "premultiplied",
      colorSpace: r.colorSpace ?? "srgb",
      usage: Bl()
    });
  }
  get gpu() {
    return this.context;
  }
  get size() {
    return this.#l(), bt(this.canvas);
  }
  get texelSize() {
    const e = this.size;
    return [1 / e[0], 1 / e[1]];
  }
  get color() {
    return this.#l(), new Me(this.device, this.context.getCurrentTexture(), {
      size: this.size,
      format: this.format,
      usage: ["render_attachment", "texture_binding", "copy_src"],
      label: this.options.label ? `${this.options.label}.color` : "surface.color"
    }, "external");
  }
  get colors() {
    return [this.color];
  }
  get depth() {
    this.#l();
  }
  get sampleCount() {
    return this.#l(), 1;
  }
  get dpr() {
    return this.#r;
  }
  /** Default clear color of this surface; passes that clear without naming a color use it. */
  get clearColor() {
    return dn(this.#s);
  }
  set clearColor(e) {
    this.#s = Et(e, "surface.clearColor");
  }
  get disposed() {
    return this.#i;
  }
  resize(e) {
    if (this.#l(), this.#a)
      throw uo(this.options.label);
    this.#u(Tt(e), this.#r, !0);
  }
  applyAutoResize() {
    if (this.#i || !this.autoResize || !this.layoutBacked)
      return;
    const e = lr(this.options.dpr), n = Di(this.canvas, e);
    this.#u(n, e, !0);
  }
  onResize(e) {
    this.#l(), this.#t.add(e), this.#a = !0, _e += 1;
    try {
      e(this.#d());
    } finally {
      _e -= 1, this.#a = !1;
    }
    return () => {
      this.#t.delete(e);
    };
  }
  async read() {
    return this.#l(), this.color.read();
  }
  async readFloats() {
    return this.#l(), this.color.readFloats();
  }
  onDestroy(e) {
    return this.#l(), this.#e.onDestroy(this, e);
  }
  onTexturesRecreated(e) {
    return this.#l(), this.#n.add(e), () => {
      this.#n.delete(e);
    };
  }
  renderPassDescriptor(e = {}) {
    const { clear: n = [0, 0, 0, 1], preserve: r } = e;
    this.#l();
    const i = { view: this.context.getCurrentTexture().createView(), loadOp: r ? "load" : "clear", storeOp: "store" };
    return r || (i.clearValue = $i(n)), { colorAttachments: [i] };
  }
  dispose() {
    if (!this.#i) {
      this.#i = !0;
      try {
        this.context.unconfigure?.();
      } catch {
      }
      this.unregister(this), this.#t.clear(), this.#n.clear(), this.#e.emit(this);
    }
  }
  #u(e, n, r) {
    const i = !Li(bt(this.canvas), e);
    this.#r = n, i && (cr(this.canvas, e), this.#o(), r && this.#c());
  }
  #o() {
    for (const e of [...this.#n])
      e();
  }
  #c() {
    this.#a = !0, _e += 1;
    try {
      const e = this.#d();
      for (const n of [...this.#t])
        n(e);
    } finally {
      _e -= 1, this.#a = !1;
    }
  }
  #d() {
    const e = bt(this.canvas);
    return { width: e[0], height: e[1], dpr: this.#r, surface: this };
  }
  #l() {
    if (this.#i)
      throw co(this.options.label);
  }
}
function Ul(t) {
  return typeof t.clientWidth == "number";
}
function Nl(t, e, n, r) {
  return e.size ? Tt(e.size) : n ? Di(t, r) : Tt(bt(t));
}
function Di(t, e) {
  const n = t;
  return Tt([Math.round(n.clientWidth * e), Math.round(n.clientHeight * e)]);
}
function bt(t) {
  const e = t;
  return [e.width, e.height];
}
function cr(t, e) {
  const n = t;
  n.width = e[0], n.height = e[1];
}
function Tt(t) {
  return [Math.max(1, Math.floor(t[0])), Math.max(1, Math.floor(t[1]))];
}
function lr(t) {
  const e = globalThis.devicePixelRatio ?? 1;
  return Array.isArray(t) ? Math.min(t[1], Math.max(t[0], e)) : typeof t == "number" ? t : e;
}
function Ol() {
  return globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
}
function Bl() {
  const t = globalThis.GPUTextureUsage;
  return t ? t.RENDER_ATTACHMENT | t.TEXTURE_BINDING | t.COPY_SRC : void 0;
}
const Vl = {
  drawIndirect: { bytes: 16, args: "4 u32 values: vertexCount, instanceCount, firstVertex, firstInstance" },
  drawIndexedIndirect: { bytes: 20, args: "5 32-bit values: indexCount, instanceCount, firstIndex, baseVertex (signed), firstInstance" },
  dispatchWorkgroupsIndirect: { bytes: 12, args: "3 u32 values: workgroupCountX, workgroupCountY, workgroupCountZ" }
};
function _l(t, e, n, r) {
  const i = typeof n == "object" && n !== null ? n.buffer : void 0, s = ur(n) ? n : ur(i) ? i : void 0;
  if (!s)
    throw ve(t, `received ${dr(n)}; expected a StorageBuffer or { buffer, offset? }.`, e);
  const a = s === n ? 0 : n.offset ?? 0;
  if (typeof a != "number" || !Number.isInteger(a) || a < 0)
    throw ve(t, `offset must be an integer >= 0; received ${dr(a)}.`, e);
  if (a % 4 !== 0)
    throw ve(t, `offset must be a multiple of 4 (WebGPU requires "indirectOffset is a multiple of 4"); received ${a}.`, e);
  if (!s.buffer.options.usage.includes("indirect"))
    throw ve(t, `the buffer lacks the "indirect" usage (WebGPU requires "indirectBuffer.usage contains INDIRECT"); create it with storage(gpu, ${s.size}, { indirect: true }).`, e);
  const { bytes: o, args: c } = Vl[r];
  if (a + o > s.size)
    throw ve(t, `${r} reads ${o} bytes (${c}) at offset ${a}, but offset + ${o} = ${a + o} exceeds the buffer size ${s.size}.`, e);
  return { buffer: s.gpu, offset: a };
}
function ur(t) {
  return typeof t == "object" && t !== null && "gpu" in t && "size" in t && t.buffer instanceof le;
}
function dr(t) {
  if (typeof t == "string")
    return `"${t}"`;
  try {
    return JSON.stringify(t) ?? String(t);
  } catch {
    return String(t);
  }
}
const It = /* @__PURE__ */ Symbol("vgpu.frame.drawable");
function jl(t) {
  return t?.[It];
}
const Wl = /* @__PURE__ */ Symbol("vgpu.frame.bundle");
function ql(t) {
  return t?.[Wl];
}
const Gi = /* @__PURE__ */ Symbol("vgpu.frame.passAttachment");
function Hl(t) {
  return typeof t?.[Gi] == "function" ? t : void 0;
}
function Kl(t, e) {
  return hn(de(t, "sampler")).sampler(e);
}
let fr = 1;
function Yl(t) {
  const e = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new WeakMap();
  return {
    sampler(r = {}) {
      const i = Ht(r);
      let s = e.get(i);
      return s || (s = t.gpu.createSampler(r), e.set(i, s), n.set(s, { kind: "sampler", id: fr++ })), s;
    },
    identity(r) {
      let i = n.get(r);
      return i || (i = { kind: "sampler", id: fr++ }, n.set(r, i)), i;
    }
  };
}
function Ht(t) {
  if (t === null || typeof t != "object")
    return JSON.stringify(t);
  if (Array.isArray(t))
    return `[${t.map(Ht).join(",")}]`;
  const e = t;
  return `{${Object.keys(e).sort().map((n) => `${JSON.stringify(n)}:${Ht(e[n])}`).join(",")}}`;
}
const Xl = Qe("render-service");
function hn(t) {
  return t.service(Xl, Jl);
}
function Jl(t) {
  const e = t.device, n = pi(), r = Fi(e, {
    errorSink: (o) => t.reportError(o),
    registerSettledSource: (o) => t.registerSettledSource(o)
  }), i = ki(e), s = Ai(e), a = Yl(e);
  return t.own("service", () => {
    r.dispose(), i.dispose(), s.dispose(), n.dispose();
  }), { binds: n, pipelines: r, shaderModules: i, pipelineLayouts: s, sampler: (o) => a.sampler(o) };
}
function zi(t) {
  if (typeof t == "string")
    return t;
  if (!Ql(t) || !("version" in t) || t.version !== 1)
    throw rt(t);
  const n = t.wgsl;
  if (typeof n != "string")
    throw rt(t);
  return n;
}
function Ql(t) {
  return typeof t == "object" && t !== null;
}
function st(t, e) {
  const n = de(t, "draw"), r = hn(n), i = zi(e.shader);
  return new Ni(n.device, i, { ...e, shader: i }, r.binds, void 0, r.pipelines, r.shaderModules, r.pipelineLayouts, (s) => n.reportError(s), (s) => {
    n.trackDelivery(s);
  });
}
let Zl = 1;
const Ui = /* @__PURE__ */ new WeakMap();
class Ni {
  source;
  label;
  #e = /* @__PURE__ */ new Map();
  constructor(e, n, r, i = pi(), s, a = Fi(e), o = ki(e), c = Ai(e), l, d) {
    this.source = n, z(e, "Draw.constructor"), this.label = r.label ?? "draw";
    const u = Zl++, p = fi(n, `${this.label}.wgsl`), m = cu(this.label, r.entry), b = rr(this.label, p.entryPoints, "vertex", m.vertex, "draw"), g = rr(this.label, p.entryPoints, "fragment", m.fragment, "draw"), $ = lu(p, b, g), w = [b, g].filter((re) => !!re), y = Kc(p.bindings, w);
    eu(e, this.label, p.bindings, w, y);
    const S = r.geometry, E = b ? wt(b, "inputs", this.label) : [], C = S && ke in S ? S[ke](E, `${this.label}.geometry`) : S?.vertexBufferLayouts, T = new Map(Yc(e, this.label, p, y)), P = c.get(T), h = o.get(n, `${this.label}.shader`), x = Cu(), I = ru(this.label, r), A = su(this.label, r, I), M = uu(e, this.label, r), ze = hu(e, this.label, r), we = yu(this.label, r), ne = wu(this.label, r), Ue = xl(this.label, r.constants, p.overrides, "draw"), Ne = Zc({
      device: e,
      label: this.label,
      drawId: u,
      reflection: p,
      bindGroupLayouts: T,
      cache: i,
      onIdentityChange: (re) => x.markStale({ kind: "binding-identity", drawLabel: this.label, ...re })
    });
    Ui.set(this, { id: u, device: e, opts: r, vertexBufferLayouts: C, cache: i, defaultTarget: s, reflection: p, visibility: y, vertexEntry: b?.name ?? "vs_main", fragmentEntry: g?.name ?? "fs_main", entryKey: $, setCore: Ne, bindGroupLayouts: T, pipelineLayout: P, shaderModule: h, pipelineStore: a, pipelineLayouts: c, errorSink: l, trackSettled: d, resolvedPipelineKeys: /* @__PURE__ */ new Set(), recordedIn: x, ...I, ...A, ...M, ...ze, ...we, ...ne, ...Ue }), r.set && this.set(r.set);
    for (const re of r.targets ?? [])
      this.compileSync(re);
  }
  get gpu() {
    const e = k(this);
    for (const n of e.resolvedPipelineKeys) {
      const r = e.pipelineStore.getReady(n);
      if (r)
        return r;
    }
  }
  get targets() {
    return k(this).opts.targets;
  }
  /**
   * Frame drawable protocol: a `Frame` encodes through this instead of importing draw.ts, so a
   * program that never draws never pulls this module. The instance is its own protocol object —
   * `encode`, `label` and the depth/stencil metadata below are exactly what a pass needs.
   */
  get [It]() {
    return this;
  }
  /** @internal Frame drawable protocol; see {@link drawWritesDepth}. */
  writesDepth() {
    return Eu(this);
  }
  /** @internal Frame drawable protocol; see {@link drawStencilWritingOps}. */
  stencilWritingOps() {
    return Tu(this);
  }
  set(e) {
    const n = k(this);
    z(n.device, `${this.label}.set`);
    for (const r of n.setCore.set(e))
      n.recordedIn.markStale({ kind: "binding-identity", drawLabel: this.label, ...r });
    return this;
  }
  group(e, n) {
    const r = k(this);
    z(r.device, `${this.label}.group`);
    const i = this.#e.get(e) ?? this.layout(e), s = r.setCore.claimGroup(e, n, i);
    return r.recordedIn.markStale({ kind: "group-claim", drawLabel: this.label, group: e, previousIdentity: s, newIdentity: `claimed-group:${e}` }), this;
  }
  layout(e, n = {}) {
    return z(k(this).device, `${this.label}.layout`), n.dynamicOffsets ? this.#t(e) : k(this).setCore.layout(e);
  }
  #t(e) {
    const n = k(this);
    n.setCore.layout(e);
    const r = this.#e.get(e);
    if (r)
      return r;
    const i = Lu(this, e), s = Ti(n.device, `${this.label}.group${e}.dynamic.bgl`, i);
    return this.#e.set(e, s), n.bindGroupLayouts.set(e, s), n.pipelineLayout = n.pipelineLayouts.get(n.bindGroupLayouts), s;
  }
  /**
   * Encodes and submits this draw as a one-shot render pass.
   *
   * Raw claimed-bind-group validation failures are delivered asynchronously via
   * `gpu.onError` as `VGPU-R4-GROUP-VALIDATION`.
   */
  draw(e = {}) {
    z(k(this).device, `${this.label}.draw`);
    const n = kt(e) ? { target: e } : e, r = k(this), i = n.target ?? r.defaultTarget;
    if (!i)
      throw Bt(`${this.label}.draw`);
    Cr(i, `${this.label}.draw`);
    const s = r.device.gpu.createCommandEncoder(), a = s.beginRenderPass(i.renderPassDescriptor()), o = [];
    try {
      this.encode(a, i, n, (u) => o.push(u));
    } catch (u) {
      O(o), mi(r.device);
      try {
        a.end();
      } catch {
      }
      throw u;
    }
    bi(r.device, a, o, o[0]?.context);
    let c;
    const l = o[0]?.context;
    l && We(r.device, l);
    try {
      c = s.finish();
    } catch (u) {
      const p = l ? j(r.device) : void 0;
      O(o), p && O([p]);
      const m = p?.context ?? l;
      if (m) {
        Ir(r, m.label, m.group, u);
        return;
      }
      throw u;
    }
    if (l) {
      const u = j(r.device);
      u && (o[0] = o[0] ? St(u, o[0]) : u);
    }
    const d = o[0]?.context;
    d && We(r.device, d);
    try {
      r.device.gpu.queue.submit([c]);
    } catch (u) {
      const p = d ? j(r.device) : void 0;
      O(o), p && O([p]);
      const m = p?.context ?? d;
      if (m) {
        Ir(r, m.label, m.group, u);
        return;
      }
      throw u;
    }
    if (d) {
      const u = j(r.device);
      u && (o[0] = o[0] ? St(u, o[0]) : u);
    }
    if (o.length) {
      const u = gi(r.device, o, { errorSink: r.errorSink });
      r.trackSettled?.(u);
    }
  }
  encode(e, n, r = {}, i) {
    z(k(this).device, `${this.label}.encode`);
    const s = this.pipelineFor(n, !0);
    if (!s)
      return;
    e.setPipeline(s);
    const a = k(this);
    a.blendConstant && e.setBlendConstant(a.blendConstant), a.stencilRef !== void 0 && e.setStencilReference(a.stencilRef);
    for (const o of a.setCore.bindGroups())
      this.#n(e, o, r, i);
    this.#a(e, r);
  }
  #n(e, n, r, i) {
    const s = $u(r.offsets, n.group, n.offsets);
    if (!n.claimValidation || !i) {
      e.setBindGroup(n.group, n.bindGroup, s);
      return;
    }
    We(k(this).device, n.claimValidation);
    try {
      e.setBindGroup(n.group, n.bindGroup, s);
    } catch (o) {
      throw $c(k(this).device), Le(n.claimValidation.label, n.claimValidation.group, o);
    }
    const a = j(k(this).device);
    a && i(a);
  }
  compile(e) {
    z(k(this).device, `${this.label}.compile`);
    const { key: n, signature: r, signatureKey: i } = this.#r(e, `${this.label}.compile`);
    return k(this).pipelineStore.getAsync(n, () => this.#c(r), { where: `${this.label}.compile`, signature: i }).then(() => (z(k(this).device, `${this.label}.compile`), k(this).resolvedPipelineKeys.add(n), this));
  }
  compileSync(e) {
    z(k(this).device, `${this.label}.compileSync`);
    const { key: n, signature: r, signatureKey: i } = this.#r(e, `${this.label}.compileSync`);
    return k(this).pipelineStore.getSync(n, () => this.#o(r), { where: `${this.label}.compileSync`, signature: i }) && k(this).resolvedPipelineKeys.add(n), this;
  }
  pipelineFor(e, n = !1) {
    z(k(this).device, `${this.label}.pipelineFor`);
    const { key: r, signature: i, signatureKey: s } = this.#r(e, `${this.label}.pipelineFor`, n), a = k(this).pipelineStore.getSync(r, () => this.#o(i), { where: `${this.label}.pipelineFor`, signature: s });
    return a && k(this).resolvedPipelineKeys.add(r), a;
  }
  pipelineForAsync(e) {
    z(k(this).device, `${this.label}.pipelineForAsync`);
    const { key: n, signature: r, signatureKey: i } = this.#r(e, `${this.label}.pipelineForAsync`);
    return k(this).pipelineStore.getAsync(n, () => this.#c(r), { where: `${this.label}.pipelineForAsync`, signature: i }).then((a) => (z(k(this).device, `${this.label}.pipelineForAsync`), k(this).resolvedPipelineKeys.add(n), a));
  }
  #r(e, n, r = !1) {
    const i = this.#s(e, n, r), s = Pi(i);
    return { signature: i, signatureKey: s, key: this.#i(i) };
  }
  #s(e, n, r = !1) {
    const i = k(this), s = e ?? i.defaultTarget;
    if (!s)
      throw Bt(n);
    r || Cr(s, n);
    const a = gl(s);
    if (bl(a, n), i.colorStates && i.colorStates.length !== a.colors.length)
      throw Ot(this.label, `expected one entry per color attachment; colors has ${i.colorStates.length}, but the target signature has ${a.colors.length}.`, n);
    if (i.multisampleState?.alphaToCoverageEnabled && (a.sampleCount ?? 1) <= 1)
      throw dt(this.label, `alphaToCoverage requires a multisampled target, but the target signature has sampleCount ${a.sampleCount ?? 1}; create the target with msaa: true.`, n);
    if ((i.stencilState || i.stencilRef !== void 0) && !Ye(a.depth))
      throw Ee(this.label, `stencil requires a depth format with a stencil aspect, but the target signature has ${a.depth ? `"${a.depth}"` : "no depth"}; create the target with depth: "depth24plus-stencil8".`, n);
    return a;
  }
  #i(e) {
    const n = k(this), r = n.opts.geometry;
    return yl({ module: n.shaderModule, pipelineLayout: n.pipelineLayout, vertexBufferLayouts: n.vertexBufferLayouts, signature: e, fragmentKey: n.fragmentKey, topology: r?.topology, stripIndexFormat: Oi(r), cullMode: n.cullMode, frontFace: n.frontFace, unclippedDepth: n.unclippedDepth, depthKey: n.depthKey, stencilKey: n.stencilKey, multisampleKey: n.multisampleKey, constantsKey: n.constantsKey, entryKey: n.entryKey });
  }
  #a(e, n = {}) {
    const r = k(this).opts.geometry;
    if (r?.vertexBuffers && r.vertexBuffers.forEach((s, a) => e.setVertexBuffer(a, s)), n.indirect !== void 0)
      return this.#u(e, r, n);
    const i = nu(this.label, r, k(this).opts, n);
    if (!r?.indexBuffer)
      return e.draw(i.vertexCount, i.instanceCount, i.firstVertex, i.firstInstance);
    e.setIndexBuffer(r.indexBuffer, r.indexFormat ?? "uint32"), e.drawIndexed(i.indexCount, i.instanceCount, i.firstIndex, i.baseVertex, i.firstInstance);
  }
  /**
   * The GPU reads the draw arguments from the buffer, so per-call counts alongside indirect are dead options and throw.
   * A non-zero firstInstance in the buffered arguments cannot be validated on the CPU; per WebGPU, it "must be 0,
   * unless the 'indirect-first-instance' feature is enabled", otherwise the indirect call "will be treated as a no-op".
   */
  #u(e, n, r) {
    const i = `${this.label}.draw`, s = tu.find((l) => r[l] !== void 0);
    if (s !== void 0)
      throw ve(this.label, `indirect cannot be combined with ${s} in the same call; the GPU reads the draw arguments from the buffer, so the CPU-side value would be ignored.`, i);
    const a = !!n?.indexBuffer, { buffer: o, offset: c } = _l(this.label, i, r.indirect, a ? "drawIndexedIndirect" : "drawIndirect");
    if (!a)
      return e.drawIndirect(o, c);
    e.setIndexBuffer(n.indexBuffer, n.indexFormat ?? "uint32"), e.drawIndexedIndirect(o, c);
  }
  #o(e) {
    const n = k(this);
    return n.device.gpu.createRenderPipeline({
      label: `${this.label}.pipeline`,
      layout: n.pipelineLayout,
      vertex: { module: n.shaderModule, entryPoint: n.vertexEntry, buffers: [...n.vertexBufferLayouts ?? []], ...n.constants ? { constants: n.constants } : {} },
      fragment: { module: n.shaderModule, entryPoint: n.fragmentEntry, targets: pr(e, n), ...n.constants ? { constants: n.constants } : {} },
      primitive: hr(n.opts.geometry, n.cullMode, n.frontFace, n.unclippedDepth),
      depthStencil: wr(e, n),
      multisample: Er(e, n)
    });
  }
  #c(e) {
    const n = k(this);
    return n.device.gpu.createRenderPipelineAsync({
      label: `${this.label}.pipeline`,
      layout: n.pipelineLayout,
      vertex: { module: n.shaderModule, entryPoint: n.vertexEntry, buffers: [...n.vertexBufferLayouts ?? []], ...n.constants ? { constants: n.constants } : {} },
      fragment: { module: n.shaderModule, entryPoint: n.fragmentEntry, targets: pr(e, n), ...n.constants ? { constants: n.constants } : {} },
      primitive: hr(n.opts.geometry, n.cullMode, n.frontFace, n.unclippedDepth),
      depthStencil: wr(e, n),
      multisample: Er(e, n)
    });
  }
}
function eu(t, e, n, r, i) {
  const s = t.limits;
  for (const [a, o, c] of [["vertex", 1, "maxStorageBuffersInVertexStage"], ["fragment", 2, "maxStorageBuffersInFragmentStage"]]) {
    const l = r.find((p) => p.stage === a);
    if (!l)
      continue;
    const d = n.filter((p) => p.bindingLayout?.kind === "buffer" && p.bindingLayout.buffer.type !== "uniform" && i(p) & o), u = s[c] ?? s.maxStorageBuffersPerShaderStage;
    if (u !== void 0 && d.length > u)
      throw Ns(e, a, l.name, d.length, u, d);
  }
}
const tu = ["vertices", "indices", "instances", "firstVertex", "firstIndex", "baseVertex", "firstInstance"];
function pr(t, e) {
  return t.colors.map((n, r) => {
    const i = e.colorStates?.[r], s = i?.blendState ?? e.blendState, a = i?.writeMask ?? e.writeMask, o = { format: n };
    return s && (o.blend = s), a !== void 0 && (o.writeMask = a), o;
  });
}
function nu(t, e, n, r) {
  se(t, "DrawOptions.instances", n.instances), se(t, "DrawOptions.vertices", n.vertices), se(t, "DrawOptions.firstInstance", n.firstInstance), se(t, "DrawCallOptions.instances", r.instances), ie(t, "DrawCallOptions.vertices", r.vertices), ie(t, "DrawCallOptions.indices", r.indices), ie(t, "DrawCallOptions.firstVertex", r.firstVertex), ie(t, "DrawCallOptions.firstIndex", r.firstIndex), ie(t, "DrawCallOptions.baseVertex", r.baseVertex), se(t, "DrawCallOptions.firstInstance", r.firstInstance), se(t, "GeometryLike.vertexCount", e?.vertexCount), se(t, "GeometryLike.indexCount", e?.indexCount), se(t, "GeometryLike.instanceCount", e?.instanceCount), ie(t, "GeometryLike.firstVertex", e?.firstVertex), ie(t, "GeometryLike.firstIndex", e?.firstIndex), ie(t, "GeometryLike.baseVertex", e?.baseVertex);
  const i = !!e?.indexBuffer, a = e?.geometry ?? (e && ke in e ? e : void 0), o = r.firstVertex ?? e?.firstVertex ?? 0, c = r.vertices ?? e?.vertexCount ?? n.vertices ?? 3, l = r.firstIndex ?? e?.firstIndex ?? 0, d = r.indices ?? e?.indexCount ?? 0, u = r.baseVertex ?? e?.baseVertex ?? 0;
  if (i)
    mr(t, "index", l, d, a?.indexCount);
  else if (r.indices !== void 0 || r.firstIndex !== void 0 || r.baseVertex !== void 0)
    throw Pe(`${t}.draw`, "Index range needs an indexed geometry.");
  return i || mr(t, "vertex", o, c, a?.vertexCount), {
    instanceCount: r.instances ?? n.instances ?? e?.instanceCount ?? 1,
    firstInstance: r.firstInstance ?? n.firstInstance ?? 0,
    vertexCount: c,
    firstVertex: o,
    indexCount: d,
    firstIndex: l,
    baseVertex: u
  };
}
function Oi(t) {
  const e = t?.topology ?? "triangle-list";
  return t?.stripIndexFormat ?? (e.endsWith("strip") ? t?.indexFormat : void 0);
}
function hr(t, e, n, r) {
  const i = t?.topology ?? "triangle-list", s = Oi(t), a = s ? { topology: i, stripIndexFormat: s } : { topology: i };
  return e !== void 0 && (a.cullMode = e), n !== void 0 && (a.frontFace = n), r && (a.unclippedDepth = !0), a;
}
function mr(t, e, n, r, i) {
  if (!(i === void 0 || n + r <= i))
    throw Pe(`${t}.draw`, `${e} range [${n}, ${n + r}) exceeds parent geometry ${e} count ${i}.`);
}
function ie(t, e, n) {
  if (!(n === void 0 || Number.isInteger(n) && n >= 0))
    throw Pe(`${t}.draw`, `${e} must be an integer >= 0; received ${String(n)}.`);
}
function se(t, e, n) {
  if (n !== void 0 && !(Number.isInteger(n) && n >= 0))
    throw new v({
      code: "VGPU-R1-DRAW-COUNT",
      message: `${e} of '${t}' must be an integer >= 0; received ${String(n)}. Use 0 only when you want to issue a valid draw with no vertices/instances.`,
      where: `${t}.draw`
    });
}
function ru(t, e) {
  const n = e.blend === void 0 ? void 0 : Bi(t, e.blend), r = e.writeMask === void 0 ? void 0 : ji(t, e.writeMask), i = e.colors === void 0 ? void 0 : iu(t, e.colors), s = i ? `${Tr(n, r)}@${i.map(Su).join("@")}` : n || r !== void 0 ? Tr(n, r) : void 0;
  return { blendState: n, writeMask: r, colorStates: i, fragmentKey: s };
}
function iu(t, e) {
  if (!Array.isArray(e))
    throw Ot(t, `colors must be an array; received ${R(e)}.`);
  return e.map((n, r) => {
    if (n == null)
      return null;
    if (typeof n != "object" || Array.isArray(n))
      throw Ot(t, `colors[${r}] must be null or { blend?, writeMask? }; received ${R(n)}.`);
    const i = n.blend === void 0 ? void 0 : Bi(`${t}.colors[${r}]`, n.blend), s = n.writeMask === void 0 ? void 0 : ji(`${t}.colors[${r}]`, n.writeMask);
    return !i && s === void 0 ? null : { blendState: i, writeMask: s };
  });
}
function Bi(t, e) {
  if (e === "alpha")
    return ot({ src: "src-alpha", dst: "one-minus-src-alpha" }, { src: "one", dst: "one-minus-src-alpha" });
  if (e === "premultiplied")
    return ot({ src: "one", dst: "one-minus-src-alpha" }, { src: "one", dst: "one-minus-src-alpha" });
  if (e === "additive")
    return ot({ src: "one", dst: "one" }, { src: "one", dst: "one" });
  if (typeof e != "object" || e === null || !gr(e.color))
    throw Pn(t, e);
  const n = e.color, r = e.alpha;
  if (r !== void 0 && !gr(r))
    throw Pn(t, e);
  return ot(n, r ?? n);
}
function gr(t) {
  return typeof t == "object" && t !== null && typeof t.src == "string" && typeof t.dst == "string";
}
function ot(t, e) {
  return { color: br(t), alpha: br(e) };
}
function br(t) {
  return { srcFactor: t.src, dstFactor: t.dst, operation: t.op ?? "add" };
}
function su(t, e, n) {
  if (e.blendConstant === void 0)
    return {};
  const r = e.blendConstant;
  if (!Array.isArray(r) || r.length !== 4 || r.some((i) => typeof i != "number" || !Number.isFinite(i)))
    throw kn(t, `received ${R(r)}; expected [r, g, b, a] finite numbers.`);
  if (!ou(n).some((i) => i && au(i)))
    throw kn(t, `no color target's effective blend uses a "constant"/"one-minus-constant" factor (colors[i].blend replaces the top-level blend for that target), so blendConstant would have no effect.`);
  return { blendConstant: { r: r[0], g: r[1], b: r[2], a: r[3] } };
}
function ou(t) {
  return t.colorStates ? t.colorStates.map((e) => e?.blendState ?? t.blendState) : [t.blendState];
}
function au(t) {
  return [t.color.srcFactor, t.color.dstFactor, t.alpha.srcFactor, t.alpha.dstFactor].some((e) => e === "constant" || e === "one-minus-constant");
}
function cu(t, e) {
  if (e === void 0)
    return {};
  if (typeof e != "object" || e === null || Array.isArray(e))
    throw ft(t, `received ${R(e)}; expected { vertex?, fragment? } entry point names.`);
  return e;
}
function lu(t, e, n) {
  const r = t.entryPoints.find((s) => s.stage === "vertex"), i = t.entryPoints.find((s) => s.stage === "fragment");
  if (!(e === r && n === i))
    return `en~${e?.name ?? ""}~${n?.name ?? ""}`;
}
function uu(t, e, n) {
  const r = n.cull === void 0 ? void 0 : fu(e, n.cull), i = n.frontFace === void 0 ? void 0 : pu(e, n.frontFace), s = n.unclippedDepth === void 0 ? void 0 : du(t, e, n.unclippedDepth);
  return { cullMode: r, frontFace: i, unclippedDepth: s };
}
function du(t, e, n) {
  if (typeof n != "boolean")
    throw Fn(e, `received ${R(n)}; expected a boolean.`);
  if (n) {
    if (!t.features.has("depth-clip-control"))
      throw Fn(e, 'the device lacks the "depth-clip-control" feature; request it at init: init({ requiredFeatures: ["depth-clip-control"] }) on an adapter that supports it.');
    return !0;
  }
}
function fu(t, e) {
  if (e === "none" || e === "front" || e === "back")
    return e;
  throw js(t, e);
}
function pu(t, e) {
  if (e === "ccw" || e === "cw")
    return e;
  throw Ws(t, e);
}
const Vi = { depthWriteEnabled: !0, depthCompare: "less-equal" }, _i = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"], yr = -2147483648, xr = 2147483647;
function wr(t, e) {
  if (t.depth)
    return { format: t.depth, ...e.depthState ?? Vi, ...e.stencilState ?? {} };
}
function hu(t, e, n) {
  if (n.depth === void 0)
    return {};
  const r = mu(t, e, n.depth, n.geometry?.topology ?? "triangle-list");
  return { depthState: r, depthKey: gu(r) };
}
function mu(t, e, n, r) {
  if (n === !1)
    return { depthWriteEnabled: !1, depthCompare: "always" };
  if (typeof n != "object" || n === null)
    throw J(e, `received ${R(n)}.`);
  if (n.write !== void 0 && typeof n.write != "boolean")
    throw J(e, `write must be a boolean; received ${R(n.write)}.`);
  if (n.compare !== void 0 && !_i.includes(n.compare))
    throw J(e, `compare must be a GPUCompareFunction; received ${R(n.compare)}.`);
  if (n.bias !== void 0 && !Number.isInteger(n.bias))
    throw J(e, `bias must be an integer (WebGPU depthBias is i32); received ${R(n.bias)}.`);
  if (n.bias !== void 0 && (n.bias < yr || n.bias > xr))
    throw J(e, `bias must fit in the i32 range [${yr}, ${xr}] (WebGPU depthBias is i32); received ${R(n.bias)}.`);
  if (n.biasSlopeScale !== void 0 && !Number.isFinite(n.biasSlopeScale))
    throw J(e, `biasSlopeScale must be a finite number; received ${R(n.biasSlopeScale)}.`);
  if (n.biasClamp !== void 0 && !Number.isFinite(n.biasClamp))
    throw J(e, `biasClamp must be a finite number; received ${R(n.biasClamp)}.`);
  const i = n.bias ?? 0, s = n.biasSlopeScale ?? 0, a = n.biasClamp ?? 0;
  if ((i !== 0 || s !== 0 || a !== 0) && !r.startsWith("triangle"))
    throw J(e, `bias, biasSlopeScale, and biasClamp must be 0 for "${r}" topology.`);
  if (a !== 0 && t.isCompatibilityMode)
    throw J(e, `biasClamp must be 0 on a compatibility-mode device; received ${R(n.biasClamp)}.`);
  return {
    depthWriteEnabled: n.write ?? !0,
    depthCompare: n.compare ?? "less-equal",
    ...i !== 0 ? { depthBias: i } : {},
    ...s !== 0 ? { depthBiasSlopeScale: s } : {},
    ...a !== 0 ? { depthBiasClamp: a } : {}
  };
}
function gu(t) {
  return `${t.depthWriteEnabled ? 1 : 0}~${t.depthCompare}~${t.depthBias ?? 0}~${t.depthBiasSlopeScale ?? 0}~${t.depthBiasClamp ?? 0}`;
}
const bu = ["keep", "zero", "replace", "invert", "increment-clamp", "decrement-clamp", "increment-wrap", "decrement-wrap"];
function yu(t, e) {
  if (e.stencil === void 0)
    return {};
  const n = e.stencil;
  if (typeof n != "object" || n === null || Array.isArray(n))
    throw Ee(t, `received ${R(n)}; expected { front?, back?, readMask?, writeMask?, ref? }.`);
  const r = n.front === void 0 ? void 0 : vr(t, "front", n.front), i = n.back === void 0 ? void 0 : vr(t, "back", n.back);
  Gt(t, "readMask", n.readMask), Gt(t, "writeMask", n.writeMask), Gt(t, "ref", n.ref);
  const s = {
    ...r ? { stencilFront: r } : {},
    // Omitted back mirrors the normalized front so both faces behave the same; with neither given, both keep the WebGPU defaults.
    ...i ?? r ? { stencilBack: i ?? { ...r } } : {},
    ...n.readMask !== void 0 ? { stencilReadMask: n.readMask } : {},
    ...n.writeMask !== void 0 ? { stencilWriteMask: n.writeMask } : {}
  }, a = s.stencilFront !== void 0 || s.stencilBack !== void 0 || s.stencilReadMask !== void 0 || s.stencilWriteMask !== void 0;
  return !a && n.ref === void 0 ? {} : {
    ...a ? { stencilState: s, stencilKey: xu(s) } : {},
    // The reference is encoder state (setStencilReference), not pipeline state; it stays out of the pipeline key.
    ...n.ref !== void 0 ? { stencilRef: n.ref } : {}
  };
}
function vr(t, e, n) {
  if (typeof n != "object" || n === null || Array.isArray(n))
    throw Ee(t, `${e} must be a { compare?, fail?, depthFail?, pass? } object; received ${R(n)}.`);
  if (n.compare !== void 0 && !_i.includes(n.compare))
    throw Ee(t, `${e}.compare must be a GPUCompareFunction; received ${R(n.compare)}.`);
  for (const [r, i] of [["fail", n.fail], ["depthFail", n.depthFail], ["pass", n.pass]])
    if (i !== void 0 && !bu.includes(i))
      throw Ee(t, `${e}.${r} must be a GPUStencilOperation; received ${R(i)}.`);
  return { compare: n.compare ?? "always", failOp: n.fail ?? "keep", depthFailOp: n.depthFail ?? "keep", passOp: n.pass ?? "keep" };
}
function Gt(t, e, n) {
  if (n !== void 0 && (typeof n != "number" || !Number.isInteger(n) || n < 0 || n > 4294967295))
    throw Ee(t, `${e} must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue is u32); received ${R(n)}.`);
}
function xu(t) {
  return `st~${Sr(t.stencilFront)}~${Sr(t.stencilBack)}~${t.stencilReadMask ?? 4294967295}~${t.stencilWriteMask ?? 4294967295}`;
}
function Sr(t) {
  return t ? `${t.compare},${t.failOp},${t.depthFailOp},${t.passOp}` : "default";
}
function Er(t, e) {
  return { count: t.sampleCount ?? 1, ...e.multisampleState ?? {} };
}
function wu(t, e) {
  if (e.multisample === void 0)
    return {};
  const n = e.multisample;
  if (typeof n != "object" || n === null || Array.isArray(n))
    throw dt(t, `received ${R(n)}; expected { alphaToCoverage?, mask? }.`);
  if (n.alphaToCoverage !== void 0 && typeof n.alphaToCoverage != "boolean")
    throw dt(t, `alphaToCoverage must be a boolean; received ${R(n.alphaToCoverage)}.`);
  if (n.mask !== void 0 && (typeof n.mask != "number" || !Number.isInteger(n.mask) || n.mask < 0 || n.mask > 4294967295))
    throw dt(t, `mask must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUSampleMask is u32); received ${R(n.mask)}.`);
  const r = {
    ...n.alphaToCoverage !== void 0 ? { alphaToCoverageEnabled: n.alphaToCoverage } : {},
    ...n.mask !== void 0 ? { mask: n.mask } : {}
  };
  return r.alphaToCoverageEnabled === void 0 && r.mask === void 0 ? {} : { multisampleState: r, multisampleKey: vu(r) };
}
function vu(t) {
  return `ms~${t.alphaToCoverageEnabled ? 1 : 0}~${t.mask ?? 4294967295}`;
}
function ji(t, e) {
  if (!Array.isArray(e))
    throw An(t, R(e));
  let n = 0;
  for (const r of e)
    if (r === "r")
      n |= 1;
    else if (r === "g")
      n |= 2;
    else if (r === "b")
      n |= 4;
    else if (r === "a")
      n |= 8;
    else
      throw An(t, R(r));
  return n;
}
function Tr(t, e) {
  return `${Wi(t)};${e ?? 15}`;
}
function Wi(t) {
  if (!t)
    return "none;none";
  const e = t.color, n = t.alpha;
  return `${e.srcFactor},${e.dstFactor},${e.operation};${n.srcFactor},${n.dstFactor},${n.operation}`;
}
function Su(t) {
  return t ? `${t.blendState ? Wi(t.blendState) : "inherit"};${t.writeMask ?? "inherit"}` : "inherit";
}
function R(t) {
  if (typeof t == "string")
    return `"${t}"`;
  try {
    return JSON.stringify(t) ?? String(t);
  } catch {
    return String(t);
  }
}
function Eu(t) {
  return (k(t).depthState ?? Vi).depthWriteEnabled;
}
function Tu(t) {
  const e = k(t), n = e.stencilState;
  if (!n || n.stencilWriteMask === 0)
    return [];
  const r = e.cullMode ?? "none", i = [], s = (a, o) => {
    if (o)
      for (const [c, l] of [["fail", o.failOp], ["depthFail", o.depthFailOp], ["pass", o.passOp]])
        l !== void 0 && l !== "keep" && i.push(`${a}.${c}: "${l}"`);
  };
  return r !== "front" && s("front", n.stencilFront), r !== "back" && s("back", n.stencilBack), i;
}
function Iu(t, e, n, r = {}, i) {
  t.encode(e, n, r, i);
}
function k(t) {
  const e = Ui.get(t);
  if (!e)
    throw new TypeError("Invalid Draw instance");
  return e;
}
function Ir(t, e, n, r) {
  const i = (async () => {
    await nn(t.device), z(t.device, `${e}.validation`);
    const s = Le(e, n, r);
    t.errorSink ? await t.errorSink(s) : console.error(s);
  })();
  return t.trackSettled?.(i), i;
}
function Cu() {
  const t = /* @__PURE__ */ new Set();
  return {
    add(e) {
      t.add(e);
    },
    delete(e) {
      t.delete(e);
    },
    list() {
      return [...t];
    },
    markStale(e) {
      for (const n of t)
        n.markStale(e);
    }
  };
}
function $u(t, e, n) {
  return t ? Array.isArray(t) ? t : t[e] ?? n : n;
}
function Lu(t, e) {
  const n = k(t);
  return Ei(n.reflection.bindings, e, n.visibility).map(Pu);
}
function Pu(t) {
  return t.buffer ? { ...t, buffer: { ...t.buffer, hasDynamicOffset: !0 } } : t;
}
function Cr(t, e) {
  if (Mi(t) && !Dl())
    throw Wr(e);
}
function $r(t, e, n = {}) {
  if ("geometry" in n)
    throw B("effect", "effect() never accepts vertex buffers; use draw(gpu, { shader, geometry: geometry(gpu, descriptor) }).");
  const r = de(t, "effect"), i = hn(r);
  return new ku(r.device, zi(e), n, i.binds, void 0, i.pipelines, i.shaderModules, i.pipelineLayouts, (s) => r.reportError(s), (s) => {
    r.trackDelivery(s);
  });
}
const qi = /* @__PURE__ */ new WeakMap();
class ku {
  get gpu() {
    return pe(this).gpu;
  }
  constructor(e, n, r = {}, i, s, a, o, c, l, d) {
    const u = Au(n), p = new Ni(e, u, { shader: u, set: r.set, label: r.label ?? "effect", blend: r.blend, writeMask: r.writeMask }, i, s, a, o, c, l, d);
    qi.set(this, p);
  }
  set(e) {
    return pe(this).set(e), this;
  }
  draw(e = {}) {
    pe(this).draw(kt(e) ? { target: e } : e);
  }
  compile(e) {
    return pe(this).compile(e).then(() => this);
  }
  compileSync(e) {
    return pe(this).compileSync(e), this;
  }
  /** @internal FramePass delegates here; not part of the frozen public Effect surface. */
  encode(e, n, r = {}, i) {
    Iu(pe(this), e, n, r, i);
  }
  /**
   * Frame drawable protocol: an effect is encoded as its underlying draw, so it reuses that draw's
   * protocol object — same encode path, same depth/stencil metadata for read-only passes.
   */
  get [It]() {
    return pe(this)[It];
  }
}
function pe(t) {
  const e = qi.get(t);
  if (!e)
    throw new TypeError("Invalid Effect instance");
  return e;
}
function Au(t) {
  return Fu(t) ? t : `
struct VgpuFullscreenVertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};
@vertex fn vgpu_fullscreen_vs(@builtin(vertex_index) vi: u32) -> VgpuFullscreenVertexOut {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var out: VgpuFullscreenVertexOut;
  out.position = vec4f(pos[vi], 0.0, 1.0);
  out.uv = uv[vi];
  return out;
}
${t}`;
}
function Fu(t) {
  return fi(t, "effect.wgsl").entryPoints.some((e) => e.stage === "vertex");
}
const Mu = Qe("clock");
function Ru(t) {
  return Du(de(t, "clock"));
}
function Du(t) {
  return t.service(Mu, (e) => {
    const n = fn(e), r = (i) => {
      if (e.disposed)
        throw Yr(i);
      z(e.device, i);
    };
    return {
      get time() {
        return r("clock.time"), n.time;
      },
      get deltaTime() {
        return r("clock.deltaTime"), n.deltaTime;
      },
      get frameCount() {
        return r("clock.frameCount"), n.frameCount;
      },
      advance(i) {
        if (r("clock.advance"), typeof i != "number" || !Number.isFinite(i) || i < 0)
          throw po(i);
        n.advanceBy(i);
      }
    };
  });
}
function Gu(t, e, n = {}) {
  return Uu(de(t, "frameLoop")).loop(e, n);
}
const zu = Qe("frame-runner");
function Uu(t) {
  return t.service(zu, (e) => {
    const n = fn(e);
    return new Yu(() => {
      let r = () => {
      };
      const i = new Nu(e.device, void 0, (s) => e.reportError(s), (s) => {
        e.trackDelivery(s);
      }, () => r());
      return r = e.own("scheduler", () => i.cancel()), i;
    }, () => n.tick(), (r) => e.own("scheduler", () => r.stop()));
  });
}
class Nu {
  device;
  defaultTarget;
  errorSink;
  trackSettled;
  releaseLifecycle;
  /**
   * Resolves after submitted GPU work completes and raw claimed-bind-group
   * validation has been delivered to `gpu.onError`.
   *
   * This is a completion/timing signal only; it never rejects and is not an error
   * channel.
   */
  done = Promise.resolve();
  #e;
  #t = [];
  /**
   * Everything a pass of this frame attached, as opaque {@link FrameOwner}s: timers and
   * visibilities today, scene view generations later. The frame never learns what they are — it
   * only guarantees each one sees exactly one `frameSubmitted` or `frameAbandoned`.
   */
  #n = /* @__PURE__ */ new Set();
  /**
   * Owners whose per-frame bookkeeping a failed pass invalidated: their frame is neither finalized
   * nor read back, so a throwing pass callback cannot leave a phantom result. Kept alongside the
   * live set so a later pass re-attaching the same instance in this frame stays dropped too — the
   * failed pass's span/slots are still in that instance's frame bookkeeping.
   */
  #r = /* @__PURE__ */ new Set();
  #s = !1;
  #i = !1;
  #a = !1;
  constructor(e, n, r, i, s) {
    this.device = e, this.defaultTarget = n, this.errorSink = r, this.trackSettled = i, this.releaseLifecycle = s, z(e, "Frame.constructor"), this.#e = e.gpu.createCommandEncoder({ label: "vgpu.frame" });
  }
  pass(e, n) {
    if (this.#i)
      throw Un("Frame.pass");
    z(this.device, "Frame.pass");
    const r = kt(e), i = typeof n == "function" ? n : (g) => g.draw(n), s = r ? e : e.target ?? this.defaultTarget;
    if (!s)
      throw Bt("Frame.pass");
    if (Mi(s) && this.#s)
      throw Wr("Frame.pass");
    const a = r ? void 0 : e.clear, o = a === !1;
    if (o && s.sampleCount === 4)
      throw qs();
    const c = r ? void 0 : e.clearDepth;
    if (c !== void 0) {
      if (typeof c != "number" || !(c >= 0 && c <= 1))
        throw Mn(c);
      if (o)
        throw Hs();
      if (!s.depth)
        throw Mn(c, "but the target has no depth attachment, so clearDepth would have no effect.", "Create the target with depth: true (or a depth format), or drop clearDepth.");
    }
    const l = r ? void 0 : e.clearStencil;
    if (l !== void 0) {
      if (typeof l != "number" || !Number.isInteger(l) || l < 0 || l > 4294967295)
        throw Rn(`received ${String(l)}; expected an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue).`);
      if (o)
        throw Ks();
      const g = s.depth?.format;
      if (!Ye(g))
        throw Rn(`received ${String(l)}, but the target's depth format ${g ? `"${g}"` : "(none)"} has no stencil aspect, so clearStencil would have no effect.`);
    }
    const d = r ? void 0 : e.depthReadOnly;
    if (d !== void 0 && typeof d != "boolean")
      throw me(`received ${ue(d)}; expected a boolean.`, "Pass depthReadOnly: true to open the pass with a read-only depth attachment, or omit it.");
    if (d) {
      if (!s.depth)
        throw me("is set, but the target has no depth attachment, so there is nothing to make read-only.", "Create the target with depth: true (or a depth format), or drop depthReadOnly.");
      if (s.sampleCount === 4)
        throw Ys();
      if (c !== void 0)
        throw me("cannot be combined with clearDepth; a read-only depth aspect omits its load/store ops and is never cleared.", "Remove clearDepth, or drop depthReadOnly.");
      if (l !== void 0)
        throw me("cannot be combined with clearStencil; a read-only stencil aspect omits its load/store ops and is never cleared.", "Remove clearStencil, or drop depthReadOnly.");
    }
    const u = r ? void 0 : qu(e.viewport, this.device.gpu.limits, s.size), p = r ? void 0 : Hu(e.scissor, s.size), m = [];
    let b;
    try {
      const g = r || e.timer === void 0 ? void 0 : this.#l(e.timer, s, m, ju), w = (r || e.visibility === void 0 ? void 0 : this.#l(e.visibility, s, m, Wu))?.occlusion;
      let y = s.renderPassDescriptor({ clear: a === void 0 || a === !0 || a === !1 ? s.clearColor ?? un : a, preserve: o, clearDepth: c, clearStencil: l, depthReadOnly: d });
      g?.timestampWrites && (y = { ...y, timestampWrites: g.timestampWrites }), w && (y = { ...y, occlusionQuerySet: w.querySet }), b = this.#e.beginRenderPass(y), u && b.setViewport(u.x, u.y, u.width, u.height, u.minDepth, u.maxDepth), p && b.setScissorRect(p[0], p[1], p[2], p[3]), this.#a = !0;
      try {
        i(new Ou(b, s, this.#t, d === !0, w, this, (S) => {
          if (z(this.device, S), this.#i)
            throw Un(S);
        }));
      } finally {
        this.#a = !1;
      }
    } catch (g) {
      this.#c(m), O(this.#t), this.#t.length = 0, mi(this.device);
      try {
        b?.end();
      } catch {
      }
      throw g;
    }
    bi(this.device, b, this.#t);
  }
  submit() {
    if (this.#s || this.#i)
      return;
    z(this.device, "Frame.submit"), this.#s = !0, this.releaseLifecycle?.();
    for (const i of this.#d())
      i.finalizeFrame(this, this.#e);
    let e;
    const n = this.#t[0]?.context;
    n && We(this.device, n);
    try {
      e = this.#e.finish();
    } catch (i) {
      this.#u(this.#o());
      const s = n ? j(this.device) : void 0;
      O(this.#t), s && O([s]);
      const a = s?.context ?? n;
      if (!a)
        throw i;
      this.done = this.#p(this.#f(a.label, a.group, i));
      return;
    }
    if (n) {
      const i = j(this.device);
      i && (this.#t[0] = this.#t[0] ? St(i, this.#t[0]) : i);
    }
    const r = this.#t[0]?.context;
    r && We(this.device, r);
    try {
      this.device.gpu.queue.submit([e]);
    } catch (i) {
      this.#u(this.#o());
      const s = r ? j(this.device) : void 0;
      O(this.#t), s && O([s]);
      const a = s?.context ?? r;
      if (!a)
        throw i;
      this.done = this.#p(this.#f(a.label, a.group, i));
      return;
    }
    if (r) {
      const i = j(this.device);
      i && (this.#t[0] = this.#t[0] ? St(i, this.#t[0]) : i);
    }
    for (const i of this.#d())
      i.frameSubmitted(this);
    this.#u(this.#r), this.done = this.#p(gi(this.device, this.#t, { errorSink: this.errorSink }));
  }
  /**
   * Discards the frame without submitting it: the command encoder is dropped (nothing this frame
   * encoded ever runs) and every telemetry instance it attached releases the retain it took on its
   * query ring, so a `timer(gpu)` / `visibility(gpu)` can be disposed for good without waiting for
   * `gpu.dispose()`. This is the explicit way out of the leak a manual `frame(gpu)` would otherwise
   * hold: a frame is never assumed abandoned, because an old frame can still be submitted.
   *
   * Idempotent, like `submit()`: cancelling twice is a no-op, and `submit()` after `cancel()` does
   * nothing. Cancelling a frame that was already submitted throws `VGPU-FRAME-SUBMITTED` — its work
   * is on the queue and cannot be taken back, so silently accepting the call would hide a real
   * lifecycle bug.
   */
  cancel() {
    if (!this.#i) {
      if (this.#s)
        throw mo("Frame.cancel");
      if (this.#a)
        throw ho("Frame.cancel");
      this.#i = !0, this.releaseLifecycle?.(), this.#u(this.#o()), this.#n.clear(), this.#r.clear(), O(this.#t), this.#t.length = 0;
    }
  }
  /**
   * Ends the frame for telemetry instances that will never see a real frameSubmitted: a pass whose
   * callback threw, a frame whose finish/submit failed, or a canceled frame. Each one took a retain
   * on its query ring when it was attached to a pass descriptor (so a mid-frame dispose() cannot
   * destroy a set the frame still points at); without the matching release, a dispose() after the
   * failure leaves the ring alive forever. frameAbandoned() drops the instance's pending encoded
   * state as it releases: a resolve that never reached the queue must not be decoded — its staging
   * buffer holds stale bytes, which would surface as a phantom duration or a phantom "hidden".
   */
  #u(e) {
    for (const n of [...e])
      n.frameAbandoned(this);
  }
  /** Every owner this frame attached, discarded ones included. */
  #o() {
    return [...this.#n, ...this.#r];
  }
  /** Moves owners out of this frame's live set: they are neither finalized nor read back. */
  #c(e) {
    for (const n of [...e])
      this.#n.delete(n), this.#r.add(n);
  }
  #d() {
    return [...this.#n].filter((e) => !this.#r.has(e));
  }
  /**
   * Attaches one `FramePassOptions` telemetry value to this pass through the nominal attachment
   * protocol, so the frame never learns whether it is a timer span, a visibility or a future
   * scene-view generation: it only records the owner it must settle exactly once.
   */
  #l(e, n, r, i) {
    const s = Hl(e);
    if (!s)
      throw i(e);
    let a;
    try {
      a = s[Gi]({ frame: this, device: this.device, target: n });
    } catch (o) {
      throw this.#c(this.#n), o;
    }
    return this.#n.add(a.owner), r.push(a.owner), a;
  }
  async #f(e, n, r) {
    await nn(this.device), z(this.device, "Frame.validation");
    const i = Le(e, n, r);
    this.errorSink ? await this.errorSink(i) : console.error(i);
  }
  #p(e) {
    return this.trackSettled?.(e), e;
  }
}
class Ou {
  encoder;
  target;
  validations;
  depthReadOnly;
  occlusionSource;
  frame;
  assertFrameOpen;
  #e = !1;
  constructor(e, n, r, i = !1, s, a, o) {
    this.encoder = e, this.target = n, this.validations = r, this.depthReadOnly = i, this.occlusionSource = s, this.frame = a, this.assertFrameOpen = o;
  }
  draw(e, n = {}) {
    this.assertFrameOpen?.("FramePass.draw");
    const r = Vu(e);
    this.depthReadOnly && Bu(r, this.target), r.encode(this.encoder, this.target, n, (i) => this.validations.push(i));
  }
  /**
   * Wraps one or more draws in begin/endOcclusionQuery. The body ALWAYS executes; condition your
   * real draws on `q.hidden` outside.
   */
  occlusion(e, n) {
    if (this.assertFrameOpen?.("FramePass.occlusion"), !this.occlusionSource)
      throw Qs();
    if (this.#e)
      throw Zs();
    const r = this.occlusionSource.beginQuery(e, this.frame);
    this.encoder.beginOcclusionQuery(r), this.#e = !0;
    try {
      typeof n == "function" ? n() : this.draw(n);
    } finally {
      this.#e = !1, this.encoder.endOcclusionQuery();
    }
  }
  bundles(...e) {
    if (this.assertFrameOpen?.("FramePass.bundles"), this.depthReadOnly)
      throw me("pass cannot replay bundles: bundle records bundles with writable depth/stencil, and WebGPU only executes read-only-recorded bundles in a read-only pass.", "Encode the draws directly with pass.draw(...) inside the depthReadOnly pass.", "FramePass.bundles");
    const n = e.map((r) => ql(r) ?? _u());
    for (const r of n)
      r.assertReplayable(this.target);
    this.encoder.executeBundles(n.map((r) => r.gpu));
  }
}
function Bu(t, e) {
  if (t.writesDepth())
    throw me(`pass cannot encode draw '${t.label}': its depth state writes depth (the default is write: true). Give the draw depth: { write: false } (or depth: false to disable depth testing).`, "Use depth: { write: false } on the draw, or open the pass without depthReadOnly.", "FramePass.draw");
  if (Ye(e.depth?.format)) {
    const n = t.stencilWritingOps();
    if (n.length)
      throw me(`pass cannot encode draw '${t.label}': its stencil ops can write (${n.join(", ")}), and the pass's stencil aspect is read-only too.`, 'Use "keep" for those ops or stencil writeMask: 0, or open the pass without depthReadOnly.', "FramePass.draw");
  }
}
function Vu(t) {
  const e = jl(t);
  if (!e)
    throw new TypeError("Invalid Effect instance: pass.draw() expects a Draw or an Effect created by this library.");
  return e;
}
function _u() {
  throw new v({ code: "VGPU-R3-BUNDLE-INVALID", message: "p.bundles() expected bundles created by bundle(gpu, { target }, cb).", where: "FramePass.bundles" });
}
function ju(t) {
  return Xs(`FramePassOptions.timer received ${ue(t)}; expected a TimerSpan from timer.span(name).`, 'Create const passTimer = timer(gpu) once, then pass passTimer.span("name") per pass.', "Frame.pass");
}
function Wu(t) {
  return Js(`FramePassOptions.visibility received ${ue(t)}; expected a Visibility from visibility(gpu).`, "Create const vis = visibility(gpu) once, then pass { target, visibility: vis } per pass.", "Frame.pass");
}
function qu(t, e, n) {
  if (t === void 0)
    return;
  if (typeof t != "object" || t === null || Array.isArray(t))
    throw Q(`received ${ue(t)}; expected { x?, y?, width, height, minDepth?, maxDepth? }.`);
  const { x: r = 0, y: i = 0, width: s, height: a, minDepth: o = 0, maxDepth: c = 1 } = t;
  for (const [p, m] of [["x", r], ["y", i], ["width", s], ["height", a], ["minDepth", o], ["maxDepth", c]])
    if (typeof m != "number" || !Number.isFinite(m))
      throw Q(`${p} received ${ue(m)}; expected a finite number.`);
  const l = e.maxTextureDimension2D, d = l * 2, u = `target is ${n[0]}x${n[1]}px, device maxTextureDimension2D is ${l}`;
  if (!(s >= 0 && s <= l))
    throw Q(`width ${s} is outside [0, ${l}] (${u}).`);
  if (!(a >= 0 && a <= l))
    throw Q(`height ${a} is outside [0, ${l}] (${u}).`);
  if (!(r >= -d && r + s <= d - 1))
    throw Q(`x ${r} with width ${s} is outside [${-d}, ${d - 1}] (${u}).`);
  if (!(i >= -d && i + a <= d - 1))
    throw Q(`y ${i} with height ${a} is outside [${-d}, ${d - 1}] (${u}).`);
  if (!(o >= 0 && o <= 1))
    throw Q(`minDepth ${o} is outside [0, 1].`);
  if (!(c >= 0 && c <= 1))
    throw Q(`maxDepth ${c} is outside [0, 1].`);
  if (!(o <= c))
    throw Q(`minDepth ${o} exceeds maxDepth ${c}.`);
  return { x: r, y: i, width: s, height: a, minDepth: o, maxDepth: c };
}
function Hu(t, e) {
  if (t === void 0)
    return;
  if (!Array.isArray(t) || t.length !== 4)
    throw At(`received ${ue(t)}; expected [x, y, width, height].`);
  const [n, r, i, s] = t;
  for (const [c, l] of [["x", n], ["y", r], ["width", i], ["height", s]])
    if (typeof l != "number" || !Number.isInteger(l) || l < 0)
      throw At(`${c} received ${ue(l)}; expected a non-negative integer.`);
  const [a, o] = e;
  if (n + i > a || r + s > o)
    throw At(`[${n}, ${r}, ${i}, ${s}] exceeds the target's current size ${a}x${o}px (x + width <= ${a}, y + height <= ${o}).`);
  return [n, r, i, s];
}
function ue(t) {
  return typeof t == "string" ? `'${t}'` : Array.isArray(t) ? `[${t.map((e) => ue(e)).join(", ")}]` : typeof t == "object" && t !== null ? "an object" : String(t);
}
function Ku(t) {
  const e = t?.code;
  return e === "VGPU-DEVICE-DISPOSED" || e === "VGPU-DEVICE-LOST";
}
class Yu {
  createFrame;
  advance;
  trackLoop;
  #e = !1;
  /**
   * @param trackLoop Lifecycle hook for the owning gpu: called with each started loop handle and
   * returns the untrack function the handle runs when it stops on its own, so `gpu.dispose()` can
   * stop the loops still running without holding on to the ones already stopped.
   */
  constructor(e, n, r) {
    this.createFrame = e, this.advance = n, this.trackLoop = r;
  }
  frame(e) {
    if (this.#e || Rl())
      throw qr();
    this.#e = !0, Gl();
    try {
      this.advance();
      const n = this.createFrame();
      if (e)
        try {
          e(n);
        } finally {
          try {
            n.submit();
          } catch (r) {
            if (!Ku(r))
              throw r;
          }
        }
      return n;
    } finally {
      zl(), this.#e = !1;
    }
  }
  loop(e, n = {}) {
    let r = !1;
    const i = globalThis.requestAnimationFrame ?? ((p) => setTimeout(() => p(performance.now()), 16)), s = globalThis.cancelAnimationFrame ?? ((p) => clearTimeout(p)), a = n.fps && n.fps > 0 ? 1e3 / n.fps : 0;
    let o, c = 0;
    const l = (p) => {
      r || (Xu(p, o, a) && (o = p, this.frame(e)), r || (c = i(l)));
    };
    c = i(l);
    let d;
    const u = {
      stop() {
        r = !0, s(c), d?.(), d = void 0;
      }
    };
    return d = this.trackLoop?.(u), u;
  }
}
function Xu(t, e, n) {
  return e === void 0 || n <= 0 ? !0 : t - e >= n;
}
function Lr(t, e) {
  return new Ju(de(t, "target").device, e);
}
class Ju {
  device;
  options;
  resourceIdentity = $t("render-target");
  #e = new Lt();
  #t = /* @__PURE__ */ new Set();
  #n;
  #r;
  #s;
  #i;
  #a;
  constructor(e, n) {
    this.device = e, this.options = n, cl(n, e), this.#a = n.clearColor === void 0 ? un : Et(n.clearColor, "target.clearColor"), this.#n = n.size, this.#r = this.#d(), this.#s = this.sampleCount === 4 ? this.#l() : void 0, this.#i = this.#f();
  }
  get gpu() {
    return this.color.gpu;
  }
  get size() {
    return this.#n;
  }
  get texelSize() {
    return [1 / this.#n[0], 1 / this.#n[1]];
  }
  /** Resolved, sampleable color texture. For MSAA targets, render passes resolve into this texture. */
  get color() {
    return this.#r[0];
  }
  /** Resolved, sampleable color textures. For MSAA targets, render passes resolve into these textures. */
  get colors() {
    return this.#r;
  }
  get depth() {
    return this.#i;
  }
  get format() {
    return gt(this.options)[0]?.format ?? "rgba8unorm";
  }
  /** Default clear color of this target; passes that clear without naming a color use it. */
  get clearColor() {
    return dn(this.#a);
  }
  set clearColor(e) {
    this.#a = Et(e, "target.clearColor");
  }
  get sampleCount() {
    return Ci(this.options);
  }
  resize(e) {
    Li(this.#n, e) || this.#u(e);
  }
  async read() {
    return this.color.read();
  }
  async readFloats() {
    return this.color.readFloats();
  }
  onDestroy(e) {
    return this.#e.onDestroy(this, e);
  }
  onTexturesRecreated(e) {
    return this.#t.add(e), () => {
      this.#t.delete(e);
    };
  }
  destroy() {
    this.#e.emit(this), this.#t.clear(), this.#c();
  }
  renderPassDescriptor(e = {}) {
    const { clear: n = [0, 0, 0, 1], preserve: r, clearDepth: i, clearStencil: s, depthReadOnly: a } = e;
    return {
      colorAttachments: this.#r.map((o, c) => ul(o, this.#s?.[c], n, r)),
      depthStencilAttachment: this.#i ? dl(this.#i, r, i, s, a) : void 0
    };
  }
  #u(e) {
    this.#c(), this.#n = [e[0], e[1]], this.#r = this.#d(), this.#s = this.sampleCount === 4 ? this.#l() : void 0, this.#i = this.#f(), this.#o();
  }
  #o() {
    for (const e of [...this.#t])
      e();
  }
  #c() {
    for (const e of this.#r)
      e.destroy();
    for (const e of this.#s ?? [])
      e.destroy();
    this.#i?.destroy();
  }
  #d() {
    return gt(this.options).map((e, n) => this.device.createTexture({
      size: this.#n,
      format: e.format,
      usage: ["render_attachment", "texture_binding", "copy_src"],
      sampleCount: 1,
      label: this.options.label ? `${this.options.label}.color${n}.resolve` : void 0
    }));
  }
  #l() {
    return gt(this.options).map((e, n) => this.device.createTexture({
      size: this.#n,
      format: e.format,
      usage: ["render_attachment"],
      sampleCount: 4,
      label: this.options.label ? `${this.options.label}.color${n}` : void 0
    }));
  }
  #f() {
    const e = Ii(this.options);
    return e ? this.device.createTexture({
      size: this.#n,
      format: e,
      usage: ["render_attachment", "texture_binding"],
      sampleCount: this.sampleCount,
      label: this.options.label ? `${this.options.label}.depth` : void 0
    }) : void 0;
  }
}
function Qu(t) {
  return So("browser", t);
}
function Zu(t) {
  return t * Math.PI / 180;
}
function ed(t, e, n, r) {
  const i = Math.tan(Math.PI * 0.5 - 0.5 * t), s = 1 / (n - r);
  return new Float32Array([
    i / e,
    0,
    0,
    0,
    0,
    i,
    0,
    0,
    0,
    0,
    Number.isFinite(r) ? r * s : -1,
    -1,
    0,
    0,
    Number.isFinite(r) ? r * n * s : -n,
    0
  ]);
}
function td(t, e) {
  const n = e ? `'${e}'` : "the node";
  return new v({
    code: "VGPU-SCENE-CYCLE",
    message: `add() would make ${n} an ancestor of itself.`,
    fix: "Remove the node from the ancestor chain first, or add a different node.",
    where: t
  });
}
function te(t, e, n) {
  return new v({
    code: "VGPU-SCENE-VALUE-INVALID",
    message: `\`${e}\` is invalid; expected ${n}.`,
    fix: `Pass ${n} for \`${e}\`.`,
    where: t
  });
}
function qe(t) {
  return t.fill(0), t[0] = t[5] = t[10] = t[15] = 1, t;
}
function nd(t, e) {
  return t.set(e), t;
}
function rd(t, e, n, r) {
  const i = n[0], s = n[1], a = n[2], o = n[3], c = i + i, l = s + s, d = a + a, u = i * c, p = i * l, m = i * d, b = s * l, g = s * d, $ = a * d, w = o * c, y = o * l, S = o * d, E = r[0], C = r[1], T = r[2];
  return t[0] = (1 - (b + $)) * E, t[1] = (p + S) * E, t[2] = (m - y) * E, t[3] = 0, t[4] = (p - S) * C, t[5] = (1 - (u + $)) * C, t[6] = (g + w) * C, t[7] = 0, t[8] = (m + y) * T, t[9] = (g - w) * T, t[10] = (1 - (u + b)) * T, t[11] = 0, t[12] = e[0], t[13] = e[1], t[14] = e[2], t[15] = 1, t;
}
function Hi(t, e, n) {
  const r = e[0], i = e[1], s = e[2], a = e[3], o = e[4], c = e[5], l = e[6], d = e[7], u = e[8], p = e[9], m = e[10], b = e[11], g = e[12], $ = e[13], w = e[14], y = e[15];
  for (let S = 0; S < 4; S++) {
    const E = S * 4, C = n[E], T = n[E + 1], P = n[E + 2], h = n[E + 3];
    t[E] = r * C + o * T + u * P + g * h, t[E + 1] = i * C + c * T + p * P + $ * h, t[E + 2] = s * C + l * T + m * P + w * h, t[E + 3] = a * C + d * T + b * P + y * h;
  }
  return t;
}
function Ki(t, e) {
  const n = e[0], r = e[1], i = e[2], s = e[4], a = e[5], o = e[6], c = e[8], l = e[9], d = e[10], u = e[12], p = e[13], m = e[14], b = a * d - o * l, g = o * c - s * d, $ = s * l - a * c, w = n * b + r * g + i * $, y = w === 0 ? 0 : 1 / w, S = b * y, E = g * y, C = $ * y, T = (i * l - r * d) * y, P = (n * d - i * c) * y, h = (r * c - n * l) * y, x = (r * o - i * a) * y, I = (i * s - n * o) * y, A = (n * a - r * s) * y;
  return t[0] = S, t[1] = T, t[2] = x, t[3] = 0, t[4] = E, t[5] = P, t[6] = I, t[7] = 0, t[8] = C, t[9] = h, t[10] = A, t[11] = 0, t[12] = -(S * u + E * p + C * m), t[13] = -(T * u + P * p + h * m), t[14] = -(x * u + I * p + A * m), t[15] = 1, t;
}
function id(t, e, n) {
  const r = n[0], i = n[1], s = n[2];
  return t[0] = e[0] * r + e[4] * i + e[8] * s + e[12], t[1] = e[1] * r + e[5] * i + e[9] * s + e[13], t[2] = e[2] * r + e[6] * i + e[10] * s + e[14], t;
}
function sd(t, e, n) {
  const r = n[0], i = n[1], s = n[2];
  return t[0] = e[0] * r + e[4] * i + e[8] * s, t[1] = e[1] * r + e[5] * i + e[9] * s, t[2] = e[2] * r + e[6] * i + e[10] * s, t;
}
function od(t, e, n, r) {
  const i = Math.cos(e / 2), s = Math.sin(e / 2), a = Math.cos(n / 2), o = Math.sin(n / 2), c = Math.cos(r / 2), l = Math.sin(r / 2);
  return t[0] = s * a * c + i * o * l, t[1] = i * o * c - s * a * l, t[2] = i * a * l + s * o * c, t[3] = i * a * c - s * o * l, t;
}
function ad(t, e, n, r, i, s, a, o, c, l) {
  const d = e + s + l;
  if (d > 0) {
    const u = 0.5 / Math.sqrt(d + 1);
    t[3] = 0.25 / u, t[0] = (a - c) * u, t[1] = (o - r) * u, t[2] = (n - i) * u;
  } else if (e > s && e > l) {
    const u = 2 * Math.sqrt(1 + e - s - l);
    t[3] = (a - c) / u, t[0] = 0.25 * u, t[1] = (i + n) / u, t[2] = (o + r) / u;
  } else if (s > l) {
    const u = 2 * Math.sqrt(1 + s - e - l);
    t[3] = (o - r) / u, t[0] = (i + n) / u, t[1] = 0.25 * u, t[2] = (c + a) / u;
  } else {
    const u = 2 * Math.sqrt(1 + l - e - s);
    t[3] = (n - i) / u, t[0] = (o + r) / u, t[1] = (c + a) / u, t[2] = 0.25 * u;
  }
  return t;
}
function cd(t, e, n, r) {
  let i = e[0] - n[0], s = e[1] - n[1], a = e[2] - n[2];
  const o = Math.hypot(i, s, a);
  if (o === 0)
    return t[0] = 0, t[1] = 0, t[2] = 0, t[3] = 1, t;
  i /= o, s /= o, a /= o;
  let c = r[1] * a - r[2] * s, l = r[2] * i - r[0] * a, d = r[0] * s - r[1] * i, u = Math.hypot(c, l, d);
  u === 0 && (c = a, l = 0, d = -i, u = Math.hypot(c, l, d), u === 0 && (c = 1, l = 0, d = 0, u = 1)), c /= u, l /= u, d /= u;
  const p = s * d - a * l, m = a * c - i * d, b = i * l - s * c;
  return ad(t, c, l, d, p, m, b, i, s, a);
}
const ld = new Float32Array([0, 1, 0]), Pr = new Float32Array(3), at = new Float32Array(3), ct = new Float32Array(3), zt = new Float32Array(16);
class ud {
  kind;
  label;
  visible = !0;
  #e = new Float32Array(3);
  #t = new Float32Array([0, 0, 0, 1]);
  #n = new Float32Array([1, 1, 1]);
  #r = qe(new Float32Array(16));
  #s = qe(new Float32Array(16));
  #i = new Float32Array(3);
  #a = !1;
  #u = !1;
  #o = null;
  #c = [];
  _worldVersion = 0;
  constructor(e, n = {}) {
    this.kind = e, this.label = n.label, this.#d(n), n.children && this.add(...n.children);
  }
  /** Updates transform components in place; unspecified components are left untouched. */
  set(e) {
    return this.#d(e), this;
  }
  #d(e) {
    const n = `${this.label ?? this.kind}.set`;
    let r = !1;
    if (e.position !== void 0 && (lt(this.#e, e.position, "position", n), r = !0), e.quaternion !== void 0) {
      if (e.quaternion.length !== 4)
        throw te(n, "quaternion", "an array of 4 numbers (x, y, z, w)");
      this.#t[0] = e.quaternion[0], this.#t[1] = e.quaternion[1], this.#t[2] = e.quaternion[2], this.#t[3] = e.quaternion[3], r = !0;
    } else if (e.rotation !== void 0) {
      if (e.rotation.length !== 3)
        throw te(n, "rotation", "an array of 3 Euler angles in radians");
      od(this.#t, e.rotation[0], e.rotation[1], e.rotation[2]), r = !0;
    }
    e.scale !== void 0 && (typeof e.scale == "number" ? this.#n.fill(e.scale) : lt(this.#n, e.scale, "scale", n), r = !0), e.visible !== void 0 && (this.visible = e.visible), e.label !== void 0 && (this.label = e.label), r && this.#l();
  }
  /**
   * Rotates the node so its -Z axis points at a world-space target.
   *
   * The whole computation runs in parent space (the target and up hint are pulled through
   * the parent's affine inverse), which stays exact under non-uniform parent scale: an
   * affine map sends the parent-space ray through the target to the world-space ray through
   * the world target. Extracting a scale-stripped parent rotation instead — as an earlier
   * version did — skews the forward vector whenever the parent scale is anisotropic.
   */
  lookAt(e, n = ld) {
    const r = `${this.label ?? this.kind}.lookAt`;
    lt(at, e, "target", r), lt(ct, n, "up", r), Pr.set(this.#e);
    const i = this.#o;
    return i && (Ki(zt, i.worldMatrix), id(at, zt, at), sd(ct, zt, ct)), cd(this.#t, Pr, at, ct), this.#l(), this;
  }
  /** Adds children, reparenting them if needed. Throws `VGPU-SCENE-CYCLE` on cycles. */
  add(...e) {
    const n = `${this.label ?? this.kind}.add`;
    for (const r of e) {
      for (let i = this; i; i = i.#o)
        if (i === r)
          throw td(n, r.label ?? r.kind);
      r.#o && r.#o.#p(r), r.#o = this, this.#c.push(r), r.#f();
    }
    return this;
  }
  /** Removes direct children; nodes that are not children are ignored. */
  remove(...e) {
    for (const n of e)
      n.#o === this && this.#p(n);
    return this;
  }
  /** Detaches this node from its parent, keeping its local transform. */
  removeFromParent() {
    return this.#o && this.#o.#p(this), this;
  }
  /** Depth-first visit of this node and all descendants. */
  traverse(e) {
    e(this);
    for (const n of this.#c)
      n.traverse(e);
  }
  get parent() {
    return this.#o;
  }
  get children() {
    return this.#c;
  }
  /** Local position. Stable array identity; mutate via `set()`. */
  get position() {
    return this.#e;
  }
  /** Local rotation quaternion (x, y, z, w). Stable array identity; mutate via `set()`. */
  get quaternion() {
    return this.#t;
  }
  /** Local scale. Stable array identity; mutate via `set()`. */
  get scale() {
    return this.#n;
  }
  /** Column-major local TRS matrix, recomputed lazily. Stable array identity. */
  get localMatrix() {
    return this.#a && (rd(this.#r, this.#e, this.#t, this.#n), this.#a = !1), this.#r;
  }
  /** Column-major world matrix, recomputed lazily for dirty subtrees. Stable array identity. */
  get worldMatrix() {
    if (this.#u || this.#a) {
      const e = this.localMatrix, n = this.#o;
      n ? Hi(this.#s, n.worldMatrix, e) : nd(this.#s, e), this.#u = !1, this._worldVersion++;
    }
    return this.#s;
  }
  /** World-space position derived from `worldMatrix`. Stable array identity. */
  get worldPosition() {
    const e = this.worldMatrix;
    return this.#i[0] = e[12], this.#i[1] = e[13], this.#i[2] = e[14], this.#i;
  }
  #l() {
    this.#a = !0, this.#f(!0);
  }
  #f(e = !1) {
    if (!(this.#u && !e)) {
      this.#u = !0;
      for (const n of this.#c)
        n.#f();
    }
  }
  #p(e) {
    const n = this.#c.indexOf(e);
    n >= 0 && this.#c.splice(n, 1), e.#o = null, e.#f(!0);
  }
}
function lt(t, e, n, r) {
  if (e.length !== 3)
    throw te(r, n, "an array of 3 numbers");
  t[0] = e[0], t[1] = e[1], t[2] = e[2];
}
class dd extends ud {
  #e = qe(new Float32Array(16));
  #t = qe(new Float32Array(16));
  #n = qe(new Float32Array(16));
  _projectionDirty = !0;
  #r = -1;
  #s = !0;
  get projection() {
    return this._projectionDirty && (this._updateProjection(this.#e), this._projectionDirty = !1, this.#s = !0), this.#e;
  }
  get view() {
    return this.#i(), this.#t;
  }
  get viewProjection() {
    const e = this.projection;
    return this.#i(), this.#s && (Hi(this.#n, e, this.#t), this.#s = !1), this.#n;
  }
  get viewProjectionMatrix() {
    return this.viewProjection;
  }
  #i() {
    const e = this.worldMatrix;
    this.#r !== this._worldVersion && (Ki(this.#t, e), this.#r = this._worldVersion, this.#s = !0);
  }
}
class fd extends dd {
  #e;
  #t;
  #n;
  #r;
  constructor(e) {
    Ar("perspectiveCamera", e.fov), e.aspect !== void 0 && Mr("perspectiveCamera", e.aspect), Fr("perspectiveCamera", e.near ?? 0.1, e.far ?? 100), pd("perspectiveCamera", e.target, e.up), super("perspective-camera", e), this.#e = e.fov, this.#t = e.aspect, this.#n = e.near ?? 0.1, this.#r = e.far ?? 100, e.target && this.lookAt(e.target, e.up);
  }
  set(e) {
    super.set(e);
    const n = `${this.label ?? this.kind}.set`;
    if (e.fov !== void 0 && (Ar(n, e.fov), this.#e = e.fov, this._projectionDirty = !0), e.aspect !== void 0 && (Mr(n, e.aspect), this.#t = e.aspect, this._projectionDirty = !0), e.near !== void 0 || e.far !== void 0) {
      const r = e.near ?? this.#n, i = e.far ?? this.#r;
      Fr(n, r, i), this.#n = r, this.#r = i, this._projectionDirty = !0;
    }
    return this;
  }
  get fov() {
    return this.#e;
  }
  /** Resolved aspect ratio; defaults to 1 until set explicitly. */
  get aspect() {
    return this.#t ?? 1;
  }
  get near() {
    return this.#n;
  }
  get far() {
    return this.#r;
  }
  _updateProjection(e) {
    e.set(ed(Zu(this.#e), this.#t ?? 1, this.#n, this.#r));
  }
}
function kr(t) {
  return new fd(t);
}
function pd(t, e, n) {
  if (e !== void 0) {
    if (e.length !== 3)
      throw te(t, "target", "an array of 3 numbers");
    if (n !== void 0 && n.length !== 3)
      throw te(t, "up", "an array of 3 numbers");
  }
}
function Ar(t, e) {
  if (!(e > 0 && e < 180))
    throw te(t, "fov", "a field of view in degrees between 0 and 180 (exclusive)");
}
function Fr(t, e, n) {
  if (!(e > 0))
    throw te(t, "near", "a positive near plane distance");
  if (!(n > e))
    throw te(t, "far", "a far plane distance greater than `near`");
}
function Mr(t, e) {
  if (!(e > 0) || !Number.isFinite(e))
    throw te(t, "aspect", "a positive, finite width/height ratio");
}
const ut = { version: 1, wgsl: "struct _vgsl_c0aea4c3__CrystalUniforms{viewProjection:mat4x4f,cameraPosition:vec3f,time:f32,lightDirection:vec3f,transmission:f32,color:vec3f,ior:f32,rotation:vec2f,dispersion:f32,wavelength:f32,positionOffset:vec2f,scale:f32,modeIndex:f32,spectralPurity:f32,raysEnabled:f32,lightVisible:f32,globalLight:f32,paperBackground:f32,pointer:vec2f,reflectionPass:f32,floorY:f32,}@group(0) @binding(0) var<uniform> crystal:_vgsl_c0aea4c3__CrystalUniforms;struct _vgsl_c0aea4c3__VertexInput{@location(0) position:vec3f,@location(1) normal:vec3f,}struct _vgsl_c0aea4c3__VertexOutput{@builtin(position) clipPosition:vec4f,@location(0) worldPosition:vec3f,@location(1) worldNormal:vec3f,}fn d(a:f32)-> mat3x3f{let b=cos(a);let c=sin(a);return mat3x3f(1.0,0.0,0.0,0.0,b,c,0.0,-c,b);}fn e(a:f32)-> mat3x3f{let b=cos(a);let c=sin(a);return mat3x3f(b,0.0,-c,0.0,1.0,0.0,c,0.0,b);}fn f(a:vec3f)-> f32{return fract(sin(dot(a,vec3f(127.1,311.7,74.7)))*43758.5453);}fn h(a:vec3f,b:f32)-> f32{let c=a*34.0;let g=floor(c);let r=fract(c)-0.5;let s=f(g);let t=vec3f(f(g+vec3f(13.1,1.7,9.2)),f(g+vec3f(4.6,17.3,2.8)),f(g+vec3f(8.4,5.1,21.9)))-0.5;let w=r-t*0.58;let x=min(length(w.xy),min(length(w.xz),length(w.yz)));let y=smoothstep(0.115,0.018,x);let z=step(0.86,s);let A=0.58+0.42*sin(b*mix(1.4,4.8,s)+s*19.0);return z*y*A;}@vertex fn vs_main(a:_vgsl_c0aea4c3__VertexInput)-> _vgsl_c0aea4c3__VertexOutput{let rotation=e(crystal.rotation.x)*d(crystal.rotation.y);var worldPosition=rotation*a.position*crystal.scale;worldPosition=vec3f(worldPosition.xy+crystal.positionOffset,worldPosition.z);var worldNormal=normalize(rotation*a.normal);if(crystal.reflectionPass>0.5){worldPosition.y=crystal.floorY*2.0-worldPosition.y;worldNormal.y=-worldNormal.y;}var b:_vgsl_c0aea4c3__VertexOutput;b.worldPosition=worldPosition;b.worldNormal=worldNormal;b.clipPosition=crystal.viewProjection*vec4f(worldPosition,1.0);return b;}@fragment fn fs_main(a:_vgsl_c0aea4c3__VertexOutput,@builtin(front_facing) c:bool)-> @location(0) vec4f{var s=normalize(a.worldNormal);if(!c){s=-s;}let t=normalize(crystal.cameraPosition-a.worldPosition);let lightDirection=normalize(crystal.lightDirection);let w=normalize(lightDirection+t);let A=clamp(dot(s,t),0.0,1.0);let B=(crystal.ior-1.0)/max(crystal.ior+1.0,0.001);let C=B*B;let D=C+(1.0-C)*pow(1.0-A,5.0);let E=clamp(crystal.lightVisible,0.0,1.0);let F=max(dot(s,lightDirection),0.0)*E;let G=max(dot(-s,lightDirection),0.0)*E;let H=pow(max(dot(s,w),0.0),92.0)*E;let I=clamp(crystal.globalLight,0.0,1.0);let J=normalize(vec3f(-0.42,0.72,0.56));let K=normalize(vec3f(0.58,-0.24,0.78));let L=I*(0.20+max(dot(s,J),0.0)*0.48+max(dot(s,K),0.0)*0.22);let M=I*pow(1.0-A,2.4)*0.30;let N=normalize(J+t);let O=I*pow(max(dot(s,N),0.0),44.0);let P=1.0/max(crystal.ior,1.001);let Q=reflect(-t,s);let R=refract(-t,s,P);let S=normalize(s+vec3f(crystal.pointer.x,crystal.pointer.y,0.0)*0.075);let T=crystal.dispersion*0.031*crystal.raysEnabled*E;let U=q(normalize(R+S*T),lightDirection,2.0,crystal.time,crystal.paperBackground).r;let V=q(R,lightDirection,2.0,crystal.time,crystal.paperBackground).g;let W=q(normalize(R-S*T),lightDirection,2.0,crystal.time,crystal.paperBackground).b;let X=vec3f(U,V,W);let Y=q(normalize(R+s*0.115),lightDirection,2.0,crystal.time,crystal.paperBackground);let Z=q(normalize(R-s*0.075),lightDirection,2.0,crystal.time,crystal.paperBackground);let aa=mix(X,(Y+Z)*0.5,0.19+crystal.dispersion*0.08);let ab=q(Q,lightDirection,2.0,crystal.time,crystal.paperBackground);let ac=l(crystal.wavelength);let ad=clamp(crystal.dispersion*crystal.raysEnabled*(0.30+crystal.spectralPurity*0.48),0.0,0.82);var ae=mix(crystal.color,normalize(ac*0.82+crystal.color*0.18),ad);if(crystal.modeIndex>1.5&&crystal.modeIndex<2.5){ae=mix(ae,ac,0.24+crystal.dispersion*0.46);}let af=clamp(0.38+(1.0-A)*1.38+length(a.worldPosition.xy)*0.12,0.28,2.25);let ag=max(vec3f(0.035),(vec3f(1.0)-ae)*(1.15+(1.0-crystal.transmission)*2.35));let ah=exp(-ag*af);let ai=clamp(0.22+(1.0-crystal.transmission)*0.42+crystal.paperBackground*0.18,0.0,0.86);let aj=mix(vec3f(1.0),ah,ai);let ak=ae*(vec3f(1.0)-ah)*(0.13+G*0.32+L*0.10);let al=aa*aj*(0.72+crystal.transmission*0.74)+ak+ae*0.014;var color=mix(ae*(0.035+F*0.16+G*0.09),al,0.34+crystal.transmission*0.62);color=mix(color,ab*0.92+ae*0.15,D*0.86);color+=ae*(0.04+(1.0-crystal.transmission)*0.10);color+=ae*crystal.paperBackground*(0.10+D*0.20);color+=ae*H*3.8;color+=mix(ae,vec3f(1.0),0.10)*L*(0.58+crystal.paperBackground*0.20+(1.0-crystal.transmission)*0.20);color+=ab*M*0.42;color+=mix(vec3f(1.0),ae,0.42)*O*1.45;let am=pow(max(dot(s,normalize(vec3f(-0.40,0.66,0.63)+t)),0.0),30.0);color+=mix(vec3f(0.82,0.94,1.0),ae,0.18)*am*(0.32+E*0.54+I*0.42);color+=ae*(0.055+crystal.transmission*0.10)*(0.35+G*0.82+L*0.46);let an=vec3f(0.40)+ae*1.28;color=mix(color,color*an,(1.0-D)*(0.26+(1.0-crystal.transmission)*0.12));color+=mix(vec3f(1.0),ac,crystal.raysEnabled)*G*crystal.transmission*(0.10+crystal.raysEnabled*0.22);let ao=h(a.worldPosition,crystal.time);let ap=clamp((crystal.transmission*0.60+G*1.05+crystal.dispersion*0.48)*crystal.spectralPurity*crystal.raysEnabled,0.0,1.0);let aq=mix(vec3f(0.90,0.94,1.0),normalize(ac*0.78+crystal.color*0.22),ap);let ar=0.15+F*0.65+G*0.48+L*0.34+D*0.34;color+=aq*ao*ar*(1.50+crystal.dispersion*crystal.raysEnabled*E*3.0);if(crystal.modeIndex>0.5&&crystal.modeIndex<1.5){let at=0.78+0.22*sin((a.worldPosition.x+a.worldPosition.y*1.6)*17.0);color*=mix(vec3f(0.72),ac*1.2,at*0.35);}if(crystal.modeIndex>2.5&&crystal.modeIndex<3.5){color+=vec3f(pow(1.0-A,7.0))*0.32;}let au=mix(0.88,0.16,clamp(crystal.transmission,0.0,1.0));var av=clamp(au+D*0.58+H*0.12+crystal.paperBackground*0.08,0.14,0.94);if(crystal.reflectionPass>0.5){let aw=clamp((a.worldPosition.y-crystal.floorY)/1.35,0.0,1.0);let ax=(1.0-smoothstep(0.06,0.96,aw))*(1.0-crystal.paperBackground*0.88);let ay=0.72+0.28*sin(a.worldPosition.x*71.0+a.worldPosition.z*47.0);color=mix(color,ae*dot(color,vec3f(0.2126,0.7152,0.0722)),0.52)*(0.30+ay*0.14);av*=ax*0.42;}return vec4f(max(color,vec3f(0.0)),av);}const _vgsl_c0bf6b2b__SUN_COLOR=vec3f(1.0,0.68,0.34);fn i(a:f32)-> f32{return clamp(a,0.0,1.0);}fn j(a:vec3f)-> vec2f{let b=abs(a);var c=a.xy/max(b.z,0.0001);if(b.x> b.y&&b.x> b.z){c=a.zy/max(b.x,0.0001);}if(b.y> b.x&&b.y> b.z){c=a.xz/max(b.y,0.0001);}return c;}fn k(a:vec3f,b:f32,c:f32,g:f32)-> vec3f{let r=j(a)*b;let s=vec3u(vec3i(floor(vec3f(r,b*0.031))));let t=u(s);let w=smoothstep(c,1.0,v(t.x));let A=(vec2f(v(t.y),v(t.z))-0.5)*0.68;let B=fract(r)-0.5-A;let C=fract(v(t.y)*11.73+v(t.z)*7.19);let D=mix(0.032,0.128,C*C);let E=smoothstep(D,D*0.16,length(B));let F=smoothstep(D*1.9,D*0.42,length(B));let G=mix(0.46,1.54,v(t.z));let H=0.67+0.33*sin(g*G+v(t.x)*6.28318);let I=0.86+0.14*sin(g*(G*2.73+0.31)+v(t.y)*8.31);let J=clamp(H*I,0.28,1.18);let K=mix(vec3f(0.86,0.91,1.0),vec3f(1.0,0.985,0.94),v(t.y));return K*pow(w,1.28)*(E*(0.82+J*0.26)+F*0.075)*J*mix(1.14,3.62,C);}fn l(a:f32)-> vec3f{let b=clamp((a-380.0)/340.0,0.0,1.0);let c=smoothstep(0.42,0.78,b)+(1.0-smoothstep(0.78,0.98,b))*0.13;let g=smoothstep(0.08,0.42,b)*(1.0-smoothstep(0.60,0.84,b));let r=1.0-smoothstep(0.25,0.54,b);return normalize(vec3f(max(c,0.08),max(g,0.05),max(r,0.08)));}fn m(a:vec3f,b:vec3f,c:vec2f,g:f32,)-> f32{let r=vec3f(0.0,1.0,0.0);let s=normalize(cross(r,b));let t=normalize(cross(b,s));let w=dot(a,b);if(w<=0.02){return 0.0;}let x=vec2f(dot(a,s),dot(a,t))/w;let y=max(abs(x)-c,vec2f(0.0));return(1.0-smoothstep(0.0,g,length(y)))*smoothstep(0.02,0.18,w);}fn n(a:vec3f)-> vec3f{let b=normalize(a);let c=m(b,normalize(vec3f(-0.52,0.22,-1.0)),vec2f(0.075,0.46),0.085);let g=m(b,normalize(vec3f(0.64,0.08,-1.0)),vec2f(0.055,0.34),0.075);let r=m(b,normalize(vec3f(0.04,0.74,-1.0)),vec2f(0.38,0.045),0.075);let s=m(b,normalize(vec3f(-0.06,-0.18,1.0)),vec2f(0.24,0.18),0.16);return vec3f(0.82,0.93,1.0)*c*3.2+vec3f(1.0,0.985,0.95)*g*2.15+vec3f(0.90,0.96,1.0)*r*2.8+vec3f(0.20,0.44,0.72)*s*0.58;}fn o(a:vec3f,b:vec3f,c:f32,g:f32)-> vec3f{let r=normalize(a);let s=normalize(b);let t=normalize(vec3f(0.28,0.92,-0.22));let w=1.0-abs(dot(r,t));let y=0.5+0.5*sin(r.x*39.0+sin(r.z*23.0)*3.0);let A=pow(i(w),12.0)*(0.016+y*0.032);var B=vec3f(0.0012,0.0015,0.0024);B+=vec3f(0.075,0.085,0.115)*A;B+=k(r,24.0,0.820,g);B+=k(r,58.0,0.930,g*0.87);B+=k(r,126.0,0.978,g*1.14);let C=i(dot(r,s));let D=smoothstep(0.99935,0.99986,C);let E=pow(C,360.0)*1.65;let F=pow(C,118.0)*0.11;B+=_vgsl_c0bf6b2b__SUN_COLOR*(D*4.8+E+F)*clamp(c,0.0,1.0);return B;}fn p(a:vec3f)-> vec3f{let b=normalize(a);let c=j(b);let g=0.5+0.5*sin(c.x*1180.0+sin(c.y*91.0)*3.2);let r=0.5+0.5*sin(c.y*730.0+sin(c.x*63.0)*2.4);let s=vec3u(vec3i(floor(vec3f((c+2.0)*360.0,19.0))));let t=v(u(s).x);let w=(g-0.5)*0.026+(r-0.5)*0.018+(t-0.5)*0.032;let z=vec3f(0.79,0.765,0.72);return z*(0.94+w);}fn q(a:vec3f,b:vec3f,c:f32,g:f32,r:f32,)-> vec3f{let s=o(a,b,c,g);let t=step(1.5,c);let w=n(a)*t;let x=s+w;let y=p(a)+w*0.34;return mix(x,y,clamp(r,0.0,1.0));}fn u(a:vec3u)-> vec3u{var b=a*1664525u+1013904223u;b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));return b;}fn v(a:u32)-> f32{return f32(a>>8u)*(1.0/16777216.0);}" }, hd = { version: 1, wgsl: "struct _vgsl_25b11952__SpaceUniforms{right:vec3f,tanHalfFov:f32,up:vec3f,aspect:f32,forward:vec3f,time:f32,lightDirection:vec3f,modeIndex:f32,posterColor:vec3f,wavelength:f32,dispersion:f32,spectralPurity:f32,transmission:f32,raysEnabled:f32,pointer:vec2f,lightVisible:f32,paperBackground:f32,}@group(0) @binding(0) var<uniform> space:_vgsl_25b11952__SpaceUniforms;fn c(a:vec2f,b:vec2f,g:vec2f)-> vec2f{let r=g-b;let t=max(length(r),0.0001);let u=r/t;let v=dot(a-b,u);let w=clamp(v/t,0.0,1.0);let x=b+r*w;return vec2f(length(a-x),w);}fn d(a:vec2f,b:vec2f,g:vec2f,r:f32,t:f32,u:f32,v:f32,w:vec3f,)-> vec3f{let z=g-b;let A=max(length(z),0.0001);let B=z/A;let C=vec2f(-B.y,B.x);let D=dot(a-b,B)/A;let E=floor(D*t);let F=fract(sin(E*91.173+u*17.137)*43758.5453);let G=fract(sin(E*37.217+u*43.713)*17621.923);let H=(E+0.18+F*0.64)/t*A;let I=b+B*H+C*(G-0.5)*r*1.7;let J=mix(0.0024,0.0092,G*G);let K=smoothstep(J,J*0.15,length(a-I));let L=step(0.0,D)*step(D,1.0);let M=1.0-smoothstep(r,r*1.8,abs(dot(a-b,C)));let N=0.74+0.26*sin(v*mix(0.8,2.8,G)+F*18.0);return w*K*L*M*N*mix(0.9,3.0,F);}fn e(a:vec2f)-> vec3f{let b=clamp(space.raysEnabled*space.lightVisible,0.0,1.0);if(b<0.5){return vec3f(0.0);}let g=vec2f(a.x*space.aspect,a.y);let r=clamp(space.pointer,vec2f(-1.0),vec2f(1.0));let t=vec2f(1.38,-0.26-r.y*0.34);let u=vec2f(0.12+r.x*0.045,-0.018-r.y*0.075);let v=vec2f(-0.10+r.x*0.028,0.018+r.y*0.052);let w=c(g,t,u);let z=smoothstep(0.01,0.11,w.y)*(1.0-smoothstep(0.90,1.0,w.y));let A=1.0-smoothstep(0.003,0.010,w.x);let B=1.0-smoothstep(0.010,0.042,w.x);var C=vec3f(1.0,0.99,0.96)*(A*3.8+B*0.34)*z;C+=d(g,t,u,0.044,82.0,1.0,space.time,vec3f(1.0,0.99,0.96))*1.35;let D=0.045+space.dispersion*0.235;let E=r.y*0.31+r.x*0.09;let F=clamp(space.spectralPurity,0.0,1.0);for(var G=0;G<7;G=G+1){let H=f32(G)/6.0;let wavelength=400.0+H*300.0;let I=k(wavelength);let J=vec2f(-1.34,0.30+E+(H-0.5)*D);let K=c(g,v,J);let L=smoothstep(0.015,0.12,K.y)*(1.0-smoothstep(0.90,1.0,K.y));let M=1.0-smoothstep(0.002,0.008+space.dispersion*0.003,K.x);let N=1.0-smoothstep(0.008,0.028+space.dispersion*0.009,K.x);C+=I*(M*2.15+N*0.19)*L*(0.62+space.transmission*0.42);C+=d(g,v,J,0.026,44.0,10.0+f32(G),space.time*1.11,I)*(0.16+space.dispersion*0.38);}let O=vec2f(-1.34,0.30+E+clamp((space.wavelength-550.0)/340.0,-0.5,0.5)*D);let P=c(g,v,O);let Q=1.0-smoothstep(0.002,0.008,P.x);let R=normalize(mix(k(space.wavelength),space.posterColor,F*0.35));C+=R*Q*0.7*smoothstep(0.0,0.15,P.y);return C;}fn f(a:vec2f,b:vec3f,g:vec3f,r:f32)-> vec3f{let t=-0.34;let u=1.0-smoothstep(t-0.018,t+0.025,a.y);let v=0.010+0.018*(a.y*0.5+0.5);let w=exp(-dot(vec2f(a.x*0.70,a.y-0.10),vec2f(a.x*0.70,a.y-0.10))*2.2);let z=vec3f(0.0045,0.0065,0.0090)+b*0.72+g*w*0.014;let A=clamp((t-a.y)/0.66,0.0,1.0);let B=0.5+0.5*sin((a.x*913.0+a.y*617.0)+sin(a.x*121.0)*2.4);var C=vec3f(0.0012,0.0020,0.0030)+g*(0.010-A*0.006);C+=vec3f(B)*0.0022;var D=mix(z+vec3f(v),C,u);let E=exp(-abs(a.y-t)*150.0);D+=mix(vec3f(0.025),g*0.16,0.35)*E;let F=exp(-pow(a.x/0.34,2.0)-pow((a.y-(t-0.055))/0.052,2.0));D*=1.0-F*u*0.72;let G=exp(-pow(a.x/0.42,2.0)-pow((a.y-(t-0.19))/0.22,2.0));D+=g*G*u*0.009*(0.92+0.08*sin(r*0.31));return D;}@fragment fn fs_main(@location(0) a:vec2f)-> @location(0) vec4f{let b=vec2f(a.x,1.0-a.y)*2.0-1.0;let g=normalize(space.forward+space.right*b.x*space.aspect*space.tanHalfFov+space.up*b.y*space.tanHalfFov);let r=p(g,space.lightDirection,0.0,space.time,space.paperBackground);let t=f(b,r,space.posterColor,space.time);var u=mix(t,r,clamp(space.paperBackground,0.0,1.0));u+=e(b);let v=1.0-smoothstep(0.48,1.38,length(vec2f(b.x*0.72,b.y)));u*=mix(mix(0.62,0.93,space.paperBackground),1.0,v);if(space.modeIndex>1.5&&space.modeIndex<2.5){u*=vec3f(0.95,0.98,1.04);}return vec4f(u,1.0);}const _vgsl_c0bf6b2b__SUN_COLOR=vec3f(1.0,0.68,0.34);fn h(a:f32)-> f32{return clamp(a,0.0,1.0);}fn i(a:vec3f)-> vec2f{let b=abs(a);var g=a.xy/max(b.z,0.0001);if(b.x> b.y&&b.x> b.z){g=a.zy/max(b.x,0.0001);}if(b.y> b.x&&b.y> b.z){g=a.xz/max(b.y,0.0001);}return g;}fn j(a:vec3f,b:f32,g:f32,r:f32)-> vec3f{let t=i(a)*b;let u=vec3u(vec3i(floor(vec3f(t,b*0.031))));let v=q(u);let w=smoothstep(g,1.0,s(v.x));let A=(vec2f(s(v.y),s(v.z))-0.5)*0.68;let B=fract(t)-0.5-A;let C=fract(s(v.y)*11.73+s(v.z)*7.19);let D=mix(0.032,0.128,C*C);let E=smoothstep(D,D*0.16,length(B));let F=smoothstep(D*1.9,D*0.42,length(B));let G=mix(0.46,1.54,s(v.z));let H=0.67+0.33*sin(r*G+s(v.x)*6.28318);let I=0.86+0.14*sin(r*(G*2.73+0.31)+s(v.y)*8.31);let J=clamp(H*I,0.28,1.18);let K=mix(vec3f(0.86,0.91,1.0),vec3f(1.0,0.985,0.94),s(v.y));return K*pow(w,1.28)*(E*(0.82+J*0.26)+F*0.075)*J*mix(1.14,3.62,C);}fn k(a:f32)-> vec3f{let b=clamp((a-380.0)/340.0,0.0,1.0);let g=smoothstep(0.42,0.78,b)+(1.0-smoothstep(0.78,0.98,b))*0.13;let r=smoothstep(0.08,0.42,b)*(1.0-smoothstep(0.60,0.84,b));let t=1.0-smoothstep(0.25,0.54,b);return normalize(vec3f(max(g,0.08),max(r,0.05),max(t,0.08)));}fn l(a:vec3f,b:vec3f,g:vec2f,r:f32,)-> f32{let t=vec3f(0.0,1.0,0.0);let u=normalize(cross(t,b));let v=normalize(cross(b,u));let w=dot(a,b);if(w<=0.02){return 0.0;}let x=vec2f(dot(a,u),dot(a,v))/w;let y=max(abs(x)-g,vec2f(0.0));return(1.0-smoothstep(0.0,r,length(y)))*smoothstep(0.02,0.18,w);}fn m(a:vec3f)-> vec3f{let b=normalize(a);let g=l(b,normalize(vec3f(-0.52,0.22,-1.0)),vec2f(0.075,0.46),0.085);let r=l(b,normalize(vec3f(0.64,0.08,-1.0)),vec2f(0.055,0.34),0.075);let t=l(b,normalize(vec3f(0.04,0.74,-1.0)),vec2f(0.38,0.045),0.075);let u=l(b,normalize(vec3f(-0.06,-0.18,1.0)),vec2f(0.24,0.18),0.16);return vec3f(0.82,0.93,1.0)*g*3.2+vec3f(1.0,0.985,0.95)*r*2.15+vec3f(0.90,0.96,1.0)*t*2.8+vec3f(0.20,0.44,0.72)*u*0.58;}fn n(a:vec3f,b:vec3f,g:f32,r:f32)-> vec3f{let t=normalize(a);let u=normalize(b);let v=normalize(vec3f(0.28,0.92,-0.22));let w=1.0-abs(dot(t,v));let y=0.5+0.5*sin(t.x*39.0+sin(t.z*23.0)*3.0);let A=pow(h(w),12.0)*(0.016+y*0.032);var B=vec3f(0.0012,0.0015,0.0024);B+=vec3f(0.075,0.085,0.115)*A;B+=j(t,24.0,0.820,r);B+=j(t,58.0,0.930,r*0.87);B+=j(t,126.0,0.978,r*1.14);let C=h(dot(t,u));let D=smoothstep(0.99935,0.99986,C);let E=pow(C,360.0)*1.65;let F=pow(C,118.0)*0.11;B+=_vgsl_c0bf6b2b__SUN_COLOR*(D*4.8+E+F)*clamp(g,0.0,1.0);return B;}fn o(a:vec3f)-> vec3f{let b=normalize(a);let g=i(b);let r=0.5+0.5*sin(g.x*1180.0+sin(g.y*91.0)*3.2);let t=0.5+0.5*sin(g.y*730.0+sin(g.x*63.0)*2.4);let u=vec3u(vec3i(floor(vec3f((g+2.0)*360.0,19.0))));let v=s(q(u).x);let w=(r-0.5)*0.026+(t-0.5)*0.018+(v-0.5)*0.032;let z=vec3f(0.79,0.765,0.72);return z*(0.94+w);}fn p(a:vec3f,b:vec3f,g:f32,r:f32,t:f32,)-> vec3f{let u=n(a,b,g,r);let v=step(1.5,g);let w=m(a)*v;let x=u+w;let y=o(a)+w*0.34;return mix(x,y,clamp(t,0.0,1.0));}fn q(a:vec3u)-> vec3u{var b=a*1664525u+1013904223u;b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));return b;}fn s(a:u32)-> f32{return f32(a>>8u)*(1.0/16777216.0);}" }, md = { version: 1, wgsl: "@group(0) @binding(0) var skyTexture:texture_2d<f32>;@group(0) @binding(1) var crystalTexture:texture_2d<f32>;@group(0) @binding(2) var sceneSampler:sampler;fn c(a:vec3f)-> vec3f{let b=a*(a+0.0245786)-0.000090537;let i=a*(0.983729*a+0.4329510)+0.238081;return b/i;}fn d(a:vec3f)-> vec3f{let b=mat3x3f(vec3f(0.59719,0.07600,0.02840),vec3f(0.35458,0.90834,0.13383),vec3f(0.04823,0.01566,0.83777));let i=mat3x3f(vec3f(1.60475,-0.10208,-0.00327),vec3f(-0.53108,1.10813,-0.07276),vec3f(-0.07367,-0.00605,1.07602));return clamp(i*c(b*a),vec3f(0.0),vec3f(1.0));}fn e(b:vec2f)-> vec3f{let i=textureSample(skyTexture,sceneSampler,b);let j=textureSample(crystalTexture,sceneSampler,b);return mix(i.rgb,j.rgb,clamp(j.a,0.0,1.0));}fn f(a:vec2f)-> vec3f{let b=e(a);return max(b-vec3f(0.88),vec3f(0.0));}@fragment fn fs_main(@builtin(position) a:vec4f,@location(0) b:vec2f)-> @location(0) vec4f{let i=vec2f(b.x,1.0-b.y);var j=e(i);let k=vec2f(textureDimensions(skyTexture));let l=vec2f(1.0)/max(k,vec2f(1.0));let m=l*2.4;var n=f(i+vec2f(m.x,0.0))+f(i-vec2f(m.x,0.0));n+=f(i+vec2f(0.0,m.y))+f(i-vec2f(0.0,m.y));n+=f(i+m)+f(i-m);n+=f(i+vec2f(m.x,-m.y))+f(i+vec2f(-m.x,m.y));j+=n*0.026;let o=smoothstep(0.92,0.20,length(i-0.5)*1.25);j*=0.72+o*0.28;j=d(j);let p=(h(g(vec2u(a.xy)).x)-0.5)/255.0;j+=vec3f(p);return vec4f(pow(max(j,vec3f(0.0)),vec3f(1.0/2.2)),1.0);}fn g(a:vec2u)-> vec2u{var b=a*1664525u+1013904223u;b.x=b.x+b.y*1664525u;b.y=b.y+b.x*1664525u;b=b^(b>> vec2u(16u));b.x=b.x+b.y*1664525u;b.y=b.y+b.x*1664525u;b=b^(b>> vec2u(16u));return b;}fn h(a:u32)-> f32{return f32(a>>8u)*(1.0/16777216.0);}" }, L = (t) => document.querySelector(t), F = (t) => [...document.querySelectorAll(t)], Y = [
  { id: "isometric", code: "ISOMETRIC", label: { zh: "等轴晶体", ja: "等軸晶系", en: "Isometric" }, color: "#8b60c8", shape: "polygon(50% 0,100% 50%,50% 100%,0 50%)", source: "8晶体.stl · CLUSTER 01" },
  { id: "hexagonal", code: "HEXAGONAL", label: { zh: "六方晶体", ja: "六方晶系", en: "Hexagonal" }, color: "#52a9d5", shape: "polygon(25% 7%,75% 7%,100% 50%,75% 93%,25% 93%,0 50%)", source: "8晶体.stl · CLUSTER 02" },
  { id: "tetragonal", code: "TETRAGONAL", label: { zh: "四方晶体", ja: "正方晶系", en: "Tetragonal" }, color: "#4e6fc7", shape: "polygon(16% 0,84% 0,100% 100%,0 100%)", source: "8晶体.stl · CLUSTER 03" },
  { id: "trigonal", code: "TRIGONAL", label: { zh: "三方晶体", ja: "三方晶系", en: "Trigonal" }, color: "#f0c635", shape: "polygon(50% 0,100% 100%,0 100%)", source: "8晶体.stl · CLUSTER 04" },
  { id: "monoclinic", code: "MONOCLINIC", label: { zh: "单斜晶体", ja: "単斜晶系", en: "Monoclinic" }, color: "#d95b5f", shape: "polygon(28% 0,100% 0,72% 100%,0 100%)", source: "8晶体.stl · CLUSTER 05" },
  { id: "orthorhombic", code: "ORTHORHOMBIC", label: { zh: "斜方晶体", ja: "斜方晶系", en: "Orthorhombic" }, color: "#47aa51", shape: "polygon(18% 8%,82% 0,100% 92%,36% 100%,0 60%)", source: "8晶体.stl · CLUSTER 06" },
  { id: "triclinic", code: "TRICLINIC", label: { zh: "三斜晶体", ja: "三斜晶系", en: "Triclinic" }, color: "#9da43e", shape: "polygon(24% 0,100% 24%,76% 100%,0 76%)", source: "8晶体.stl · CLUSTER 07" },
  { id: "source-square", code: "SOURCE SQUARE", label: { zh: "正方源模型", ja: "正方ソース形状", en: "Source Square" }, color: "#a3684f", shape: "polygon(14% 0,86% 0,100% 20%,88% 100%,12% 100%,0 20%)", source: "8晶体.stl · CLUSTER 08" }
], gd = [
  "HEXAGONAL DIAMOND",
  "CARLSBERGITE",
  "BARRINGERITE",
  "OSBORNITE",
  "BREZINAITE",
  "NININGERITE",
  "HEIDEITE",
  "DAUBREELITE",
  "OLDHAMITE",
  "ROEDDERITE",
  "MAJORITE",
  "TRANQUILLITYITE",
  "RINGWOODITE",
  "MERRIHUEITE",
  "YAGIITE",
  "FARRINGTONITE",
  "PANETHITE",
  "BUCHWALDITE",
  "BRIANITE",
  "STANFIELDITE",
  "ORTHOFERROSILITE",
  "BRONZITE",
  "ENSTATITE",
  "PIGEONITE",
  "TITANOFASSAITE",
  "CLINOENSTATITE",
  "OLIVINE",
  "PRIMITIVE ANORTHITE",
  "BYTOWNITE",
  "ALBITE",
  "ANORTHOCLASE",
  "SPINEL",
  "ILMENITE",
  "SPHALERITE",
  "ANATASE",
  "GRAPHITE",
  "GOETHITE",
  "KAMACITE",
  "A—CRISTOBALITE",
  "QUARTZ",
  "CASSIDYITE",
  "WHITLOCKITE",
  "TROILITE",
  "LAWRENCITE",
  "SCHREIBERSITE",
  "COHENITE",
  "GEHLENITE",
  "MERRILLITE",
  "A—MOISSANITE",
  "REEVESITE"
], bd = [
  "六方金刚石",
  "卡尔斯伯格石",
  "巴林格石",
  "奥斯本石",
  "布列齐纳石",
  "宁宁格石",
  "海德石",
  "道布雷石",
  "奥尔德姆石",
  "罗德石",
  "大隅石",
  "宁静海石",
  "林伍德石",
  "梅里休石",
  "八木石",
  "法林顿石",
  "帕内石",
  "布赫瓦尔德石",
  "布里安石",
  "斯坦菲尔德石",
  "斜方铁辉石",
  "古铜辉石",
  "顽火辉石",
  "易变辉石",
  "钛法萨石",
  "斜顽辉石",
  "橄榄石",
  "原始钙长石",
  "倍长石",
  "钠长石",
  "歪长石",
  "尖晶石",
  "钛铁矿",
  "闪锌矿",
  "锐钛矿",
  "石墨",
  "针铁矿",
  "铁纹石",
  "α—方石英",
  "石英",
  "卡西迪石",
  "惠特洛克石",
  "陨硫铁",
  "劳伦石",
  "磷铁镍矿",
  "陨碳铁矿",
  "钙铝黄长石",
  "梅里尔石",
  "α—碳硅石",
  "里夫斯石"
], yd = [1, 0, 1, 0, 4, 0, 4, 0, 0, 1, 0, 1, 0, 1, 1, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 6, 0, 3, 0, 2, 1, 4, 0, 2, 1, 3, 3, 1, 3, 2, 4, 0, 1, 1, 3], Rr = [
  "#777777",
  "#8f55bd",
  "#5e9fd7",
  "#f2c42f",
  "#a56b58",
  "#717171",
  "#e6e6e2",
  "#262626",
  "#aa614b",
  "#8a8a88",
  "#8b56bc",
  "#a94a27",
  "#5597d1",
  "#58b4ba",
  "#aaa9a4",
  "#e1ded9",
  "#f2c334",
  "#dad7d2",
  "#302f2f",
  "#ee5c5e",
  "#174f2a",
  "#616424",
  "#858585",
  "#191919",
  "#164f2d",
  "#8fd21b",
  "#3e7930",
  "#d27480",
  "#a4d72f",
  "#858585",
  "#d9d6d0",
  "#8bd52e",
  "#252525",
  "#f0cf35",
  "#4259b5",
  "#201919",
  "#512112",
  "#2c2723",
  "#ed5859",
  "#8b8b88",
  "#38a84b",
  "#7c7c79",
  "#a5452e",
  "#38a847",
  "#d9d6cf",
  "#d6d3cd",
  "#7b7b79",
  "#e8e5df",
  "#35ae42",
  "#dce838"
];
function xd(t) {
  let e = 0, n = 0, r = 0;
  t < 440 ? (e = (440 - t) / 60, r = 1) : t < 490 ? (n = (t - 440) / 50, r = 1) : t < 510 ? (n = 1, r = (510 - t) / 20) : t < 580 ? (e = (t - 510) / 70, n = 1) : t < 645 ? (e = 1, n = (645 - t) / 65) : e = 1;
  const i = t < 420 ? 0.3 + 0.7 * (t - 380) / 40 : t > 700 ? 0.3 + 0.7 * (720 - t) / 20 : 1, s = 0.8;
  return [Math.pow(Math.max(0, e * i), s), Math.pow(Math.max(0, n * i), s), Math.pow(Math.max(0, r * i), s)];
}
function Yi(t) {
  const [e, n, r] = Ge(t), i = Math.max(e, n, r), s = Math.min(e, n, r), a = i <= 1e-3 ? 0 : (i - s) / i;
  if (a < 0.12) return { wavelength: 560, purity: 0 };
  const o = [e / i, n / i, r / i];
  let c = 560, l = Number.POSITIVE_INFINITY;
  for (let d = 380; d <= 720; d += 1) {
    const u = xd(d), p = Math.max(...u) || 1, m = u.reduce((b, g, $) => b + Math.pow(g / p - o[$], 2), 0);
    m < l && (l = m, c = d);
  }
  return { wavelength: c, purity: Math.min(1, Math.max(0, a)) };
}
const D = gd.map((t, e) => {
  const n = Yi(Rr[e]);
  return {
    name: t,
    cn: bd[e],
    type: yd[e],
    color: Rr[e],
    wavelength: n.wavelength,
    spectralPurity: n.purity,
    transmission: 0.34 + e * 17 % 55 / 100,
    ior: 1.28 + e * 13 % 70 / 100,
    dispersion: 0.12 + e * 19 % 66 / 100
  };
}), Ae = {
  zh: { brand: "新-天象图库", modeSample: "样本", modeComposition: "成分", modeSpectrum: "光谱", modeCrystal: "晶系", modeCompare: "对照", camera: "视角", layers: "图层", explain: "解读", filter: "筛选", language: "语言", size: "尺寸", data: "资料", scale: "观察尺度", cosmic: "宇宙", earth: "地球", material: "物质", headline: "把陨石继续放大<br>直到看见晶体", intro: "颜色、晶系与透光不是装饰，它们共同组成一块陨石的微观档案。", dragHint: "拖动旋转 · 滚轮推进 · 点击外环切换矿物", selected: "当前选中", system: "晶体类别", color: "海报色相", transmission: "透光率", refraction: "折射率", simulationNote: "透光率、折射率及代表波长为网页视觉模拟参数，不作为矿物学测量数据。", pin: "固定到对照", optics: "光学模拟", dispersion: "色散", wavelength: "代表波长", compare: "对照", reset: "复位", cameraLead: "不同视角对应不同的晶面阅读方式。", layersLead: "把海报中的视觉变量拆开，单独阅读。", layerRing: "矿物外环", layerGrid: "晶格坐标", layerLabels: "文字标记", layerOptics: "光学色散", explainLead: "原海报负责看见整体；网页负责进入单个晶体并比较它们。", posterCaption: "陨石成分图 / 原始海报比例 3508 × 4962", explainIconTitle: "外环图标", explainIcon: "每个几何图标代表一种陨石矿物；点击后把对应色相、晶体形态和光学参数送入中央模型。", explainColorTitle: "色相与代表波长", explainColor: "无法为每种矿物指定一个固定可见波长；网页把原稿色相匹配为代表波长和色纯度，用于驱动光束与粒子，不改变矿物身份。", explainCoreTitle: "中央晶体", explainCore: "中央展示直接读取 8晶体.stl，并按模型在文件中的空间位置拆成八个真实网格；透明、折射与色散由网页材质实时计算。", explainBoundaryTitle: "数据边界", explainBoundary: "矿物真实光学特征是随波长变化的完整光谱。本页的透光、折射、色散与代表波长均为视觉模拟，不是矿物学实测数据库。", catalogCaption: "平面晶体图标与英文名称对照", filterLead: "按八类源模型或海报色系缩小外环目录。", showAll: "显示全部 / SHOW ALL", sizeLead: "只改变界面信息，不缩放中央晶体。", dataLead: "唯一三维模型源为 8晶体.stl；网页将其中八个空间分组对应到海报的八类晶体。" },
  ja: { brand: "新・天象図庫", modeSample: "標本", modeComposition: "成分", modeSpectrum: "スペクトル", modeCrystal: "晶系", modeCompare: "比較", camera: "視角", layers: "レイヤー", explain: "解説", filter: "選別", language: "言語", size: "サイズ", data: "資料", scale: "観測スケール", cosmic: "宇宙", earth: "地球", material: "物質", headline: "隕石をさらに拡大し<br>結晶まで観察する", intro: "色、晶系、透過性は装飾ではなく、隕石の微視的アーカイブを構成します。", dragHint: "ドラッグで回転 · ホイールで接近 · 外周から鉱物を選択", selected: "選択中", system: "結晶形状", color: "ポスター色", transmission: "透過率", refraction: "屈折率", simulationNote: "透過率と屈折率は視覚シミュレーション用で、鉱物学的な実測値ではありません。", pin: "比較に固定", optics: "光学シミュレーション", dispersion: "分散", wavelength: "波長", compare: "比較", reset: "リセット", cameraLead: "視点ごとに異なる結晶面の読み方を示します。", layersLead: "ポスターの視覚変数を分解して個別に読みます。", layerRing: "鉱物リング", layerGrid: "結晶格子", layerLabels: "ラベル", layerOptics: "光学分散", explainLead: "原ポスターは全体を見せ、ウェブは個別の結晶と比較へ入ります。", posterCaption: "隕石成分図 / 原ポスター比率 3508 × 4962", explainIconTitle: "外周アイコン", explainIcon: "各アイコンは隕石鉱物を表し、選択すると色、形状、光学パラメータが中央モデルへ反映されます。", explainColorTitle: "連続色環", explainColor: "色相は原稿の分類変数です。波長操作は照明応答を変えますが、鉱物の同一性は変えません。", explainCoreTitle: "中央結晶", explainCore: "中央表示は 8晶体.stl を直接読み込み、ファイル内の位置から8つの実メッシュへ分割します。透過・屈折・分散はウェブでリアルタイム計算します。", explainBoundaryTitle: "データ境界", explainBoundary: "透過・屈折・分散は視覚シミュレーションであり、鉱物学的な実測データではありません。", catalogCaption: "平面結晶アイコンと英語名の対応", filterLead: "8つの形状またはポスター色から外周を絞り込みます。", showAll: "すべて表示 / SHOW ALL", sizeLead: "中央結晶を変えず、UI情報だけを拡大します。", dataLead: "唯一の3Dモデルソースは 8晶体.stl。内部の8グループをポスターの8結晶形に対応させます。" },
  en: { brand: "NEW CELESTIAL ARCHIVE", modeSample: "Sample", modeComposition: "Composition", modeSpectrum: "Spectrum", modeCrystal: "Crystal", modeCompare: "Compare", camera: "Camera", layers: "Layers", explain: "Explain", filter: "Filter", language: "Language", size: "UI Size", data: "Data", scale: "Observation Scale", cosmic: "Cosmic", earth: "Earth", material: "Material", headline: "Magnify the meteorite<br>until crystals appear", intro: "Color, crystal form and transmission are not decoration; together they form a microscopic material archive.", dragHint: "Drag to rotate · Wheel to move · Select a mineral on the ring", selected: "Selected", system: "Crystal form", color: "Poster color", transmission: "Transmission", refraction: "Refraction", simulationNote: "Transmission and refraction are visual simulation parameters, not mineralogical measurements.", pin: "Pin to compare", optics: "Optical simulation", dispersion: "Dispersion", wavelength: "Wavelength", compare: "Compare", reset: "Reset", cameraLead: "Each camera preset reveals a different way to read the crystal facets.", layersLead: "Separate the poster's visual variables and read them independently.", layerRing: "Mineral ring", layerGrid: "Lattice grid", layerLabels: "Labels", layerOptics: "Optical dispersion", explainLead: "The poster shows the whole; the web page enters and compares individual crystals.", posterCaption: "Meteorite composition / original poster ratio 3508 × 4962", explainIconTitle: "Outer icons", explainIcon: "Each geometric icon represents a meteorite mineral. Selecting it sends its hue, form and optical parameters to the central model.", explainColorTitle: "Continuous color ring", explainColor: "Hue is a classification variable from the poster. Wavelength changes lighting response without changing mineral identity.", explainCoreTitle: "Central crystal", explainCore: "The center reads 8晶体.stl directly and separates its eight spatial groups into real meshes. Transmission, refraction and dispersion are rendered live.", explainBoundaryTitle: "Data boundary", explainBoundary: "Transmission, refraction and dispersion are visual simulations, not mineralogical measurements.", catalogCaption: "Flat crystal icons and English-name reference", filterLead: "Filter the outer ring by one of eight source forms.", showAll: "Show all", sizeLead: "Change interface scale without resizing the central crystal.", dataLead: "The only 3D source is 8晶体.stl; its eight spatial groups map to the poster's eight crystal forms." }
};
Object.assign(Ae.zh, {
  collapsePanels: "收起两侧",
  layerRays: "射线",
  layerLight: "光源",
  layerGlobal: "全局灯",
  layerPaper: "白纸背景",
  explainCore: "中央展示直接读取 8晶体.stl，并按模型在文件中的空间位置拆成八个真实网格；透明、折射与色散由网页材质实时计算。",
  dataLead: "唯一三维模型源为 8晶体.stl；网页将其中八个空间分组对应到海报的八类晶体。",
  wavelength: "代表波长",
  simulationNote: "透光率、折射率及代表波长为网页视觉模拟参数，不作为矿物学测量数据。",
  explainColorTitle: "色相与代表波长",
  explainColor: "无法为每种矿物指定一个固定可见波长；网页把原稿色相匹配为代表波长和色纯度，用于驱动光束与粒子，不改变矿物身份。",
  explainBoundary: "矿物真实光学特征是随波长变化的完整光谱。本页的透光、折射、色散与代表波长均为视觉模拟，不是矿物学实测数据库。"
});
Object.assign(Ae.ja, {
  collapsePanels: "両側を閉じる",
  layerRays: "光線",
  layerLight: "光源",
  layerGlobal: "全体照明",
  layerPaper: "白い紙",
  explainCore: "中央表示は 8晶体.stl を直接読み込み、ファイル内の位置から8つの実メッシュへ分割します。透過・屈折・分散はウェブでリアルタイム計算します。",
  dataLead: "唯一の3Dモデルソースは 8晶体.stl。内部の8グループをポスターの8結晶形に対応させます。",
  wavelength: "代表波長",
  simulationNote: "透過率・屈折率・代表波長は視覚シミュレーション用で、鉱物学的な実測値ではありません。",
  explainColorTitle: "色相と代表波長",
  explainColor: "鉱物ごとに固定された可視波長はありません。原稿色から代表波長と色純度を対応させ、光線と粒子の色を制御します。",
  explainBoundary: "実際の鉱物光学は波長ごとに変化するスペクトルです。本ページの光学値と代表波長は視覚シミュレーションです。"
});
Object.assign(Ae.en, {
  collapsePanels: "Collapse sides",
  layerRays: "Rays",
  layerLight: "Light source",
  layerGlobal: "Global light",
  layerPaper: "White paper",
  explainCore: "The center reads 8晶体.stl directly and separates its eight spatial groups into real meshes. Transmission, refraction and dispersion are rendered live.",
  dataLead: "The only 3D source is 8晶体.stl; its eight spatial groups map to the poster's eight crystal forms.",
  wavelength: "Mapped wavelength",
  simulationNote: "Transmission, refraction and mapped wavelength are visual simulation parameters, not mineralogical measurements.",
  explainColorTitle: "Hue and mapped wavelength",
  explainColor: "Minerals do not have one fixed visible wavelength. Poster hue is mapped to a representative wavelength and color purity that drive the beam and particles.",
  explainBoundary: "Real mineral optics are spectra that vary with wavelength. Optical values and mapped wavelength on this page are visual simulations, not measured mineral data."
});
const wd = {
  zh: { sampleTitle: "真实样本", sampleBody: "当前矿物使用对应的 STL 晶体网格，拖动观察晶面，滚轮改变距离。", compositionTitle: "成分关系", compositionBody: "相同晶系的矿物被归为一组；颜色来自原海报的分类色相。", spectrumTitle: "光谱响应", spectrumBody: "波长与色散共同改变穿过晶体的光，不改变矿物名称和类别。", crystalTitle: "八个 STL 网格", crystalBody: "点击下方任一网格，直接切换 8晶体.stl 中对应的空间分组。", compareTitle: "并置比较", compareBody: "左侧为当前选择，右侧为已固定样本；两者使用同一个画外光源。", triangles: "三角面", sameType: "同晶系", source: "模型源", slotA: "当前 A", slotB: "固定 B", loading: "正在解析 STL…" },
  ja: { sampleTitle: "実メッシュ標本", sampleBody: "STLの実形状をドラッグして結晶面を観察し、ホイールで距離を変えます。", compositionTitle: "成分関係", compositionBody: "同じ晶系の鉱物をまとめ、原ポスターの色相で分類します。", spectrumTitle: "スペクトル応答", spectrumBody: "波長と分散が透過光を変えますが、鉱物の同一性は変えません。", crystalTitle: "8つのSTLメッシュ", crystalBody: "8晶体.stl 内の空間グループを選択します。", compareTitle: "並置比較", compareBody: "左は現在、右は固定標本。同じ画面外光源で比較します。", triangles: "三角面", sameType: "同晶系", source: "ソース", slotA: "現在 A", slotB: "固定 B", loading: "STLを解析中…" },
  en: { sampleTitle: "Real mesh sample", sampleBody: "The current mineral uses its STL mesh. Drag to inspect facets; use the wheel to change distance.", compositionTitle: "Composition relation", compositionBody: "Minerals sharing a crystal form are grouped; color comes from the poster taxonomy.", spectrumTitle: "Spectral response", spectrumBody: "Wavelength and dispersion alter transmitted light without changing mineral identity.", crystalTitle: "Eight STL meshes", crystalBody: "Choose one spatial cluster parsed from 8晶体.stl.", compareTitle: "Side-by-side", compareBody: "Current and pinned samples share one offscreen light.", triangles: "Triangles", sameType: "Same form", source: "Source", slotA: "Current A", slotB: "Pinned B", loading: "Parsing STL…" }
}, Xi = {
  sample: { zh: "01 SAMPLE / 单体材质观察", ja: "01 SAMPLE / 単体材料観察", en: "01 SAMPLE / SINGLE MATERIAL" },
  composition: { zh: "02 COMPOSITION / 成分关系拆解", ja: "02 COMPOSITION / 成分分解", en: "02 COMPOSITION / MATERIAL RELATIONS" },
  spectrum: { zh: "03 SPECTRUM / 波长与色相响应", ja: "03 SPECTRUM / 波長応答", en: "03 SPECTRUM / WAVELENGTH RESPONSE" },
  crystal: { zh: "04 CRYSTAL / 八类源模型", ja: "04 CRYSTAL / 8つの形状", en: "04 CRYSTAL / EIGHT SOURCE FORMS" },
  compare: { zh: "05 COMPARE / 并置比较", ja: "05 COMPARE / 並置比較", en: "05 COMPARE / SIDE-BY-SIDE" }
}, Ce = L("#crystalCanvas"), H = 34, f = {
  selected: H,
  typeIndex: D[H].type,
  typeSelection: !1,
  color: Ge(D[H].color),
  transmission: D[H].transmission,
  ior: D[H].ior,
  dispersion: D[H].dispersion,
  wavelength: D[H].wavelength,
  spectralPurity: D[H].spectralPurity,
  pointer: [-0.12, 0.16],
  lightPointer: [0, 0],
  zoom: 1,
  autoRotate: 1,
  raysEnabled: 1,
  lightVisible: 1,
  globalLight: 0,
  paperBackground: 0,
  focusMode: !1,
  modeIndex: 0,
  pinned: 0,
  lang: localStorage.getItem("nca-lang") || "zh",
  size: localStorage.getItem("nca-ui-size") || "fine"
};
let mn = () => {
}, Ct = 0, Dr = 0, q = [], $e = 0, Ji = 0, Kt = 0, Yt = 0, Xt = 0;
function Ge(t) {
  const e = t.replace("#", "");
  return [parseInt(e.slice(0, 2), 16) / 255, parseInt(e.slice(2, 4), 16) / 255, parseInt(e.slice(4, 6), 16) / 255];
}
function vd(t) {
  return Y[t].shape;
}
function Sd() {
  const t = L("#typeRail"), e = L("#filterTypes");
  Y.forEach((n, r) => {
    const i = document.createElement("button");
    i.className = "type-button", i.dataset.type = String(r), i.style.setProperty("--type-color", n.color), i.style.setProperty("--shape", n.shape), i.innerHTML = `<i class="mini-glyph"></i><b>${n.label[f.lang]}</b><small>${String(r + 1).padStart(2, "0")} · ${n.code}</small>`, i.addEventListener("click", () => es(r)), t.append(i);
    const s = document.createElement("button");
    s.dataset.filterType = String(r), s.innerHTML = `<b>${String(r + 1).padStart(2, "0")} ${n.label[f.lang]}</b><small>${n.code}</small>`, s.addEventListener("click", () => Td(r, s)), e.append(s);
  });
}
function Ed() {
  const t = L("#mineralRing");
  D.forEach((e, n) => {
    const r = -90 + n * (360 / D.length), i = r * Math.PI / 180, s = document.createElement("button"), a = Math.cos(i) < -0.15 ? " label-left" : " label-right", o = Math.sin(i) < -0.72 ? " label-top" : Math.sin(i) > 0.72 ? " label-bottom" : "";
    s.className = `mineral-node${n % 4 === 0 ? " major" : ""}${a}${o}`, s.dataset.index = String(n), s.dataset.type = String(e.type), s.dataset.label = `${e.name} · ${e.cn}`, s.title = `${e.name} / ${e.cn}`, s.setAttribute("aria-label", `${e.name} / ${e.cn}`), s.style.setProperty("--x", `${50 + Math.cos(i) * 50}%`), s.style.setProperty("--y", `${50 + Math.sin(i) * 50}%`), s.style.setProperty("--r", `${r + 90}deg`), s.style.setProperty("--node-color", e.color), s.style.setProperty("--shape", vd(e.type)), s.innerHTML = "<i></i>", s.addEventListener("click", () => gn(n)), t.append(s);
  });
}
function ge() {
  const t = L("#crystalLab"), e = L("#mineralRing"), n = document.querySelector(".ring-scale"), r = document.querySelector(".topbar"), i = document.querySelector(".control-deck");
  if (!n || !r || !i) return;
  const s = t.getBoundingClientRect(), a = r.getBoundingClientRect(), o = i.getBoundingClientRect(), c = Math.max(s.top, a.bottom + 30), l = Math.min(s.bottom, o.top - 30), d = Math.max(260, l - c), u = Math.max(240, Math.min(700, s.width - 48, d - 58)), p = (c + l) / 2 - s.top;
  [e, n].forEach((m) => {
    m.style.width = `${u}px`, m.style.top = `${p}px`, m.style.transform = "translate(-50%,-50%)";
  });
}
function Qi() {
  cancelAnimationFrame(Kt), Ce.style.removeProperty("width"), Ce.style.removeProperty("height"), Kt = requestAnimationFrame(() => {
    ge();
  });
}
function Zi(t = 480) {
  window.clearTimeout(Yt), Yt = window.setTimeout(() => {
    !document.hidden && document.body.dataset.render === "webgpu" && ns();
  }, t);
}
function es(t) {
  const e = D.findIndex((r) => r.type === t);
  if (e >= 0) {
    const r = D[e];
    f.selected = e, f.transmission = Math.max(0.68, r.transmission), f.ior = Math.max(1.42, r.ior), f.dispersion = Math.max(0.24, r.dispersion);
  } else
    f.transmission = 0.68, f.ior = 1.52, f.dispersion = 0.28;
  f.typeSelection = !0, f.typeIndex = t, f.color = Ge(Y[t].color);
  const n = Yi(Y[t].color);
  f.wavelength = n.wavelength, f.spectralPurity = n.purity, F(".mineral-node").forEach((r) => r.classList.remove("active")), F(".type-button").forEach((r) => r.classList.toggle("active", Number(r.dataset.type) === t)), bn(), Xe(), N();
}
function gn(t, e = !1) {
  const n = D[t];
  f.selected = t, f.typeSelection = !1, f.typeIndex = n.type, f.color = Ge(n.color), e || (f.transmission = n.transmission, f.ior = n.ior, f.dispersion = n.dispersion, f.wavelength = n.wavelength, f.spectralPurity = n.spectralPurity), F(".mineral-node").forEach((r) => r.classList.toggle("active", Number(r.dataset.index) === t)), F(".type-button").forEach((r) => r.classList.toggle("active", Number(r.dataset.type) === n.type)), bn(), Xe(), N();
}
function bn() {
  const t = D[f.selected], e = Y[f.typeIndex];
  L("#mineralNumber").textContent = f.typeSelection ? `STL ${String(f.typeIndex + 1).padStart(2, "0")} / 08` : `${String(f.selected + 1).padStart(2, "0")} / ${D.length}`, L("#mineralName").textContent = f.typeSelection ? e.code : t.name, L("#mineralCn").textContent = f.typeSelection ? e.label[f.lang] : f.lang === "en" ? e.code : t.cn, L("#specSystem").textContent = e.label[f.lang], L("#specColor").textContent = (f.typeSelection ? e.color : t.color).toUpperCase(), L("#specTransmission").textContent = `${Math.round(f.transmission * 100)}%`, L("#specIor").textContent = f.ior.toFixed(2), L("#activeTypeName").textContent = e.label[f.lang], L("#activeTypeCode").textContent = `${e.code} · STL ${String(f.typeIndex + 1).padStart(2, "0")}`, Fe();
}
function Fe() {
  const t = document.querySelector("#modeDetail");
  if (!t) return;
  const e = wd[f.lang], n = D[f.selected], r = Y[f.typeIndex], i = q[f.typeIndex], s = i ? i.triangleCount.toLocaleString() : e.loading, a = document.body.dataset.mode || "sample";
  if (a === "composition") {
    const o = D.filter((l) => l.type === f.typeIndex), c = f.typeSelection ? r.color : n.color;
    t.innerHTML = `<div class="mode-summary"><small>02 / COMPOSITION</small><b>${e.compositionTitle}</b><p>${e.compositionBody}</p></div><div class="mode-kpis"><span><small>${e.sameType}</small><b>${o.length}</b></span><span><small>POSTER HUE</small><b style="color:${c}">${c.toUpperCase()}</b></span></div><div class="mode-tags">${o.slice(0, 7).map((l) => `<span>${l.name}</span>`).join("") || "<span>SOURCE-ONLY STL FORM</span>"}</div>`;
  } else if (a === "spectrum") {
    const o = (f.wavelength - 380) / 340 * 100;
    t.innerHTML = `<div class="mode-summary"><small>03 / SPECTRUM</small><b>${e.spectrumTitle}</b><p>${e.spectrumBody}</p></div><div class="spectrum-viz"><i style="left:${o}%"></i></div><div class="mode-kpis"><span><small>POSTER-MAPPED WAVELENGTH</small><b>${Math.round(f.wavelength)} nm</b></span><span><small>COLOR PURITY / DISPERSION</small><b>${Math.round(f.spectralPurity * 100)}% · ${f.dispersion.toFixed(2)}</b></span></div>`;
  } else if (a === "crystal")
    t.innerHTML = `<div class="mode-summary"><small>04 / CRYSTAL</small><b>${e.crystalTitle}</b><p>${e.crystalBody}</p></div><div class="mode-mesh-grid">${Y.map((o, c) => `<button class="${c === f.typeIndex ? "active" : ""}" data-mode-type="${c}" style="--mesh-color:${o.color}" aria-label="STL ${String(c + 1).padStart(2, "0")} · ${o.code}"><i style="--shape:${o.shape}"></i><span>${String(c + 1).padStart(2, "0")}</span><small>${o.code}<br>${q[c]?.triangleCount.toLocaleString() || "—"}</small></button>`).join("")}</div>`;
  else if (a === "compare") {
    const o = D[f.pinned];
    t.innerHTML = `<div class="mode-summary"><small>05 / COMPARE</small><b>${e.compareTitle}</b><p>${e.compareBody}</p></div><div class="compare-grid"><div><small>${e.slotA}</small><b>${f.typeSelection ? r.code : n.name}</b><span>${r.code} · ${Math.round(f.transmission * 100)}%</span></div><div><small>${e.slotB}</small><b>${o.name}</b><span>${Y[o.type].code} · ${Math.round(o.transmission * 100)}%</span></div></div>`;
  } else
    t.innerHTML = `<div class="mode-summary"><small>01 / SAMPLE</small><b>${e.sampleTitle}</b><p>${e.sampleBody}</p></div><div class="mode-kpis"><span><small>${e.triangles}</small><b>${s}</b></span><span><small>${e.source}</small><b>STL ${String(f.typeIndex + 1).padStart(2, "0")}</b></span></div>`;
}
function Xe() {
  const t = L("#transmissionRange"), e = L("#iorRange"), n = L("#dispersionRange"), r = L("#wavelengthRange");
  t.value = String(Math.round(f.transmission * 100)), e.value = String(Math.round(f.ior * 100)), n.value = String(Math.round(f.dispersion * 100)), r.value = String(Math.round(f.wavelength)), L("#transmissionOut").textContent = `${t.value}%`, L("#iorOut").textContent = (Number(e.value) / 100).toFixed(2), L("#dispersionOut").textContent = (Number(n.value) / 100).toFixed(2), L("#wavelengthOut").textContent = `${Math.round(f.wavelength)} nm`, L("#specTransmission").textContent = `${t.value}%`, L("#specIor").textContent = (Number(e.value) / 100).toFixed(2);
}
function N() {
  mn({
    typeIndex: f.typeIndex,
    pointer: f.pointer,
    color: f.color,
    transmission: f.transmission,
    ior: f.ior,
    dispersion: f.dispersion,
    wavelength: f.wavelength,
    spectralPurity: f.spectralPurity,
    zoom: f.zoom,
    autoRotate: f.autoRotate,
    raysEnabled: f.raysEnabled,
    modeIndex: f.modeIndex
  });
}
function Td(t, e) {
  const n = e.classList.contains("active");
  F("#filterTypes button").forEach((r) => r.classList.remove("active")), F(".mineral-node").forEach((r) => r.classList.remove("filtered-out")), !n && (e.classList.add("active"), F(".mineral-node").forEach((r) => r.classList.toggle("filtered-out", Number(r.dataset.type) !== t)));
}
function Ut(t) {
  const e = F("#modeNav button"), n = e.findIndex((r) => r.dataset.mode === t);
  f.modeIndex = Math.max(0, n), document.body.dataset.mode = t, e.forEach((r) => r.classList.toggle("active", r.dataset.mode === t)), L("#modeCaption").textContent = Xi[t][f.lang], t === "spectrum" && (f.dispersion = Math.max(f.dispersion, 0.58)), t === "crystal" && (f.transmission = Math.max(f.transmission, 0.62)), Xe(), Fe(), N();
}
function ts(t) {
  f.lang = t, localStorage.setItem("nca-lang", t), document.documentElement.lang = t === "zh" ? "zh-CN" : t, F("[data-i18n]").forEach((n) => {
    const r = n.dataset.i18n;
    Ae[t][r] && (n.innerHTML = Ae[t][r]);
  }), F("#languageSet button").forEach((n) => n.classList.toggle("active", n.dataset.lang === t)), F(".type-button").forEach((n, r) => {
    const i = n.querySelector("b");
    i && (i.textContent = Y[r].label[t]);
  }), F("#filterTypes button").forEach((n, r) => {
    const i = n.querySelector("b");
    i && (i.textContent = `${String(r + 1).padStart(2, "0")} ${Y[r].label[t]}`);
  });
  const e = document.body.dataset.mode || "sample";
  L("#modeCaption").textContent = Xi[e][t], f.focusMode && (L("#focusToggle [data-i18n='collapsePanels']").textContent = t === "zh" ? "展开两侧" : t === "ja" ? "両側を開く" : "Expand sides"), bn(), Fe();
}
function Id() {
  F("#modeNav button").forEach((o) => o.addEventListener("click", () => Ut(o.dataset.mode))), F(".top-tools button[data-panel]").forEach((o) => o.addEventListener("click", () => Cd(o.dataset.panel))), F("[data-close]").forEach((o) => o.addEventListener("click", () => o.closest(".drawer")?.classList.remove("open"))), F("#languageSet button").forEach((o) => o.addEventListener("click", () => ts(o.dataset.lang))), F("#sizeSet button").forEach((o) => o.addEventListener("click", () => {
    f.size = o.dataset.size, localStorage.setItem("nca-ui-size", f.size), document.body.dataset.uiSize = f.size, F("#sizeSet button").forEach((c) => c.classList.toggle("active", c === o)), requestAnimationFrame(ge);
  })), F("#cameraPresets button").forEach((o) => o.addEventListener("click", () => {
    const c = o.dataset.camera, l = c === "front" ? [0, 0, 1] : c === "edge" ? [0.76, -0.18, 1.03] : c === "macro" ? [-0.32, 0.24, 1.32] : [-0.12, 0.16, 1];
    f.pointer = [l[0], l[1]], f.zoom = l[2], N(), F("#cameraPresets button").forEach((d) => d.classList.toggle("active", d === o));
  })), L("#focusToggle").addEventListener("click", () => {
    f.focusMode = !f.focusMode, document.body.classList.toggle("focus-mode", f.focusMode), L("#focusToggle").setAttribute("aria-expanded", String(!f.focusMode));
    const o = L("#focusToggle [data-i18n='collapsePanels']");
    o.textContent = f.focusMode ? f.lang === "zh" ? "展开两侧" : f.lang === "ja" ? "両側を開く" : "Expand sides" : Ae[f.lang].collapsePanels, requestAnimationFrame(() => {
      ge(), Qi();
    }), Nt(f.focusMode ? "FOCUS · PANELS COLLAPSED" : "PANELS · RESTORED");
  }), F("#layerSet button").forEach((o) => o.addEventListener("click", () => {
    o.classList.toggle("active");
    const c = o.dataset.layer;
    document.body.classList.toggle(`hide-${c}`, !o.classList.contains("active")), c === "rays" && (f.raysEnabled = o.classList.contains("active") ? 1 : 0, N()), c === "light" && (f.lightVisible = o.classList.contains("active") ? 1 : 0, N()), c === "global-light" && (f.globalLight = o.classList.contains("active") ? 1 : 0, document.body.classList.toggle("global-light", f.globalLight > 0), N()), c === "paper" && (f.paperBackground = o.classList.contains("active") ? 1 : 0, document.body.classList.toggle("paper-background", f.paperBackground > 0), N());
  })), L("#clearFilter").addEventListener("click", () => {
    F("#filterTypes button").forEach((o) => o.classList.remove("active")), F(".mineral-node").forEach((o) => o.classList.remove("filtered-out"));
  }), L("#playBtn").addEventListener("click", () => {
    f.autoRotate = f.autoRotate > 0 ? 0 : 1, L("#playBtn").classList.toggle("active", f.autoRotate > 0), L("#playBtn b").textContent = f.autoRotate > 0 ? "Ⅱ" : "▶", N();
  }), L("#resetBtn").addEventListener("click", () => {
    f.pointer = [-0.12, 0.16], f.lightPointer = [0, 0], f.zoom = 1, gn(H), Xe(), Nt("RESET · ANATASE");
  }), L("#pinBtn").addEventListener("click", () => {
    f.pinned = f.selected, Nt(`${D[f.selected].name} · PINNED`), Ut("compare");
  }), L("#compareBtn").addEventListener("click", () => Ut("compare")), L("#modeDetail").addEventListener("click", (o) => {
    const c = o.target.closest("[data-mode-type]");
    c && es(Number(c.dataset.modeType));
  }), [
    ["#transmissionRange", (o) => f.transmission = o / 100],
    ["#iorRange", (o) => f.ior = o / 100],
    ["#dispersionRange", (o) => f.dispersion = o / 100],
    ["#wavelengthRange", (o) => {
      f.wavelength = o, f.spectralPurity = 1;
    }]
  ].forEach(([o, c]) => L(o).addEventListener("input", (l) => {
    c(Number(l.target.value)), Xe(), Fe(), N();
  }));
  const e = L("#crystalLab");
  let n = !1, r = 0, i = 0;
  const s = () => {
    n = !1, document.body.classList.remove("crystal-dragging"), e.classList.remove("is-dragging");
  };
  e.addEventListener("selectstart", (o) => o.preventDefault()), e.addEventListener("pointerdown", (o) => {
    o.target.closest(".ui,button,input,label,a") || (o.preventDefault(), document.getSelection()?.removeAllRanges(), n = !0, document.body.classList.add("crystal-dragging"), e.classList.add("is-dragging"), r = o.clientX, i = o.clientY, e.setPointerCapture(o.pointerId));
  }), e.addEventListener("pointermove", (o) => {
    const c = e.getBoundingClientRect();
    f.lightPointer = [
      Math.max(-1, Math.min(1, (o.clientX - c.left) / Math.max(1, c.width) * 2 - 1)),
      Math.max(-1, Math.min(1, 1 - (o.clientY - c.top) / Math.max(1, c.height) * 2))
    ], n && (o.preventDefault(), f.pointer[0] += (o.clientX - r) / 360, f.pointer[1] += (o.clientY - i) / 360, f.pointer[1] = Math.max(-0.7, Math.min(0.7, f.pointer[1])), r = o.clientX, i = o.clientY, N());
  }), e.addEventListener("pointerup", s), e.addEventListener("pointercancel", s), e.addEventListener("lostpointercapture", s), e.addEventListener("wheel", (o) => {
    o.preventDefault(), f.zoom = Math.max(0.72, Math.min(1.42, f.zoom - o.deltaY * 65e-5)), N();
  }, { passive: !1 });
  const a = new ResizeObserver(ge);
  a.observe(e), a.observe(L(".topbar")), a.observe(L(".control-deck")), addEventListener("resize", () => {
    ge(), Zi();
  }), document.addEventListener("keydown", (o) => {
    o.key === "Escape" && F(".drawer.open").forEach((c) => c.classList.remove("open"));
  }), document.addEventListener("dragstart", (o) => o.preventDefault());
}
function Cd(t) {
  const e = L(`[data-drawer="${t}"]`), n = !e.classList.contains("open");
  F(".drawer.open").forEach((r) => r.classList.remove("open")), F(".top-tools button").forEach((r) => r.classList.remove("active")), n && (e.classList.add("open"), L(`.top-tools button[data-panel="${t}"]`).classList.add("active"));
}
function Nt(t) {
  const e = L("#toast");
  e.textContent = t, e.classList.add("visible"), window.clearTimeout(Dr), Dr = window.setTimeout(() => e.classList.remove("visible"), 1800);
}
async function Gr() {
  const t = await fetch("models/8-crystals.stl?v=material-r14-20260831");
  if (!t.ok) throw new Error(`STL ${t.status}`);
  const e = await t.arrayBuffer(), n = new DataView(e);
  if (e.byteLength < 84) throw new Error("STL header is incomplete");
  const r = n.getUint32(80, !0);
  if (84 + r * 50 > e.byteLength) throw new Error("STL triangle table is incomplete");
  const i = new Array(r);
  for (let d = 0; d < r; d++) {
    const u = 84 + d * 50 + 12, p = (n.getFloat32(u, !0) + n.getFloat32(u + 12, !0) + n.getFloat32(u + 24, !0)) / 3;
    i[d] = { triangle: d, x: p };
  }
  const s = i.slice().sort((d, u) => d.x - u.x), a = s.slice(1).map((d, u) => ({ index: u + 1, size: d.x - s[u].x })).sort((d, u) => u.size - d.size).slice(0, 7).sort((d, u) => d.index - u.index);
  if (a.length !== 7) throw new Error("STL does not contain eight spatial clusters");
  const o = a.map((d) => (s[d.index - 1].x + s[d.index].x) / 2), c = Array.from({ length: 8 }, () => []);
  return i.forEach(({ triangle: d, x: u }) => {
    let p = 0;
    for (; p < o.length && u > o[p]; ) p++;
    c[p].push(d);
  }), c.map((d, u) => {
    if (!d.length) throw new Error(`STL cluster ${u + 1} is empty`);
    const p = [1 / 0, 1 / 0, 1 / 0], m = [-1 / 0, -1 / 0, -1 / 0];
    d.forEach((S) => {
      const E = 84 + S * 50 + 12;
      for (let C = 0; C < 3; C++) for (let T = 0; T < 3; T++) {
        const P = n.getFloat32(E + C * 12 + T * 4, !0);
        p[T] = Math.min(p[T], P), m[T] = Math.max(m[T], P);
      }
    });
    const b = p.map((S, E) => (S + m[E]) / 2), g = m.map((S, E) => S - p[E]), $ = 2.05 / Math.max(...g), w = new Float32Array(d.length * 18);
    let y = 0;
    return d.forEach((S) => {
      const E = 84 + S * 50;
      let C = n.getFloat32(E, !0), T = n.getFloat32(E + 4, !0), P = n.getFloat32(E + 8, !0);
      const h = Math.hypot(C, T, P) || 1;
      C /= h, T /= h, P /= h;
      for (let x = 0; x < 3; x++) {
        const I = E + 12 + x * 12;
        w[y++] = (n.getFloat32(I, !0) - b[0]) * $, w[y++] = (n.getFloat32(I + 4, !0) - b[1]) * $, w[y++] = (n.getFloat32(I + 8, !0) - b[2]) * $, w[y++] = C, w[y++] = T, w[y++] = P;
      }
    }), { vertices: w, vertexCount: d.length * 3, triangleCount: d.length, extent: g };
  });
}
function $d(t) {
  const e = Math.hypot(...t) || 1;
  return [t[0] / e, t[1] / e, t[2] / e];
}
function oe(t, e, n, r, i, s = !1, a = !1) {
  const o = s ? D[f.pinned] : D[f.selected], c = (document.body.dataset.mode || "sample") === "compare";
  return {
    viewProjection: n,
    cameraPosition: r,
    time: t,
    lightDirection: e,
    transmission: s ? o.transmission : f.transmission,
    color: s ? Ge(o.color) : f.color,
    ior: s ? o.ior : f.ior,
    rotation: [f.pointer[0] * 2.1 + t * 0.12 * f.autoRotate, f.pointer[1] * 1.7 + 0.24],
    dispersion: s ? o.dispersion : f.dispersion,
    wavelength: s ? o.wavelength : f.wavelength,
    spectralPurity: s ? o.spectralPurity : f.spectralPurity,
    raysEnabled: f.raysEnabled,
    lightVisible: f.lightVisible,
    globalLight: f.globalLight,
    paperBackground: f.paperBackground,
    pointer: f.lightPointer,
    reflectionPass: a ? 1 : 0,
    floorY: 0.6,
    positionOffset: c ? [s ? 0.72 : -0.72, 0] : [0, 0],
    scale: c ? 0.58 : 0.7,
    modeIndex: f.modeIndex
  };
}
async function ns() {
  const t = ++$e;
  cancelAnimationFrame(Ct);
  try {
    if (q.length || (q = await Gr()), Fe(), L("#renderStatus").textContent = `8晶体.STL · ${q.reduce((w, y) => w + y.triangleCount, 0).toLocaleString()} TRI`, !("gpu" in navigator)) throw new Error("WebGPU unavailable");
    const e = await Qu();
    e.onError((w) => console.error("VGPU DETAIL", w.code, w.where, w.fix, w.cause?.message || String(w.cause)));
    const n = Al(e, Ce, { dpr: [1, 1.65], label: "NCA material surface" }), r = Lr(e, { size: n.size, format: "rgba16float", label: "NCA HDR star space" }), i = Lr(e, { size: n.size, format: "rgba16float", depth: !0, label: "NCA transparent crystal layer" }), s = Kl(e, { minFilter: "linear", magFilter: "linear" }), a = $r(e, hd, { label: "NCA vgpu star space", set: { space: { right: [1, 0, 0], tanHalfFov: Math.tan(45 * Math.PI / 360), up: [0, 1, 0], aspect: n.size[0] / n.size[1], forward: [0, 0, -1], time: 0, lightDirection: [-0.25, 0.1, -0.82], modeIndex: 0, posterColor: f.color, wavelength: f.wavelength, dispersion: f.dispersion, spectralPurity: f.spectralPurity, transmission: f.transmission, raysEnabled: f.raysEnabled, pointer: f.lightPointer, lightVisible: f.lightVisible, paperBackground: f.paperBackground } } }), o = $r(e, md, { label: "NCA ACES composite", set: { skyTexture: r.color, crystalTexture: i.color, sceneSampler: s } }), c = q.map((w, y) => ko(e, { label: `8晶体.stl / cluster ${y + 1}`, buffers: [{ data: w.vertices, stride: 24, attributes: { position: { format: "float32x3", offset: 0, location: 0 }, normal: { format: "float32x3", offset: 12, location: 1 } } }], vertexCount: w.vertexCount })), l = kr({ fov: 45, aspect: n.size[0] / n.size[1], near: 0.1, far: 50, position: [0, 0, 4.4], target: [0, 0, 0] }), d = [-0.25, 0.1, -0.82], u = c.map((w, y) => st(e, { shader: ut, geometry: w, cull: "none", label: `STL crystal A ${y + 1}`, set: { crystal: oe(0, d, l.viewProjection, [0, 0, 4.4], y) } })), p = c.map((w, y) => st(e, { shader: ut, geometry: w, cull: "none", label: `STL crystal B ${y + 1}`, set: { crystal: oe(0, d, l.viewProjection, [0, 0, 4.4], y, !0) } })), m = c.map((w, y) => st(e, { shader: ut, geometry: w, cull: "none", label: `STL reflection A ${y + 1}`, set: { crystal: oe(0, d, l.viewProjection, [0, 0, 4.4], y, !1, !0) } })), b = c.map((w, y) => st(e, { shader: ut, geometry: w, cull: "none", label: `STL reflection B ${y + 1}`, set: { crystal: oe(0, d, l.viewProjection, [0, 0, 4.4], y, !0, !0) } }));
    n.onResize(({ width: w, height: y }) => {
      r.resize([w, y]), i.resize([w, y]);
    });
    const g = Ru(e);
    let $ = -1;
    mn = () => {
    }, Gu(e, (w) => {
      if (t !== $e) return;
      Ji = performance.now();
      const y = g.time, S = y * 0.085 + 1.15, E = $d([Math.cos(S) * 0.25, Math.sin(S) * 0.17, -0.82]), C = 4.4 / Math.max(0.72, f.zoom), T = kr({ fov: 45, aspect: n.size[0] / Math.max(1, n.size[1]), near: 0.1, far: 50, position: [0, 0, C], target: [0, 0, 0] });
      a.set({ space: { aspect: n.size[0] / Math.max(1, n.size[1]), time: y, lightDirection: E, modeIndex: f.modeIndex, posterColor: f.color, wavelength: f.wavelength, dispersion: f.dispersion, spectralPurity: f.spectralPurity, transmission: f.transmission, raysEnabled: f.raysEnabled, pointer: f.lightPointer, lightVisible: f.lightVisible, paperBackground: f.paperBackground } });
      const P = f.typeIndex, h = D[f.pinned].type;
      u[P].set({ crystal: oe(y, E, T.viewProjection, [0, 0, C], P) }), p[h].set({ crystal: oe(y, E, T.viewProjection, [0, 0, C], h, !0) }), m[P].set({ crystal: oe(y, E, T.viewProjection, [0, 0, C], P, !1, !0) }), b[h].set({ crystal: oe(y, E, T.viewProjection, [0, 0, C], h, !0, !0) }), w.pass({ target: r, clear: [0, 0, 0, 1] }, (I) => {
        I.draw(a);
      }), w.pass({ target: i, clear: [0, 0, 0, 0], clearDepth: 1 }, (I) => {
        I.draw(m[P]), (document.body.dataset.mode || "sample") === "compare" && I.draw(b[h]), I.draw(u[P]), (document.body.dataset.mode || "sample") === "compare" && I.draw(p[h]);
      }), w.pass(n, o);
      const x = Math.floor(y);
      if (x !== $) {
        $ = x;
        const I = Math.round(S * 180 / Math.PI % 360), A = document.querySelector("#sunStatus");
        A && (A.textContent = `LIGHT ${String(I).padStart(3, "0")}° · ${f.lightVisible > 0 ? "OFFSCREEN" : "SPOT OFF"}${f.globalLight > 0 ? " + GLOBAL" : ""}`);
      }
    }), document.body.dataset.render = "webgpu", L("#renderStatus").textContent = `VGPU · STL 8/8 · ${q.reduce((w, y) => w + y.triangleCount, 0).toLocaleString()} TRI`, N();
  } catch (e) {
    if (t !== $e) return;
    if (console.warn("vgpu fallback", e), !q.length)
      try {
        q = await Gr(), Fe();
      } catch (n) {
        console.warn("STL fallback unavailable", n);
      }
    Ld(t);
  }
}
function Ld(t = $e) {
  cancelAnimationFrame(Ct), document.body.dataset.render = "fallback", L("#renderStatus").textContent = "STL 8/8 · CANVAS FALLBACK";
  const e = Ce.getContext("2d");
  if (!e) return;
  const n = Array.from({ length: 620 }, (a, o) => ({ x: Math.sin(o * 91.713) * 43758.5453 % 1, y: Math.sin(o * 37.217) * 17621.923 % 1, r: 0.45 + o % 11 / 6, a: 0.16 + o % 7 / 11, phase: o * 0.731, speed: 0.42 + o % 9 / 11 })).map((a) => ({ ...a, x: Math.abs(a.x), y: Math.abs(a.y) })), r = () => {
    const a = Math.min(devicePixelRatio || 1, 1.6);
    Ce.width = innerWidth * a, Ce.height = innerHeight * a, e.setTransform(a, 0, 0, a, 0, 0);
  };
  addEventListener("resize", r), r(), mn = () => {
  };
  const i = (a, o, c, l, d, u, p, m, b) => {
    const g = Math.max(1, Math.ceil(a.triangleCount / 1100)), $ = d.map((T) => Math.round(T * 255)), w = [], y = Math.cos(u), S = Math.sin(u), E = Math.cos(p), C = Math.sin(p);
    for (let T = 0; T < a.triangleCount; T += g) {
      const P = T * 18, h = [];
      let x = 0;
      for (let Ue = 0; Ue < 3; Ue++) {
        const Ne = P + Ue * 6, re = a.vertices[Ne], xn = a.vertices[Ne + 1], wn = a.vertices[Ne + 2], rs = re * y + wn * S, vn = -re * S + wn * y, is = xn * E - vn * C, ss = xn * C + vn * E;
        h.push(o + rs * l, c - is * l), x += ss;
      }
      const I = a.vertices[P + 3], A = a.vertices[P + 4], M = a.vertices[P + 5], ze = I * y + M * S, we = -I * S + M * y, ne = A * E - we * C;
      w.push({ z: x / 3, p: h, light: Math.max(0, ze * m - ne * b + we * 0.64) });
    }
    w.sort((T, P) => T.z - P.z).forEach((T) => {
      e.beginPath(), e.moveTo(T.p[0], T.p[1]), e.lineTo(T.p[2], T.p[3]), e.lineTo(T.p[4], T.p[5]), e.closePath();
      const P = f.globalLight * (0.26 + T.light * 0.16), h = 0.055 + T.light * 0.26 + P * 0.24 + f.transmission * 0.08;
      e.fillStyle = `rgba(${$[0]},${$[1]},${$[2]},${h})`, e.fill(), e.strokeStyle = `rgba(225,238,255,${0.018 + T.light * 0.08 + P * 0.09})`, e.lineWidth = 0.45, e.stroke();
    });
  }, s = () => {
    if (t !== $e) return;
    Ct = requestAnimationFrame(s);
    const a = innerWidth, o = innerHeight, c = performance.now() / 1e3;
    if (f.paperBackground > 0) {
      e.fillStyle = "#f2eee6", e.fillRect(0, 0, a, o), e.strokeStyle = "rgba(82,72,62,.045)", e.lineWidth = 0.55;
      for (let S = 0; S < 180; S++) {
        const E = S * 73.17 % o;
        e.beginPath(), e.moveTo(0, E), e.lineTo(a, E + Math.sin(S) * 2), e.stroke();
      }
    } else
      e.fillStyle = "#020305", e.fillRect(0, 0, a, o), n.forEach((S) => {
        const E = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(c * S.speed * 1.35 + S.phase)), C = S.a * E;
        e.fillStyle = `rgba(238,244,255,${C})`, e.beginPath(), e.arc(S.x * a, S.y * o, S.r * (0.88 + E * 0.2), 0, Math.PI * 2), e.fill();
      });
    const l = c * 0.085 + 1.15;
    if (f.raysEnabled > 0 && f.lightVisible > 0) {
      e.save(), e.globalCompositeOperation = f.paperBackground > 0 ? "source-over" : "lighter";
      const S = a * 0.5, E = o * 0.49, C = E - f.lightPointer[1] * o * 0.12, T = E - o * 0.08 - f.lightPointer[1] * o * 0.16, P = e.createLinearGradient(a * 1.04, T, S, C);
      P.addColorStop(0, "rgba(255,255,255,0)"), P.addColorStop(0.62, f.paperBackground > 0 ? "rgba(120,126,136,.28)" : "rgba(255,255,255,.34)"), P.addColorStop(1, "rgba(255,255,255,.95)"), e.strokeStyle = P, e.lineWidth = 8, e.beginPath(), e.moveTo(a * 1.04, T), e.lineTo(S, C), e.stroke(), ["#6f45ff", "#3285ff", "#36d8e5", "#58d86a", "#f3df47", "#ff8a3a", "#ff3f5b"].forEach((x, I) => {
        e.strokeStyle = x, e.globalAlpha = 0.22 + f.dispersion * 0.38, e.lineWidth = 3.2, e.beginPath(), e.moveTo(S, C), e.lineTo(-a * 0.04, E + o * 0.08 + f.lightPointer[1] * o * 0.18 + (I - 3) * f.dispersion * 23), e.stroke();
      }), e.restore();
    }
    const d = (document.body.dataset.mode || "sample") === "compare", u = Math.min(a, o) * 0.205 * f.zoom, p = f.pointer[0] * 2.1 + c * 0.12 * f.autoRotate, m = f.pointer[1] * 1.7 + 0.24, b = Math.cos(l), g = Math.sin(l), $ = q[f.typeIndex];
    $ && i($, a * 0.5 + (d ? -u * 0.72 : 0), o * 0.49, u * (d ? 0.62 : 1), f.color, p, m, b, g);
    const w = q[D[f.pinned].type];
    d && w && i(w, a * 0.5 + u * 0.72, o * 0.49, u * 0.62, Ge(D[f.pinned].color), p, m, b, g);
    const y = document.querySelector("#sunStatus");
    y && (y.textContent = `LIGHT ${String(Math.round(l * 180 / Math.PI % 360)).padStart(3, "0")}° · ${f.lightVisible > 0 ? "OFFSCREEN" : "SPOT OFF"}${f.globalLight > 0 ? " + GLOBAL" : ""}`);
  };
  s();
}
function yn() {
  ge(), Qi(), ((Xt ? performance.now() - Xt : 0) > 120 || performance.now() - Ji > 600) && Zi(140);
}
document.addEventListener("visibilitychange", () => {
  document.hidden ? Xt = performance.now() : yn();
});
addEventListener("pageshow", yn);
addEventListener("focus", yn);
Sd();
Ed();
Id();
document.body.dataset.uiSize = f.size;
ts(f.lang);
gn(H);
ge();
ns();
addEventListener("beforeunload", () => {
  $e++, cancelAnimationFrame(Ct), cancelAnimationFrame(Kt), window.clearTimeout(Yt);
});
