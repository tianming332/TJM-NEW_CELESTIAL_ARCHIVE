let ha = class extends Error {
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
class re extends ha {
  constructor(e) {
    super({ ...e, severity: "error" }), this.name = "ValidationError";
  }
}
function Si(t) {
  return new ha({
    code: "VGPU-FEATURE-UNSUPPORTED",
    message: `Adapter does not support requested feature(s): ${t.map((e) => `"${e}"`).join(", ")}.`,
    fix: "Remove the unsupported name(s) from init({ requiredFeatures: [...] }) or run on an adapter that supports them; gate optional code paths on device.features after init.",
    where: "init"
  });
}
function Mi(t, e) {
  if (!t)
    return;
  const a = (e ?? []).filter((n) => !t.has(n));
  if (a.length)
    throw Si(a);
}
const Ei = {
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
function ct(t) {
  const e = globalThis.GPUBufferUsage;
  return t.reduce((a, n) => a | Ui(n, e), 0);
}
function Ui(t, e) {
  const a = t.toUpperCase();
  return e?.[a] ?? Ei[t];
}
function $a() {
  return globalThis.GPUMapMode?.READ ?? 1;
}
const ji = {
  copy_src: 1,
  copy_dst: 2,
  texture_binding: 4,
  storage_binding: 8,
  render_attachment: 16
};
function Ni(t) {
  const e = globalThis.GPUTextureUsage;
  return t.reduce((a, n) => a | Ci(n, e), 0);
}
function Ci(t, e) {
  const a = t.toUpperCase();
  return e?.[a] ?? ji[t];
}
function nr(t) {
  return "__vgpuMockBytes" in t;
}
function Ra(t) {
  return "__vgpuMockBytes" in t;
}
let Ti = 1;
function Rt(t) {
  return Object.freeze({ kind: t, id: Ti++ });
}
class Dt {
  callbacks = /* @__PURE__ */ new Set();
  destroyed = !1;
  onDestroy(e, a) {
    return this.destroyed ? (a(e), () => {
    }) : (this.callbacks.add(a), () => {
      this.callbacks.delete(a);
    });
  }
  emit(e) {
    if (this.destroyed)
      return !1;
    this.destroyed = !0;
    const a = [...this.callbacks];
    this.callbacks.clear();
    for (const n of a)
      n(e);
    return !0;
  }
}
class Ie {
  device;
  gpu;
  options;
  ownership;
  destroySignal = new Dt();
  identity = Rt("buffer");
  destroyed = !1;
  constructor(e, a, n, r = "owned") {
    this.device = e, this.gpu = a, this.options = n, this.ownership = r, Object.defineProperty(this, "assertUsable", { value: (i) => this.#e(i) });
  }
  get resourceIdentity() {
    return this.identity;
  }
  onDestroy(e) {
    return this.destroySignal.onDestroy(this, e);
  }
  #e(e = "Buffer") {
    if (this.destroyed)
      throw new re({
        code: "VGPU-BUFFER-DISPOSED",
        message: "Buffer is destroyed.",
        where: e,
        fix: "Wrap or create a live GPUBuffer before using it."
      });
    this.device.assertUsable(e);
  }
  write(e, a = 0) {
    this.#e("Buffer.write"), this.ownership === "external" && this.validateExternalOperation("write", a, e.byteLength, "copy_dst");
    try {
      this.device.queue.writeBuffer(this.gpu, a, e);
    } catch (n) {
      throw this.ownership !== "external" ? n : ft("Buffer.write", "The external GPUBuffer rejected the write operation.", n);
    }
  }
  async read(e, a = 0) {
    this.#e("Buffer.read"), this.ownership === "external" && this.validateExternalOperation("read", a, e, "copy_src");
    try {
      const n = await this.device.readback.read(this.gpu, e, a);
      return this.#e("Buffer.read"), n;
    } catch (n) {
      throw n instanceof re || this.ownership !== "external" ? n : ft("Buffer.read", "The external GPUBuffer rejected the read operation.", n);
    }
  }
  destroy() {
    this.destroyed || (this.destroyed = !0, this.destroySignal.emit(this), this.ownership === "owned" && !nr(this.gpu) && this.gpu.destroy());
  }
  dispose() {
    this.destroy();
  }
  validateExternalOperation(e, a, n, r) {
    if (!(Number.isSafeInteger(a) && a >= 0 && a % 4 === 0 && Number.isSafeInteger(n) && n >= 0 && n % 4 === 0 && a <= this.options.size && n <= this.options.size - a))
      throw ft(`Buffer.${e}`, "External buffer offsets and lengths must be non-negative, 4-byte aligned, and within the buffer size.");
    if ((this.gpu.usage & ct([r])) === 0)
      throw ft(`Buffer.${e}`, `External buffer is missing ${r.toUpperCase()} usage.`);
  }
}
function ft(t, e, a) {
  return new re({
    code: "VGPU-EXTERNAL-BUFFER-VALIDATION",
    message: e,
    where: t,
    cause: a,
    fix: "Use a buffer with the required usage flags and an aligned in-range operation."
  });
}
function Ai(t) {
  if (Fi(t))
    throw Pi();
  const e = { version: 1, mappings: [] }, a = {
    version: 1,
    modules: [{ path: "<runtime>", text: t }],
    diagnostics: [],
    sourceMap: e,
    cacheKey: Li(t)
  };
  return {
    kind: "wgsl",
    wgsl: t,
    source: { text: t, path: "<runtime>", imports: [] },
    ast: a,
    sourceMap: e,
    diagnostics: [],
    cacheKey: a.cacheKey,
    entryPoints: Oi(t),
    stats: { lines: t.split(/\r?\n/).length, bytes: new TextEncoder().encode(t).byteLength, bindGroups: 0 }
  };
}
function Li(t) {
  let e = 2166136261;
  for (let a = 0; a < t.length; a++)
    e = Math.imul(e ^ t.charCodeAt(a), 16777619);
  return { default: `vgpu-wgsl-1:${(e >>> 0).toString(16).padStart(8, "0")}` };
}
function Oi(t) {
  const e = [], a = /@(vertex|fragment|compute)\s+fn\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  for (const n of t.matchAll(a))
    e.push(n[2]);
  return e;
}
function Fi(t) {
  const e = t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").trimStart();
  return e.startsWith("import ") || e.startsWith("import{");
}
function Pi() {
  const t = new Error("Runtime WGSL strings cannot contain import statements. Use a build-time loader or @vgpu/wgsl/runtime.");
  return t.name = "VGPUWGSLRuntimeImportError", t.code = "VGPU-WGSL-RUNTIME-IMPORT", t.severity = "error", t.source = "wgsl", t;
}
const Da = ct(["copy_dst", "map_read"]);
class Bi {
  device;
  constructor(e) {
    this.device = e;
  }
  async read(e, a, n) {
    if (nr(e))
      return e.__vgpuMockBytes.slice(n, n + a).buffer;
    const r = this.device.createBuffer({
      size: a,
      usage: Da
    });
    try {
      const i = this.device.createCommandEncoder();
      i.copyBufferToBuffer(e, n, r, 0, a), this.device.queue.submit([i.finish()]), await r.mapAsync($a());
      const s = r.getMappedRange().slice(0);
      return za(r), s;
    } finally {
      Ha(r);
    }
  }
  async readTexture(e, a, n) {
    const [r, i] = a, s = jt(n, "Readback.readTexture"), o = s.bytesPerPixel, c = $i(r * o, 256), d = c * i, l = this.device.createBuffer({ size: d, usage: Da });
    let f;
    try {
      const m = this.device.createCommandEncoder();
      m.copyTextureToBuffer({ texture: e }, { buffer: l, bytesPerRow: c, rowsPerImage: i }, { width: r, height: i }), this.device.queue.submit([m.finish()]), await l.mapAsync($a());
      const p = new Uint8Array(l.getMappedRange());
      f = new Uint8Array(r * i * o);
      for (let I = 0; I < i; I++) {
        const S = I * c, N = I * r * o;
        f.set(p.subarray(S, S + r * o), N);
      }
      za(l);
    } finally {
      Ha(l);
    }
    return s.swizzle === "bgra-to-rgba" && rr(f), f;
  }
  destroy() {
  }
}
function za(t) {
  try {
    t.unmap();
  } catch {
  }
}
function Ha(t) {
  try {
    t.destroy();
  } catch {
  }
}
function $i(t, e) {
  return Math.ceil(t / e) * e;
}
const Ga = {
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
function jt(t, e) {
  const a = Ga[t];
  if (a)
    return a;
  throw new re({
    code: "VGPU-CORE-UNSUPPORTED-FORMAT",
    message: `Texture.read does not support format ${t}. Supported formats: ${Object.keys(Ga).join(", ")}.`,
    where: e
  });
}
function Ri(t, e, a = "Texture.readFloats") {
  const n = jt(e, a), r = n.bytesPerPixel / n.components, i = Math.floor(t.byteLength / r), s = new Float32Array(i), o = new DataView(t.buffer, t.byteOffset, t.byteLength);
  for (let c = 0; c < i; c++)
    n.componentType === "unorm8" ? s[c] = o.getUint8(c) / 255 : n.componentType === "float16" ? s[c] = Di(o.getUint16(c * 2, !0)) : s[c] = o.getFloat32(c * 4, !0);
  return s;
}
function Di(t) {
  const e = t & 32768 ? -1 : 1, a = t >> 10 & 31, n = t & 1023;
  return a === 0 ? e * n * 2 ** -24 : a === 31 ? n === 0 ? e * Number.POSITIVE_INFINITY : Number.NaN : e * (n + 1024) * 2 ** (a - 25);
}
function zi(t, e, a) {
  const n = t.slice(0, e[0] * e[1] * a.bytesPerPixel);
  return a.swizzle === "bgra-to-rgba" && rr(n), n;
}
function rr(t) {
  for (let e = 0; e < t.length; e += 4) {
    const a = t[e];
    t[e] = t[e + 2], t[e + 2] = a;
  }
}
function Hi(t) {
  return { size: t, usage: ct(["copy_src", "copy_dst"]) };
}
class Gi {
  gpu;
  guard;
  constructor(e, a = () => {
  }) {
    this.gpu = e, this.guard = a;
  }
  writeBuffer(e, a, n) {
    this.guard("Queue.writeBuffer"), this.gpu.writeBuffer(e, a, n);
  }
  async flush() {
    this.guard("Queue.flush"), await this.gpu.onSubmittedWorkDone?.(), this.guard("Queue.flush");
  }
}
class Vi {
  gpu;
  resolved;
  constructor(e, a) {
    this.gpu = e, this.resolved = a;
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
const Wi = /* @__PURE__ */ Symbol.for("vgpu/Texture"), qi = /* @__PURE__ */ Symbol.for("vgpu/Texture/resizeLock");
class Ge {
  device;
  ownership;
  [Wi] = !0;
  destroySignal = new Dt();
  identity = Rt("texture");
  currentGpu;
  currentOptions;
  defaultView = null;
  resizeLock;
  destroyed = !1;
  constructor(e, a, n, r = "owned") {
    this.device = e, this.ownership = r, this.currentGpu = a, this.currentOptions = n, Object.defineProperty(this, qi, {
      value: (i) => {
        this.resizeLock = i;
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
      throw new re({
        code: "VGPU-CORE-EXTERNAL-TEXTURE",
        message: "Texture wraps an externally owned GPUTexture and cannot be resized.",
        where: "Texture.resize"
      });
    if (this.resizeLock)
      throw new re({
        code: "VGPU-CORE-TEXTURE-RESIZE-LOCKED",
        message: this.resizeLock,
        where: "Texture.resize"
      });
    const a = this.options.size[2] ?? 1, n = e[2] ?? a;
    if (this.options.size[0] === e[0] && this.options.size[1] === e[1] && a === n)
      return !1;
    const r = e[2] === void 0 && this.options.size[2] === void 0 ? [e[0], e[1]] : [e[0], e[1], n], i = { ...this.options, size: r }, s = this.gpu;
    return this.currentGpu = this.device.gpu.createTexture(ir(i)), this.currentOptions = i, this.defaultView = null, s.destroy(), !0;
  }
  /**
   * Raw, unpadded texel bytes in this texture's own format (row stride padding removed).
   * `byteLength` is `width * height * bytesPerPixel(format)`; `bgra*` bytes are swizzled to RGBA order.
   * Use `readFloats()` for float formats to get decoded component values.
   */
  async read() {
    this.assertAlive("Texture.read");
    const e = jt(this.options.format, "Texture.read");
    if (Ra(this.gpu))
      return zi(this.gpu.__vgpuMockBytes, this.options.size, e);
    const a = await this.device.readback.readTexture(this.gpu, this.options.size, this.options.format);
    return this.assertAlive("Texture.read"), a;
  }
  /**
   * Texel components decoded to f32, row-major, `width * height * components(format)` long.
   * `float16`/`float32` formats keep their HDR values (no clamping); `unorm8` formats are
   * normalized to `[0, 1]` without srgb gamma conversion.
   */
  async readFloats() {
    return jt(this.options.format, "Texture.readFloats"), Ri(await this.read(), this.options.format);
  }
  destroy() {
    this.destroyed || (this.destroyed = !0, this.defaultView = null, this.destroySignal.emit(this), this.ownership !== "external" && (Ra(this.gpu) || this.gpu.destroy()));
  }
  dispose() {
    this.destroy();
  }
  assertAlive(e = "Texture") {
    if (this.destroyed)
      throw new re({ code: "VGPU-CORE-TEXTURE-DESTROYED", message: "Texture is destroyed", where: e });
    this.device.assertUsable?.(e);
  }
}
function ir(t) {
  const e = {
    label: t.label,
    size: { width: t.size[0], height: t.size[1], depthOrArrayLayers: t.size[2] ?? 1 },
    format: t.format,
    usage: Ni(t.usage)
  };
  return t.mipLevelCount !== void 0 && (e.mipLevelCount = t.mipLevelCount), t.sampleCount !== void 0 && (e.sampleCount = t.sampleCount), t.dimension !== void 0 && (e.dimension = t.dimension), t.viewFormats !== void 0 && (e.viewFormats = [...t.viewFormats]), e;
}
class Xi {
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
  constructor(e, a = null, n = "owned", r = {}) {
    this.gpu = e, this.adapterInfo = a, Object.defineProperty(this, "assertUsable", { value: (o) => this.#e(o) }), this.ownership = typeof n == "string" ? n : "owned";
    const i = typeof n == "string" ? r : n;
    this.isCompatibilityMode = i.isCompatibilityMode ?? !1, this.queue = new Gi(e.queue, (o) => this.#e(o)), this.readback = new Bi(e);
    const s = e.lost;
    s && typeof s.then == "function" && Promise.resolve(s).then((o) => {
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
    const a = typeof e == "string" ? Ai(e) : e;
    return new Vi(this.gpu.createShaderModule({ code: a.wgsl }), a);
  }
  createTexture(e) {
    return this.#e("Device.createTexture"), new Ge(this, this.gpu.createTexture(ir(e)), e);
  }
  createBuffer(e) {
    this.#e("Device.createBuffer");
    const a = Ki(e);
    a && this.captureError(a);
    const n = a ? Hi(Math.max(4, e.size || 4)) : Ji(e);
    return new Ie(this, this.gpu.createBuffer(n), e);
  }
  /** Wraps a caller-owned GPUBuffer without taking ownership of its native lifetime. */
  wrapBuffer(e) {
    if (this.#e("Device.wrapBuffer"), !Zi(e))
      throw new re({
        code: "VGPU-EXTERNAL-BUFFER-INVALID",
        message: "Device.wrapBuffer requires a GPUBuffer with finite size and usage properties.",
        where: "Device.wrapBuffer",
        fix: "Pass a live GPUBuffer created for this GPUDevice."
      });
    const a = {
      size: e.size,
      usage: _i(e.usage),
      ...e.label ? { label: e.label } : {}
    };
    return new Ie(this, e, a, "external");
  }
  pushErrorScope(e) {
    this.#e("Device.pushErrorScope"), this.scopes.push([]), this.gpu.pushErrorScope?.(e);
  }
  async popErrorScope() {
    this.#e("Device.popErrorScope");
    const e = this.scopes.pop(), a = await this.gpu.popErrorScope?.();
    return this.#e("Device.popErrorScope"), e?.[0] ?? Yi(a) ?? null;
  }
  #e(e) {
    if (this.state === "alive")
      return;
    if (this.state === "disposed")
      throw new re({
        code: "VGPU-DEVICE-DISPOSED",
        message: "The GPU device wrapper has been disposed.",
        where: e,
        fix: "Create a new Gpu instance before performing more work."
      });
    const a = this.lossInfo?.reason, n = this.lossInfo?.message;
    throw new re({
      code: "VGPU-DEVICE-LOST",
      message: `The GPU device was lost${a ? ` (${a})` : ""}${n ? `: ${n}` : "."}`,
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
    const a = this.scopes.at(-1);
    if (a)
      a.push(e);
    else
      throw e;
  }
}
function Ki(t) {
  return !Number.isFinite(t.size) || t.size <= 0 ? Va("Buffer size must be greater than zero.") : t.usage.length === 0 ? Va("Buffer usage must not be empty.") : null;
}
function Va(t) {
  return new re({ code: "VGPU-CORE-INVALID-USAGE", message: t, where: "Device.createBuffer" });
}
function Ji(t) {
  return { label: t.label, size: t.size, usage: ct(t.usage) };
}
function Yi(t) {
  return t ? new re({ code: "VGPU-CORE-VALIDATION", message: t.message, where: "GPUDevice.popErrorScope", cause: t }) : null;
}
function Zi(t) {
  if (typeof t != "object" && typeof t != "function" || t === null)
    return !1;
  const e = t;
  return Number.isSafeInteger(e.size) && (e.size ?? -1) >= 0 && Number.isSafeInteger(e.usage) && (e.usage ?? -1) >= 0 && typeof e.destroy == "function";
}
const Qi = ["map_read", "map_write", "copy_src", "copy_dst", "index", "vertex", "uniform", "storage", "indirect", "query_resolve"];
function _i(t) {
  return Qi.filter((e) => (t & ct([e])) !== 0);
}
const sr = /* @__PURE__ */ new WeakMap(), es = /* @__PURE__ */ new WeakMap();
function ts(t, e) {
  return sr.set(t, as(e)), t;
}
function Qe(t) {
  return sr.get(t);
}
function or(t) {
  return es.get(t);
}
function as(t) {
  return { entries: t.entries.map((e) => ({ ...e })) };
}
let j = class extends ha {
};
function ns(t, e, a, n, r, i) {
  const s = e === "vertex" ? "Vertex" : "Fragment", o = e === "vertex" ? "VERTEX" : "FRAGMENT", c = `maxStorageBuffersIn${s}Stage`;
  return new j({
    code: `VGPU-LIMIT-STORAGE-${o}`,
    message: `${s} entry '${a}' in '${t}' uses ${n} storage buffer(s), but device limit ${c} is ${r}.`,
    fix: e === "vertex" ? `Request init({ requiredLimits: { ${c}: ${n} } }) if the adapter supports it, or move vertex data to geometry(gpu, ...) vertex streams.` : `Request init({ requiredLimits: { ${c}: ${n} } }) if the adapter supports it, or reduce fragment storage buffers.`,
    where: `${t}.pipelineLayout`,
    detail: { stage: e, entryPoint: a, count: n, limit: r, bindings: i.map(({ name: d, group: l, binding: f }) => ({ name: d, group: l, binding: f })) }
  });
}
function rs(t, e, a, n, r) {
  return new j({
    code: "VGPU-SET-TEXTURE-FILTERABILITY",
    message: `${n} (${a}) cannot satisfy filtering texture '${e.name}' @group(${e.group}) @binding(${e.binding}).`,
    fix: "Use a filterable format; request float32-filterable for rgba32float when supported; or use textureLoad without a sampler.",
    where: `${t}.set`,
    detail: { format: a, group: e.group, binding: e.binding, bindingName: e.name, resourceName: n, samplerName: r?.name, samplerGroup: r?.group, samplerBinding: r?.binding }
  });
}
function is(t, e) {
  const a = Fs(t, e);
  return new j({
    code: "VGPU-R1-BINDING-NEVER-SET",
    message: `Unset \`${e.name}\` @group(${e.group}) @binding(${e.binding}) in '${t}'. Fix: ${a}; or ${t}.group(${e.group}, bindGroup).`,
    where: `${t}.draw`
  });
}
function cr(t, e) {
  const a = e === "lib" ? "lib-owned by its first JS set()" : "user-owned by its first resource set()", n = e === "lib" ? `Fix: pass a resource from the start: wave.set({ ${t}: new Uniform(gpu.device, { size: 4 }) }).` : `Fix: pass JS values from the first set(): wave.set({ ${t}: jsValue }).`;
  return new j({
    code: "VGPU-R1-OWNERSHIP-FLIP",
    message: `\`${t}\` is ${a}; ownership cannot change. ${n}`,
    where: "set"
  });
}
function ss(t, e) {
  return new j({
    code: "VGPU-R4-GROUP-CLAIMED",
    message: `group ${e} of '${t}' is claimed; set() cannot update it.`,
    fix: `Call set() first, or build from ${t}.layout(${e}); pass dynamic offsets to p.draw().`,
    where: `${t}.set`
  });
}
function os(t, e, a, n) {
  return new j({
    code: "VGPU-R4-GROUP-INCOMPATIBLE",
    message: `claimed group ${e} in '${t}' is incompatible: ${a}.`,
    fix: `Build from ${t}.layout(${e}, { dynamicOffsets? }) then call ${t}.group(${e}, bindGroup).`,
    where: `${t}.group`,
    cause: n
  });
}
function De(t, e, a) {
  return new j({
    code: "VGPU-R4-GROUP-VALIDATION",
    message: `WebGPU rejected claimed group ${e} in '${t}'.`,
    fix: `Build from ${t}.layout(${e}); pass offsets via p.draw(draw, { offsets: { ${e}: [...] } }).`,
    where: `${t}.draw`,
    cause: a,
    detail: { drawLabel: t, group: e }
  });
}
function Wa(t, e) {
  return new j({
    code: "VGPU-BLEND-INVALID",
    message: `Invalid blend '${String(e)}' in '${t}'.`,
    fix: 'Use "alpha", "additive", "premultiplied", or { color, alpha? } components.',
    where: "draw"
  });
}
function qa(t, e) {
  return new j({
    code: "VGPU-BLEND-CONSTANT-INVALID",
    message: `Invalid blendConstant in '${t}': ${e}`,
    fix: 'Use [r, g, b, a] finite numbers with a blend whose color or alpha uses "constant"/"one-minus-constant"; omit it to keep the pass default (0, 0, 0, 0).',
    where: "draw"
  });
}
function Xa(t, e) {
  return new j({
    code: "VGPU-WRITEMASK-INVALID",
    message: `Invalid writeMask ${e} in '${t}'.`,
    fix: "Use an array of r/g/b/a; omit it for all channels.",
    where: "draw"
  });
}
function aa(t, e, a = "draw") {
  return new j({
    code: "VGPU-COLORS-INVALID",
    message: `Invalid colors in '${t}': ${e}`,
    fix: "Use one { blend?, writeMask? } or null entry per color attachment of the target, aligned by index; omit colors to apply the top-level blend/writeMask to every attachment.",
    where: a
  });
}
function cs(t, e) {
  return new j({
    code: "VGPU-CULL-INVALID",
    message: `Invalid cull '${String(e)}' in '${t}'.`,
    fix: 'Use "none", "front", or "back"; omit it for no culling.',
    where: "draw"
  });
}
function ds(t, e) {
  return new j({
    code: "VGPU-FRONTFACE-INVALID",
    message: `Invalid frontFace '${String(e)}' in '${t}'.`,
    fix: 'Use "ccw" or "cw"; omit it for counter-clockwise.',
    where: "draw"
  });
}
function Ka(t, e) {
  return new j({
    code: "VGPU-UNCLIPPED-DEPTH-INVALID",
    message: `Invalid unclippedDepth in '${t}': ${e}`,
    fix: 'Use a boolean. unclippedDepth: true needs the "depth-clip-control" device feature — request it with init({ requiredFeatures: ["depth-clip-control"] }) on an adapter that supports it. Omit the option to keep depth clipping.',
    where: "draw"
  });
}
function le(t, e) {
  return new j({
    code: "VGPU-DEPTH-INVALID",
    message: `Invalid depth in '${t}': ${e}`,
    fix: 'Use false or { write?, compare?, bias?, biasSlopeScale?, biasClamp? }; omit it for { write: true, compare: "less-equal" }.',
    where: "draw"
  });
}
function Pe(t, e, a = "draw") {
  return new j({
    code: "VGPU-STENCIL-INVALID",
    message: `Invalid stencil in '${t}': ${e}`,
    fix: `Use { front?, back?, readMask?, writeMask?, ref? } with GPUCompareFunction/GPUStencilOperation faces and u32 masks, against a target whose depth format has a stencil aspect (depth: "depth24plus-stencil8"); omit it for WebGPU's pass-through defaults.`,
    where: a
  });
}
function vt(t, e, a = "draw") {
  return new j({
    code: "VGPU-MULTISAMPLE-INVALID",
    message: `Invalid multisample in '${t}': ${e}`,
    fix: "Use { alphaToCoverage?, mask? }: alphaToCoverage needs a target created with msaa: true, and mask must be an integer in [0, 0xFFFFFFFF] (bits above the target's sampleCount are ignored). Omit multisample for full-coverage defaults.",
    where: a
  });
}
function ut(t, e, a = "draw") {
  return new j({
    code: "VGPU-CONSTANTS-INVALID",
    message: `Invalid constants in '${t}': ${e}`,
    fix: "Key WGSL `override` constants by name, or by the decimal string of N when the declaration has @id(N); values are finite numbers or booleans, converted to the override's WGSL type (bool/i32/u32/f32/f16). Every override without a default value must be provided. Omit constants to keep the WGSL defaults.",
    where: a
  });
}
function It(t, e, a = "draw") {
  return new j({
    code: "VGPU-ENTRY-INVALID",
    message: `Invalid entry in '${t}': ${e}`,
    fix: "Name an entry point declared in the shader with the matching stage — { vertex?, fragment? } strings for draw, one @compute name string for compute. Omit entry (or a field) to use the first entry point of that stage.",
    where: a
  });
}
function Ee(t, e, a) {
  return new j({
    code: "VGPU-INDIRECT-INVALID",
    message: `Invalid indirect in '${t}': ${e}`,
    fix: "Pass a storage buffer created with storage(gpu, bytes, { indirect: true }) — bare, or as { buffer, offset? } with a 4-aligned byte offset — sized so the GPU-read arguments fit: 16 bytes for drawIndirect, 20 for drawIndexedIndirect, 12 for dispatchWorkgroupsIndirect. Omit indirect to use CPU-side counts.",
    where: a
  });
}
function ls() {
  return new j({
    code: "VGPU-PASS-PRESERVE-MSAA",
    message: "clear:false cannot preserve MSAA; use a non-MSAA target.",
    fix: "Use non-MSAA for accumulation.",
    where: "Frame.pass"
  });
}
function Ja(t, e = "expected a number in [0, 1].", a = 'Use 1 (default), or 0 with depth: { compare: "greater" } for reversed-Z.') {
  return new j({
    code: "VGPU-PASS-CLEARDEPTH-INVALID",
    message: `clearDepth received ${String(t)}; ${e}`,
    fix: a,
    where: "Frame.pass"
  });
}
function fe(t) {
  return new j({
    code: "VGPU-PASS-VIEWPORT-INVALID",
    message: `Invalid viewport: ${t}`,
    fix: "Use { x?, y?, width, height, minDepth?, maxDepth? } finite numbers within device limits; omit it for the full target.",
    where: "Frame.pass"
  });
}
function Wt(t) {
  return new j({
    code: "VGPU-PASS-SCISSOR-INVALID",
    message: `Invalid scissor: ${t}`,
    fix: "Use [x, y, width, height] non-negative integers with x + width and y + height within the target's current pixel size; omit it for the full target.",
    where: "Frame.pass"
  });
}
function fs() {
  return new j({
    code: "VGPU-PASS-PRESERVE-CLEARDEPTH",
    message: "clear:false preserves depth; clearDepth cannot apply.",
    fix: "Remove clearDepth, or let the pass clear.",
    where: "Frame.pass"
  });
}
function Ya(t) {
  return new j({
    code: "VGPU-PASS-CLEARSTENCIL-INVALID",
    message: `clearStencil ${t}`,
    fix: `Use an integer in [0, 0xFFFFFFFF] on a target whose depth format has a stencil aspect, e.g. depth: "depth24plus-stencil8"; the value is masked to the stencil aspect's bit width.`,
    where: "Frame.pass"
  });
}
function us() {
  return new j({
    code: "VGPU-PASS-PRESERVE-CLEARSTENCIL",
    message: "clear:false preserves stencil; clearStencil cannot apply.",
    fix: "Remove clearStencil, or let the pass clear.",
    where: "Frame.pass"
  });
}
function je(t, e, a = "Frame.pass") {
  return new j({
    code: "VGPU-PASS-DEPTH-READONLY",
    message: `depthReadOnly ${t}`,
    fix: e,
    where: a
  });
}
function hs() {
  return new j({
    code: "VGPU-PASS-DEPTH-READONLY-MSAA",
    message: `depthReadOnly cannot read an MSAA target's depth: multisampled depth is stored with storeOp "discard", so a read-only pass tests against discarded contents.`,
    fix: "Use a non-MSAA target for read-only depth, or drop depthReadOnly and let the pass own its depth.",
    where: "Frame.pass"
  });
}
function bs(t, e, a = "timer") {
  return new j({
    code: "VGPU-TIMER-INVALID",
    message: `Invalid timer use: ${t}`,
    fix: e,
    where: a
  });
}
function ms(t, e, a = "visibility") {
  return new j({
    code: "VGPU-VIS-INVALID",
    message: `Invalid visibility use: ${t}`,
    fix: e,
    where: a
  });
}
function gs() {
  return new j({
    code: "VGPU-QUERY-NO-VISIBILITY",
    message: "occlusion() needs the pass to be opened with a visibility instance; the render pass has no occlusionQuerySet to write into.",
    fix: "Open the pass with f.pass({ target, visibility: vis }, ...) using the visibility(gpu) instance that created the query handle.",
    where: "FramePass.occlusion"
  });
}
function ps() {
  return new j({
    code: "VGPU-QUERY-NESTED",
    message: "occlusion() cannot nest inside an active occlusion() body; WebGPU allows one active occlusion query per pass at a time.",
    fix: "Encode each occlusion scope sequentially: p.occlusion(a, ...); p.occlusion(b, ...).",
    where: "FramePass.occlusion"
  });
}
function na(t = "Frame.pass") {
  return new j({
    code: "VGPU-TARGET-REQUIRED",
    message: "Target required. Fix: pass surface(gpu, canvas) or target(gpu, { size }) as { target }.",
    where: t
  });
}
function ce(t, e, a, n) {
  return new j({ code: t, message: `${t}: ${a}`, fix: n, where: e });
}
function q(t, e) {
  return ce("VGPU-MESH-LAYOUT-INVALID", t, e, "Fix attributes/formats/offsets; use non-numeric names and 4-aligned stride <= 2048.");
}
function Za(t, e) {
  return ce("VGPU-MESH-LIMIT-EXCEEDED", t, e, "Use <= 8 buffers and <= 16 attributes (or the device limits).");
}
function Qa(t, e) {
  return ce("VGPU-MESH-LOCATION-CONFLICT", t, `Duplicate geometry @location(${e}).`, "Use unique locations, or omit them for name matching.");
}
function dr(t, e) {
  return ce("VGPU-MESH-DATA-MISALIGNED", t, e, "Fix: repack data, set matching stride, or give raw buffers an explicit count.");
}
function ze(t, e) {
  return ce("VGPU-MESH-RANGE-INVALID", t, e, "Use index ranges for indexed geometries, vertex ranges otherwise, within geometry counts.");
}
function Be(t, e) {
  return ce("VGPU-MESH-WRITE-RANGE", t, e, "Write within the buffer byteLength, or create a larger geometry.");
}
function ys(t, e, a = []) {
  return ce("VGPU-MESH-ATTRIBUTE-UNMATCHED", t, `Geometry attribute '${e}' has no shader input.`, `Use shader name${a.length ? ` (${a.join(",")})` : ""} or { location:n }.`);
}
function ws(t, e, a) {
  return ce("VGPU-MESH-ATTRIBUTE-UNMATCHED", t, `Geometry attribute '${e}' matches locations ${a.join(",")}.`, "Rename inputs or set { location:n }.");
}
function xs(t, e, a = []) {
  return ce("VGPU-MESH-INPUT-MISSING", t, `Geometry lacks shader input '${e}'.`, `Add/remove it. Geometry attributes: ${a.join(",") || "none"}.`);
}
function vs(t, e, a, n) {
  return ce("VGPU-MESH-FORMAT-MISMATCH", t, `Attribute '${e}' ${a} != shader ${n}.`, "Match the float/sint/uint shader base type; widths may differ.");
}
function Is(t) {
  return new j({
    code: "VGPU-PIPELINE-LAYOUT-GAP",
    message: `Pipeline bind group ${t} is missing.`,
    fix: "Use consecutive @group() indices starting at 0.",
    where: "pipeline layout"
  });
}
function Ke(t, e, a) {
  return new j({
    code: "VGPU-COMPILE-FAILED",
    message: "WebGPU pipeline compilation failed.",
    fix: "Check WGSL, vertex layouts, and target signature.",
    where: t,
    cause: e,
    detail: a ? { signature: a } : void 0
  });
}
function _a(t) {
  return new j({
    code: "VGPU-COMPILE-DISPOSED",
    message: "GPU disposed during pipeline compilation.",
    where: t
  });
}
function ht(t, e) {
  return new j({
    code: "VGPU-COMPILE-SIGNATURE-INVALID",
    message: `Invalid TargetSignature: ${e}`,
    fix: "Pass { colors, depth?, sampleCount?:1|4 } or a Target.",
    where: t
  });
}
function ks(t) {
  return new j({
    code: "VGPU-TARGET-DEPTH-STENCIL-ONLY",
    message: `depth received '${t}'; stencil-only depth targets are not supported yet.`,
    fix: 'Use a format with a depth aspect such as "depth24plus" or "depth24plus-stencil8".',
    where: "target"
  });
}
function lr() {
  return new j({
    code: "VGPU-TARGET-SIZE-REQUIRED",
    message: "Target size required. Fix: target(gpu, { size: [w,h] }); update surface-derived targets in onResize.",
    where: "target"
  });
}
function fr(t) {
  return new j({
    code: "VGPU-SURFACE-NOT-IN-FRAME",
    message: "Surface targets are only available inside frame(gpu).",
    fix: "surface passes must run inside frame(gpu, ...); precompile against an offscreen target(gpu, ...) instead",
    where: t
  });
}
function Ss() {
  return new j({
    code: "VGPU-SURFACE-CONTEXT",
    message: "Canvas WebGPU context failed. Fix: check navigator.gpu and remove any existing 2d/webgl context.",
    where: "surface"
  });
}
function Ms(t) {
  return new j({
    code: "VGPU-SURFACE-DUPLICATE",
    message: `Canvas already has surface${t ? ` '${t}'` : ""}. Fix: reuse or dispose it.`,
    where: "surface"
  });
}
function Es(t) {
  return new j({
    code: "VGPU-SURFACE-DISPOSED",
    message: `Surface '${t ?? "surface"}' is disposed. Fix: call surface(gpu, canvas).`,
    where: "surface"
  });
}
function Us() {
  return new j({
    code: "VGPU-SURFACE-AUTORESIZE-UNSUPPORTED",
    message: "autoResize needs clientWidth. Fix: call surface.resize([w,h]) for OffscreenCanvas; onResize still fires.",
    where: "surface"
  });
}
function js(t) {
  return new j({
    code: "VGPU-SURFACE-RESIZE-REENTRANT",
    message: `Cannot resize this surface${t ? ` '${t}'` : ""} in onResize. Fix: resize derived targets only.`,
    where: "surface.resize"
  });
}
function Ns(t) {
  return new j({
    code: "VGPU-CLEAR-COLOR-INVALID",
    message: `Invalid ${t}: expected four finite numbers.`,
    fix: "Assign [r, g, b, a] or a GPUColor object ({ r, g, b, a }).",
    where: t
  });
}
function ur() {
  return new j({
    code: "VGPU-FRAME-REENTRANT",
    message: "Nested frame(gpu) is invalid. Fix: queue work for the next frame.",
    where: "frame"
  });
}
function en(t) {
  return new j({
    code: "VGPU-FRAME-CANCELED",
    message: "the frame was canceled; its command encoder was dropped and nothing more can be encoded or submitted on it.",
    fix: "Open a new frame(gpu) for further work; cancel() is the last operation on a frame.",
    where: t
  });
}
function Cs(t) {
  return new j({
    code: "VGPU-FRAME-PASS-ACTIVE",
    message: "the frame cannot be canceled while a pass callback is active.",
    fix: "Return from the frame.pass(...) callback first, then call frame.cancel(); this keeps pass descriptor resources alive until the pass is closed.",
    where: t
  });
}
function Ts(t) {
  return new j({
    code: "VGPU-FRAME-SUBMITTED",
    message: "the frame was already submitted; submitted GPU work cannot be canceled.",
    fix: "Call cancel() only on a frame you decided not to submit; the frame you did submit needs no cleanup.",
    where: t
  });
}
function he(t, e, a) {
  return new j({
    code: "VGPU-R1-BINDING-INCOMPATIBLE-RESOURCE",
    message: `binding \`${t.name}\` @group(${t.group}) @binding(${t.binding}) needs ${e}.`,
    fix: a,
    where: "set"
  });
}
function J(t, e, a) {
  return new j({ code: "VGPU-RING1-UNSUPPORTED", message: e, fix: a, where: t });
}
function bt(t) {
  return Ls(t) && t.version !== 1 ? new j({
    code: "VGPU-SHADER-SOURCE-INVALID",
    message: `VGPU-SHADER-SOURCE-INVALID: unsupported ShaderSource v${String(t.version)}; expected v1. Fix: update vgpu or regenerate it.`,
    where: "shader source"
  }) : new j({
    code: "VGPU-SHADER-SOURCE-INVALID",
    message: `VGPU-SHADER-SOURCE-INVALID: expected WGSL or { version, wgsl }, got ${Os(t)}. Fix: configure @vgpu/wgsl loader-vite or loader-webpack.`,
    where: "shader source"
  });
}
function As(t) {
  return new j({
    code: "VGPU-R1-STORAGE-ALIASING",
    message: "`src` and writable `dst` alias. Fix: alternate them with pingPongStorage(gpu).",
    where: t
  });
}
function Ls(t) {
  return typeof t == "object" && t !== null && "version" in t;
}
function Os(t) {
  if (typeof t != "object" || t === null)
    return typeof t;
  try {
    const e = JSON.stringify(t);
    return e.length > 80 ? `${e.slice(0, 77)}...` : e;
  } catch {
    return "object";
  }
}
function Fs(t, e) {
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
const tn = ["scheduler", "resource", "service"];
function zt(t) {
  return { name: t };
}
const hr = /* @__PURE__ */ new WeakMap();
function Ps(t) {
  const e = hr.get(t);
  if (!e)
    throw new j({
      code: "VGPU-GPU-FOREIGN",
      message: "This object was not created by init(); it has no vgpu kernel.",
      fix: "Pass the gpu returned by init() from vgpu, vgpu/node or vgpu/mock.",
      where: "gpu"
    });
  return e;
}
class Bs {
  device;
  #e = /* @__PURE__ */ new Map();
  #t = new Map(tn.map((e) => [e, /* @__PURE__ */ new Set()]));
  #a = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Set();
  #i = /* @__PURE__ */ new Set();
  #r = !1;
  constructor(e) {
    this.device = e;
  }
  get disposed() {
    return this.#r;
  }
  service(e, a) {
    const n = this.#e.get(e);
    if (n !== void 0)
      return n;
    const r = a(this);
    return this.#e.set(e, r), r;
  }
  peekService(e) {
    return this.#e.get(e);
  }
  own(e, a) {
    const n = this.#t.get(e);
    return n.add(a), () => {
      n.delete(a);
    };
  }
  addErrorListener(e) {
    return this.#a.add(e), () => {
      this.#a.delete(e);
    };
  }
  reportError(e) {
    if (this.#r)
      return Promise.resolve();
    const a = Promise.resolve().then(() => {
      const n = [...this.#a];
      if (!n.length) {
        console.error(e);
        return;
      }
      for (const r of n)
        try {
          r(e);
        } catch (i) {
          console.error(i);
        }
    });
    return this.trackDelivery(a);
  }
  trackDelivery(e) {
    const a = Promise.resolve(e).then(() => {
    }, (n) => {
      console.error(n);
    });
    return this.#n.add(a), a.finally(() => this.#n.delete(a)), a;
  }
  registerSettledSource(e) {
    return this.#i.add(e), () => {
      this.#i.delete(e);
    };
  }
  async settled() {
    const e = [
      ...this.#n,
      ...[...this.#i].flatMap((a) => a())
    ];
    await Promise.allSettled(e);
  }
  dispose() {
    if (!this.#r) {
      this.#r = !0;
      for (const e of tn) {
        const a = this.#t.get(e);
        for (const n of [...a])
          n();
        a.clear();
      }
      this.#e.clear(), this.#i.clear(), this.#a.clear(), this.device.dispose();
    }
  }
}
function $s(t) {
  const e = new Bs(t), a = {
    device: t,
    gpu: t.gpu,
    get disposed() {
      return e.disposed;
    },
    onError: (n) => e.addErrorListener(n),
    settled: () => e.settled(),
    dispose: () => {
      e.dispose();
    }
  };
  return hr.set(a, e), a;
}
async function Rs(t, e = {}, a) {
  return $s(await Ds(t, e, a));
}
async function Ds(t, e, a) {
  return e.adapter || a ? (e.adapter ?? a()).requestDevice(e) : zs(e);
}
async function zs(t) {
  const a = await globalThis.navigator.gpu?.requestAdapter({ powerPreference: t.powerPreference });
  if (!a)
    throw J("init", "navigator.gpu.requestAdapter() returned null.");
  Mi(a.features, t.requiredFeatures);
  const n = await a.requestDevice({ requiredFeatures: t.requiredFeatures, requiredLimits: t.requiredLimits });
  return new Xi(n, a.info ?? null);
}
function G(t, e) {
  t.assertUsable(e);
}
function an(t, e) {
  t.assertUsable(e);
}
const br = /* @__PURE__ */ Symbol("vgpu.bindingResource");
function Hs(t) {
  return typeof (typeof t == "object" && t !== null ? t[br] : void 0) == "function" ? t : void 0;
}
const He = /* @__PURE__ */ Symbol("vgpu.geometry.layoutResolver");
function me(t, e) {
  const a = Ps(t);
  if (a.disposed)
    throw Gs(e);
  return a;
}
function Gs(t) {
  return new j({
    code: "VGPU-GPU-DISPOSED",
    message: `${t}() ran after gpu.dispose(); the device and everything it owned are gone.`,
    fix: "Create resources before disposing the gpu, or init() a new one.",
    where: t
  });
}
function mr(t, e, a, n) {
  const r = t.own("resource", () => a(e));
  return n?.(r), e;
}
class Vs {
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
  #a;
  #n = /* @__PURE__ */ new Map();
  #i = /* @__PURE__ */ new Set();
  #r = !1;
  constructor(e, a) {
    const n = "geometry";
    if (a.buffers.length > 8)
      throw Za(n, `${a.buffers.length} vertex buffers exceed limit 8.`);
    let r = 0;
    const i = /* @__PURE__ */ new Set(), s = a.buffers.map((m, p) => {
      const I = Ys(e, m, `${n}.buffers[${p}]`);
      r += I.attributes.length;
      for (const S of I.attributes)
        if (S.location !== void 0) {
          if (i.has(S.location))
            throw Qa(`${n}.buffers[${p}]`, S.location);
          i.add(S.location);
        }
      return I;
    }), o = e.gpu.limits.maxVertexAttributes;
    if (r > o)
      throw Za(n, `${r} attributes exceed device limit ${o}.`);
    const c = a.topology ?? "triangle-list";
    if (!_s.has(c))
      throw q(n, `Invalid topology: ${String(c)}.`);
    const d = Zs(e, a, n), l = rn(s, "vertex"), f = rn(s, "instance");
    sn(s, "vertex", a.vertexCount ?? l, n), sn(s, "instance", a.instanceCount ?? f, n), qt(n, "vertexCount", a.vertexCount, l), qt(n, "instanceCount", a.instanceCount, f), qt(n, "indexCount", a.indexCount, d.count), this.topology = c, this.stripIndexFormat = c.endsWith("strip") ? d.format : void 0, this.#a = s, this.vertexBufferLayouts = Object.freeze(s.map((m) => m.layout)), this.vertexBuffers = Object.freeze(s.map((m) => m.gpu)), this.buffers = Object.freeze(s.map((m, p) => new Ws(`${n}.buffers[${p}]`, m))), this.vertexCount = a.vertexCount ?? l, this.instanceCount = a.instanceCount ?? f, this.indexBuffer = d.gpu, this.indexFormat = d.format, this.indexCount = a.indexCount ?? d.count, this.#e = d.owned, this.#t = d.byteLength, Qs(this);
  }
  /** @internal Resolves named attributes for one reflected vertex entry point. */
  [He](e, a) {
    if (this.#r)
      throw q(a, "Geometry is destroyed; create a live geometry.");
    const n = e.map((d) => `${d.name}:${d.location}:${kt(d.type)}`).join("|"), r = this.#n.get(n);
    if (r)
      return r;
    const i = /* @__PURE__ */ new Set(), s = this.#a.flatMap((d) => d.attributes.map((l) => l.name)), o = this.#a.map((d) => {
      const l = [...d.layout.attributes], f = d.attributes.map((m, p) => {
        const I = m.location === void 0 ? e.filter((C) => C.name === m.name) : [];
        if (m.location === void 0 && I.length === 0)
          throw ys(a, m.name, e.map((C) => C.name));
        if (I.length > 1)
          throw ws(a, m.name, I.map((C) => C.location));
        const S = m.location ?? I[0].location;
        if (i.has(S))
          throw Qa(a, S);
        i.add(S);
        const N = e.find((C) => C.location === S);
        if (N && ao(m.format) !== kt(N.type))
          throw vs(a, m.name, m.format, kt(N.type));
        return Object.freeze({ ...l[p], shaderLocation: S });
      });
      return Object.freeze({ arrayStride: d.layout.arrayStride, ...d.layout.stepMode ? { stepMode: d.layout.stepMode } : {}, attributes: Object.freeze(f) });
    });
    for (const d of e)
      if (!i.has(d.location))
        throw xs(a, d.name, s);
    const c = Object.freeze(o);
    return this.#n.set(n, c), c;
  }
  /** Creates a frozen range view sharing this geometry's buffers and layout identity. */
  slice(e = {}) {
    return new qs(this, e);
  }
  /** Updates bytes in vertex buffer stream 0 without resizing it. */
  write(e, a = 0) {
    const n = this.buffers[0];
    if (!n)
      throw Be("geometry.write", "No vertex buffer 0; add one before writing.");
    n.write(e, a);
  }
  /** Updates bytes in the owned index buffer without resizing it. */
  writeIndices(e, a = 0) {
    if (this.#r)
      throw Be("geometry.writeIndices", "Geometry is destroyed; create a new geometry before writing.");
    if (!this.#e || this.#t === void 0)
      throw Be("geometry.writeIndices", "No owned index buffer; write caller-owned buffers directly.");
    pr("geometry.writeIndices", this.#t, e.byteLength, a), this.#e.write(e, a);
  }
  /** Destroys buffers owned by this geometry; caller-owned buffers are untouched. */
  destroy() {
    if (!this.#r) {
      this.#r = !0;
      for (const e of this.buffers)
        e.destroyOwned();
      this.#e?.destroy();
      for (const e of [...this.#i])
        e();
      this.#i.clear();
    }
  }
  /**
   * @internal Ownership hook: runs once, right after `destroy()` freed the buffers, so the owner
   * that registered this geometry with the kernel can drop its teardown registration.
   */
  onDestroy(e) {
    return this.#r ? (e(), () => {
    }) : (this.#i.add(e), () => {
      this.#i.delete(e);
    });
  }
}
class Ws {
  where;
  inner;
  gpu;
  stride;
  stepMode;
  #e = { destroyed: !1 };
  constructor(e, a) {
    this.where = e, this.inner = a, this.gpu = a.gpu, this.stride = a.stride, this.stepMode = a.stepMode, Object.freeze(this);
  }
  write(e, a = 0) {
    if (this.#e.destroyed)
      throw Be(this.where, "Geometry is destroyed; create a new geometry before writing.");
    if (!this.inner.owned || this.inner.byteLength === void 0)
      throw Be(this.where, "Caller-owned buffer; write it directly.");
    pr(this.where, this.inner.byteLength, gr(e), a), this.inner.owned.write(e, a);
  }
  destroyOwned() {
    this.#e.destroyed = !0, this.inner.owned?.destroy();
  }
}
class qs {
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
  [He](e, a) {
    return this.geometry[He](e, a);
  }
  constructor(e, a) {
    if (this.geometry = e, this.vertexBuffers = e.vertexBuffers, this.indexBuffer = e.indexBuffer, this.indexFormat = e.indexFormat, this.vertexBufferLayouts = e.vertexBufferLayouts, this.topology = e.topology, this.stripIndexFormat = e.stripIndexFormat, e.indexBuffer) {
      if (a.firstVertex !== void 0 || a.vertexCount !== void 0)
        throw ze("geometry.slice", "Indexed slice needs firstIndex/indexCount/baseVertex; omit vertex range fields.");
      const n = a.firstIndex ?? 0, r = e.indexCount ?? 0, i = a.indexCount ?? r - n;
      ve("geometry.slice", "firstIndex", n, r), ve("geometry.slice", "indexCount", i, r - n), ve("geometry.slice", "baseVertex", a.baseVertex ?? 0, Number.MAX_SAFE_INTEGER), this.firstIndex = n, this.indexCount = i, this.baseVertex = a.baseVertex ?? 0, this.vertexCount = e.vertexCount;
    } else {
      if (a.firstIndex !== void 0 || a.indexCount !== void 0 || a.baseVertex !== void 0)
        throw ze("geometry.slice", "Non-indexed slice needs firstVertex/vertexCount; omit index range fields.");
      const n = a.firstVertex ?? 0, r = e.vertexCount ?? 0, i = a.vertexCount ?? r - n;
      ve("geometry.slice", "firstVertex", n, r), ve("geometry.slice", "vertexCount", i, r - n), this.firstVertex = n, this.vertexCount = i, this.indexCount = e.indexCount;
    }
    ve("geometry.slice", "instanceCount", a.instanceCount ?? e.instanceCount ?? 0, Number.MAX_SAFE_INTEGER), this.instanceCount = a.instanceCount ?? e.instanceCount, Object.freeze(this);
  }
}
function Xs(t, e) {
  const a = me(t, "geometry"), n = Ks(e) ? e.build(a.device) : e;
  return Js(a, new Vs(a.device, n));
}
function Ks(t) {
  return "build" in t && typeof t.build == "function";
}
function Js(t, e) {
  return mr(t, e, (a) => a.destroy(), (a) => {
    e.onDestroy(a);
  });
}
function nn(t) {
  if (t === "unorm10-10-10-2" || t === "unorm8x4-bgra")
    return 4;
  const e = /^(float|uint|sint|unorm|snorm)(8|16|32)(?:x([234]))?$/.exec(t);
  if (!e)
    return 0;
  const [, a, n, r] = e;
  return (n === "32" ? /norm/.test(a) : !r || r === "3" || n === "8" && a === "float") ? 0 : Number(n) / 8 * Number(r ?? 1);
}
function Ys(t, e, a) {
  if (e.data !== void 0 && e.buffer !== void 0)
    throw q(a, "Choose data or buffer, not both.");
  const n = e.stepMode ?? "vertex";
  if (n !== "vertex" && n !== "instance")
    throw q(a, `Invalid stepMode: ${String(n)}.`);
  const r = [], i = [];
  let s = 0;
  for (const [f, m] of Object.entries(e.attributes)) {
    if (/^\d+$/.test(f))
      throw q(a, `Attribute '${f}' is numeric; use a non-numeric name.`);
    const p = typeof m == "string" ? { format: m } : m, I = nn(p.format);
    if (!I)
      throw q(a, `Unknown GPUVertexFormat '${p.format}'.`);
    const S = p.offset ?? s, N = Math.min(4, I);
    if (!Number.isInteger(S) || S < 0 || S % N !== 0)
      throw q(a, `Attribute '${f}' offset ${String(S)} needs ${N}-byte alignment.`);
    if (p.location !== void 0 && (!Number.isInteger(p.location) || p.location < 0 || p.location >= t.gpu.limits.maxVertexAttributes))
      throw q(a, `Location ${String(p.location)} for '${f}' is outside limit ${t.gpu.limits.maxVertexAttributes}.`);
    r.push({ shaderLocation: p.location ?? r.length, offset: S, format: p.format }), i.push({ name: f, format: p.format, location: p.location }), s += I;
  }
  const o = e.stride ?? to(s);
  if (!Number.isInteger(o) || o <= 0 || o > 2048 || o % 4 !== 0)
    throw q(a, `Stride ${String(o)} must be 4-aligned in [4,2048].`);
  for (const [f, m] of r.entries()) {
    const p = nn(m.format);
    if (m.offset + p > o)
      throw q(a, `Attribute '${i[f]?.name}' (${m.offset}+${p}) exceeds stride ${o}.`);
  }
  const c = e.data ? gr(e.data) : void 0;
  if (c !== void 0 && c % o !== 0)
    throw dr(a, `Data byteLength ${c} is not divisible by stride ${o}.`);
  const d = e.data !== void 0 ? t.createBuffer({ label: e.label, size: Math.max(4, c ?? 0), usage: ["vertex", "copy_dst"] }) : void 0;
  return d && e.data && d.write(e.data), { layout: Object.freeze({ arrayStride: o, ...e.stepMode ? { stepMode: n } : {}, attributes: Object.freeze(r) }), attributes: Object.freeze(i), stride: o, stepMode: n, byteLength: c, gpu: d?.gpu ?? eo(e.buffer, a), owned: d };
}
function Zs(t, e, a) {
  if (e.indices !== void 0 && e.indexBuffer !== void 0)
    throw q(a, "Choose indices or indexBuffer, not both.");
  if (e.indices === void 0) {
    const c = [e.indexBuffer, e.indexFormat, e.indexCount].filter((d) => d !== void 0).length;
    if (c !== 0 && c !== 3)
      throw q(a, "Provide indexBuffer, indexFormat, and indexCount together.");
    if (e.indexFormat !== void 0 && e.indexFormat !== "uint16" && e.indexFormat !== "uint32")
      throw q(a, `Unknown index format '${String(e.indexFormat)}'.`);
    return e.indexCount !== void 0 && ve(a, "indexCount", e.indexCount, Number.MAX_SAFE_INTEGER), { gpu: e.indexBuffer, format: e.indexFormat, count: e.indexCount };
  }
  if (e.indexFormat !== void 0)
    throw q(a, "indices infer format; omit indexFormat.");
  const n = Array.isArray(e.indices) ? new Uint32Array(e.indices) : e.indices, r = n instanceof Uint16Array ? "uint16" : "uint32", i = n.byteLength;
  if (i % (r === "uint16" ? 2 : 4) !== 0)
    throw dr(a, `Index byteLength ${i} is invalid for ${r}.`);
  const s = t.createBuffer({ label: e.label ? `${e.label}.indices` : void 0, size: Math.max(4, i), usage: ["index", "copy_dst"] });
  return s.write(n), { gpu: s.gpu, owned: s, format: r, count: n.length, byteLength: i };
}
function rn(t, e) {
  let a;
  for (const n of t)
    n.stepMode === e && n.byteLength !== void 0 && (a = Math.min(a ?? 1 / 0, Math.floor(n.byteLength / n.stride)));
  return a;
}
function sn(t, e, a, n) {
  if (a === void 0 && t.some((r) => r.stepMode === e && r.byteLength === void 0))
    throw q(n, `Raw ${e} buffer needs ${e}Count.`);
}
function qt(t, e, a, n) {
  a !== void 0 && ve(t, e, a, n ?? Number.MAX_SAFE_INTEGER);
}
function Qs(t) {
  for (const e of Object.keys(t))
    e !== "destroyed" && Object.defineProperty(t, e, { writable: !1, configurable: !1 });
}
const _s = /* @__PURE__ */ new Set(["point-list", "line-list", "line-strip", "triangle-list", "triangle-strip"]);
function eo(t, e) {
  if (!t)
    throw q(e, "Provide geometry buffer data or buffer.");
  return t;
}
function gr(t) {
  return t.byteLength;
}
function to(t) {
  return t + 3 & -4;
}
function pr(t, e, a, n) {
  if (!Number.isInteger(n) || n < 0 || n % 4 !== 0 || a % 4 !== 0 || n + a > e)
    throw Be(t, `Write size ${a}/offset ${String(n)} must be 4-aligned within ${e} bytes.`);
}
function ve(t, e, a, n) {
  if (!Number.isInteger(a) || a < 0 || a > n)
    throw ze(t, `${e}=${String(a)} must be an integer in [0,${n}].`);
}
function ao(t) {
  return t.startsWith("sint") ? "i32" : t.startsWith("uint") ? "u32" : "f32";
}
function kt(t) {
  return t.kind === "scalar" ? t.name : t.kind === "vector" || t.kind === "matrix" || t.kind === "atomic" ? kt(t.element) : t.kind;
}
class yr extends Error {
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
  constructor(e, a, n = 1, r = 1, i = "error") {
    super(a), this.name = "VGPUError", this.code = e, this.line = n, this.column = r, this.severity = i;
  }
}
function no(t, e, a = {}) {
  const n = new yr(t, e, a.line ?? 1, a.column ?? 1, a.severity ?? "error");
  return a.fix !== void 0 && (n.fix = a.fix), a.where !== void 0 && (n.where = a.where), a.cause !== void 0 && (n.cause = a.cause), a.metadata !== void 0 && (n.metadata = a.metadata), n;
}
function H(t, e, a = 1, n = 1) {
  return new yr(t, e, a, n);
}
const ro = /* @__PURE__ */ new Set(["fn", "struct", "const", "alias", "var", "override"]);
function io(t) {
  const e = [], a = [], n = [];
  let r = 0, i = !1, s = 0;
  for (; r < t.length; ) {
    const o = t[r];
    if (o.text === "{") {
      s++, r++;
      continue;
    }
    if (o.text === "}") {
      s = Math.max(0, s - 1), r++;
      continue;
    }
    if (wr(o)) {
      r++;
      continue;
    }
    if (s > 0) {
      r++;
      continue;
    }
    if (o.text === "import") {
      if (i)
        throw H("VGPU-WGSL-IMP-ORDER", "Imports must precede declarations", o.line, o.column);
      const [f, m] = so(t, r);
      e.push(f), r = m;
      continue;
    }
    if (o.text === "export" && t[r + 1]?.text === "{")
      throw H("VGPU-WGSL-EXP-REEXPORT-CYCLE", "Re-export cycles are not supported", o.line, o.column);
    if (o.text === "@" && t[r + 2]?.text === "export" && t[r + 3]?.text === "@")
      throw H("VGPU-WGSL-EXP-NOTDECL", "Repeated export attributes", o.line, o.column);
    const c = o.text === "export" || o.text === "@" && t[r + 2]?.text === "export", d = c ? oo(t, o.text === "export" ? r + 1 : r + 3) : r, l = t[d];
    if (l && ro.has(l.text)) {
      const f = co(t, d);
      a.push({ name: f, localName: f, kind: l.text }), c && n.push({ name: f, localName: f, kind: l.text }), i = !0;
    }
    r++;
  }
  return { imports: e, exports: n, locals: a };
}
function so(t, e) {
  let a = e + 1;
  const n = [];
  if (t[a]?.text === "{") {
    for (a++; t[a] && t[a].text !== "}"; ) {
      if (wr(t[a])) {
        a++;
        continue;
      }
      const s = Kt(t[a]);
      let o = s;
      a++, t[a]?.text === "as" && (o = Kt(t[a + 1]), a += 2), n.push({ imported: s, local: o }), t[a]?.text === "," && a++;
    }
    a++, Xt(t[a], "from"), a++;
  } else if (t[a]?.text === "*")
    Xt(t[a + 1], "as"), n.push({ imported: "*", local: Kt(t[a + 2]), namespace: !0 }), a += 3, Xt(t[a], "from"), a++;
  else throw t[a]?.kind === "string" ? H("VGPU-WGSL-IMP-SIDEEFFECT", "Side-effect imports are not supported", t[a].line, t[a].column) : H("VGPU-WGSL-IMP-DEFAULT", "Default imports are not supported", t[a]?.line, t[a]?.column);
  const r = t[a];
  if (r?.kind !== "string")
    throw H("VGPU-WGSL-RES-NOTFOUND", "Import path must be a string", r?.line, r?.column);
  const i = r.text.slice(1, -1);
  return a++, t[a]?.text === ";" && a++, [{ from: i, bindings: n, start: t[e].start, end: t[a - 1].end }, a];
}
function oo(t, e) {
  for (; t[e]?.text === "@"; ) {
    if (e += 2, t[e]?.text === "(")
      for (; t[e] && t[e].text !== ")"; )
        e++;
    t[e]?.text === ")" && e++;
  }
  return e;
}
function co(t, e) {
  let a = e + 1;
  if (t[e]?.text === "var" && t[a]?.text === "<")
    for (; t[a] && t[a].text !== ">"; )
      a++;
  for (; a < t.length; a++)
    if (t[a].kind === "ident")
      return t[a].text;
  throw H("VGPU-WGSL-EXP-NOTDECL", "Exported declaration has no name", t[e]?.line, t[e]?.column);
}
function Xt(t, e) {
  if (t?.text !== e)
    throw H("VGPU-WGSL-IMP-DEFAULT", `Expected ${e}`, t?.line, t?.column);
}
function Kt(t) {
  if (t?.kind !== "ident")
    throw H("VGPU-WGSL-IMP-DEFAULT", "Expected identifier", t?.line, t?.column);
  return t.text;
}
function wr(t) {
  return t.kind === "lineComment" || t.kind === "blockComment";
}
function lo(t, e) {
  return e === "uniform" || e === "storage" ? "buffer" : t.kind === "sampler" ? "sampler" : t.kind === "texture" ? t.textureKind === "texture_external" ? "externalTexture" : "texture" : "unknown";
}
function fo(t, e, a, n, r) {
  if (t === "buffer")
    return uo(e, a, r);
  if (n.kind === "sampler")
    return ho(n);
  if (n.kind === "texture")
    return n.textureKind === "texture_external" ? { kind: "externalTexture", externalTexture: {} } : n.textureKind.startsWith("texture_storage_") ? bo(n) : mo(n);
}
function uo(t, e, a) {
  return { kind: "buffer", buffer: { type: t === "uniform" ? "uniform" : e === "read" ? "read-only-storage" : "storage", hasDynamicOffset: !1, minBindingSize: a?.size } };
}
function ho(t) {
  return { kind: "sampler", sampler: { type: t.comparison ? "comparison" : "filtering" } };
}
function bo(t) {
  return {
    kind: "storageTexture",
    storageTexture: {
      access: po(t.access),
      format: t.texelFormat ?? "rgba8unorm",
      viewDimension: xr(t.dimension)
    }
  };
}
function mo(t) {
  return {
    kind: "texture",
    texture: {
      sampleType: go(t),
      viewDimension: xr(t.dimension),
      multisampled: t.dimension === "multisampled_2d" || t.dimension === "depth_multisampled_2d"
    }
  };
}
function go(t) {
  if (t.textureKind.startsWith("texture_depth_"))
    return "depth";
  const e = t.sampleType;
  return e?.kind === "scalar" && e.name === "i32" ? "sint" : e?.kind === "scalar" && e.name === "u32" ? "uint" : "unfilterable-float";
}
function xr(t) {
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
function po(t) {
  return t === "read" ? "read-only" : t === "read_write" ? "read-write" : "write-only";
}
const ae = (1n << 64n) - 1n, Ue = 11400714785074694791n, Ye = 14029467366897019727n, on = 1609587929392839161n, vr = 9650029242287828579n, cn = 2870177450012600261n;
function yo(t, e = 0n) {
  const a = new TextEncoder().encode(t);
  let n = 0, r;
  if (a.length >= 32) {
    let i = e + Ue + Ye, s = e + Ye, o = e, c = e - Ue;
    const d = a.length - 32;
    do
      i = Oe(i, Je(a, n)), n += 8, s = Oe(s, Je(a, n)), n += 8, o = Oe(o, Je(a, n)), n += 8, c = Oe(c, Je(a, n)), n += 8;
    while (n <= d);
    r = xe(i, 1n) + xe(s, 7n) + xe(o, 12n) + xe(c, 18n), r = mt(r, i), r = mt(r, s), r = mt(r, o), r = mt(r, c);
  } else
    r = e + cn;
  for (r = r + BigInt(a.length) & ae; n + 8 <= a.length; )
    r ^= Oe(0n, Je(a, n)), r = xe(r, 27n) * Ue + vr & ae, n += 8;
  for (n + 4 <= a.length && (r ^= wo(a, n) * Ue & ae, r = xe(r, 23n) * Ye + on & ae, n += 4); n < a.length; )
    r ^= BigInt(a[n]) * cn & ae, r = xe(r, 11n) * Ue & ae, n++;
  return r ^= r >> 33n, r = r * Ye & ae, r ^= r >> 29n, r = r * on & ae, r ^= r >> 32n, r.toString(16).padStart(16, "0");
}
function Oe(t, e) {
  return xe(t + e * Ye & ae, 31n) * Ue & ae;
}
function mt(t, e) {
  return t ^= Oe(0n, e), t * Ue + vr & ae;
}
function xe(t, e) {
  return (t << e | t >> 64n - e) & ae;
}
function Je(t, e) {
  let a = 0n;
  for (let n = 7; n >= 0; n--)
    a = (a << 8n) + BigInt(t[e + n]);
  return a;
}
function wo(t, e) {
  return BigInt(t[e]) | BigInt(t[e + 1]) << 8n | BigInt(t[e + 2]) << 16n | BigInt(t[e + 3]) << 24n;
}
function xo(t) {
  return yo(t);
}
function vo(t) {
  return xo(t).slice(0, 8);
}
function Io(t, e) {
  return `_vgsl_${vo(t)}__${e}`;
}
function ee(t, e) {
  const a = t.find((i) => i.name === e);
  if (!a)
    return;
  const n = a.args.map((i) => i.text).join(""), r = Number(n.replace(/[ui]$/, ""));
  return Number.isFinite(r) ? r : void 0;
}
function ba(t) {
  const e = [[]];
  let a = 0, n = 0;
  for (const r of t) {
    if (r.text === "<" ? a++ : r.text === ">" ? a = Math.max(0, a - 1) : r.text === "(" ? n++ : r.text === ")" && (n = Math.max(0, n - 1)), r.text === "," && a === 0 && n === 0) {
      e.push([]);
      continue;
    }
    e[e.length - 1].push(r);
  }
  return e.map(Ir).filter((r) => r.length > 0);
}
function Ir(t) {
  let e = 0, a = t.length;
  for (; e < a && t[e].text === ","; )
    e++;
  for (; a > e && t[a - 1].text === ","; )
    a--;
  return t.slice(e, a);
}
function ko(t) {
  if (t !== void 0 && kr(t))
    return Number(t.replace(/[ui]$/, ""));
}
function kr(t) {
  return /^(0|[1-9][0-9]*)([ui])?$/.test(t);
}
function Sr(t) {
  if (t === "read" || t === "write" || t === "read_write")
    return t;
}
function So(t) {
  return ["f32", "f16", "i32", "u32", "bool"].find((e) => e === t);
}
function Mo(t) {
  return { kind: "scalar", name: t === "f" ? "f32" : t === "h" ? "f16" : t === "i" ? "i32" : "u32" };
}
function Mr(t) {
  return t === "f16" ? 2 : 4;
}
function Ae(t, e) {
  return Math.ceil(e / t) * t;
}
function oe(t) {
  const e = Ir(t);
  if (e.length === 0)
    throw H("VGPU-WGSL-REFLECT-TYPE", "Expected WGSL type");
  const a = e.map((i) => i.text).join(""), n = Eo(a);
  if (n)
    return n;
  if (e[1]?.text === "<") {
    const i = e[0].text, s = ba(e.slice(2, -1)), o = Uo(i, s);
    if (o)
      return o;
  }
  const r = jo(a);
  return r || No(a);
}
function Eo(t) {
  const e = So(t);
  if (e)
    return { kind: "scalar", name: e };
  const a = t.match(/^vec([234])([fiuh])$/);
  if (a)
    return { kind: "vector", width: Number(a[1]), element: Mo(a[2]) };
  const n = t.match(/^mat([234])x([234])([fh])$/);
  if (n) {
    const r = n[3] === "h" ? { kind: "scalar", name: "f16" } : { kind: "scalar", name: "f32" };
    return { kind: "matrix", columns: Number(n[1]), rows: Number(n[2]), element: r };
  }
}
function Uo(t, e) {
  if (t === "array") {
    const a = e[1]?.map((r) => r.text).join(""), n = a === void 0 ? void 0 : ko(a);
    return { kind: "array", element: oe(e[0] ?? []), count: n, countExpression: a };
  }
  if (t === "atomic")
    return { kind: "atomic", element: oe(e[0] ?? []) };
  if (t === "vec2" || t === "vec3" || t === "vec4")
    return { kind: "vector", width: Number(t.slice(3)), element: oe(e[0] ?? []) };
  if (/^mat[234]x[234]$/.test(t))
    return { kind: "matrix", columns: Number(t[3]), rows: Number(t[5]), element: oe(e[0] ?? []) };
  if (t === "ptr")
    return { kind: "ptr", addressSpace: e[0]?.map((a) => a.text).join("") ?? "", element: oe(e[1] ?? []), access: e[2]?.map((a) => a.text).join("") };
  if (t === "sampler")
    return { kind: "sampler", comparison: !1 };
  if (t.startsWith("texture_storage_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(16), texelFormat: e[0]?.map((a) => a.text).join(""), access: Sr(e[1]?.map((a) => a.text).join("")) };
  if (t.startsWith("texture_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(8), sampleType: e[0] ? oe(e[0]) : void 0 };
}
function jo(t) {
  if (t === "sampler" || t === "sampler_comparison")
    return { kind: "sampler", comparison: t === "sampler_comparison" };
  if (t === "texture_external")
    return { kind: "texture", textureKind: t };
  if (t.startsWith("texture_depth_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(8) };
  if (t.startsWith("texture_"))
    return { kind: "texture", textureKind: t, dimension: t.slice(8) };
}
function No(t) {
  return { kind: "identifier", name: t };
}
function Se(t) {
  if (t?.kind !== "ident" && t?.kind !== "keyword")
    throw H("VGPU-WGSL-REFLECT-PARSE", "Expected identifier", t?.line, t?.column);
  return t.text;
}
function Le(t, e, a) {
  for (let n = e; n < t.length; n++)
    if (t[n].text === a)
      return n;
  throw H("VGPU-WGSL-REFLECT-PARSE", `Expected ${a}`, t[e]?.line, t[e]?.column);
}
function Co(t, e, a, n) {
  for (let r = e; r < a; r++)
    if (t[r].text === n)
      return r;
}
function Ht(t, e, a) {
  let n = 0;
  for (let r = e; r < t.length; r++)
    if ((t[r].text === "{" || t[r].text === "(") && n++, (t[r].text === "}" || t[r].text === ")") && (n = Math.max(0, n - 1)), n === 0 && t[r].text === a)
      return r;
  return t.length;
}
function ma(t, e) {
  const a = t[e].text, n = a === "(" ? ")" : a === "{" ? "}" : ">";
  let r = 0;
  for (let i = e; i < t.length; i++)
    if (t[i].text === a && r++, t[i].text === n && (r--, r === 0))
      return i;
  throw H("VGPU-WGSL-REFLECT-PARSE", `Unclosed ${a}`, t[e]?.line, t[e]?.column);
}
function ga(t, e) {
  const a = [];
  let n = e;
  for (; t[n]?.text === "@"; ) {
    const r = t[n], i = Se(t[n + 1]);
    n += 2;
    let s = [];
    if (t[n]?.text === "(") {
      const o = ma(t, n);
      s = t.slice(n + 1, o), n = o + 1;
    }
    a.push({ name: i, args: s, token: r });
  }
  return [a, n];
}
function $e(t) {
  switch (t.kind) {
    case "scalar":
      return t.name;
    case "identifier":
      return t.name;
    case "vector":
      return `vec${t.width}<${$e(t.element)}>`;
    case "matrix":
      return `mat${t.columns}x${t.rows}<${$e(t.element)}>`;
    case "array":
      return `array<${$e(t.element)}${t.count === void 0 ? "" : `,${t.count}`}>`;
    default:
      return t.kind;
  }
}
function To(t) {
  const e = t.find((n) => n.name === "workgroup_size");
  if (!e)
    return;
  const a = ba(e.args).map((n) => Number(n.map((r) => r.text).join("")));
  return [a[0] ?? 1, a[1] ?? 1, a[2] ?? 1];
}
function Ao(t, e) {
  if (t[e]?.text !== "<")
    return { after: e };
  const a = Le(t, e, ">"), n = ba(t.slice(e + 1, a)).map((r) => r.map((i) => i.text).join(""));
  return { addressSpace: n[0], access: Sr(n[1]), after: a + 1 };
}
function Lo(t) {
  const e = [], a = [], n = [], r = [], i = [], s = [], o = t.tokens.filter((l) => l.kind !== "lineComment" && l.kind !== "blockComment");
  let c = 0, d = 0;
  for (; c < o.length; ) {
    const l = o[c];
    if (l.text === "{") {
      d++, c++;
      continue;
    }
    if (l.text === "}") {
      d = Math.max(0, d - 1), c++;
      continue;
    }
    if (d > 0) {
      c++;
      continue;
    }
    const f = c, [m, p] = ga(o, c);
    c = p, o[c]?.text === "export" && c++;
    const I = o[c]?.text;
    if (I === "enable") {
      o[c + 1]?.kind === "ident" && s.push(o[c + 1].text), c = Ht(o, c, ";") + 1;
      continue;
    }
    if (I === "struct") {
      const S = Oo(t, o, c);
      S.item && e.push(S.item), c = S.next;
      continue;
    }
    if (I === "alias") {
      const S = Fo(t, o, c);
      S.item && a.push(S.item), c = S.next;
      continue;
    }
    if (I === "var") {
      const S = Po(t, o, c, m);
      S.item && n.push(S.item), c = S.next;
      continue;
    }
    if (I === "fn") {
      const S = Bo(t, o, c, m);
      S.item && r.push(S.item), c = S.next;
      continue;
    }
    if (I === "override") {
      const S = Ro(o, c, m);
      S.item && i.push(S.item), c = S.next;
      continue;
    }
    c = Math.max(f + 1, c + 1);
  }
  return { structs: e, aliases: a, vars: n, entries: r, overrides: i, features: s };
}
function Oo(t, e, a, n) {
  const r = Se(e[a + 1]), i = Le(e, a + 2, "{"), s = ma(e, i);
  return {
    item: { name: r, originalName: r, mangledName: pa(t, r, "struct"), members: Do(e.slice(i + 1, s)), path: t.path },
    next: s + 1
  };
}
function Fo(t, e, a, n) {
  const r = Se(e[a + 1]), i = Le(e, a + 2, "="), s = Ht(e, i + 1, ";");
  return {
    item: { name: r, originalName: r, mangledName: pa(t, r, "alias"), target: oe(e.slice(i + 1, s)), path: t.path },
    next: s + 1
  };
}
function Po(t, e, a, n) {
  const { addressSpace: r, access: i, after: s } = Ao(e, a + 1), o = Se(e[s]), c = Le(e, s + 1, ":"), d = Ht(e, c + 1, ";");
  return {
    item: { path: t.path, name: o, mangledName: zo(n) ? o : pa(t, o, "var"), attrs: n, addressSpace: r, access: i, type: oe(e.slice(c + 1, d)) },
    next: d + 1
  };
}
function Bo(t, e, a, n) {
  const r = Se(e[a + 1]), i = n.find((c) => c.name === "vertex" || c.name === "fragment" || c.name === "compute")?.name;
  if (!i)
    return { item: void 0, next: a + 1 };
  const s = Le(e, a + 2, "("), o = ma(e, s);
  return { item: { name: r, mangledName: r, stage: i, workgroupSize: To(n), path: t.path, params: $o(e.slice(s + 1, o)) }, next: o + 1 };
}
function $o(t) {
  const e = [];
  let a = 0;
  for (; a < t.length; ) {
    const [n, r] = ga(t, a);
    if (a = r, !t[a] || t[a].text === ",") {
      a++;
      continue;
    }
    const i = Se(t[a]), s = Le(t, a + 1, ":");
    let o = s + 1, c = 0;
    for (; o < t.length && (t[o].text === "<" && c++, t[o].text === ">" && (c = Math.max(0, c - 1)), !(c === 0 && t[o].text === ",")); )
      o++;
    e.push({ name: i, attrs: n, type: oe(t.slice(s + 1, o)) }), a = o + 1;
  }
  return e;
}
function Ro(t, e, a) {
  const n = Se(t[e + 1]), r = Ht(t, e + 1, ";"), i = Co(t, e + 2, r, "=");
  return { item: { name: n, mangledName: n, id: ee(a, "id"), defaultValue: i === void 0 ? void 0 : t.slice(i + 1, r).map((s) => s.text).join("") }, next: r + 1 };
}
function Do(t) {
  const e = [];
  let a = 0;
  for (; a < t.length; ) {
    const [n, r] = ga(t, a);
    if (a = r, !t[a] || t[a].text === "," || t[a].text === ";") {
      a++;
      continue;
    }
    const i = Se(t[a]), s = Le(t, a + 1, ":");
    let o = s + 1, c = 0;
    for (; o < t.length && (t[o].text === "<" && c++, t[o].text === ">" && (c = Math.max(0, c - 1)), !(c === 0 && (t[o].text === "," || t[o].text === ";"))); )
      o++;
    e.push({ name: i, attrs: n, type: oe(t.slice(s + 1, o)), align: ee(n, "align"), size: ee(n, "size") }), a = o + 1;
  }
  return e;
}
function pa(t, e, a) {
  return a === "override" ? e : Io(t.path, e);
}
function zo(t) {
  return ee(t, "group") !== void 0 || ee(t, "binding") !== void 0;
}
const Ho = "literal length required for auto layout; use draw.group(n, bg) manual binding", Go = "VGPUError: `bool` is not host-shareable in uniform/storage. Fix: use `u32` (0 | 1) → struct Params { enabled: u32 }", Er = "use a manual group claim (`draw.group(n, bg)`)";
function Vo(t = 1, e = 1) {
  return H("VGPU-WGSL-REFLECT-ARRAY-LENGTH", Ho, t, e);
}
function Ur(t = 1, e = 1) {
  return H("VGPU-WGSL-REFLECT-BOOL-HOST-SHAREABLE", Go, t, e);
}
function Nt(t, e, a = 1, n = 1) {
  return H("VGPU-WGSL-REFLECT-UNKNOWN-TYPE", `type '${t}' is unknown in ${e}; ${Er}`, a, n);
}
function dn(t, e, a = 1, n = 1) {
  return H("VGPU-WGSL-REFLECT-NS-TYPE", `type '${t}' is a namespace-member import; use a named import or manual @group(1+) binding`, a, n);
}
function jr(t, e = 1, a = 1) {
  return H("VGPU-WGSL-REFLECT-NON-HOST-SHAREABLE", `Type ${t} is not host-shareable; ${Er}`, e, a);
}
const Ve = "naga-standard";
function Wo(t, e, a) {
  const n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = /* @__PURE__ */ new Map();
    for (const c of [...s.structs, ...s.aliases])
      o.set(c.originalName, { path: c.path, name: c.originalName, mangledName: c.mangledName, kind: "members" in c ? "struct" : "alias" });
    n.set(s.structs[0]?.path ?? s.aliases[0]?.path ?? s.vars[0]?.path ?? "", o);
  }
  const r = new Map(t.map((s) => [s.path, n.get(s.path) ?? /* @__PURE__ */ new Map()])), i = /* @__PURE__ */ new Map();
  for (const s of t) {
    const o = new Map(r.get(s.path));
    for (const c of s.parsed.imports)
      qo(s, c, o, t, r);
    i.set(s.path, o);
  }
  return i;
}
function qo(t, e, a, n, r, i) {
  const s = Ko(e, t.path, n), o = r.get(s);
  for (const c of e.bindings) {
    if (c.namespace) {
      a.set(c.local, { path: s, name: c.local, mangledName: c.local, kind: "namespace" });
      continue;
    }
    const d = o?.get(c.imported);
    d && a.set(c.local, d);
  }
}
function Xo(t, e) {
  const a = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  for (const i of t) {
    for (const s of i.structs) {
      const o = {
        name: s.name,
        mangledName: s.mangledName,
        members: s.members.map((c) => ({ name: c.name, type: Te(c.type, s.path, e), align: c.align, size: c.size }))
      };
      a.set(s.mangledName, o), r.set(s.mangledName, o);
    }
    for (const s of i.aliases) {
      const o = { name: s.name, mangledName: s.mangledName, target: Te(s.target, s.path, e) };
      n.set(s.mangledName, o), r.set(s.mangledName, o);
    }
  }
  return { structs: a, aliases: n, byMangled: r };
}
function Te(t, e, a, n) {
  switch (t.kind) {
    case "identifier": {
      const r = t.name.indexOf(".");
      if (r > 0) {
        const s = t.name.slice(0, r);
        if (a.get(e)?.get(s)?.kind === "namespace")
          throw dn(t.name);
      }
      const i = a.get(e)?.get(t.name);
      if (i?.kind === "namespace")
        throw dn(t.name);
      if (!i)
        throw Nt(t.name, e);
      return { kind: "identifier", name: i.name, mangledName: i.mangledName };
    }
    case "array":
    case "atomic":
    case "vector":
    case "matrix":
    case "ptr":
      return { ...t, element: Te(t.element, e, a) };
    case "texture":
      return { ...t, sampleType: t.sampleType ? Te(t.sampleType, e, a) : void 0 };
    default:
      return t;
  }
}
function We(t, e) {
  if (!e || t.kind !== "identifier")
    return t;
  const a = e.aliases.get(t.mangledName ?? t.name);
  return a ? We(a.target, e) : t;
}
function ra(t, e) {
  const a = We(t, e);
  switch (a.kind) {
    case "array":
    case "atomic":
    case "vector":
    case "matrix":
    case "ptr":
      return { ...a, element: ra(a.element, e) };
    case "texture":
      return { ...a, sampleType: a.sampleType ? ra(a.sampleType, e) : void 0 };
    default:
      return a;
  }
}
function Ko(t, e, a, n) {
  const r = void 0;
  if (r !== void 0 && a.some((d) => d.path === r))
    return r;
  const i = t.from, s = e.slice(0, e.lastIndexOf("/") + 1), o = i.startsWith("/") ? i : Jo(`${s}${i}`);
  return [i, o].find((d) => a.some((l) => l.path === d)) ?? r ?? o;
}
function Jo(t) {
  const e = t.startsWith("/"), a = [];
  for (const n of t.split("/"))
    !n || n === "." || (n === ".." ? a.pop() : a.push(n));
  return `${e ? "/" : ""}${a.join("/")}`;
}
function dt(t, e, a = $e(t), n = a, r) {
  const i = r ? ra(t, r) : t;
  return Yo(i, e, a, n, r);
}
function Yo(t, e, a, n, r) {
  switch (t.kind) {
    case "scalar":
      return Zo(t, e, a, n);
    case "atomic":
      return Qo(t, e, a, n);
    case "vector":
      return _o(t, e, a, n, r);
    case "matrix":
      return ec(t, e, a, n, r);
    case "array":
      return tc(t, e, a, n, r);
    case "identifier":
      return nc(t, e, a, n, r);
    default:
      throw jr($e(t));
  }
}
function Zo(t, e, a, n) {
  const r = Mr(t.name);
  if (t.name === "bool")
    throw Ur();
  return { name: a, mangledName: n, addressSpace: e, layoutMode: Ve, type: t, align: r, size: r };
}
function Qo(t, e, a, n) {
  return { name: a, mangledName: n, addressSpace: e, layoutMode: Ve, type: t, align: 4, size: 4 };
}
function _o(t, e, a, n, r) {
  const s = dt(t.element, e, a, n, r).size ?? 4, o = t.width === 2 ? s * 2 : s * 4;
  return { name: a, mangledName: n, addressSpace: e, layoutMode: Ve, type: t, align: o, size: s * t.width };
}
function ec(t, e, a, n, r) {
  const i = { kind: "vector", width: t.rows, element: t.element }, s = dt(i, e, `${a}[]`, `${n}[]`, r), o = Ae(s.align, s.size ?? 0);
  return { name: a, mangledName: n, addressSpace: e, layoutMode: Ve, type: t, align: s.align, size: o * t.columns, stride: o, element: s };
}
function tc(t, e, a, n, r) {
  ac(t.countExpression);
  const i = dt(t.element, e, `${a}[]`, `${n}[]`, r), s = Ae(at(t.element, e, r), i.size ?? 0);
  return {
    name: a,
    mangledName: n,
    addressSpace: e,
    layoutMode: Ve,
    type: t,
    align: at(t, e, r),
    size: t.count === void 0 ? void 0 : s * t.count,
    stride: s,
    element: i,
    runtimeSized: t.count === void 0
  };
}
function ac(t) {
  if (t !== void 0 && !kr(t))
    throw Vo();
}
function nc(t, e, a, n, r) {
  if (!r)
    throw Nt(t.name, "<unknown>");
  const i = r.structs.get(t.mangledName ?? t.name);
  if (!i)
    throw Nt(t.name, "<unknown>");
  const s = [];
  let o = 0, c = 1;
  for (const l of i.members) {
    const f = rc(l, e, o, r);
    s.push(f.member), o = ic(e, l.type, f.offset, f.member.size ?? 0, r), c = Math.max(c, f.member.align);
  }
  const d = oc(e, c);
  return { name: a, mangledName: n, addressSpace: e, layoutMode: Ve, type: t, align: d, size: Ae(d, o), members: s };
}
function rc(t, e, a, n) {
  const r = dt(t.type, e, t.name, t.name, n), i = Math.max(at(t.type, e, n), t.align ?? 1), s = Math.max(r.size ?? 0, t.size ?? 0), o = Ae(i, a);
  return {
    member: { name: t.name, offset: o, align: i, size: s, type: t.type, layout: r, explicitAlign: t.align, explicitSize: t.size },
    offset: o
  };
}
function ic(t, e, a, n, r) {
  return a + (t === "uniform" && sc(e, r) ? Ae(16, n) : n);
}
function sc(t, e) {
  const a = We(t, e);
  return a.kind === "identifier" && e.structs.has(a.mangledName ?? a.name);
}
function oc(t, e) {
  return t === "uniform" ? Ae(16, e) : e;
}
function at(t, e, a) {
  const n = a ? We(t, a) : t, r = St(n, e, a);
  return e === "uniform" && cc(n, a) ? Ae(16, r) : r;
}
function cc(t, e) {
  return t.kind === "array" || t.kind === "identifier" && !!e?.structs.get(t.mangledName ?? t.name);
}
function St(t, e, a) {
  const n = a ? We(t, a) : t;
  switch (n.kind) {
    case "scalar":
      return dc(n.name);
    case "atomic":
      return 4;
    case "vector":
      return n.width === 2 ? St(n.element, e, a) * 2 : St(n.element, e, a) * 4;
    case "matrix":
      return St({ kind: "vector", width: n.rows, element: n.element }, e, a);
    case "array":
      return at(n.element, e, a);
    case "identifier":
      return lc(n, e, a);
    default:
      throw jr($e(n));
  }
}
function dc(t) {
  if (t === "bool")
    throw Ur();
  return Mr(t);
}
function lc(t, e, a) {
  const n = a?.structs.get(t.mangledName ?? t.name);
  if (!n)
    throw Nt(t.name, "<unknown>");
  return Math.max(1, ...n.members.map((r) => Math.max(at(r.type, e, a), r.align ?? 1)));
}
const fc = /* @__PURE__ */ new Set([
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
]), uc = /* @__PURE__ */ new Set(["import", "export", "from", "as"]), Nr = /* @__PURE__ */ new Set([...fc, ...uc]), hc = /* @__PURE__ */ new Set([
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
]), bc = /* @__PURE__ */ new Set(["binding_array"]), mc = /* @__PURE__ */ new Set([
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
]), gc = /* @__PURE__ */ new Set([
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
]), pc = /* @__PURE__ */ new Set([
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
]), yc = /* @__PURE__ */ new Set([
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
]), wc = /* @__PURE__ */ new Set(["function", "private", "storage", "uniform", "workgroup"]), xc = /* @__PURE__ */ new Set(["read", "read_write", "write"]), vc = /* @__PURE__ */ new Set([
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
  ...Nr,
  ...hc,
  ...bc,
  ...mc,
  ...gc,
  ...pc,
  ...yc,
  ...wc,
  ...xc,
  ...vc
];
const Ic = "VGPU-WGSL-IDENT-NONASCII", kc = "https://github.com/vercel-labs/vgpu/issues/294";
function Sc(t, e) {
  const a = [];
  let n = 0, r = 1, i = 1;
  const s = (c, d, l, f, m) => a.push({ kind: c, text: t.slice(d, l), start: d, end: l, line: f, column: m }), o = () => {
    t[n] === `
` ? (r++, i = 1) : i++, n++;
  };
  for (; n < t.length; ) {
    const c = t[n];
    if (/\s/.test(c)) {
      o();
      continue;
    }
    const d = n, l = r, f = i;
    if (c === "/" && t[n + 1] === "/") {
      for (; n < t.length && t[n] !== `
`; )
        o();
      s("lineComment", d, n, l, f);
      continue;
    }
    if (c === "/" && t[n + 1] === "*") {
      let m = 0;
      for (; n < t.length; ) {
        if (t[n] === "/" && t[n + 1] === "*") {
          m++, o(), o();
          continue;
        }
        if (t[n] === "*" && t[n + 1] === "/") {
          if (m--, o(), o(), m === 0) {
            s("blockComment", d, n, l, f);
            break;
          }
          continue;
        }
        o();
      }
      if (m !== 0)
        throw H("VGPU-WGSL-LEX-UNTERM-COMMENT", "Unterminated block comment", l, f);
      continue;
    }
    if (c === '"' || c === "'") {
      const m = c;
      for (o(); n < t.length && t[n] !== m; ) {
        if (t[n] === `
`)
          throw H("VGPU-WGSL-LEX-UNTERM-STRING", "Unterminated string", l, f);
        t[n] === "\\" && o(), o();
      }
      if (n >= t.length)
        throw H("VGPU-WGSL-LEX-UNTERM-STRING", "Unterminated string", l, f);
      o(), s("string", d, n, l, f);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      for (; n < t.length && /[A-Za-z0-9_]/.test(t[n]); )
        o();
      const m = t.slice(d, n);
      s(Nr.has(m) ? "keyword" : "ident", d, n, l, f);
      continue;
    }
    if (/[0-9]/.test(c) || c === "." && /[0-9]/.test(t[n + 1] ?? "")) {
      for (c === "." && o(); n < t.length; ) {
        const m = t[n];
        if (/[A-Za-z0-9_.]/.test(m)) {
          o();
          continue;
        }
        if ((m === "+" || m === "-") && Ec(t[n - 1]) && /[0-9]/.test(t[n + 1] ?? "")) {
          o();
          continue;
        }
        break;
      }
      s("number", d, n, l, f);
      continue;
    }
    if (c.charCodeAt(0) > 127)
      throw Mc(t, n, r, i, e);
    o(), s("punct", d, n, l, f);
  }
  return a;
}
function Mc(t, e, a, n, r) {
  let i = e;
  for (; i > 0 && ln(t[i - 1]); )
    i--;
  let s = e + 1;
  for (; s < t.length && ln(t[s]); )
    s++;
  const o = t.slice(i, s), c = n - (e - i), d = r === void 0 ? "" : ` in ${r}`, l = no(Ic, `Non-ASCII identifier '${o}'${d} at line ${a} column ${c}; vgpu's WGSL pipeline supports ASCII identifiers only`, { fix: `Rename '${o}' using ASCII letters, digits and '_'. Unicode (XID) identifiers are tracked in ${kc}`, line: a, column: c });
  return l.range = { file: r, start: { line: a, column: c } }, l;
}
function ln(t) {
  return t.charCodeAt(0) > 127 || /[A-Za-z0-9_]/.test(t);
}
function Ec(t) {
  return t === "e" || t === "E" || t === "p" || t === "P";
}
const Uc = /^_vgsl_[0-9a-f]{8,16}__[A-Za-z_][A-Za-z0-9_]*$/, jc = /* @__PURE__ */ new Set(["fn", "struct", "const", "alias", "var", "override"]);
function Cr(t) {
  return new Nc(t).analyze();
}
class Nc {
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
      preservedTokens: [...this.preserved.entries()].map(([e, a]) => ({ tokenIndex: e, reason: a })),
      fallback: { wholeModule: this.moduleFallbackReasons.length > 0, reasons: this.moduleFallbackReasons }
    };
  }
  collectTopLevel() {
    let e = 0;
    for (let a = 0; a < this.tokens.length; a++) {
      const n = this.tokens[a];
      if (!ue(n)) {
        if (n.text === "{") {
          e++;
          continue;
        }
        if (n.text === "}") {
          e--, e < 0 && (this.moduleFallback("unmatched top-level closing brace", a), e = 0);
          continue;
        }
        if (e === 0) {
          if (n.text === "@") {
            a = this.preserveAttribute(a);
            continue;
          }
          if (n.text === "enable" || n.text === "requires" || n.text === "diagnostic" || n.text === "const_assert") {
            a = this.preserveStatement(a, "directive");
            continue;
          }
          if (n.text !== "export") {
            if (n.text === "struct") {
              a = this.collectStruct(a);
              continue;
            }
            if (n.text === "fn") {
              a = this.collectFunction(a);
              continue;
            }
            if (n.text === "const" || n.text === "alias" || n.text === "var" || n.text === "override") {
              a = this.preserveGlobalDeclaration(a);
              continue;
            }
            n.kind === "keyword" && !jc.has(n.text) && this.moduleFallback(`unexpected top-level keyword '${n.text}'`, a);
          }
        }
      }
    }
    e !== 0 && this.moduleFallback("unclosed top-level brace", this.tokens.length - 1), this.scopes[this.moduleScopeId].endToken = Math.max(0, this.tokens.length - 1);
  }
  collectStruct(e) {
    const a = this.nextSig(e);
    if (a === void 0 || this.tokens[a]?.kind !== "ident")
      return this.moduleFallback("struct without name", e), e;
    this.preserveToken(a, "global");
    const n = this.nextSig(a);
    if (n === void 0 || this.tokens[n]?.text !== "{")
      return this.moduleFallback("struct without body", e), a;
    const r = this.findMatching(n, "{", "}");
    if (r === void 0)
      return this.moduleFallback("unclosed struct body", n), n;
    for (let i = n; i <= r; i++)
      this.tokens[i]?.kind === "ident" && this.preserveToken(i, "struct");
    return r;
  }
  collectFunction(e) {
    const a = this.nextSig(e);
    if (a === void 0 || this.tokens[a]?.kind !== "ident")
      return this.moduleFallback("function without name", e), e;
    const n = this.tokens[a].text, r = Uc.test(n) && !this.hasEntryAttributeBefore(e);
    this.addDeclaration(n, "function", a, this.moduleScopeId, void 0, r), r || this.preserveToken(a, "global");
    const i = this.nextSig(a);
    if (i === void 0 || this.tokens[i]?.text !== "(")
      return this.moduleFallback("function without parameter list", a), a;
    const s = this.findMatching(i, "(", ")");
    if (s === void 0)
      return this.moduleFallback("unclosed function parameter list", i), i;
    const o = this.findNextText(s + 1, "{");
    if (o === void 0)
      return this.moduleFallback("function without body", s), s;
    this.preserveFunctionSignatureTail(s + 1, o);
    const c = this.findMatching(o, "{", "}");
    if (c === void 0)
      return this.moduleFallback("unclosed function body", o), o;
    const d = this.createScope("function", this.moduleScopeId, this.functions.length, i);
    return this.functions.push({ id: this.functions.length, name: n, nameTokenIndex: a, scopeId: d, bodyStartToken: o, bodyEndToken: c, skipped: !1, fallbackReasons: [] }), this.collectParams(i, s, d, this.functions.length - 1), this.scopes[d].endToken = c, c;
  }
  collectParams(e, a, n, r) {
    for (let i = e + 1; i < a; i++) {
      const s = this.tokens[i];
      if (!ue(s)) {
        if (s.text === "@") {
          i = this.preserveAttribute(i);
          continue;
        }
        if (s.kind === "ident" && this.nextSig(i) !== void 0 && this.tokens[this.nextSig(i)]?.text === ":") {
          this.addDeclaration(s.text, "param", i, n, r, !0);
          const o = this.nextSig(i);
          i = this.preserveTypeFrom(o + 1, [",", ")"], a);
        }
      }
    }
  }
  preserveFunctionSignatureTail(e, a) {
    for (let n = e; n < a; n++) {
      const r = this.tokens[n];
      if (!ue(r)) {
        if (r.text === "@") {
          n = this.preserveAttribute(n);
          continue;
        }
        r.kind === "ident" && this.preserveToken(n, "type");
      }
    }
  }
  preserveGlobalDeclaration(e) {
    let a = e + 1;
    if (this.tokens[e]?.text === "var") {
      const i = this.nextSig(e);
      if (i !== void 0 && this.tokens[i]?.text === "<") {
        const s = this.findMatching(i, "<", ">");
        if (s === void 0)
          return this.moduleFallback("unparseable top-level var template", i), i;
        this.preserveRange(i, s, "type"), a = s + 1;
      }
    }
    const n = this.findNextIdent(a);
    n !== void 0 && (this.preserveToken(n, "global"), this.addDeclaration(this.tokens[n].text, "global", n, this.moduleScopeId, void 0, !1));
    const r = this.findStatementEnd(e);
    for (let i = e; i <= r; i++)
      this.tokens[i]?.kind === "ident" && this.preserveToken(i, "global");
    return r;
  }
  walkFunction(e) {
    const a = [this.moduleScopeId, e.scopeId], n = [], r = (o, c) => {
      const d = this.createScope(o, a[a.length - 1], e.id, c);
      return a.push(d), d;
    }, i = (o) => {
      if (a.length <= 2) {
        this.functionFallback(e, "scope frame underflow", o);
        return;
      }
      const c = a.pop();
      return this.scopes[c].endToken = o, c;
    };
    r("block", e.bodyStartToken);
    let s = 1;
    for (let o = e.bodyStartToken + 1; o < e.bodyEndToken; o++) {
      this.activatePendingSymbols(o);
      const c = this.tokens[o];
      if (ue(c))
        continue;
      if (c.text === "@") {
        o = this.preserveAttribute(o);
        continue;
      }
      if (c.text === ".") {
        const l = this.nextSig(o);
        l !== void 0 && this.tokens[l]?.kind === "ident" && this.preserveToken(l, "member");
        continue;
      }
      if (c.text === "enable" || c.text === "requires" || c.text === "diagnostic") {
        o = this.preserveStatement(o, "directive");
        continue;
      }
      if (c.text === "for") {
        const l = r("for-init", o), f = this.nextSig(o);
        (f === void 0 || this.tokens[f]?.text !== "(") && this.functionFallback(e, "for without parenthesized header", o), n.push({ scopeId: l, headerDepth: 0, awaitingBody: !1 });
        continue;
      }
      const d = n[n.length - 1];
      if (d && d.bodyDepth === void 0 && (c.text === "(" && d.headerDepth++, c.text === ")" && (d.headerDepth--, d.headerDepth <= 0 && (d.awaitingBody = !0))), c.text === "{") {
        s++;
        const l = Cc(n, (f) => f.awaitingBody && f.bodyDepth === void 0);
        l && (l.bodyDepth = s), r("block", o);
        continue;
      }
      if (c.text === "}") {
        const l = s;
        for (i(o), s--; n.length > 0 && n[n.length - 1].bodyDepth === l; )
          i(o), n.pop();
        s < 0 && this.functionFallback(e, "unmatched closing brace", o);
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
        o = this.collectLocalDeclaration(o, a[a.length - 1], e);
        continue;
      }
      if (c.kind === "ident" && !this.preserved.has(o)) {
        const l = this.resolve(c.text, a);
        l !== void 0 ? this.references.push({ name: c.text, tokenIndex: o, declarationId: l, scopeId: a[a.length - 1], functionId: e.id }) : this.preserveToken(o, "unknown");
      }
    }
    for (; a.length > 2; )
      i(e.bodyEndToken);
  }
  collectLocalDeclaration(e, a, n) {
    const r = this.tokens[e].text;
    let i = e + 1;
    if (r === "var") {
      const c = this.nextSig(e);
      if (c !== void 0 && this.tokens[c]?.text === "<") {
        const d = this.findMatching(c, "<", ">");
        if (d === void 0)
          return this.functionFallback(n, "unparseable var template", c), c;
        this.preserveRange(c, d, "type"), i = d + 1;
      }
    }
    const s = this.findNextIdent(i);
    if (s === void 0 || s >= n.bodyEndToken)
      return this.functionFallback(n, `${r} without identifier`, e), e;
    this.addDeclaration(this.tokens[s].text, r, s, a, n.id, !0, this.findStatementEnd(e));
    const o = this.nextSig(s);
    return o !== void 0 && this.tokens[o]?.text === ":" ? this.preserveTypeFrom(o + 1, ["=", ";", ",", ")"], n.bodyEndToken) : s;
  }
  addDeclaration(e, a, n, r, i, s, o) {
    const c = this.declarations.length;
    return this.declarations.push({ id: c, name: e, kind: a, tokenIndex: n, scopeId: r, functionId: i, safeToRename: s }), o !== void 0 ? this.pendingSymbols.push({ name: e, id: c, scopeId: r, activateAfter: o }) : this.activateSymbol(e, c, r), c;
  }
  activatePendingSymbols(e) {
    for (let a = this.pendingSymbols.length - 1; a >= 0; a--) {
      const n = this.pendingSymbols[a];
      n.activateAfter >= e || (this.activateSymbol(n.name, n.id, n.scopeId), this.pendingSymbols.splice(a, 1));
    }
  }
  activateSymbol(e, a, n) {
    let r = this.symbolsByScope.get(n);
    r || (r = /* @__PURE__ */ new Map(), this.symbolsByScope.set(n, r)), r.has(e) || r.set(e, a);
  }
  resolve(e, a) {
    for (let n = a.length - 1; n >= 0; n--) {
      const r = this.symbolsByScope.get(a[n])?.get(e);
      if (r !== void 0)
        return r;
    }
  }
  preserveAttribute(e) {
    this.preserveToken(e, "attribute");
    const a = this.nextSig(e);
    if (a === void 0)
      return e;
    this.preserveToken(a, "attribute");
    const n = this.nextSig(a);
    if (n === void 0 || this.tokens[n]?.text !== "(")
      return a;
    const r = this.findMatching(n, "(", ")");
    return r === void 0 ? (this.preserveRange(n, n, "attribute"), n) : (this.preserveRange(n, r, "attribute"), r);
  }
  preserveTypeFrom(e, a, n) {
    let r = 0, i = 0, s = 0, o = e - 1;
    for (let c = e; c < n; c++) {
      const d = this.tokens[c];
      if (!ue(d)) {
        if (r === 0 && i === 0 && s === 0 && a.includes(d.text))
          return Math.max(e - 1, c - 1);
        if (d.text === "<")
          r++;
        else if (d.text === ">")
          r = Math.max(0, r - 1);
        else if (d.text === "(")
          i++;
        else if (d.text === ")") {
          if (i === 0 && a.includes(")"))
            return Math.max(e - 1, c - 1);
          i = Math.max(0, i - 1);
        } else d.text === "[" ? s++ : d.text === "]" && (s = Math.max(0, s - 1));
        d.kind === "ident" && this.preserveToken(c, "type"), o = c;
      }
    }
    return o;
  }
  preserveStatement(e, a) {
    const n = this.findStatementEnd(e);
    return this.preserveRange(e, n, a), n;
  }
  preserveRange(e, a, n) {
    for (let r = e; r <= a; r++)
      this.tokens[r] && this.tokens[r].kind !== "lineComment" && this.tokens[r].kind !== "blockComment" && this.preserveToken(r, n);
  }
  preserveToken(e, a) {
    this.preserved.has(e) || this.preserved.set(e, a);
  }
  createScope(e, a, n, r) {
    const i = this.scopes.length;
    return this.scopes.push({ id: i, kind: e, parentId: a, functionId: n, startToken: r }), i;
  }
  nextSig(e) {
    for (let a = e + 1; a < this.tokens.length; a++)
      if (!ue(this.tokens[a]))
        return a;
  }
  findNextIdent(e) {
    for (let a = e; a < this.tokens.length; a++) {
      const n = this.tokens[a];
      if (!ue(n)) {
        if (n.kind === "ident")
          return a;
        if (n.text !== "@")
          return;
      }
    }
  }
  findNextText(e, a) {
    for (let n = e; n < this.tokens.length; n++)
      if (!ue(this.tokens[n]) && this.tokens[n].text === a)
        return n;
  }
  // `<` / `>` are deliberately not tracked here: in a declaration's initializer they are
  // comparison or shift operators, not template brackets, and a net-positive count made this scan
  // overshoot the statement's own `;` (vgpu#251). A WGSL template argument list can never contain
  // `;`, `{` or `}`, so angle depth is not load-bearing for finding a statement end.
  findStatementEnd(e) {
    let a = 0;
    for (let n = e; n < this.tokens.length; n++) {
      const r = this.tokens[n].text;
      if (r === "(")
        a++;
      else if (r === ")")
        a = Math.max(0, a - 1);
      else if (a === 0 && (r === ";" || r === "{" || r === "}"))
        return n;
    }
    return this.tokens.length - 1;
  }
  findMatching(e, a, n) {
    let r = 0;
    for (let i = e; i < this.tokens.length; i++) {
      const s = this.tokens[i].text;
      if (s === a && r++, s === n && (r--, r === 0))
        return i;
    }
  }
  hasEntryAttributeBefore(e) {
    for (let a = e - 1; a >= 0; a--) {
      const n = this.tokens[a];
      if (!ue(n)) {
        if (n.text === ")" || n.kind === "ident" || n.text === "@") {
          const r = n.text;
          if (r === "compute" || r === "vertex" || r === "fragment")
            return !0;
          continue;
        }
        break;
      }
    }
    return !1;
  }
  moduleFallback(e, a) {
    this.moduleFallbackReasons.push(`${e} at token ${a}`);
  }
  functionFallback(e, a, n) {
    e.skipped = !0, e.fallbackReasons.push(`${a} at token ${n}`);
  }
}
function Cc(t, e) {
  for (let a = t.length - 1; a >= 0; a--)
    if (e(t[a]))
      return t[a];
}
function ue(t) {
  return t.kind === "lineComment" || t.kind === "blockComment";
}
const Tc = /* @__PURE__ */ new Set(["textureSample", "textureSampleBias", "textureSampleLevel", "textureSampleGrad", "textureGather", "textureSampleBaseClampToEdge"]), Ac = /* @__PURE__ */ new Set(["textureSampleCompare", "textureSampleCompareLevel", "textureGatherCompare"]);
function Lc(t, e, a) {
  const n = /* @__PURE__ */ new Map();
  for (let r = 0; r < t.length; r++) {
    const i = t[r], s = e[r], o = Cr(i.tokens), c = /* @__PURE__ */ new Map();
    for (const l of s.vars) {
      const f = ee(l.attrs, "group"), m = ee(l.attrs, "binding"), p = o.declarations.find((I) => I.kind === "global" && I.name === l.name);
      f !== void 0 && m !== void 0 && p && c.set(p.id, { group: f, binding: m });
    }
    const d = /* @__PURE__ */ new Map();
    for (const l of o.declarations) {
      if (l.kind !== "function")
        continue;
      const f = o.functions.find((m) => m.nameTokenIndex === l.tokenIndex);
      f && d.set(l.id, f.id);
    }
    for (const l of s.entries) {
      const f = o.functions.find((S) => S.name === l.name), m = [];
      let p = o.fallback.wholeModule || !f;
      !p && f && (p = !Tr(f.id, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Set(), o, c, d, m));
      const I = f ? $c(f.id, o, c, d) : a.map(ia);
      n.set(l, p ? Rc(a, I) : Dc(m));
    }
  }
  return n;
}
function Tr(t, e, a, n, r, i, s) {
  const o = n.functions[t];
  if (!o || o.skipped)
    return !1;
  const c = `${t}|${[...e].map(([f, m]) => `${f}:${m.group}:${m.binding}`).join(",")}`;
  if (a.has(c))
    return !0;
  a.add(c);
  const d = n.references.filter((f) => f.functionId === t), l = new Map(d.map((f) => [f.tokenIndex, f]));
  for (let f = o.bodyStartToken + 1; f < o.bodyEndToken; f++) {
    const m = n.tokens[f]?.text, p = Tc.has(m ?? "") ? "filtering" : Ac.has(m ?? "") ? "comparison" : void 0, I = l.get(f), S = I && i.get(I.declarationId);
    if (!p && S === void 0)
      continue;
    const N = Bc(n, f);
    if (N === void 0 || n.tokens[N]?.text !== "(")
      continue;
    const C = Pc(n, N);
    if (!C)
      return !1;
    const b = C.map(([y, w]) => Oc(y, w, n, r, e));
    if (p) {
      const y = m === "textureGather" && !Fc(C[0], n, r, e) ? 1 : 0, w = b[y], x = b[y + 1];
      if (!w || !x)
        return !1;
      s.push({ texture: w, sampler: x, mode: p });
    } else {
      const y = n.declarations.filter((x) => x.kind === "param" && x.functionId === S).sort((x, M) => x.tokenIndex - M.tokenIndex), w = /* @__PURE__ */ new Map();
      for (let x = 0; x < y.length; x++)
        b[x] && w.set(y[x].id, b[x]);
      if (!Tr(S, w, a, n, r, i, s))
        return !1;
    }
  }
  return !0;
}
function Oc(t, e, a, n, r) {
  for (const i of a.references) {
    if (i.tokenIndex < t || i.tokenIndex > e)
      continue;
    const s = n.get(i.declarationId) ?? r.get(i.declarationId);
    if (s)
      return s;
  }
}
function Fc(t, e, a, n) {
  const r = e.references.find((i) => i.tokenIndex >= t[0] && i.tokenIndex <= t[1]);
  return r?.tokenIndex === t[0] ? a.get(r.declarationId) ?? n.get(r.declarationId) : void 0;
}
function Pc(t, e) {
  const a = [];
  let n = 1, r = 0, i = 0, s = 0, o = e + 1;
  for (let c = e + 1; c < t.tokens.length; c++) {
    const d = t.tokens[c].text;
    if (d === "(")
      n++;
    else if (d === ")") {
      if (n--, n === 0)
        return a.push([o, c - 1]), a;
    } else d === "[" ? r++ : d === "]" ? r-- : d === "{" ? i++ : d === "}" ? i-- : d === "<" ? s++ : d === ">" ? s-- : d === "," && n === 1 && r === 0 && i === 0 && s === 0 && (a.push([o, c - 1]), o = c + 1);
  }
}
function Bc(t, e) {
  for (let a = e + 1; a < t.tokens.length; a++)
    if (t.tokens[a].kind !== "lineComment" && t.tokens[a].kind !== "blockComment")
      return a;
}
function $c(t, e, a, n) {
  const r = [t], i = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Map();
  for (; r.length; ) {
    const o = r.pop();
    if (!i.has(o)) {
      i.add(o);
      for (const c of e.references) {
        if (c.functionId !== o)
          continue;
        const d = a.get(c.declarationId);
        d && s.set(`${d.group}:${d.binding}`, d);
        const l = n.get(c.declarationId);
        l !== void 0 && r.push(l);
      }
    }
  }
  return [...s.values()];
}
function Rc(t, e) {
  const a = new Set(e.map((s) => `${s.group}:${s.binding}`)), n = t.filter((s) => a.has(`${s.group}:${s.binding}`)), r = n.filter((s) => s.bindingLayout?.kind === "texture" && s.bindingLayout.texture.sampleType === "unfilterable-float" && !s.bindingLayout.texture.multisampled), i = n.filter((s) => s.bindingLayout?.kind === "sampler" && s.bindingLayout.sampler.type === "filtering");
  return r.flatMap((s) => i.map((o) => ({ texture: ia(s), sampler: ia(o), mode: "filtering" })));
}
function ia(t) {
  return { group: t.group, binding: t.binding };
}
function Dc(t) {
  const e = /* @__PURE__ */ new Set();
  return t.filter((a) => {
    const n = `${a.texture.group}:${a.texture.binding}:${a.sampler.group}:${a.sampler.binding}:${a.mode}`;
    return e.has(n) ? !1 : (e.add(n), !0);
  });
}
function zc(t, e) {
  const a = t.map(Lo), n = Wo(t, a), r = Xo(a, n), i = [], s = [];
  for (const d of a)
    for (const l of d.vars) {
      const f = ee(l.attrs, "group"), m = ee(l.attrs, "binding");
      if (f === void 0 || m === void 0)
        continue;
      const p = Te(l.type, l.path, n), I = lo(p, l.addressSpace), S = l.addressSpace === "uniform" || l.addressSpace === "storage" ? dt(p, l.addressSpace, l.name, l.mangledName, r) : void 0;
      S && s.push(S), i.push({
        group: f,
        binding: m,
        name: l.name,
        mangledName: l.mangledName,
        type: p,
        kind: I,
        addressSpace: l.addressSpace,
        access: l.access,
        struct: p.kind === "identifier" ? r.structs.get(p.mangledName ?? p.name) : void 0,
        layout: S,
        bindingLayout: fo(I, l.addressSpace, l.access, p, S)
      });
    }
  i.sort((d, l) => d.group - l.group || d.binding - l.binding);
  const o = Hc(t, a, i), c = Lc(t, a, i);
  return {
    bindings: i,
    entryPoints: a.flatMap((d) => d.entries.map((l) => Gc(l, a.flatMap((f) => f.structs), n, r, o.get(l) ?? i, c.get(l) ?? []))),
    overrides: a.flatMap((d) => d.overrides),
    featuresRequired: [...new Set(a.flatMap((d) => d.features))],
    aliases: [...r.aliases.values()],
    structs: [...r.structs.values()],
    hostShareableLayouts: s
  };
}
function Hc(t, e, a) {
  const n = /* @__PURE__ */ new Map();
  for (let r = 0; r < t.length; r++) {
    const i = t[r], s = e[r], o = Cr(i.tokens), c = o.fallback.wholeModule, d = /* @__PURE__ */ new Map();
    for (const f of o.declarations) {
      if (f.kind !== "function")
        continue;
      const m = o.functions.find((p) => p.nameTokenIndex === f.tokenIndex);
      m && d.set(f.id, m.id);
    }
    const l = /* @__PURE__ */ new Map();
    for (const f of s.vars) {
      const m = ee(f.attrs, "group"), p = ee(f.attrs, "binding");
      if (m === void 0 || p === void 0)
        continue;
      const I = o.declarations.find((S) => S.kind === "global" && S.name === f.name);
      I && l.set(I.id, { group: m, binding: p });
    }
    for (const f of s.entries) {
      const m = o.functions.find((N) => N.name === f.name);
      if (c || !m) {
        n.set(f, a);
        continue;
      }
      const p = [m.id], I = /* @__PURE__ */ new Set(), S = /* @__PURE__ */ new Map();
      for (; p.length; ) {
        const N = p.pop();
        if (!I.has(N) && (I.add(N), !!o.functions[N]))
          for (const C of o.references) {
            if (C.functionId !== N)
              continue;
            const b = l.get(C.declarationId);
            b && S.set(`${b.group}:${b.binding}`, b);
            const y = d.get(C.declarationId);
            y !== void 0 && p.push(y);
          }
      }
      n.set(f, [...S.values()].sort((N, C) => N.group - C.group || N.binding - C.binding));
    }
  }
  return n;
}
function Gc(t, e, a, n, r, i) {
  return {
    name: t.name,
    mangledName: t.mangledName,
    stage: t.stage,
    // `workgroupSize` and `inputs` stay absent rather than `undefined`-valued when they do not
    // apply: an own key valued `undefined` survives structuredClone but is dropped by
    // JSON.stringify, which would make the key set differ across serialization boundaries.
    ...t.workgroupSize ? { workgroupSize: t.workgroupSize } : {},
    bindings: r.map(({ group: s, binding: o }) => ({ group: s, binding: o })),
    samplingPairs: i,
    ...t.stage === "vertex" ? { inputs: Vc(t, e, a, n) } : {}
  };
}
function Vc(t, e, a, n) {
  const r = [];
  for (const i of t.params) {
    if (fn(i.attrs, "builtin"))
      continue;
    const s = Te(i.type, t.path, a), o = ee(i.attrs, "location");
    if (o !== void 0) {
      r.push({ name: i.name, location: o, type: s });
      continue;
    }
    const c = We(s, n);
    if (c.kind !== "identifier")
      continue;
    const d = e.find((f) => f.mangledName === (c.mangledName ?? c.name)), l = n.structs.get(c.mangledName ?? c.name);
    if (d)
      for (let f = 0; f < d.members.length; f++) {
        const m = d.members[f];
        if (fn(m.attrs, "builtin"))
          continue;
        const p = ee(m.attrs, "location");
        p !== void 0 && r.push({ name: m.name, location: p, type: l?.members[f]?.type ?? Te(m.type, d.path, a) });
      }
  }
  return r;
}
function fn(t, e) {
  return t.some((a) => a.name === e);
}
function ya(t, e = "<runtime>") {
  const a = Sc(t, e), n = io(a);
  if (n.imports.length > 0)
    throw H("VGPU-WGSL-REFLECT-SOURCE-IMPORT", "reflectSource() accepts a single raw WGSL string; use resolveShader() for WGSL import graphs.");
  return zc([{ path: e, source: t, tokens: a, parsed: n }]);
}
function wa() {
  const t = /* @__PURE__ */ new Map();
  return {
    getOrCreate(e, a, n, r) {
      const i = n.map(Ct), s = `${e}:${a}:${i.join("|")}`, o = t.get(s);
      if (o)
        return o.bindGroup;
      const c = r();
      return t.set(s, { identities: i, bindGroup: c }), c;
    },
    evictIdentity(e) {
      const a = Ct(e);
      for (const [n, r] of t)
        r.identities.includes(a) && t.delete(n);
    },
    clearDraw(e) {
      const a = `${e}:`;
      for (const n of t.keys())
        n.startsWith(a) && t.delete(n);
    },
    dispose() {
      t.clear();
    }
  };
}
function Ct(t) {
  return typeof t == "string" || typeof t == "number" ? String(t) : `${t.kind}:${t.id}`;
}
function nt(t, e, a) {
  const n = t[e];
  if (!n)
    throw new j({
      code: "VGPU-REFLECT-ENTRY-METADATA-MISSING",
      message: `Entry point '${t.name}' has no reflected ${e}.`,
      fix: "Pass the reflection from reflectSource()/resolveShader().",
      where: a
    });
  return n;
}
const Tt = /* @__PURE__ */ new WeakMap();
function _e(t, e) {
  if (!t.gpu.pushErrorScope || !t.gpu.popErrorScope)
    return;
  t.gpu.pushErrorScope("validation");
  const a = Tt.get(t.gpu);
  a ? a.push(e) : Tt.set(t.gpu, [e]);
}
function ne(t) {
  const e = Tt.get(t.gpu);
  if (!e?.length || !t.gpu.popErrorScope)
    return;
  const a = e.pop();
  return e.length || Tt.delete(t.gpu), { context: a, error: t.gpu.popErrorScope() };
}
function Ar(t) {
  const e = [];
  let a = ne(t);
  for (; a; )
    e.push(a), a = ne(t);
  return e;
}
function Wc(t) {
  const e = ne(t);
  e && va(e);
}
function Lr(t) {
  for (const e of Ar(t))
    va(e);
}
function _(t) {
  for (const e of t)
    va(e);
}
function xa(t) {
  return t.gpu.queue.onSubmittedWorkDone?.() ?? Promise.resolve();
}
function Or(t, e = [], a = {}) {
  return Xc(t, e, a.errorSink ?? Kc);
}
function At(t, e) {
  return {
    context: t.context,
    error: qc(t.error, e.error)
  };
}
async function qc(t, e) {
  const a = await Promise.allSettled([t, e]);
  for (const r of a)
    if (r.status === "fulfilled" && r.value)
      return r.value;
  const n = a.find((r) => r.status === "rejected");
  if (n?.status === "rejected")
    throw n.reason;
  return null;
}
async function Xc(t, e, a) {
  await xa(t);
  for (const n of e)
    try {
      const r = await n.error;
      r && await a(De(n.context.label, n.context.group, r));
    } catch (r) {
      await a(De(n.context.label, n.context.group, r));
    }
}
function va(t) {
  t.error.catch(() => {
  });
}
function Kc(t) {
  console.error(t);
}
function Fr(t, e, a, n) {
  try {
    e.end();
  } catch (r) {
    const i = Ar(t);
    _(a), _(i), a.length = 0;
    const s = i[0]?.context ?? n;
    throw s ? De(s.label, s.group, r) : r;
  }
}
let Jc = 1;
const un = /* @__PURE__ */ new WeakMap();
function Yc(t) {
  return t === null || typeof t != "object" || ArrayBuffer.isView(t) || t instanceof ArrayBuffer || Array.isArray(t) ? !0 : t instanceof Ie || t instanceof Ge ? !1 : !Br(t);
}
function sa(t) {
  return typeof t != "object" || t === null || Array.isArray(t) || ArrayBuffer.isView(t) || t instanceof ArrayBuffer || t instanceof Ie || t instanceof Ge ? !1 : !Br(t);
}
function hn(t, e, a) {
  switch (t.bindingLayout?.kind) {
    case "buffer":
      return Zc(t, e, a);
    case "texture":
      return Qc(t, e, a);
    case "sampler":
      return _c(t, e);
    case "storageTexture":
      throw he(t, "storage texture", "Pass a storage-compatible texture.");
    case "externalTexture":
      throw he(t, "external texture", "Pass a compatible GPUExternalTexture.");
    default:
      throw he(t, "reflected resource", "Fix shader reflection bindingLayout.");
  }
}
function Zc(t, e, a) {
  const n = Hs(e);
  if (n)
    return n[br](t, a.sourceHint);
  if (e instanceof Ie)
    return an(e, `${a.sourceHint}.set`), td(t, e.options.usage), { resource: { buffer: e.gpu }, identity: e.resourceIdentity, unsubscribe: (r) => e.onDestroy(r) };
  if (nd(e))
    return an(e.buffer, `${a.sourceHint}.set`), { resource: { buffer: e.gpu, offset: 0, size: e.size }, identity: e.buffer.resourceIdentity, unsubscribe: (r) => e.buffer.onDestroy(r) };
  if (Rr(e))
    return { resource: e, identity: rt(e.buffer) };
  if (Ia(e))
    return { resource: { buffer: e }, identity: rt(e) };
  throw he(t, "buffer", `Pass a compatible Buffer/Uniform: ${t.name}.set({ ${t.name}: gpu.device.createBuffer(...) }).`);
}
function Qc(t, e, a) {
  const n = Pr(e);
  if (n) {
    const r = n.color;
    bn(t, r, a);
    const i = n.onTexturesRecreated?.bind(n);
    return { resource: r.createView(), identity: r.resourceIdentity, unsubscribe: (s) => n.onDestroy(s), onRecreate: i ? (s) => i(s) : void 0 };
  }
  if (e instanceof Ge)
    return ad(t, e.usage), bn(t, e, a), { resource: e.createView(), identity: e.resourceIdentity, unsubscribe: (r) => e.onDestroy(r) };
  if ($r(e))
    return { resource: e.createView(), identity: e.resourceIdentity ?? rt(e) };
  if (typeof e == "object" && e !== null)
    return { resource: e, identity: rt(e) };
  throw he(t, "texture/target", `Pass a Texture or Target: ${t.name}.set({ ${t.name}: scene.color }) or set({ ${t.name}: scene }).`);
}
function _c(t, e) {
  if (ed(e))
    return { resource: e, identity: rt(e) };
  throw he(t, "sampler", `Use the cached sampler: set({ ${t.name}: sampler(gpu) }).`);
}
function ed(t) {
  return typeof t != "object" || t === null || t instanceof Ie || t instanceof Ge ? !1 : !Ia(t) && !Rr(t) && !$r(t) && !Pr(t);
}
function td(t, e) {
  const a = t.bindingLayout?.kind === "buffer" ? t.bindingLayout.buffer.type : void 0;
  if (a === "uniform" && !e.includes("uniform"))
    throw he(t, "uniform buffer", "Create with usage: ['uniform','copy_dst'].");
  if ((a === "storage" || a === "read-only-storage") && !e.includes("storage"))
    throw he(t, "storage buffer", "Create with usage: ['storage','copy_dst'].");
}
function ad(t, e) {
  if (!e.includes("texture_binding") && !e.includes("render_attachment"))
    throw he(t, "sampled texture", "Use texture_binding usage or a sampleable Target.");
}
function bn(t, e, a) {
  if (!(!a.filterableTexture || a.float32Filterable) && (e.format === "r32float" || e.format === "rg32float" || e.format === "rgba32float"))
    throw rs(a.sourceHint, t, e.format, e.label ?? "texture", a.pairedSampler);
}
function Pr(t) {
  if (typeof t != "object" || t === null)
    return;
  const e = t;
  if (!(!e.resourceIdentity || !e.color || typeof e.onDestroy != "function"))
    return e;
}
function Br(t) {
  const e = t;
  return "gpu" in e || "bindGroup" in e || "createView" in e || "resourceIdentity" in e;
}
function rt(t) {
  if (typeof t != "object" || t === null)
    return `value:${String(t)}`;
  let e = un.get(t);
  return e || (e = { kind: "external", id: Jc++ }, un.set(t, e)), e;
}
function nd(t) {
  return typeof t == "object" && t !== null && "gpu" in t && "size" in t && "buffer" in t && t.buffer instanceof Ie;
}
function $r(t) {
  return typeof t == "object" && t !== null && typeof t.createView == "function";
}
function Rr(t) {
  return typeof t == "object" && t !== null && "buffer" in t && Ia(t.buffer);
}
function Ia(t) {
  return typeof t == "object" && t !== null && "size" in t && "usage" in t && typeof t.destroy == "function";
}
function rd(t, e) {
  id(t);
  const a = new ArrayBuffer(t.size);
  return ka(new DataView(a), t, 0, e), a;
}
function id(t) {
  if (t.size === void 0)
    throw J("set", `No se puede inferir byteLength para layout runtime-sized '${t.name}'.`);
}
function ka(t, e, a, n) {
  if (e.members)
    return sd(t, e.members, a, n);
  od(t, e, a, n);
}
function sd(t, e, a, n) {
  const r = n;
  for (const i of e)
    ka(t, i.layout, a + i.offset, r?.[i.name]);
}
function od(t, e, a, n) {
  switch (e.type.kind) {
    case "scalar":
      return Sa(t, a, e.type.name, n);
    case "vector":
      return cd(t, a, e.type, n);
    case "matrix":
      return dd(t, e, a, n);
    case "array":
      return ld(t, e, a, n);
    default:
      throw J("set", `No hay writer para layout ${e.type.kind}.`);
  }
}
function Sa(t, e, a, n) {
  a === "f32" ? t.setFloat32(e, Number(n ?? 0), !0) : a === "i32" ? t.setInt32(e, Number(n ?? 0), !0) : a === "u32" || a === "bool" ? t.setUint32(e, a === "bool" ? n ? 1 : 0 : Number(n ?? 0), !0) : t.setUint16(e, fd(Number(n ?? 0)), !0);
}
function cd(t, e, a, n) {
  const r = n, i = Dr(a.element);
  for (let s = 0; s < a.width; s++)
    Sa(t, e + s * i, Ma(a.element), r?.[s] ?? 0);
}
function dd(t, e, a, n) {
  const r = e.type, i = n, s = Dr(r.element), o = e.stride ?? 16;
  for (let c = 0; c < r.columns; c++)
    for (let d = 0; d < r.rows; d++)
      Sa(t, a + c * o + d * s, Ma(r.element), i?.[c * r.rows + d] ?? 0);
}
function ld(t, e, a, n) {
  const r = n, i = e.stride ?? e.element?.size ?? 0;
  if (!e.element)
    throw J("set", "Array layout sin element layout.");
  for (let s = 0; s < (r?.length ?? 0); s++)
    ka(t, e.element, a + s * i, r[s]);
}
function Dr(t) {
  return Ma(t) === "f16" ? 2 : 4;
}
function Ma(t) {
  if (t.kind !== "scalar")
    throw J("set", `Expected scalar, got ${t.kind}`);
  return t.name;
}
function fd(t) {
  const e = new Float32Array(1), a = new Uint32Array(e.buffer);
  e[0] = t;
  const n = a[0], r = n >> 16 & 32768, i = n & 8388607, s = n >> 23 & 255;
  if (s === 255)
    return r | (i ? 32256 : 31744);
  const o = s - 127 + 15;
  return o >= 31 ? r | 31744 : o <= 0 ? o < -10 ? r : r | (i | 8388608) >> 1 - o + 13 : r | o << 10 | i >> 13;
}
const mn = /* @__PURE__ */ new WeakMap();
function zr(t, e) {
  const a = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
  for (const i of e) {
    const s = i.stage === "vertex" ? 1 : i.stage === "fragment" ? 2 : 4;
    for (const o of nt(i, "bindings", "visibility")) {
      const c = `${o.group}:${o.binding}`;
      a.set(c, (a.get(c) ?? 0) | s);
    }
    for (const o of nt(i, "samplingPairs", "visibility"))
      o.mode === "filtering" && n.add(`${o.texture.group}:${o.texture.binding}`);
  }
  const r = (i) => a.get(`${i.group}:${i.binding}`) ?? 0;
  return Object.defineProperty(r, "filterable", { value: n }), r;
}
function Hr(t, e, a = Ea) {
  return t.flatMap((n) => {
    if (n.group !== e)
      return [];
    const r = a(n);
    return r === 0 ? [] : [{ binding: n.binding, visibility: r, ...gd(n, a.filterable?.has(`${n.group}:${n.binding}`) ?? !1) }];
  });
}
function Gr(t, e, a, n = Ea) {
  const r = /* @__PURE__ */ new Map(), i = a.bindings.filter((o) => n(o) !== 0).map((o) => o.group), s = Math.max(-1, ...i);
  for (let o = 0; o <= s; o++)
    r.set(o, hd(t, e, a, o, n));
  return r;
}
function ud(t, e) {
  return t.gpu.createPipelineLayout({ bindGroupLayouts: bd(e) });
}
function hd(t, e, a, n, r = Ea) {
  return Vr(t, `${e}.group${n}.bgl`, Hr(a.bindings, n, r));
}
function Vr(t, e, a) {
  let n = mn.get(t.gpu);
  n || (n = /* @__PURE__ */ new Map(), mn.set(t.gpu, n));
  const r = JSON.stringify(a), i = n.get(r);
  if (i)
    return i;
  const s = ts(t.gpu.createBindGroupLayout({ label: e, entries: a }), { entries: a });
  return n.set(r, s), s;
}
function bd(t) {
  const e = Math.max(-1, ...t.keys()), a = [];
  for (let n = 0; n <= e; n++)
    a.push(md(t, n));
  return a;
}
function md(t, e) {
  const a = t.get(e);
  if (!a)
    throw J("pipelineLayout", `Bind groups must be contiguous for pipeline layout; missing group(${e}).`);
  return a;
}
function gd(t, e) {
  const a = t.bindingLayout;
  if (!a)
    throw J("bindGroupLayout", `Binding '${t.name}' does not have a reflected bindingLayout.`);
  return e && a.kind === "texture" && a.texture.sampleType === "unfilterable-float" && !a.texture.multisampled ? { texture: { ...a.texture, sampleType: "float" } } : pd(a);
}
function pd(t) {
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
function Ea(t) {
  const e = globalThis.GPUShaderStage, a = e?.VERTEX ?? 1, n = e?.FRAGMENT ?? 2, r = e?.COMPUTE ?? 4;
  return t.kind === "buffer" ? a | n | r : n | r;
}
function Wr(t) {
  const e = yd(t.reflection), a = [...t.bindGroupLayouts.keys()].sort((h, g) => h - g), n = /* @__PURE__ */ new Map();
  function r(h) {
    const g = [];
    for (const [v, k] of Object.entries(h))
      g.push(...s(v, k));
    return g;
  }
  function i(h) {
    const g = t.bindGroupLayouts.get(h.info.group);
    return !!g && !!Qe(g)?.entries.some((v) => v.binding === h.info.binding);
  }
  function s(h, g) {
    const v = e.get(h);
    if (v)
      return o(v, h, g);
    const k = wd(h, e, t.label);
    if (!k)
      throw J(`${t.label}.set`, `Binding '${h}' does not exist in '${t.label}'.`);
    return c(k, h, g);
  }
  function o(h, g, v) {
    x(h.info.group);
    const k = gn(h.info, v);
    pn(h, g, k);
    const E = Mt(h.identity);
    return k === "lib" ? d(h, kd(h.libValue, v)) : f(h, v), i(h) ? Jt(h, E) : [];
  }
  function c(h, g, v) {
    x(h.info.group);
    const k = gn(h.info, v);
    if (pn(h, g, k), xd(h, g, k), k !== "lib")
      throw J(`${t.label}.set`, `Member '${g}' needs a JS value; set resource '${h.info.name}' instead.`);
    const E = Mt(h.identity);
    return d(h, { ...Sd(h.libValue), [g]: v }), i(h) ? Jt(h, E) : [];
  }
  function d(h, g) {
    const v = U(h);
    h.libValue = g;
    const k = rd(v, g);
    h.buffer || M(h, v.size), h.bytes = k, h.buffer.write(k, 0);
  }
  function l(h) {
    const g = Qe(t.bindGroupLayouts.get(h.group))?.entries.find((E) => E.binding === h.binding), v = t.reflection.entryPoints.flatMap((E) => nt(E, "samplingPairs", t.label)).find((E) => E.mode === "filtering" && E.texture.group === h.group && E.texture.binding === h.binding), k = v && t.reflection.bindings.find((E) => E.group === v.sampler.group && E.binding === v.sampler.binding);
    return { sourceHint: t.label, filterableTexture: g?.texture?.sampleType === "float", float32Filterable: t.device.features.has("float32-filterable"), pairedSampler: k };
  }
  function f(h, g) {
    const v = hn(h.info, g, l(h.info));
    h.unsubscribe?.(), h.unsubscribeRecreate?.(), h.resource = v.resource, h.identity = v.identity, h.unsubscribe = v.unsubscribe?.(() => {
      h.identity && t.cache.evictIdentity(h.identity);
    }), h.unsubscribeRecreate = v.onRecreate?.(() => m(h, g));
  }
  function m(h, g) {
    const v = Mt(h.identity);
    h.identity && t.cache.evictIdentity(h.identity);
    const k = hn(h.info, g, l(h.info));
    if (h.unsubscribe?.(), h.unsubscribeRecreate?.(), h.resource = k.resource, h.identity = k.identity, h.unsubscribe = k.unsubscribe?.(() => {
      h.identity && t.cache.evictIdentity(h.identity);
    }), h.unsubscribeRecreate = k.onRecreate?.(() => m(h, g)), i(h))
      for (const E of Jt(h, v))
        t.onIdentityChange?.(E);
  }
  function p(h, g, v) {
    I(h), vd(t.label, h, g, v);
    const k = n.has(h) ? `claimed-group:${h}` : void 0;
    return n.set(h, g), k;
  }
  function I(h) {
    const g = t.bindGroupLayouts.get(h);
    if (!g)
      throw J(`${t.label}.layout`, `@group(${h}) does not exist in '${t.label}'.`);
    return g;
  }
  function S() {
    return a.map(N);
  }
  function N(h) {
    const g = n.get(h);
    if (g)
      return { group: h, bindGroup: g, offsets: [], claimValidation: C(g, h) };
    const v = new Set(Qe(I(h))?.entries.map((A) => A.binding)), k = t.reflection.bindings.filter((A) => A.group === h && v.has(A.binding)), E = b(k), L = y(k), O = t.cache.getOrCreate(t.drawId, h, L, () => t.device.gpu.createBindGroup({
      label: `${t.label}.group${h}`,
      layout: I(h),
      entries: E
    }));
    return { group: h, bindGroup: O, offsets: [] };
  }
  function C(h, g) {
    return or(h) ? void 0 : { label: t.label, group: g };
  }
  function b(h) {
    return h.map((g) => {
      const v = w(g);
      return { binding: g.binding, resource: v.resource };
    });
  }
  function y(h) {
    return h.map((g) => w(g).identity);
  }
  function w(h) {
    const g = e.get(h.name);
    if (!g?.resource || !g.identity)
      throw is(t.label, h);
    return g;
  }
  function x(h) {
    if (n.has(h))
      throw ss(t.label, h);
  }
  function M(h, g) {
    h.buffer = t.device.createBuffer({ size: g, usage: ["uniform", "copy_dst"], label: `${t.label}.${h.info.name}` }), h.resource = { buffer: h.buffer.gpu, offset: 0, size: g }, h.identity = h.buffer.resourceIdentity, h.unsubscribe = h.buffer.onDestroy(() => t.cache.evictIdentity(h.buffer.resourceIdentity));
  }
  function U(h) {
    if (h.info.kind !== "buffer" || !h.info.layout?.size)
      throw J(`${t.label}.set`, `Binding '${h.info.name}' needs a compatible resource, not JS.`);
    return h.info.layout;
  }
  return {
    get groups() {
      return a;
    },
    set: r,
    claimGroup: p,
    layout: I,
    bindGroups: S,
    bindingState(h) {
      const g = e.get(h);
      if (!(!g?.ownership || !g.resource || !g.identity))
        return { info: g.info, ownership: g.ownership, resource: g.resource, identity: g.identity };
    }
  };
}
function yd(t) {
  return new Map(t.bindings.map((e) => [e.name, { info: e, memberOwnership: /* @__PURE__ */ new Map() }]));
}
function wd(t, e, a) {
  let n;
  for (const r of e.values())
    if (r.info.layout?.members?.some((i) => i.name === t)) {
      if (n)
        throw J(`${a}.set`, `Binding member '${t}' is ambiguous in '${a}'; set the complete binding.`);
      n = r;
    }
  return n;
}
function gn(t, e) {
  return t.bindingLayout?.kind === "buffer" && Yc(e) ? "lib" : "user";
}
function pn(t, e, a) {
  if (t.ownership && t.ownership !== a)
    throw cr(e, t.ownership);
  t.ownership ??= a;
}
function xd(t, e, a) {
  const n = t.memberOwnership.get(e);
  if (n && n !== a)
    throw cr(e, n);
  t.memberOwnership.set(e, a);
}
function vd(t, e, a, n) {
  const r = or(a);
  if (!r)
    return;
  const i = Qe(n);
  if (!i)
    return;
  const s = Id(i.entries, r.layout.entries);
  if (s)
    throw os(t, e, s);
}
function Id(t, e) {
  if (t.length !== e.length)
    return `expected ${t.length} bindings and received ${e.length}`;
  const a = yn(t), n = yn(e);
  for (const [r, i] of a) {
    const s = n.get(r);
    if (!s)
      return `missing @binding(${r})`;
    if (wn(i) !== wn(s))
      return `@binding(${r}) does not match the reflected layout`;
  }
}
function yn(t) {
  return new Map(t.map((e) => [e.binding, e]));
}
function wn(t) {
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
function Jt(t, e) {
  const a = Mt(t.identity);
  return !a || e === a ? [] : [{
    group: t.info.group,
    binding: t.info.binding,
    bindingName: t.info.name,
    bindingKind: t.info.kind,
    previousIdentity: e,
    newIdentity: a
  }];
}
function Mt(t) {
  return t === void 0 ? void 0 : Ct(t);
}
function kd(t, e) {
  return sa(t) && sa(e) ? { ...t, ...e } : e;
}
function Sd(t) {
  return sa(t) ? t : {};
}
const Md = "rgba8unorm", Ua = Object.freeze([0, 0, 0, 1]);
function Lt(t, e) {
  const a = t, n = Array.isArray(t) ? t : [a?.r, a?.g, a?.b, a?.a];
  if (n.length !== 4 || !n.every((r) => typeof r == "number" && Number.isFinite(r)))
    throw Ns(e);
  return ja(t);
}
function ja(t) {
  const e = t;
  return Array.isArray(t) ? [t[0], t[1], t[2], t[3]] : { r: e.r, g: e.g, b: e.b, a: e.a };
}
function Et(t) {
  return t.colors ?? [{ format: t.format ?? Md }];
}
function qr(t) {
  return t.depth === !0 ? "depth24plus" : t.depth || void 0;
}
function Xr(t) {
  const e = t.msaa;
  if (e === !0 || e === 4)
    return 4;
  if (e === void 0 || e === !1)
    return 1;
  const a = lr();
  throw a.code = "VGPU-TARGET-MSAA-INVALID", a.message = `msaa received ${e}; WebGPU 1|4; use true`, a;
}
function Ed(t, e) {
  if (!t?.size)
    throw lr();
  const a = qr(t);
  if (a === "stencil8")
    throw ks(a);
  if (Xr(t) === 4)
    for (const n of Et(t))
      Ud(n.format, e);
}
function Ud(t, e) {
  if (e.isCompatibilityMode && t === "rgba16float")
    throw J("target", "Dawn compatibility mode does not support rgba16float+msaa.", "Use rgba8unorm for MSAA here, or disable msaa.");
}
function jd(t, e, a, n) {
  const r = {
    view: (e ?? t).createView(),
    resolveTarget: e ? t.createView() : void 0,
    loadOp: n ? "load" : "clear",
    storeOp: e ? "discard" : "store"
  };
  return n || (r.clearValue = Kr(a)), r;
}
function Nd(t, e, a, n, r) {
  if (r) {
    const s = { view: t.createView(), depthReadOnly: !0 };
    return it(t.format) && (s.stencilReadOnly = !0), s;
  }
  const i = { view: t.createView(), depthLoadOp: e ? "load" : "clear", depthStoreOp: t.sampleCount > 1 ? "discard" : "store" };
  return e || (i.depthClearValue = a ?? 1), t.format && it(t.format) && (i.stencilLoadOp = e ? "load" : "clear", i.stencilStoreOp = t.sampleCount > 1 ? "discard" : "store", e || (i.stencilClearValue = n ?? 0)), i;
}
function it(t) {
  return !!t && t.includes("stencil");
}
function Kr(t) {
  return Array.isArray(t) ? { r: t[0], g: t[1], b: t[2], a: t[3] } : t;
}
function Jr(t, e) {
  return t[0] === e[0] && t[1] === e[1];
}
function Gt(t) {
  return typeof t == "object" && t !== null && typeof t.renderPassDescriptor == "function";
}
let Cd = 1, Td = 1;
const Ad = /* @__PURE__ */ new WeakMap(), Ld = /* @__PURE__ */ new WeakMap();
function Od(t) {
  return Gt(t) ? {
    colors: t.colors.map((e) => e.format),
    depth: t.depth?.format,
    sampleCount: t.sampleCount
  } : typeof t != "object" || t === null ? { colors: [] } : {
    colors: Array.isArray(t.colors) ? [...t.colors] : t.colors ?? [],
    depth: t.depth,
    sampleCount: t.sampleCount ?? 1
  };
}
function Yr(t) {
  return `${t.colors.join(",")}:${t.depth ?? "none"}:${t.sampleCount ?? 1}`;
}
function Fd(t, e) {
  if (!Array.isArray(t.colors) || t.colors.length === 0)
    throw ht(e, "colors must be a non-empty array.");
  const a = t.colors.find((r) => typeof r != "string" || r.length === 0);
  if (a !== void 0)
    throw ht(e, `colors must contain only GPUTextureFormat strings; received ${String(a)}.`);
  if (t.depth !== void 0 && (typeof t.depth != "string" || t.depth.length === 0))
    throw ht(e, "depth must be a GPUTextureFormat string.");
  const n = t.sampleCount ?? 1;
  if (n !== 1 && n !== 4)
    throw ht(e, `sampleCount must be 1 or 4; received ${String(n)}.`);
}
function Pd(t) {
  const e = `${In(Ad, t.module, () => Cd++)}|${In(Ld, t.pipelineLayout, () => Td++)}|${zd(t.vertexBufferLayouts ?? [])}|${Yr(t.signature)}`, a = t.topology || t.stripIndexFormat ? `${e}|${t.topology ?? "triangle-list"}|${t.stripIndexFormat ?? "none"}` : e, n = t.cullMode || t.frontFace ? `${a}|${t.cullMode ?? "none"}|${t.frontFace ?? "ccw"}` : a, r = t.unclippedDepth ? `${n}|unclipped` : n, i = t.depthKey ? `${r}|${t.depthKey}` : r, s = t.stencilKey ? `${i}|${t.stencilKey}` : i, o = t.multisampleKey ? `${s}|${t.multisampleKey}` : s, c = t.constantsKey ? `${o}|${t.constantsKey}` : o, d = t.entryKey ? `${c}|${t.entryKey}` : c;
  return t.fragmentKey ? `${d}|${t.fragmentKey}` : d;
}
function oa(t, e, a, n, r) {
  if (n === void 0)
    return e.find((s) => s.stage === a);
  if (typeof n != "string")
    throw It(t, `${a} received ${ca(n)}; expected an entry point name string.`, r);
  const i = e.find((s) => s.name === n);
  if (!i)
    throw It(t, `"${n}" matches no entry point in the shader; available entry points: ${xn(e)}.`, r);
  if (i.stage !== a)
    throw It(t, `"${n}" is a @${i.stage} entry point, not @${a}; available entry points: ${xn(e)}.`, r);
  return i;
}
function xn(t) {
  return t.length ? t.map((e) => `"${e.name}" (@${e.stage})`).join(", ") : "none";
}
function Zr(t, e, a, n) {
  if (e !== void 0 && (typeof e != "object" || e === null || Array.isArray(e)))
    throw ut(t, `received ${ca(e)}; expected { overrideNameOrId: number | boolean }.`, n);
  const r = new Map(a.map((s) => [vn(s), s])), i = {};
  for (const [s, o] of Object.entries(e ?? {})) {
    if (!r.has(s))
      throw ut(t, `"${s}" matches no override in the shader; available overrides: ${Bd(a)}.`, n);
    if (typeof o == "boolean") {
      i[s] = o ? 1 : 0;
      continue;
    }
    if (typeof o != "number" || !Number.isFinite(o))
      throw ut(t, `"${s}" received ${ca(o)}; use a finite number or a boolean (WebGPU converts the value to the override's WGSL type, and NaN/Infinity fail that conversion).`, n);
    i[s] = o;
  }
  for (const s of a) {
    const o = vn(s);
    if (s.defaultValue === void 0 && !(o in i))
      throw ut(t, `override '${s.name}' has no default value and must be provided; add constants: { "${o}": value }.`, n);
  }
  return Object.keys(i).length === 0 ? {} : { constants: i, constantsKey: $d(i) };
}
function vn(t) {
  return t.id !== void 0 ? String(t.id) : t.name;
}
function Bd(t) {
  return t.length ? t.map((e) => e.id !== void 0 ? `"${e.id}" (@id of ${e.name})` : `"${e.name}"`).join(", ") : "none";
}
function $d(t) {
  return `cn~${Object.entries(t).sort(([e], [a]) => e < a ? -1 : e > a ? 1 : 0).map(([e, a]) => `${e}=${a}`).join("~")}`;
}
function ca(t) {
  if (typeof t == "string")
    return `"${t}"`;
  try {
    return JSON.stringify(t) ?? String(t);
  } catch {
    return String(t);
  }
}
function Qr(t) {
  const e = /* @__PURE__ */ new Map();
  return {
    get(a, n) {
      let r = e.get(a);
      return r || (r = t.gpu.createShaderModule({ label: n, code: a }), e.set(a, r)), r;
    },
    dispose() {
      e.clear();
    }
  };
}
function _r(t) {
  const e = /* @__PURE__ */ new Map();
  return {
    get(a) {
      const n = Hd(a);
      let r = e.get(n);
      return r || (r = t.gpu.createPipelineLayout({ bindGroupLayouts: Gd(a) }), e.set(n, r)), r;
    },
    dispose() {
      e.clear();
    }
  };
}
function ei(t, e = {}) {
  return new Rd(t, e);
}
class Rd {
  device;
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Set();
  #a;
  #n;
  #i = !1;
  constructor(e, a) {
    this.device = e, this.#a = a.errorSink ?? (() => {
    }), this.#n = a.registerSettledSource?.(() => [...this.#t]);
  }
  getReady(e) {
    return this.#e.get(e)?.pipeline;
  }
  getSync(e, a, n) {
    this.#s(n.where);
    const r = this.#e.get(e);
    if (r?.pipeline)
      return r.pipeline;
    const i = r ?? {};
    r || this.#e.set(e, i);
    const s = this.#r(e, i, a, n);
    if (!s) {
      i.pending || this.#e.delete(e);
      return;
    }
    return i.pipeline = s, i.pending?.resolve(s), i.pending = void 0, s;
  }
  getAsync(e, a, n) {
    this.#s(n.where);
    const r = this.#e.get(e);
    if (r?.pipeline)
      return Promise.resolve(r.pipeline);
    if (r?.pending)
      return r.pending.promise;
    const i = {}, s = Dd();
    i.pending = s, this.#e.set(e, i);
    let o;
    try {
      o = a();
    } catch (c) {
      const d = Ke(n.where, c, n.signature);
      return s.reject(d), this.#e.delete(e), s.promise;
    }
    return this.#c(o), o.then((c) => {
      this.#e.get(e) !== i || i.pipeline || i.pending !== s || (i.pipeline = c, i.pending = void 0, s.resolve(c));
    }, (c) => {
      this.#e.get(e) !== i || i.pipeline || i.pending !== s || (i.pending = void 0, this.#e.delete(e), s.reject(Ke(n.where, c, n.signature)));
    }), s.promise;
  }
  dispose() {
    if (this.#i)
      return;
    this.#i = !0;
    const e = _a("gpu.dispose");
    for (const a of this.#e.values())
      a.pending?.reject(e);
    this.#e.clear(), this.#t.clear(), this.#n?.();
  }
  #r(e, a, n, r) {
    const i = this.device.gpu, s = typeof i.pushErrorScope == "function" && typeof i.popErrorScope == "function";
    s && i.pushErrorScope("validation");
    try {
      const o = n();
      return s && this.#o(e, a, r), o;
    } catch (o) {
      s && this.#l();
      const c = Ke(r.where, o, r.signature);
      this.#a(c);
      return;
    }
  }
  #o(e, a, n) {
    const r = this.device.gpu.popErrorScope().then((i) => {
      if (!i)
        return;
      const s = Ke(n.where, i, n.signature);
      return this.#e.get(e) === a && this.#e.delete(e), this.#a(s);
    }, (i) => {
      const s = Ke(n.where, i, n.signature);
      return this.#e.get(e) === a && this.#e.delete(e), this.#a(s);
    });
    this.#c(r);
  }
  #l() {
    const e = this.device.gpu.popErrorScope?.();
    e && e.catch(() => {
    });
  }
  #s(e) {
    if (this.#i)
      throw _a(e);
  }
  #c(e) {
    this.#t.add(e), e.catch(() => {
    }).then(() => this.#t.delete(e), () => this.#t.delete(e));
  }
}
function Dd() {
  let t, e;
  const a = new Promise((n, r) => {
    t = n, e = r;
  });
  return a.catch(() => {
  }), { promise: a, resolve: t, reject: e };
}
function In(t, e, a) {
  let n = t.get(e);
  return n || (n = a(), t.set(e, n)), n;
}
function zd(t) {
  return JSON.stringify(t.map((e) => ({
    arrayStride: e.arrayStride,
    stepMode: e.stepMode ?? "vertex",
    attributes: [...e.attributes].map((a) => ({
      shaderLocation: a.shaderLocation,
      offset: a.offset,
      format: a.format
    }))
  })));
}
function Hd(t) {
  return JSON.stringify([...t.entries()].map(([e, a]) => ({ group: e, entries: Wd(a) })));
}
function Gd(t) {
  const e = Math.max(-1, ...t.keys()), a = [];
  for (let n = 0; n <= e; n++)
    a.push(Vd(t, n));
  return a;
}
function Vd(t, e) {
  const a = t.get(e);
  if (!a)
    throw Is(e);
  return a;
}
function Wd(t) {
  return (Qe(t)?.entries ?? []).map((e) => ({
    binding: e.binding,
    visibility: e.visibility,
    buffer: e.buffer ? { ...e.buffer } : void 0,
    sampler: e.sampler ? { ...e.sampler } : void 0,
    texture: e.texture ? { ...e.texture } : void 0,
    storageTexture: e.storageTexture ? { ...e.storageTexture } : void 0,
    externalTexture: e.externalTexture ? { ...e.externalTexture } : void 0
  }));
}
const qd = zt("frame-state");
function ti(t) {
  return t.service(qd, Xd);
}
function Xd() {
  const t = /* @__PURE__ */ new Set();
  let e = kn(), a = !1, n = !1;
  const r = {
    time: 0,
    deltaTime: 0,
    frameCount: 0,
    advanceBy(i) {
      r.deltaTime = i, r.time += i, n = !0;
    },
    tick() {
      if (a)
        throw ur();
      a = !0;
      try {
        const i = kn();
        n ? n = !1 : (r.deltaTime = Math.max(0, (i - e) / 1e3), r.time += r.deltaTime), e = i, r.frameCount += 1;
        for (const s of [...t])
          s();
      } finally {
        a = !1;
      }
    },
    onAdvance(i) {
      return t.add(i), () => {
        t.delete(i);
      };
    }
  };
  return r;
}
function kn() {
  return globalThis.performance?.now?.() ?? Date.now();
}
function Kd(t, e, a = {}) {
  const n = me(t, "surface"), r = Yd(n), i = r.get(e);
  if (i && !i.disposed)
    throw Ms(i.label);
  const s = new ni(n.device, e, a, (d) => {
    r.get(d.canvas) === d && r.delete(d.canvas), o(), c();
  }), o = ti(n).onAdvance(() => s.applyAutoResize()), c = n.own("resource", () => s.dispose());
  return r.set(e, s), s;
}
const Jd = zt("surfaces");
function Yd(t) {
  return t.service(Jd, () => /* @__PURE__ */ new Map());
}
let Ze = 0, Na = 0;
function Zd() {
  return Ze > 0;
}
function Qd() {
  return Na > 0;
}
function _d() {
  Na += 1;
}
function el() {
  Na -= 1;
}
function ai(t) {
  return t instanceof ni;
}
class ni {
  device;
  canvas;
  options;
  unregister;
  resourceIdentity = Rt("render-target");
  label;
  context;
  autoResize;
  layoutBacked;
  format;
  #e = new Dt();
  #t = /* @__PURE__ */ new Set();
  #a = /* @__PURE__ */ new Set();
  #n;
  #i;
  #r = !1;
  #o = !1;
  constructor(e, a, n, r) {
    this.device = e, this.canvas = a, this.options = n, this.unregister = r, this.label = n.label, this.#i = n.clearColor === void 0 ? Ua : Lt(n.clearColor, "surface.clearColor");
    const i = a.getContext("webgpu");
    if (!i)
      throw Ss();
    if (this.context = i, this.layoutBacked = tl(a), n.autoResize === !0 && !this.layoutBacked)
      throw Us();
    this.autoResize = n.autoResize ?? (n.size ? !1 : this.layoutBacked), this.#n = Mn(n.dpr), this.format = n.format ?? nl();
    const s = al(a, n, this.layoutBacked, this.#n);
    (n.size || this.layoutBacked) && Sn(a, s), i.configure({
      device: e.gpu,
      format: this.format,
      alphaMode: n.alphaMode ?? "premultiplied",
      colorSpace: n.colorSpace ?? "srgb",
      usage: rl()
    });
  }
  get gpu() {
    return this.context;
  }
  get size() {
    return this.#d(), Ut(this.canvas);
  }
  get texelSize() {
    const e = this.size;
    return [1 / e[0], 1 / e[1]];
  }
  get color() {
    return this.#d(), new Ge(this.device, this.context.getCurrentTexture(), {
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
    this.#d();
  }
  get sampleCount() {
    return this.#d(), 1;
  }
  get dpr() {
    return this.#n;
  }
  /** Default clear color of this surface; passes that clear without naming a color use it. */
  get clearColor() {
    return ja(this.#i);
  }
  set clearColor(e) {
    this.#i = Lt(e, "surface.clearColor");
  }
  get disposed() {
    return this.#r;
  }
  resize(e) {
    if (this.#d(), this.#o)
      throw js(this.options.label);
    this.#l(Ot(e), this.#n, !0);
  }
  applyAutoResize() {
    if (this.#r || !this.autoResize || !this.layoutBacked)
      return;
    const e = Mn(this.options.dpr), a = ri(this.canvas, e);
    this.#l(a, e, !0);
  }
  onResize(e) {
    this.#d(), this.#t.add(e), this.#o = !0, Ze += 1;
    try {
      e(this.#f());
    } finally {
      Ze -= 1, this.#o = !1;
    }
    return () => {
      this.#t.delete(e);
    };
  }
  async read() {
    return this.#d(), this.color.read();
  }
  async readFloats() {
    return this.#d(), this.color.readFloats();
  }
  onDestroy(e) {
    return this.#d(), this.#e.onDestroy(this, e);
  }
  onTexturesRecreated(e) {
    return this.#d(), this.#a.add(e), () => {
      this.#a.delete(e);
    };
  }
  renderPassDescriptor(e = {}) {
    const { clear: a = [0, 0, 0, 1], preserve: n } = e;
    this.#d();
    const r = { view: this.context.getCurrentTexture().createView(), loadOp: n ? "load" : "clear", storeOp: "store" };
    return n || (r.clearValue = Kr(a)), { colorAttachments: [r] };
  }
  dispose() {
    if (!this.#r) {
      this.#r = !0;
      try {
        this.context.unconfigure?.();
      } catch {
      }
      this.unregister(this), this.#t.clear(), this.#a.clear(), this.#e.emit(this);
    }
  }
  #l(e, a, n) {
    const r = !Jr(Ut(this.canvas), e);
    this.#n = a, r && (Sn(this.canvas, e), this.#s(), n && this.#c());
  }
  #s() {
    for (const e of [...this.#a])
      e();
  }
  #c() {
    this.#o = !0, Ze += 1;
    try {
      const e = this.#f();
      for (const a of [...this.#t])
        a(e);
    } finally {
      Ze -= 1, this.#o = !1;
    }
  }
  #f() {
    const e = Ut(this.canvas);
    return { width: e[0], height: e[1], dpr: this.#n, surface: this };
  }
  #d() {
    if (this.#r)
      throw Es(this.options.label);
  }
}
function tl(t) {
  return typeof t.clientWidth == "number";
}
function al(t, e, a, n) {
  return e.size ? Ot(e.size) : a ? ri(t, n) : Ot(Ut(t));
}
function ri(t, e) {
  const a = t;
  return Ot([Math.round(a.clientWidth * e), Math.round(a.clientHeight * e)]);
}
function Ut(t) {
  const e = t;
  return [e.width, e.height];
}
function Sn(t, e) {
  const a = t;
  a.width = e[0], a.height = e[1];
}
function Ot(t) {
  return [Math.max(1, Math.floor(t[0])), Math.max(1, Math.floor(t[1]))];
}
function Mn(t) {
  const e = globalThis.devicePixelRatio ?? 1;
  return Array.isArray(t) ? Math.min(t[1], Math.max(t[0], e)) : typeof t == "number" ? t : e;
}
function nl() {
  return globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
}
function rl() {
  const t = globalThis.GPUTextureUsage;
  return t ? t.RENDER_ATTACHMENT | t.TEXTURE_BINDING | t.COPY_SRC : void 0;
}
const il = {
  drawIndirect: { bytes: 16, args: "4 u32 values: vertexCount, instanceCount, firstVertex, firstInstance" },
  drawIndexedIndirect: { bytes: 20, args: "5 32-bit values: indexCount, instanceCount, firstIndex, baseVertex (signed), firstInstance" },
  dispatchWorkgroupsIndirect: { bytes: 12, args: "3 u32 values: workgroupCountX, workgroupCountY, workgroupCountZ" }
};
function ii(t, e, a, n) {
  const r = typeof a == "object" && a !== null ? a.buffer : void 0, i = En(a) ? a : En(r) ? r : void 0;
  if (!i)
    throw Ee(t, `received ${Un(a)}; expected a StorageBuffer or { buffer, offset? }.`, e);
  const s = i === a ? 0 : a.offset ?? 0;
  if (typeof s != "number" || !Number.isInteger(s) || s < 0)
    throw Ee(t, `offset must be an integer >= 0; received ${Un(s)}.`, e);
  if (s % 4 !== 0)
    throw Ee(t, `offset must be a multiple of 4 (WebGPU requires "indirectOffset is a multiple of 4"); received ${s}.`, e);
  if (!i.buffer.options.usage.includes("indirect"))
    throw Ee(t, `the buffer lacks the "indirect" usage (WebGPU requires "indirectBuffer.usage contains INDIRECT"); create it with storage(gpu, ${i.size}, { indirect: true }).`, e);
  const { bytes: o, args: c } = il[n];
  if (s + o > i.size)
    throw Ee(t, `${n} reads ${o} bytes (${c}) at offset ${s}, but offset + ${o} = ${s + o} exceeds the buffer size ${i.size}.`, e);
  return { buffer: i.gpu, offset: s };
}
function En(t) {
  return typeof t == "object" && t !== null && "gpu" in t && "size" in t && t.buffer instanceof Ie;
}
function Un(t) {
  if (typeof t == "string")
    return `"${t}"`;
  try {
    return JSON.stringify(t) ?? String(t);
  } catch {
    return String(t);
  }
}
const Ft = /* @__PURE__ */ Symbol("vgpu.frame.drawable");
function sl(t) {
  return t?.[Ft];
}
const ol = /* @__PURE__ */ Symbol("vgpu.frame.bundle");
function cl(t) {
  return t?.[ol];
}
const si = /* @__PURE__ */ Symbol("vgpu.frame.passAttachment");
function dl(t) {
  return typeof t?.[si] == "function" ? t : void 0;
}
function ll(t, e) {
  return Vt(me(t, "sampler")).sampler(e);
}
let jn = 1;
function fl(t) {
  const e = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new WeakMap();
  return {
    sampler(n = {}) {
      const r = da(n);
      let i = e.get(r);
      return i || (i = t.gpu.createSampler(n), e.set(r, i), a.set(i, { kind: "sampler", id: jn++ })), i;
    },
    identity(n) {
      let r = a.get(n);
      return r || (r = { kind: "sampler", id: jn++ }, a.set(n, r)), r;
    }
  };
}
function da(t) {
  if (t === null || typeof t != "object")
    return JSON.stringify(t);
  if (Array.isArray(t))
    return `[${t.map(da).join(",")}]`;
  const e = t;
  return `{${Object.keys(e).sort().map((a) => `${JSON.stringify(a)}:${da(e[a])}`).join(",")}}`;
}
const ul = zt("render-service");
function Vt(t) {
  return t.service(ul, hl);
}
function hl(t) {
  const e = t.device, a = wa(), n = ei(e, {
    errorSink: (o) => t.reportError(o),
    registerSettledSource: (o) => t.registerSettledSource(o)
  }), r = Qr(e), i = _r(e), s = fl(e);
  return t.own("service", () => {
    n.dispose(), r.dispose(), i.dispose(), a.dispose();
  }), { binds: a, pipelines: n, shaderModules: r, pipelineLayouts: i, sampler: (o) => s.sampler(o) };
}
function Ca(t) {
  if (typeof t == "string")
    return t;
  if (!bl(t) || !("version" in t) || t.version !== 1)
    throw bt(t);
  const a = t.wgsl;
  if (typeof a != "string")
    throw bt(t);
  return a;
}
function bl(t) {
  return typeof t == "object" && t !== null;
}
function Nn(t, e) {
  const a = me(t, "draw"), n = Vt(a), r = Ca(e.shader);
  return new ci(a.device, r, { ...e, shader: r }, n.binds, void 0, n.pipelines, n.shaderModules, n.pipelineLayouts, (i) => a.reportError(i), (i) => {
    a.trackDelivery(i);
  });
}
let ml = 1;
const oi = /* @__PURE__ */ new WeakMap();
class ci {
  source;
  label;
  #e = /* @__PURE__ */ new Map();
  constructor(e, a, n, r = wa(), i, s = ei(e), o = Qr(e), c = _r(e), d, l) {
    this.source = a, G(e, "Draw.constructor"), this.label = n.label ?? "draw";
    const f = ml++, m = ya(a, `${this.label}.wgsl`), p = Sl(this.label, n.entry), I = oa(this.label, m.entryPoints, "vertex", p.vertex, "draw"), S = oa(this.label, m.entryPoints, "fragment", p.fragment, "draw"), N = Ml(m, I, S), C = [I, S].filter((D) => !!D), b = zr(m.bindings, C);
    gl(e, this.label, m.bindings, C, b);
    const y = n.geometry, w = I ? nt(I, "inputs", this.label) : [], x = y && He in y ? y[He](w, `${this.label}.geometry`) : y?.vertexBufferLayouts, M = new Map(Gr(e, this.label, m, b)), U = c.get(M), h = o.get(a, `${this.label}.shader`), g = Hl(), v = wl(this.label, n), k = vl(this.label, n, v), E = El(e, this.label, n), L = Cl(e, this.label, n), O = Ol(this.label, n), A = Pl(this.label, n), P = Zr(this.label, n.constants, m.overrides, "draw"), B = Wr({
      device: e,
      label: this.label,
      drawId: f,
      reflection: m,
      bindGroupLayouts: M,
      cache: r,
      onIdentityChange: (D) => g.markStale({ kind: "binding-identity", drawLabel: this.label, ...D })
    });
    oi.set(this, { id: f, device: e, opts: n, vertexBufferLayouts: x, cache: r, defaultTarget: i, reflection: m, visibility: b, vertexEntry: I?.name ?? "vs_main", fragmentEntry: S?.name ?? "fs_main", entryKey: N, setCore: B, bindGroupLayouts: M, pipelineLayout: U, shaderModule: h, pipelineStore: s, pipelineLayouts: c, errorSink: d, trackSettled: l, resolvedPipelineKeys: /* @__PURE__ */ new Set(), recordedIn: g, ...v, ...k, ...E, ...L, ...O, ...A, ...P }), n.set && this.set(n.set);
    for (const D of n.targets ?? [])
      this.compileSync(D);
  }
  get gpu() {
    const e = F(this);
    for (const a of e.resolvedPipelineKeys) {
      const n = e.pipelineStore.getReady(a);
      if (n)
        return n;
    }
  }
  get targets() {
    return F(this).opts.targets;
  }
  /**
   * Frame drawable protocol: a `Frame` encodes through this instead of importing draw.ts, so a
   * program that never draws never pulls this module. The instance is its own protocol object —
   * `encode`, `label` and the depth/stencil metadata below are exactly what a pass needs.
   */
  get [Ft]() {
    return this;
  }
  /** @internal Frame drawable protocol; see {@link drawWritesDepth}. */
  writesDepth() {
    return Rl(this);
  }
  /** @internal Frame drawable protocol; see {@link drawStencilWritingOps}. */
  stencilWritingOps() {
    return Dl(this);
  }
  set(e) {
    const a = F(this);
    G(a.device, `${this.label}.set`);
    for (const n of a.setCore.set(e))
      a.recordedIn.markStale({ kind: "binding-identity", drawLabel: this.label, ...n });
    return this;
  }
  group(e, a) {
    const n = F(this);
    G(n.device, `${this.label}.group`);
    const r = this.#e.get(e) ?? this.layout(e), i = n.setCore.claimGroup(e, a, r);
    return n.recordedIn.markStale({ kind: "group-claim", drawLabel: this.label, group: e, previousIdentity: i, newIdentity: `claimed-group:${e}` }), this;
  }
  layout(e, a = {}) {
    return G(F(this).device, `${this.label}.layout`), a.dynamicOffsets ? this.#t(e) : F(this).setCore.layout(e);
  }
  #t(e) {
    const a = F(this);
    a.setCore.layout(e);
    const n = this.#e.get(e);
    if (n)
      return n;
    const r = Vl(this, e), i = Vr(a.device, `${this.label}.group${e}.dynamic.bgl`, r);
    return this.#e.set(e, i), a.bindGroupLayouts.set(e, i), a.pipelineLayout = a.pipelineLayouts.get(a.bindGroupLayouts), i;
  }
  /**
   * Encodes and submits this draw as a one-shot render pass.
   *
   * Raw claimed-bind-group validation failures are delivered asynchronously via
   * `gpu.onError` as `VGPU-R4-GROUP-VALIDATION`.
   */
  draw(e = {}) {
    G(F(this).device, `${this.label}.draw`);
    const a = Gt(e) ? { target: e } : e, n = F(this), r = a.target ?? n.defaultTarget;
    if (!r)
      throw na(`${this.label}.draw`);
    Gn(r, `${this.label}.draw`);
    const i = n.device.gpu.createCommandEncoder(), s = i.beginRenderPass(r.renderPassDescriptor()), o = [];
    try {
      this.encode(s, r, a, (f) => o.push(f));
    } catch (f) {
      _(o), Lr(n.device);
      try {
        s.end();
      } catch {
      }
      throw f;
    }
    Fr(n.device, s, o, o[0]?.context);
    let c;
    const d = o[0]?.context;
    d && _e(n.device, d);
    try {
      c = i.finish();
    } catch (f) {
      const m = d ? ne(n.device) : void 0;
      _(o), m && _([m]);
      const p = m?.context ?? d;
      if (p) {
        Hn(n, p.label, p.group, f);
        return;
      }
      throw f;
    }
    if (d) {
      const f = ne(n.device);
      f && (o[0] = o[0] ? At(f, o[0]) : f);
    }
    const l = o[0]?.context;
    l && _e(n.device, l);
    try {
      n.device.gpu.queue.submit([c]);
    } catch (f) {
      const m = l ? ne(n.device) : void 0;
      _(o), m && _([m]);
      const p = m?.context ?? l;
      if (p) {
        Hn(n, p.label, p.group, f);
        return;
      }
      throw f;
    }
    if (l) {
      const f = ne(n.device);
      f && (o[0] = o[0] ? At(f, o[0]) : f);
    }
    if (o.length) {
      const f = Or(n.device, o, { errorSink: n.errorSink });
      n.trackSettled?.(f);
    }
  }
  encode(e, a, n = {}, r) {
    G(F(this).device, `${this.label}.encode`);
    const i = this.pipelineFor(a, !0);
    if (!i)
      return;
    e.setPipeline(i);
    const s = F(this);
    s.blendConstant && e.setBlendConstant(s.blendConstant), s.stencilRef !== void 0 && e.setStencilReference(s.stencilRef);
    for (const o of s.setCore.bindGroups())
      this.#a(e, o, n, r);
    this.#o(e, n);
  }
  #a(e, a, n, r) {
    const i = Gl(n.offsets, a.group, a.offsets);
    if (!a.claimValidation || !r) {
      e.setBindGroup(a.group, a.bindGroup, i);
      return;
    }
    _e(F(this).device, a.claimValidation);
    try {
      e.setBindGroup(a.group, a.bindGroup, i);
    } catch (o) {
      throw Wc(F(this).device), De(a.claimValidation.label, a.claimValidation.group, o);
    }
    const s = ne(F(this).device);
    s && r(s);
  }
  compile(e) {
    G(F(this).device, `${this.label}.compile`);
    const { key: a, signature: n, signatureKey: r } = this.#n(e, `${this.label}.compile`);
    return F(this).pipelineStore.getAsync(a, () => this.#c(n), { where: `${this.label}.compile`, signature: r }).then(() => (G(F(this).device, `${this.label}.compile`), F(this).resolvedPipelineKeys.add(a), this));
  }
  compileSync(e) {
    G(F(this).device, `${this.label}.compileSync`);
    const { key: a, signature: n, signatureKey: r } = this.#n(e, `${this.label}.compileSync`);
    return F(this).pipelineStore.getSync(a, () => this.#s(n), { where: `${this.label}.compileSync`, signature: r }) && F(this).resolvedPipelineKeys.add(a), this;
  }
  pipelineFor(e, a = !1) {
    G(F(this).device, `${this.label}.pipelineFor`);
    const { key: n, signature: r, signatureKey: i } = this.#n(e, `${this.label}.pipelineFor`, a), s = F(this).pipelineStore.getSync(n, () => this.#s(r), { where: `${this.label}.pipelineFor`, signature: i });
    return s && F(this).resolvedPipelineKeys.add(n), s;
  }
  pipelineForAsync(e) {
    G(F(this).device, `${this.label}.pipelineForAsync`);
    const { key: a, signature: n, signatureKey: r } = this.#n(e, `${this.label}.pipelineForAsync`);
    return F(this).pipelineStore.getAsync(a, () => this.#c(n), { where: `${this.label}.pipelineForAsync`, signature: r }).then((s) => (G(F(this).device, `${this.label}.pipelineForAsync`), F(this).resolvedPipelineKeys.add(a), s));
  }
  #n(e, a, n = !1) {
    const r = this.#i(e, a, n), i = Yr(r);
    return { signature: r, signatureKey: i, key: this.#r(r) };
  }
  #i(e, a, n = !1) {
    const r = F(this), i = e ?? r.defaultTarget;
    if (!i)
      throw na(a);
    n || Gn(i, a);
    const s = Od(i);
    if (Fd(s, a), r.colorStates && r.colorStates.length !== s.colors.length)
      throw aa(this.label, `expected one entry per color attachment; colors has ${r.colorStates.length}, but the target signature has ${s.colors.length}.`, a);
    if (r.multisampleState?.alphaToCoverageEnabled && (s.sampleCount ?? 1) <= 1)
      throw vt(this.label, `alphaToCoverage requires a multisampled target, but the target signature has sampleCount ${s.sampleCount ?? 1}; create the target with msaa: true.`, a);
    if ((r.stencilState || r.stencilRef !== void 0) && !it(s.depth))
      throw Pe(this.label, `stencil requires a depth format with a stencil aspect, but the target signature has ${s.depth ? `"${s.depth}"` : "no depth"}; create the target with depth: "depth24plus-stencil8".`, a);
    return s;
  }
  #r(e) {
    const a = F(this), n = a.opts.geometry;
    return Pd({ module: a.shaderModule, pipelineLayout: a.pipelineLayout, vertexBufferLayouts: a.vertexBufferLayouts, signature: e, fragmentKey: a.fragmentKey, topology: n?.topology, stripIndexFormat: di(n), cullMode: a.cullMode, frontFace: a.frontFace, unclippedDepth: a.unclippedDepth, depthKey: a.depthKey, stencilKey: a.stencilKey, multisampleKey: a.multisampleKey, constantsKey: a.constantsKey, entryKey: a.entryKey });
  }
  #o(e, a = {}) {
    const n = F(this).opts.geometry;
    if (n?.vertexBuffers && n.vertexBuffers.forEach((i, s) => e.setVertexBuffer(s, i)), a.indirect !== void 0)
      return this.#l(e, n, a);
    const r = yl(this.label, n, F(this).opts, a);
    if (!n?.indexBuffer)
      return e.draw(r.vertexCount, r.instanceCount, r.firstVertex, r.firstInstance);
    e.setIndexBuffer(n.indexBuffer, n.indexFormat ?? "uint32"), e.drawIndexed(r.indexCount, r.instanceCount, r.firstIndex, r.baseVertex, r.firstInstance);
  }
  /**
   * The GPU reads the draw arguments from the buffer, so per-call counts alongside indirect are dead options and throw.
   * A non-zero firstInstance in the buffered arguments cannot be validated on the CPU; per WebGPU, it "must be 0,
   * unless the 'indirect-first-instance' feature is enabled", otherwise the indirect call "will be treated as a no-op".
   */
  #l(e, a, n) {
    const r = `${this.label}.draw`, i = pl.find((d) => n[d] !== void 0);
    if (i !== void 0)
      throw Ee(this.label, `indirect cannot be combined with ${i} in the same call; the GPU reads the draw arguments from the buffer, so the CPU-side value would be ignored.`, r);
    const s = !!a?.indexBuffer, { buffer: o, offset: c } = ii(this.label, r, n.indirect, s ? "drawIndexedIndirect" : "drawIndirect");
    if (!s)
      return e.drawIndirect(o, c);
    e.setIndexBuffer(a.indexBuffer, a.indexFormat ?? "uint32"), e.drawIndexedIndirect(o, c);
  }
  #s(e) {
    const a = F(this);
    return a.device.gpu.createRenderPipeline({
      label: `${this.label}.pipeline`,
      layout: a.pipelineLayout,
      vertex: { module: a.shaderModule, entryPoint: a.vertexEntry, buffers: [...a.vertexBufferLayouts ?? []], ...a.constants ? { constants: a.constants } : {} },
      fragment: { module: a.shaderModule, entryPoint: a.fragmentEntry, targets: Cn(e, a), ...a.constants ? { constants: a.constants } : {} },
      primitive: Tn(a.opts.geometry, a.cullMode, a.frontFace, a.unclippedDepth),
      depthStencil: Bn(e, a),
      multisample: Dn(e, a)
    });
  }
  #c(e) {
    const a = F(this);
    return a.device.gpu.createRenderPipelineAsync({
      label: `${this.label}.pipeline`,
      layout: a.pipelineLayout,
      vertex: { module: a.shaderModule, entryPoint: a.vertexEntry, buffers: [...a.vertexBufferLayouts ?? []], ...a.constants ? { constants: a.constants } : {} },
      fragment: { module: a.shaderModule, entryPoint: a.fragmentEntry, targets: Cn(e, a), ...a.constants ? { constants: a.constants } : {} },
      primitive: Tn(a.opts.geometry, a.cullMode, a.frontFace, a.unclippedDepth),
      depthStencil: Bn(e, a),
      multisample: Dn(e, a)
    });
  }
}
function gl(t, e, a, n, r) {
  const i = t.limits;
  for (const [s, o, c] of [["vertex", 1, "maxStorageBuffersInVertexStage"], ["fragment", 2, "maxStorageBuffersInFragmentStage"]]) {
    const d = n.find((m) => m.stage === s);
    if (!d)
      continue;
    const l = a.filter((m) => m.bindingLayout?.kind === "buffer" && m.bindingLayout.buffer.type !== "uniform" && r(m) & o), f = i[c] ?? i.maxStorageBuffersPerShaderStage;
    if (f !== void 0 && l.length > f)
      throw ns(e, s, d.name, l.length, f, l);
  }
}
const pl = ["vertices", "indices", "instances", "firstVertex", "firstIndex", "baseVertex", "firstInstance"];
function Cn(t, e) {
  return t.colors.map((a, n) => {
    const r = e.colorStates?.[n], i = r?.blendState ?? e.blendState, s = r?.writeMask ?? e.writeMask, o = { format: a };
    return i && (o.blend = i), s !== void 0 && (o.writeMask = s), o;
  });
}
function yl(t, e, a, n) {
  ye(t, "DrawOptions.instances", a.instances), ye(t, "DrawOptions.vertices", a.vertices), ye(t, "DrawOptions.firstInstance", a.firstInstance), ye(t, "DrawCallOptions.instances", n.instances), pe(t, "DrawCallOptions.vertices", n.vertices), pe(t, "DrawCallOptions.indices", n.indices), pe(t, "DrawCallOptions.firstVertex", n.firstVertex), pe(t, "DrawCallOptions.firstIndex", n.firstIndex), pe(t, "DrawCallOptions.baseVertex", n.baseVertex), ye(t, "DrawCallOptions.firstInstance", n.firstInstance), ye(t, "GeometryLike.vertexCount", e?.vertexCount), ye(t, "GeometryLike.indexCount", e?.indexCount), ye(t, "GeometryLike.instanceCount", e?.instanceCount), pe(t, "GeometryLike.firstVertex", e?.firstVertex), pe(t, "GeometryLike.firstIndex", e?.firstIndex), pe(t, "GeometryLike.baseVertex", e?.baseVertex);
  const r = !!e?.indexBuffer, s = e?.geometry ?? (e && He in e ? e : void 0), o = n.firstVertex ?? e?.firstVertex ?? 0, c = n.vertices ?? e?.vertexCount ?? a.vertices ?? 3, d = n.firstIndex ?? e?.firstIndex ?? 0, l = n.indices ?? e?.indexCount ?? 0, f = n.baseVertex ?? e?.baseVertex ?? 0;
  if (r)
    An(t, "index", d, l, s?.indexCount);
  else if (n.indices !== void 0 || n.firstIndex !== void 0 || n.baseVertex !== void 0)
    throw ze(`${t}.draw`, "Index range needs an indexed geometry.");
  return r || An(t, "vertex", o, c, s?.vertexCount), {
    instanceCount: n.instances ?? a.instances ?? e?.instanceCount ?? 1,
    firstInstance: n.firstInstance ?? a.firstInstance ?? 0,
    vertexCount: c,
    firstVertex: o,
    indexCount: l,
    firstIndex: d,
    baseVertex: f
  };
}
function di(t) {
  const e = t?.topology ?? "triangle-list";
  return t?.stripIndexFormat ?? (e.endsWith("strip") ? t?.indexFormat : void 0);
}
function Tn(t, e, a, n) {
  const r = t?.topology ?? "triangle-list", i = di(t), s = i ? { topology: r, stripIndexFormat: i } : { topology: r };
  return e !== void 0 && (s.cullMode = e), a !== void 0 && (s.frontFace = a), n && (s.unclippedDepth = !0), s;
}
function An(t, e, a, n, r) {
  if (!(r === void 0 || a + n <= r))
    throw ze(`${t}.draw`, `${e} range [${a}, ${a + n}) exceeds parent geometry ${e} count ${r}.`);
}
function pe(t, e, a) {
  if (!(a === void 0 || Number.isInteger(a) && a >= 0))
    throw ze(`${t}.draw`, `${e} must be an integer >= 0; received ${String(a)}.`);
}
function ye(t, e, a) {
  if (a !== void 0 && !(Number.isInteger(a) && a >= 0))
    throw new j({
      code: "VGPU-R1-DRAW-COUNT",
      message: `${e} of '${t}' must be an integer >= 0; received ${String(a)}. Use 0 only when you want to issue a valid draw with no vertices/instances.`,
      where: `${t}.draw`
    });
}
function wl(t, e) {
  const a = e.blend === void 0 ? void 0 : li(t, e.blend), n = e.writeMask === void 0 ? void 0 : hi(t, e.writeMask), r = e.colors === void 0 ? void 0 : xl(t, e.colors), i = r ? `${zn(a, n)}@${r.map($l).join("@")}` : a || n !== void 0 ? zn(a, n) : void 0;
  return { blendState: a, writeMask: n, colorStates: r, fragmentKey: i };
}
function xl(t, e) {
  if (!Array.isArray(e))
    throw aa(t, `colors must be an array; received ${z(e)}.`);
  return e.map((a, n) => {
    if (a == null)
      return null;
    if (typeof a != "object" || Array.isArray(a))
      throw aa(t, `colors[${n}] must be null or { blend?, writeMask? }; received ${z(a)}.`);
    const r = a.blend === void 0 ? void 0 : li(`${t}.colors[${n}]`, a.blend), i = a.writeMask === void 0 ? void 0 : hi(`${t}.colors[${n}]`, a.writeMask);
    return !r && i === void 0 ? null : { blendState: r, writeMask: i };
  });
}
function li(t, e) {
  if (e === "alpha")
    return gt({ src: "src-alpha", dst: "one-minus-src-alpha" }, { src: "one", dst: "one-minus-src-alpha" });
  if (e === "premultiplied")
    return gt({ src: "one", dst: "one-minus-src-alpha" }, { src: "one", dst: "one-minus-src-alpha" });
  if (e === "additive")
    return gt({ src: "one", dst: "one" }, { src: "one", dst: "one" });
  if (typeof e != "object" || e === null || !Ln(e.color))
    throw Wa(t, e);
  const a = e.color, n = e.alpha;
  if (n !== void 0 && !Ln(n))
    throw Wa(t, e);
  return gt(a, n ?? a);
}
function Ln(t) {
  return typeof t == "object" && t !== null && typeof t.src == "string" && typeof t.dst == "string";
}
function gt(t, e) {
  return { color: On(t), alpha: On(e) };
}
function On(t) {
  return { srcFactor: t.src, dstFactor: t.dst, operation: t.op ?? "add" };
}
function vl(t, e, a) {
  if (e.blendConstant === void 0)
    return {};
  const n = e.blendConstant;
  if (!Array.isArray(n) || n.length !== 4 || n.some((r) => typeof r != "number" || !Number.isFinite(r)))
    throw qa(t, `received ${z(n)}; expected [r, g, b, a] finite numbers.`);
  if (!Il(a).some((r) => r && kl(r)))
    throw qa(t, `no color target's effective blend uses a "constant"/"one-minus-constant" factor (colors[i].blend replaces the top-level blend for that target), so blendConstant would have no effect.`);
  return { blendConstant: { r: n[0], g: n[1], b: n[2], a: n[3] } };
}
function Il(t) {
  return t.colorStates ? t.colorStates.map((e) => e?.blendState ?? t.blendState) : [t.blendState];
}
function kl(t) {
  return [t.color.srcFactor, t.color.dstFactor, t.alpha.srcFactor, t.alpha.dstFactor].some((e) => e === "constant" || e === "one-minus-constant");
}
function Sl(t, e) {
  if (e === void 0)
    return {};
  if (typeof e != "object" || e === null || Array.isArray(e))
    throw It(t, `received ${z(e)}; expected { vertex?, fragment? } entry point names.`);
  return e;
}
function Ml(t, e, a) {
  const n = t.entryPoints.find((i) => i.stage === "vertex"), r = t.entryPoints.find((i) => i.stage === "fragment");
  if (!(e === n && a === r))
    return `en~${e?.name ?? ""}~${a?.name ?? ""}`;
}
function El(t, e, a) {
  const n = a.cull === void 0 ? void 0 : jl(e, a.cull), r = a.frontFace === void 0 ? void 0 : Nl(e, a.frontFace), i = a.unclippedDepth === void 0 ? void 0 : Ul(t, e, a.unclippedDepth);
  return { cullMode: n, frontFace: r, unclippedDepth: i };
}
function Ul(t, e, a) {
  if (typeof a != "boolean")
    throw Ka(e, `received ${z(a)}; expected a boolean.`);
  if (a) {
    if (!t.features.has("depth-clip-control"))
      throw Ka(e, 'the device lacks the "depth-clip-control" feature; request it at init: init({ requiredFeatures: ["depth-clip-control"] }) on an adapter that supports it.');
    return !0;
  }
}
function jl(t, e) {
  if (e === "none" || e === "front" || e === "back")
    return e;
  throw cs(t, e);
}
function Nl(t, e) {
  if (e === "ccw" || e === "cw")
    return e;
  throw ds(t, e);
}
const fi = { depthWriteEnabled: !0, depthCompare: "less-equal" }, ui = ["never", "less", "equal", "less-equal", "greater", "not-equal", "greater-equal", "always"], Fn = -2147483648, Pn = 2147483647;
function Bn(t, e) {
  if (t.depth)
    return { format: t.depth, ...e.depthState ?? fi, ...e.stencilState ?? {} };
}
function Cl(t, e, a) {
  if (a.depth === void 0)
    return {};
  const n = Tl(t, e, a.depth, a.geometry?.topology ?? "triangle-list");
  return { depthState: n, depthKey: Al(n) };
}
function Tl(t, e, a, n) {
  if (a === !1)
    return { depthWriteEnabled: !1, depthCompare: "always" };
  if (typeof a != "object" || a === null)
    throw le(e, `received ${z(a)}.`);
  if (a.write !== void 0 && typeof a.write != "boolean")
    throw le(e, `write must be a boolean; received ${z(a.write)}.`);
  if (a.compare !== void 0 && !ui.includes(a.compare))
    throw le(e, `compare must be a GPUCompareFunction; received ${z(a.compare)}.`);
  if (a.bias !== void 0 && !Number.isInteger(a.bias))
    throw le(e, `bias must be an integer (WebGPU depthBias is i32); received ${z(a.bias)}.`);
  if (a.bias !== void 0 && (a.bias < Fn || a.bias > Pn))
    throw le(e, `bias must fit in the i32 range [${Fn}, ${Pn}] (WebGPU depthBias is i32); received ${z(a.bias)}.`);
  if (a.biasSlopeScale !== void 0 && !Number.isFinite(a.biasSlopeScale))
    throw le(e, `biasSlopeScale must be a finite number; received ${z(a.biasSlopeScale)}.`);
  if (a.biasClamp !== void 0 && !Number.isFinite(a.biasClamp))
    throw le(e, `biasClamp must be a finite number; received ${z(a.biasClamp)}.`);
  const r = a.bias ?? 0, i = a.biasSlopeScale ?? 0, s = a.biasClamp ?? 0;
  if ((r !== 0 || i !== 0 || s !== 0) && !n.startsWith("triangle"))
    throw le(e, `bias, biasSlopeScale, and biasClamp must be 0 for "${n}" topology.`);
  if (s !== 0 && t.isCompatibilityMode)
    throw le(e, `biasClamp must be 0 on a compatibility-mode device; received ${z(a.biasClamp)}.`);
  return {
    depthWriteEnabled: a.write ?? !0,
    depthCompare: a.compare ?? "less-equal",
    ...r !== 0 ? { depthBias: r } : {},
    ...i !== 0 ? { depthBiasSlopeScale: i } : {},
    ...s !== 0 ? { depthBiasClamp: s } : {}
  };
}
function Al(t) {
  return `${t.depthWriteEnabled ? 1 : 0}~${t.depthCompare}~${t.depthBias ?? 0}~${t.depthBiasSlopeScale ?? 0}~${t.depthBiasClamp ?? 0}`;
}
const Ll = ["keep", "zero", "replace", "invert", "increment-clamp", "decrement-clamp", "increment-wrap", "decrement-wrap"];
function Ol(t, e) {
  if (e.stencil === void 0)
    return {};
  const a = e.stencil;
  if (typeof a != "object" || a === null || Array.isArray(a))
    throw Pe(t, `received ${z(a)}; expected { front?, back?, readMask?, writeMask?, ref? }.`);
  const n = a.front === void 0 ? void 0 : $n(t, "front", a.front), r = a.back === void 0 ? void 0 : $n(t, "back", a.back);
  Yt(t, "readMask", a.readMask), Yt(t, "writeMask", a.writeMask), Yt(t, "ref", a.ref);
  const i = {
    ...n ? { stencilFront: n } : {},
    // Omitted back mirrors the normalized front so both faces behave the same; with neither given, both keep the WebGPU defaults.
    ...r ?? n ? { stencilBack: r ?? { ...n } } : {},
    ...a.readMask !== void 0 ? { stencilReadMask: a.readMask } : {},
    ...a.writeMask !== void 0 ? { stencilWriteMask: a.writeMask } : {}
  }, s = i.stencilFront !== void 0 || i.stencilBack !== void 0 || i.stencilReadMask !== void 0 || i.stencilWriteMask !== void 0;
  return !s && a.ref === void 0 ? {} : {
    ...s ? { stencilState: i, stencilKey: Fl(i) } : {},
    // The reference is encoder state (setStencilReference), not pipeline state; it stays out of the pipeline key.
    ...a.ref !== void 0 ? { stencilRef: a.ref } : {}
  };
}
function $n(t, e, a) {
  if (typeof a != "object" || a === null || Array.isArray(a))
    throw Pe(t, `${e} must be a { compare?, fail?, depthFail?, pass? } object; received ${z(a)}.`);
  if (a.compare !== void 0 && !ui.includes(a.compare))
    throw Pe(t, `${e}.compare must be a GPUCompareFunction; received ${z(a.compare)}.`);
  for (const [n, r] of [["fail", a.fail], ["depthFail", a.depthFail], ["pass", a.pass]])
    if (r !== void 0 && !Ll.includes(r))
      throw Pe(t, `${e}.${n} must be a GPUStencilOperation; received ${z(r)}.`);
  return { compare: a.compare ?? "always", failOp: a.fail ?? "keep", depthFailOp: a.depthFail ?? "keep", passOp: a.pass ?? "keep" };
}
function Yt(t, e, a) {
  if (a !== void 0 && (typeof a != "number" || !Number.isInteger(a) || a < 0 || a > 4294967295))
    throw Pe(t, `${e} must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue is u32); received ${z(a)}.`);
}
function Fl(t) {
  return `st~${Rn(t.stencilFront)}~${Rn(t.stencilBack)}~${t.stencilReadMask ?? 4294967295}~${t.stencilWriteMask ?? 4294967295}`;
}
function Rn(t) {
  return t ? `${t.compare},${t.failOp},${t.depthFailOp},${t.passOp}` : "default";
}
function Dn(t, e) {
  return { count: t.sampleCount ?? 1, ...e.multisampleState ?? {} };
}
function Pl(t, e) {
  if (e.multisample === void 0)
    return {};
  const a = e.multisample;
  if (typeof a != "object" || a === null || Array.isArray(a))
    throw vt(t, `received ${z(a)}; expected { alphaToCoverage?, mask? }.`);
  if (a.alphaToCoverage !== void 0 && typeof a.alphaToCoverage != "boolean")
    throw vt(t, `alphaToCoverage must be a boolean; received ${z(a.alphaToCoverage)}.`);
  if (a.mask !== void 0 && (typeof a.mask != "number" || !Number.isInteger(a.mask) || a.mask < 0 || a.mask > 4294967295))
    throw vt(t, `mask must be an integer in [0, 0xFFFFFFFF] (WebGPU GPUSampleMask is u32); received ${z(a.mask)}.`);
  const n = {
    ...a.alphaToCoverage !== void 0 ? { alphaToCoverageEnabled: a.alphaToCoverage } : {},
    ...a.mask !== void 0 ? { mask: a.mask } : {}
  };
  return n.alphaToCoverageEnabled === void 0 && n.mask === void 0 ? {} : { multisampleState: n, multisampleKey: Bl(n) };
}
function Bl(t) {
  return `ms~${t.alphaToCoverageEnabled ? 1 : 0}~${t.mask ?? 4294967295}`;
}
function hi(t, e) {
  if (!Array.isArray(e))
    throw Xa(t, z(e));
  let a = 0;
  for (const n of e)
    if (n === "r")
      a |= 1;
    else if (n === "g")
      a |= 2;
    else if (n === "b")
      a |= 4;
    else if (n === "a")
      a |= 8;
    else
      throw Xa(t, z(n));
  return a;
}
function zn(t, e) {
  return `${bi(t)};${e ?? 15}`;
}
function bi(t) {
  if (!t)
    return "none;none";
  const e = t.color, a = t.alpha;
  return `${e.srcFactor},${e.dstFactor},${e.operation};${a.srcFactor},${a.dstFactor},${a.operation}`;
}
function $l(t) {
  return t ? `${t.blendState ? bi(t.blendState) : "inherit"};${t.writeMask ?? "inherit"}` : "inherit";
}
function z(t) {
  if (typeof t == "string")
    return `"${t}"`;
  try {
    return JSON.stringify(t) ?? String(t);
  } catch {
    return String(t);
  }
}
function Rl(t) {
  return (F(t).depthState ?? fi).depthWriteEnabled;
}
function Dl(t) {
  const e = F(t), a = e.stencilState;
  if (!a || a.stencilWriteMask === 0)
    return [];
  const n = e.cullMode ?? "none", r = [], i = (s, o) => {
    if (o)
      for (const [c, d] of [["fail", o.failOp], ["depthFail", o.depthFailOp], ["pass", o.passOp]])
        d !== void 0 && d !== "keep" && r.push(`${s}.${c}: "${d}"`);
  };
  return n !== "front" && i("front", a.stencilFront), n !== "back" && i("back", a.stencilBack), r;
}
function zl(t, e, a, n = {}, r) {
  t.encode(e, a, n, r);
}
function F(t) {
  const e = oi.get(t);
  if (!e)
    throw new TypeError("Invalid Draw instance");
  return e;
}
function Hn(t, e, a, n) {
  const r = (async () => {
    await xa(t.device), G(t.device, `${e}.validation`);
    const i = De(e, a, n);
    t.errorSink ? await t.errorSink(i) : console.error(i);
  })();
  return t.trackSettled?.(r), r;
}
function Hl() {
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
      for (const a of t)
        a.markStale(e);
    }
  };
}
function Gl(t, e, a) {
  return t ? Array.isArray(t) ? t : t[e] ?? a : a;
}
function Vl(t, e) {
  const a = F(t);
  return Hr(a.reflection.bindings, e, a.visibility).map(Wl);
}
function Wl(t) {
  return t.buffer ? { ...t, buffer: { ...t.buffer, hasDynamicOffset: !0 } } : t;
}
function Gn(t, e) {
  if (ai(t) && !Qd())
    throw fr(e);
}
function Vn(t, e, a = {}) {
  if ("geometry" in a)
    throw J("effect", "effect() never accepts vertex buffers; use draw(gpu, { shader, geometry: geometry(gpu, descriptor) }).");
  const n = me(t, "effect"), r = Vt(n);
  return new ql(n.device, Ca(e), a, r.binds, void 0, r.pipelines, r.shaderModules, r.pipelineLayouts, (i) => n.reportError(i), (i) => {
    n.trackDelivery(i);
  });
}
const mi = /* @__PURE__ */ new WeakMap();
class ql {
  get gpu() {
    return Me(this).gpu;
  }
  constructor(e, a, n = {}, r, i, s, o, c, d, l) {
    const f = Xl(a), m = new ci(e, f, { shader: f, set: n.set, label: n.label ?? "effect", blend: n.blend, writeMask: n.writeMask }, r, i, s, o, c, d, l);
    mi.set(this, m);
  }
  set(e) {
    return Me(this).set(e), this;
  }
  draw(e = {}) {
    Me(this).draw(Gt(e) ? { target: e } : e);
  }
  compile(e) {
    return Me(this).compile(e).then(() => this);
  }
  compileSync(e) {
    return Me(this).compileSync(e), this;
  }
  /** @internal FramePass delegates here; not part of the frozen public Effect surface. */
  encode(e, a, n = {}, r) {
    zl(Me(this), e, a, n, r);
  }
  /**
   * Frame drawable protocol: an effect is encoded as its underlying draw, so it reuses that draw's
   * protocol object — same encode path, same depth/stencil metadata for read-only passes.
   */
  get [Ft]() {
    return Me(this)[Ft];
  }
}
function Me(t) {
  const e = mi.get(t);
  if (!e)
    throw new TypeError("Invalid Effect instance");
  return e;
}
function Xl(t) {
  return Kl(t) ? t : `
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
function Kl(t) {
  return ya(t, "effect.wgsl").entryPoints.some((e) => e.stage === "vertex");
}
function Jl(t, e, a = {}) {
  const n = me(t, "compute");
  return new Zl(n.device, Ca(e), a, Vt(n).binds);
}
let Yl = 1;
class Zl {
  device;
  source;
  opts;
  cache;
  id = Yl++;
  label;
  reflection;
  entryPoint;
  setCore;
  bindGroupLayouts;
  pipelineLayout;
  shaderModule;
  pipeline;
  #e;
  constructor(e, a, n = {}, r = wa()) {
    this.device = e, this.source = a, this.opts = n, this.cache = r, G(e, "Compute.constructor"), this.label = n.label ?? "compute", this.reflection = ya(a, `${this.label}.wgsl`);
    const i = Ql(this.reflection, this.label, n.entry);
    this.entryPoint = i.name;
    const { constants: s } = Zr(this.label, n.constants, this.reflection.overrides, "compute");
    this.bindGroupLayouts = Gr(e, this.label, this.reflection, zr(this.reflection.bindings, [i])), this.pipelineLayout = ud(e, this.bindGroupLayouts), this.shaderModule = e.gpu.createShaderModule({ label: `${this.label}.shader`, code: a }), this.pipeline = e.gpu.createComputePipeline({
      label: `${this.label}.pipeline`,
      layout: this.pipelineLayout,
      compute: { module: this.shaderModule, entryPoint: this.entryPoint, ...s ? { constants: s } : {} }
    }), this.setCore = Wr({ device: e, label: this.label, drawId: this.id, reflection: this.reflection, bindGroupLayouts: this.bindGroupLayouts, cache: this.cache });
    const o = new Set(nt(i, "bindings", this.label).map((c) => `${c.group}:${c.binding}`));
    this.#e = this.reflection.bindings.filter((c) => c.kind === "buffer" && c.addressSpace === "storage" && o.has(`${c.group}:${c.binding}`)), n.set && this.set(n.set);
  }
  set(e) {
    return G(this.device, `${this.label}.set`), this.setCore.set(e), this;
  }
  dispatch(e, a, n) {
    G(this.device, `${this.label}.dispatch`);
    const r = typeof e == "object" && e !== null ? this.#t(e, a, n) : void 0;
    this.#a();
    const i = this.device.gpu.createCommandEncoder({ label: `${this.label}.encoder` }), s = i.beginComputePass({ label: `${this.label}.pass` });
    s.setPipeline(this.pipeline);
    for (const o of this.setCore.bindGroups())
      s.setBindGroup(o.group, o.bindGroup, o.offsets);
    r ? s.dispatchWorkgroupsIndirect(r.buffer, r.offset) : s.dispatchWorkgroups(e, a ?? 1, n ?? 1), s.end(), this.device.gpu.queue.submit([i.finish()]);
  }
  /** The GPU reads the workgroup counts from the buffer, so explicit counts alongside indirect are dead options and throw. */
  #t(e, a, n) {
    const r = `${this.label}.dispatch`;
    if (a !== void 0 || n !== void 0)
      throw Ee(this.label, "indirect cannot be combined with explicit workgroup counts in the same call; the GPU reads the counts from the buffer, so the CPU-side values would be ignored.", r);
    return ii(this.label, r, e.indirect, "dispatchWorkgroupsIndirect");
  }
  #a() {
    if (!this.#e.length)
      return;
    const e = /* @__PURE__ */ new Map();
    for (const a of this.#e) {
      const n = this.setCore.bindingState(a.name);
      if (!n)
        continue;
      const r = Ct(n.identity);
      e.has(r) || e.set(r, []), e.get(r).push({ identity: n.identity, writable: a.access !== "read" });
    }
    for (const a of e.values())
      if (!(a.length < 2) && a.some((n) => n.writable))
        throw As(`${this.label}.dispatch`);
  }
}
function Ql(t, e, a) {
  const n = oa(e, t.entryPoints, "compute", a, "compute");
  if (!n)
    throw J(`${e}.compute`, "The compute shader requires a @compute entry point.");
  return n;
}
function _l(t, e, a = {}) {
  return tf(me(t, "frameLoop")).loop(e, a);
}
const ef = zt("frame-runner");
function tf(t) {
  return t.service(ef, (e) => {
    const a = ti(e);
    return new hf(() => {
      let n = () => {
      };
      const r = new af(e.device, void 0, (i) => e.reportError(i), (i) => {
        e.trackDelivery(i);
      }, () => n());
      return n = e.own("scheduler", () => r.cancel()), r;
    }, () => a.tick(), (n) => e.own("scheduler", () => n.stop()));
  });
}
class af {
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
  #a = /* @__PURE__ */ new Set();
  /**
   * Owners whose per-frame bookkeeping a failed pass invalidated: their frame is neither finalized
   * nor read back, so a throwing pass callback cannot leave a phantom result. Kept alongside the
   * live set so a later pass re-attaching the same instance in this frame stays dropped too — the
   * failed pass's span/slots are still in that instance's frame bookkeeping.
   */
  #n = /* @__PURE__ */ new Set();
  #i = !1;
  #r = !1;
  #o = !1;
  constructor(e, a, n, r, i) {
    this.device = e, this.defaultTarget = a, this.errorSink = n, this.trackSettled = r, this.releaseLifecycle = i, G(e, "Frame.constructor"), this.#e = e.gpu.createCommandEncoder({ label: "vgpu.frame" });
  }
  pass(e, a) {
    if (this.#r)
      throw en("Frame.pass");
    G(this.device, "Frame.pass");
    const n = Gt(e), r = typeof a == "function" ? a : (S) => S.draw(a), i = n ? e : e.target ?? this.defaultTarget;
    if (!i)
      throw na("Frame.pass");
    if (ai(i) && this.#i)
      throw fr("Frame.pass");
    const s = n ? void 0 : e.clear, o = s === !1;
    if (o && i.sampleCount === 4)
      throw ls();
    const c = n ? void 0 : e.clearDepth;
    if (c !== void 0) {
      if (typeof c != "number" || !(c >= 0 && c <= 1))
        throw Ja(c);
      if (o)
        throw fs();
      if (!i.depth)
        throw Ja(c, "but the target has no depth attachment, so clearDepth would have no effect.", "Create the target with depth: true (or a depth format), or drop clearDepth.");
    }
    const d = n ? void 0 : e.clearStencil;
    if (d !== void 0) {
      if (typeof d != "number" || !Number.isInteger(d) || d < 0 || d > 4294967295)
        throw Ya(`received ${String(d)}; expected an integer in [0, 0xFFFFFFFF] (WebGPU GPUStencilValue).`);
      if (o)
        throw us();
      const S = i.depth?.format;
      if (!it(S))
        throw Ya(`received ${String(d)}, but the target's depth format ${S ? `"${S}"` : "(none)"} has no stencil aspect, so clearStencil would have no effect.`);
    }
    const l = n ? void 0 : e.depthReadOnly;
    if (l !== void 0 && typeof l != "boolean")
      throw je(`received ${ke(l)}; expected a boolean.`, "Pass depthReadOnly: true to open the pass with a read-only depth attachment, or omit it.");
    if (l) {
      if (!i.depth)
        throw je("is set, but the target has no depth attachment, so there is nothing to make read-only.", "Create the target with depth: true (or a depth format), or drop depthReadOnly.");
      if (i.sampleCount === 4)
        throw hs();
      if (c !== void 0)
        throw je("cannot be combined with clearDepth; a read-only depth aspect omits its load/store ops and is never cleared.", "Remove clearDepth, or drop depthReadOnly.");
      if (d !== void 0)
        throw je("cannot be combined with clearStencil; a read-only stencil aspect omits its load/store ops and is never cleared.", "Remove clearStencil, or drop depthReadOnly.");
    }
    const f = n ? void 0 : lf(e.viewport, this.device.gpu.limits, i.size), m = n ? void 0 : ff(e.scissor, i.size), p = [];
    let I;
    try {
      const S = n || e.timer === void 0 ? void 0 : this.#d(e.timer, i, p, cf), C = (n || e.visibility === void 0 ? void 0 : this.#d(e.visibility, i, p, df))?.occlusion;
      let b = i.renderPassDescriptor({ clear: s === void 0 || s === !0 || s === !1 ? i.clearColor ?? Ua : s, preserve: o, clearDepth: c, clearStencil: d, depthReadOnly: l });
      S?.timestampWrites && (b = { ...b, timestampWrites: S.timestampWrites }), C && (b = { ...b, occlusionQuerySet: C.querySet }), I = this.#e.beginRenderPass(b), f && I.setViewport(f.x, f.y, f.width, f.height, f.minDepth, f.maxDepth), m && I.setScissorRect(m[0], m[1], m[2], m[3]), this.#o = !0;
      try {
        r(new nf(I, i, this.#t, l === !0, C, this, (y) => {
          if (G(this.device, y), this.#r)
            throw en(y);
        }));
      } finally {
        this.#o = !1;
      }
    } catch (S) {
      this.#c(p), _(this.#t), this.#t.length = 0, Lr(this.device);
      try {
        I?.end();
      } catch {
      }
      throw S;
    }
    Fr(this.device, I, this.#t);
  }
  submit() {
    if (this.#i || this.#r)
      return;
    G(this.device, "Frame.submit"), this.#i = !0, this.releaseLifecycle?.();
    for (const r of this.#f())
      r.finalizeFrame(this, this.#e);
    let e;
    const a = this.#t[0]?.context;
    a && _e(this.device, a);
    try {
      e = this.#e.finish();
    } catch (r) {
      this.#l(this.#s());
      const i = a ? ne(this.device) : void 0;
      _(this.#t), i && _([i]);
      const s = i?.context ?? a;
      if (!s)
        throw r;
      this.done = this.#h(this.#u(s.label, s.group, r));
      return;
    }
    if (a) {
      const r = ne(this.device);
      r && (this.#t[0] = this.#t[0] ? At(r, this.#t[0]) : r);
    }
    const n = this.#t[0]?.context;
    n && _e(this.device, n);
    try {
      this.device.gpu.queue.submit([e]);
    } catch (r) {
      this.#l(this.#s());
      const i = n ? ne(this.device) : void 0;
      _(this.#t), i && _([i]);
      const s = i?.context ?? n;
      if (!s)
        throw r;
      this.done = this.#h(this.#u(s.label, s.group, r));
      return;
    }
    if (n) {
      const r = ne(this.device);
      r && (this.#t[0] = this.#t[0] ? At(r, this.#t[0]) : r);
    }
    for (const r of this.#f())
      r.frameSubmitted(this);
    this.#l(this.#n), this.done = this.#h(Or(this.device, this.#t, { errorSink: this.errorSink }));
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
    if (!this.#r) {
      if (this.#i)
        throw Ts("Frame.cancel");
      if (this.#o)
        throw Cs("Frame.cancel");
      this.#r = !0, this.releaseLifecycle?.(), this.#l(this.#s()), this.#a.clear(), this.#n.clear(), _(this.#t), this.#t.length = 0;
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
  #l(e) {
    for (const a of [...e])
      a.frameAbandoned(this);
  }
  /** Every owner this frame attached, discarded ones included. */
  #s() {
    return [...this.#a, ...this.#n];
  }
  /** Moves owners out of this frame's live set: they are neither finalized nor read back. */
  #c(e) {
    for (const a of [...e])
      this.#a.delete(a), this.#n.add(a);
  }
  #f() {
    return [...this.#a].filter((e) => !this.#n.has(e));
  }
  /**
   * Attaches one `FramePassOptions` telemetry value to this pass through the nominal attachment
   * protocol, so the frame never learns whether it is a timer span, a visibility or a future
   * scene-view generation: it only records the owner it must settle exactly once.
   */
  #d(e, a, n, r) {
    const i = dl(e);
    if (!i)
      throw r(e);
    let s;
    try {
      s = i[si]({ frame: this, device: this.device, target: a });
    } catch (o) {
      throw this.#c(this.#a), o;
    }
    return this.#a.add(s.owner), n.push(s.owner), s;
  }
  async #u(e, a, n) {
    await xa(this.device), G(this.device, "Frame.validation");
    const r = De(e, a, n);
    this.errorSink ? await this.errorSink(r) : console.error(r);
  }
  #h(e) {
    return this.trackSettled?.(e), e;
  }
}
class nf {
  encoder;
  target;
  validations;
  depthReadOnly;
  occlusionSource;
  frame;
  assertFrameOpen;
  #e = !1;
  constructor(e, a, n, r = !1, i, s, o) {
    this.encoder = e, this.target = a, this.validations = n, this.depthReadOnly = r, this.occlusionSource = i, this.frame = s, this.assertFrameOpen = o;
  }
  draw(e, a = {}) {
    this.assertFrameOpen?.("FramePass.draw");
    const n = sf(e);
    this.depthReadOnly && rf(n, this.target), n.encode(this.encoder, this.target, a, (r) => this.validations.push(r));
  }
  /**
   * Wraps one or more draws in begin/endOcclusionQuery. The body ALWAYS executes; condition your
   * real draws on `q.hidden` outside.
   */
  occlusion(e, a) {
    if (this.assertFrameOpen?.("FramePass.occlusion"), !this.occlusionSource)
      throw gs();
    if (this.#e)
      throw ps();
    const n = this.occlusionSource.beginQuery(e, this.frame);
    this.encoder.beginOcclusionQuery(n), this.#e = !0;
    try {
      typeof a == "function" ? a() : this.draw(a);
    } finally {
      this.#e = !1, this.encoder.endOcclusionQuery();
    }
  }
  bundles(...e) {
    if (this.assertFrameOpen?.("FramePass.bundles"), this.depthReadOnly)
      throw je("pass cannot replay bundles: bundle records bundles with writable depth/stencil, and WebGPU only executes read-only-recorded bundles in a read-only pass.", "Encode the draws directly with pass.draw(...) inside the depthReadOnly pass.", "FramePass.bundles");
    const a = e.map((n) => cl(n) ?? of());
    for (const n of a)
      n.assertReplayable(this.target);
    this.encoder.executeBundles(a.map((n) => n.gpu));
  }
}
function rf(t, e) {
  if (t.writesDepth())
    throw je(`pass cannot encode draw '${t.label}': its depth state writes depth (the default is write: true). Give the draw depth: { write: false } (or depth: false to disable depth testing).`, "Use depth: { write: false } on the draw, or open the pass without depthReadOnly.", "FramePass.draw");
  if (it(e.depth?.format)) {
    const a = t.stencilWritingOps();
    if (a.length)
      throw je(`pass cannot encode draw '${t.label}': its stencil ops can write (${a.join(", ")}), and the pass's stencil aspect is read-only too.`, 'Use "keep" for those ops or stencil writeMask: 0, or open the pass without depthReadOnly.', "FramePass.draw");
  }
}
function sf(t) {
  const e = sl(t);
  if (!e)
    throw new TypeError("Invalid Effect instance: pass.draw() expects a Draw or an Effect created by this library.");
  return e;
}
function of() {
  throw new j({ code: "VGPU-R3-BUNDLE-INVALID", message: "p.bundles() expected bundles created by bundle(gpu, { target }, cb).", where: "FramePass.bundles" });
}
function cf(t) {
  return bs(`FramePassOptions.timer received ${ke(t)}; expected a TimerSpan from timer.span(name).`, 'Create const passTimer = timer(gpu) once, then pass passTimer.span("name") per pass.', "Frame.pass");
}
function df(t) {
  return ms(`FramePassOptions.visibility received ${ke(t)}; expected a Visibility from visibility(gpu).`, "Create const vis = visibility(gpu) once, then pass { target, visibility: vis } per pass.", "Frame.pass");
}
function lf(t, e, a) {
  if (t === void 0)
    return;
  if (typeof t != "object" || t === null || Array.isArray(t))
    throw fe(`received ${ke(t)}; expected { x?, y?, width, height, minDepth?, maxDepth? }.`);
  const { x: n = 0, y: r = 0, width: i, height: s, minDepth: o = 0, maxDepth: c = 1 } = t;
  for (const [m, p] of [["x", n], ["y", r], ["width", i], ["height", s], ["minDepth", o], ["maxDepth", c]])
    if (typeof p != "number" || !Number.isFinite(p))
      throw fe(`${m} received ${ke(p)}; expected a finite number.`);
  const d = e.maxTextureDimension2D, l = d * 2, f = `target is ${a[0]}x${a[1]}px, device maxTextureDimension2D is ${d}`;
  if (!(i >= 0 && i <= d))
    throw fe(`width ${i} is outside [0, ${d}] (${f}).`);
  if (!(s >= 0 && s <= d))
    throw fe(`height ${s} is outside [0, ${d}] (${f}).`);
  if (!(n >= -l && n + i <= l - 1))
    throw fe(`x ${n} with width ${i} is outside [${-l}, ${l - 1}] (${f}).`);
  if (!(r >= -l && r + s <= l - 1))
    throw fe(`y ${r} with height ${s} is outside [${-l}, ${l - 1}] (${f}).`);
  if (!(o >= 0 && o <= 1))
    throw fe(`minDepth ${o} is outside [0, 1].`);
  if (!(c >= 0 && c <= 1))
    throw fe(`maxDepth ${c} is outside [0, 1].`);
  if (!(o <= c))
    throw fe(`minDepth ${o} exceeds maxDepth ${c}.`);
  return { x: n, y: r, width: i, height: s, minDepth: o, maxDepth: c };
}
function ff(t, e) {
  if (t === void 0)
    return;
  if (!Array.isArray(t) || t.length !== 4)
    throw Wt(`received ${ke(t)}; expected [x, y, width, height].`);
  const [a, n, r, i] = t;
  for (const [c, d] of [["x", a], ["y", n], ["width", r], ["height", i]])
    if (typeof d != "number" || !Number.isInteger(d) || d < 0)
      throw Wt(`${c} received ${ke(d)}; expected a non-negative integer.`);
  const [s, o] = e;
  if (a + r > s || n + i > o)
    throw Wt(`[${a}, ${n}, ${r}, ${i}] exceeds the target's current size ${s}x${o}px (x + width <= ${s}, y + height <= ${o}).`);
  return [a, n, r, i];
}
function ke(t) {
  return typeof t == "string" ? `'${t}'` : Array.isArray(t) ? `[${t.map((e) => ke(e)).join(", ")}]` : typeof t == "object" && t !== null ? "an object" : String(t);
}
function uf(t) {
  const e = t?.code;
  return e === "VGPU-DEVICE-DISPOSED" || e === "VGPU-DEVICE-LOST";
}
class hf {
  createFrame;
  advance;
  trackLoop;
  #e = !1;
  /**
   * @param trackLoop Lifecycle hook for the owning gpu: called with each started loop handle and
   * returns the untrack function the handle runs when it stops on its own, so `gpu.dispose()` can
   * stop the loops still running without holding on to the ones already stopped.
   */
  constructor(e, a, n) {
    this.createFrame = e, this.advance = a, this.trackLoop = n;
  }
  frame(e) {
    if (this.#e || Zd())
      throw ur();
    this.#e = !0, _d();
    try {
      this.advance();
      const a = this.createFrame();
      if (e)
        try {
          e(a);
        } finally {
          try {
            a.submit();
          } catch (n) {
            if (!uf(n))
              throw n;
          }
        }
      return a;
    } finally {
      el(), this.#e = !1;
    }
  }
  loop(e, a = {}) {
    let n = !1;
    const r = globalThis.requestAnimationFrame ?? ((m) => setTimeout(() => m(performance.now()), 16)), i = globalThis.cancelAnimationFrame ?? ((m) => clearTimeout(m)), s = a.fps && a.fps > 0 ? 1e3 / a.fps : 0;
    let o, c = 0;
    const d = (m) => {
      n || (bf(m, o, s) && (o = m, this.frame(e)), n || (c = r(d)));
    };
    c = r(d);
    let l;
    const f = {
      stop() {
        n = !0, i(c), l?.(), l = void 0;
      }
    };
    return l = this.trackLoop?.(f), f;
  }
}
function bf(t, e, a) {
  return e === void 0 || a <= 0 ? !0 : t - e >= a;
}
function Wn(t, e) {
  return new mf(me(t, "target").device, e);
}
class mf {
  device;
  options;
  resourceIdentity = Rt("render-target");
  #e = new Dt();
  #t = /* @__PURE__ */ new Set();
  #a;
  #n;
  #i;
  #r;
  #o;
  constructor(e, a) {
    this.device = e, this.options = a, Ed(a, e), this.#o = a.clearColor === void 0 ? Ua : Lt(a.clearColor, "target.clearColor"), this.#a = a.size, this.#n = this.#f(), this.#i = this.sampleCount === 4 ? this.#d() : void 0, this.#r = this.#u();
  }
  get gpu() {
    return this.color.gpu;
  }
  get size() {
    return this.#a;
  }
  get texelSize() {
    return [1 / this.#a[0], 1 / this.#a[1]];
  }
  /** Resolved, sampleable color texture. For MSAA targets, render passes resolve into this texture. */
  get color() {
    return this.#n[0];
  }
  /** Resolved, sampleable color textures. For MSAA targets, render passes resolve into these textures. */
  get colors() {
    return this.#n;
  }
  get depth() {
    return this.#r;
  }
  get format() {
    return Et(this.options)[0]?.format ?? "rgba8unorm";
  }
  /** Default clear color of this target; passes that clear without naming a color use it. */
  get clearColor() {
    return ja(this.#o);
  }
  set clearColor(e) {
    this.#o = Lt(e, "target.clearColor");
  }
  get sampleCount() {
    return Xr(this.options);
  }
  resize(e) {
    Jr(this.#a, e) || this.#l(e);
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
    const { clear: a = [0, 0, 0, 1], preserve: n, clearDepth: r, clearStencil: i, depthReadOnly: s } = e;
    return {
      colorAttachments: this.#n.map((o, c) => jd(o, this.#i?.[c], a, n)),
      depthStencilAttachment: this.#r ? Nd(this.#r, n, r, i, s) : void 0
    };
  }
  #l(e) {
    this.#c(), this.#a = [e[0], e[1]], this.#n = this.#f(), this.#i = this.sampleCount === 4 ? this.#d() : void 0, this.#r = this.#u(), this.#s();
  }
  #s() {
    for (const e of [...this.#t])
      e();
  }
  #c() {
    for (const e of this.#n)
      e.destroy();
    for (const e of this.#i ?? [])
      e.destroy();
    this.#r?.destroy();
  }
  #f() {
    return Et(this.options).map((e, a) => this.device.createTexture({
      size: this.#a,
      format: e.format,
      usage: ["render_attachment", "texture_binding", "copy_src"],
      sampleCount: 1,
      label: this.options.label ? `${this.options.label}.color${a}.resolve` : void 0
    }));
  }
  #d() {
    return Et(this.options).map((e, a) => this.device.createTexture({
      size: this.#a,
      format: e.format,
      usage: ["render_attachment"],
      sampleCount: 4,
      label: this.options.label ? `${this.options.label}.color${a}` : void 0
    }));
  }
  #u() {
    const e = qr(this.options);
    return e ? this.device.createTexture({
      size: this.#a,
      format: e,
      usage: ["render_attachment", "texture_binding"],
      sampleCount: this.sampleCount,
      label: this.options.label ? `${this.options.label}.depth` : void 0
    }) : void 0;
  }
}
function Zt(t, e, a = "read-write") {
  const n = me(t, "storage"), r = typeof a == "string" ? { access: a } : a, i = gf(n.device, e, r.access ?? "read-write", void 0, r.indirect ?? !1);
  return mr(n, i, (s) => s.destroy(), (s) => {
    i.onDestroy(s);
  });
}
class Ta {
  size;
  access;
  buffer;
  constructor(e, a) {
    this.buffer = e, this.access = a, this.size = e.options.size;
  }
  static create(e, a, n, r, i = !1) {
    const s = i ? ["storage", "copy_dst", "copy_src", "indirect"] : ["storage", "copy_dst", "copy_src"], o = e.createBuffer({
      size: a,
      usage: s,
      label: r
    });
    return new Ta(o, n);
  }
  read() {
    return this.buffer.read(this.size);
  }
  write(e, a = 0) {
    this.buffer.write(pf(e), a);
  }
  get gpu() {
    return this.buffer.gpu;
  }
  get resourceIdentity() {
    return this.buffer.resourceIdentity;
  }
  onDestroy(e) {
    return this.buffer.onDestroy(e);
  }
  /** Frees the GPU allocation. Idempotent; bind groups holding it are invalidated through the buffer's destroy signal. */
  destroy() {
    this.buffer.destroy();
  }
}
function gf(t, e, a, n, r = !1) {
  return Ta.create(t, e, a, n, r);
}
function pf(t) {
  if (t instanceof ArrayBuffer || ArrayBuffer.isView(t))
    return t;
  throw new TypeError("StorageBuffer.write() requires ArrayBuffer or ArrayBufferView.");
}
function yf(t) {
  return Rs("browser", t);
}
function wf(t) {
  return t * Math.PI / 180;
}
function xf(t, e, a, n) {
  const r = Math.tan(Math.PI * 0.5 - 0.5 * t), i = 1 / (a - n);
  return new Float32Array([
    r / e,
    0,
    0,
    0,
    0,
    r,
    0,
    0,
    0,
    0,
    Number.isFinite(n) ? n * i : -1,
    -1,
    0,
    0,
    Number.isFinite(n) ? n * a * i : -a,
    0
  ]);
}
function vf(t, e) {
  const a = e ? `'${e}'` : "the node";
  return new j({
    code: "VGPU-SCENE-CYCLE",
    message: `add() would make ${a} an ancestor of itself.`,
    fix: "Remove the node from the ancestor chain first, or add a different node.",
    where: t
  });
}
function be(t, e, a) {
  return new j({
    code: "VGPU-SCENE-VALUE-INVALID",
    message: `\`${e}\` is invalid; expected ${a}.`,
    fix: `Pass ${a} for \`${e}\`.`,
    where: t
  });
}
function et(t) {
  return t.fill(0), t[0] = t[5] = t[10] = t[15] = 1, t;
}
function If(t, e) {
  return t.set(e), t;
}
function kf(t, e, a, n) {
  const r = a[0], i = a[1], s = a[2], o = a[3], c = r + r, d = i + i, l = s + s, f = r * c, m = r * d, p = r * l, I = i * d, S = i * l, N = s * l, C = o * c, b = o * d, y = o * l, w = n[0], x = n[1], M = n[2];
  return t[0] = (1 - (I + N)) * w, t[1] = (m + y) * w, t[2] = (p - b) * w, t[3] = 0, t[4] = (m - y) * x, t[5] = (1 - (f + N)) * x, t[6] = (S + C) * x, t[7] = 0, t[8] = (p + b) * M, t[9] = (S - C) * M, t[10] = (1 - (f + I)) * M, t[11] = 0, t[12] = e[0], t[13] = e[1], t[14] = e[2], t[15] = 1, t;
}
function gi(t, e, a) {
  const n = e[0], r = e[1], i = e[2], s = e[3], o = e[4], c = e[5], d = e[6], l = e[7], f = e[8], m = e[9], p = e[10], I = e[11], S = e[12], N = e[13], C = e[14], b = e[15];
  for (let y = 0; y < 4; y++) {
    const w = y * 4, x = a[w], M = a[w + 1], U = a[w + 2], h = a[w + 3];
    t[w] = n * x + o * M + f * U + S * h, t[w + 1] = r * x + c * M + m * U + N * h, t[w + 2] = i * x + d * M + p * U + C * h, t[w + 3] = s * x + l * M + I * U + b * h;
  }
  return t;
}
function pi(t, e) {
  const a = e[0], n = e[1], r = e[2], i = e[4], s = e[5], o = e[6], c = e[8], d = e[9], l = e[10], f = e[12], m = e[13], p = e[14], I = s * l - o * d, S = o * c - i * l, N = i * d - s * c, C = a * I + n * S + r * N, b = C === 0 ? 0 : 1 / C, y = I * b, w = S * b, x = N * b, M = (r * d - n * l) * b, U = (a * l - r * c) * b, h = (n * c - a * d) * b, g = (n * o - r * s) * b, v = (r * i - a * o) * b, k = (a * s - n * i) * b;
  return t[0] = y, t[1] = M, t[2] = g, t[3] = 0, t[4] = w, t[5] = U, t[6] = v, t[7] = 0, t[8] = x, t[9] = h, t[10] = k, t[11] = 0, t[12] = -(y * f + w * m + x * p), t[13] = -(M * f + U * m + h * p), t[14] = -(g * f + v * m + k * p), t[15] = 1, t;
}
function Sf(t, e, a) {
  const n = a[0], r = a[1], i = a[2];
  return t[0] = e[0] * n + e[4] * r + e[8] * i + e[12], t[1] = e[1] * n + e[5] * r + e[9] * i + e[13], t[2] = e[2] * n + e[6] * r + e[10] * i + e[14], t;
}
function Mf(t, e, a) {
  const n = a[0], r = a[1], i = a[2];
  return t[0] = e[0] * n + e[4] * r + e[8] * i, t[1] = e[1] * n + e[5] * r + e[9] * i, t[2] = e[2] * n + e[6] * r + e[10] * i, t;
}
function Ef(t, e, a, n) {
  const r = Math.cos(e / 2), i = Math.sin(e / 2), s = Math.cos(a / 2), o = Math.sin(a / 2), c = Math.cos(n / 2), d = Math.sin(n / 2);
  return t[0] = i * s * c + r * o * d, t[1] = r * o * c - i * s * d, t[2] = r * s * d + i * o * c, t[3] = r * s * c - i * o * d, t;
}
function Uf(t, e, a, n, r, i, s, o, c, d) {
  const l = e + i + d;
  if (l > 0) {
    const f = 0.5 / Math.sqrt(l + 1);
    t[3] = 0.25 / f, t[0] = (s - c) * f, t[1] = (o - n) * f, t[2] = (a - r) * f;
  } else if (e > i && e > d) {
    const f = 2 * Math.sqrt(1 + e - i - d);
    t[3] = (s - c) / f, t[0] = 0.25 * f, t[1] = (r + a) / f, t[2] = (o + n) / f;
  } else if (i > d) {
    const f = 2 * Math.sqrt(1 + i - e - d);
    t[3] = (o - n) / f, t[0] = (r + a) / f, t[1] = 0.25 * f, t[2] = (c + s) / f;
  } else {
    const f = 2 * Math.sqrt(1 + d - e - i);
    t[3] = (a - r) / f, t[0] = (o + n) / f, t[1] = (c + s) / f, t[2] = 0.25 * f;
  }
  return t;
}
function jf(t, e, a, n) {
  let r = e[0] - a[0], i = e[1] - a[1], s = e[2] - a[2];
  const o = Math.hypot(r, i, s);
  if (o === 0)
    return t[0] = 0, t[1] = 0, t[2] = 0, t[3] = 1, t;
  r /= o, i /= o, s /= o;
  let c = n[1] * s - n[2] * i, d = n[2] * r - n[0] * s, l = n[0] * i - n[1] * r, f = Math.hypot(c, d, l);
  f === 0 && (c = s, d = 0, l = -r, f = Math.hypot(c, d, l), f === 0 && (c = 1, d = 0, l = 0, f = 1)), c /= f, d /= f, l /= f;
  const m = i * l - s * d, p = s * c - r * l, I = r * d - i * c;
  return Uf(t, c, d, l, m, p, I, r, i, s);
}
const Nf = new Float32Array([0, 1, 0]), qn = new Float32Array(3), pt = new Float32Array(3), yt = new Float32Array(3), Qt = new Float32Array(16);
class Cf {
  kind;
  label;
  visible = !0;
  #e = new Float32Array(3);
  #t = new Float32Array([0, 0, 0, 1]);
  #a = new Float32Array([1, 1, 1]);
  #n = et(new Float32Array(16));
  #i = et(new Float32Array(16));
  #r = new Float32Array(3);
  #o = !1;
  #l = !1;
  #s = null;
  #c = [];
  _worldVersion = 0;
  constructor(e, a = {}) {
    this.kind = e, this.label = a.label, this.#f(a), a.children && this.add(...a.children);
  }
  /** Updates transform components in place; unspecified components are left untouched. */
  set(e) {
    return this.#f(e), this;
  }
  #f(e) {
    const a = `${this.label ?? this.kind}.set`;
    let n = !1;
    if (e.position !== void 0 && (wt(this.#e, e.position, "position", a), n = !0), e.quaternion !== void 0) {
      if (e.quaternion.length !== 4)
        throw be(a, "quaternion", "an array of 4 numbers (x, y, z, w)");
      this.#t[0] = e.quaternion[0], this.#t[1] = e.quaternion[1], this.#t[2] = e.quaternion[2], this.#t[3] = e.quaternion[3], n = !0;
    } else if (e.rotation !== void 0) {
      if (e.rotation.length !== 3)
        throw be(a, "rotation", "an array of 3 Euler angles in radians");
      Ef(this.#t, e.rotation[0], e.rotation[1], e.rotation[2]), n = !0;
    }
    e.scale !== void 0 && (typeof e.scale == "number" ? this.#a.fill(e.scale) : wt(this.#a, e.scale, "scale", a), n = !0), e.visible !== void 0 && (this.visible = e.visible), e.label !== void 0 && (this.label = e.label), n && this.#d();
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
  lookAt(e, a = Nf) {
    const n = `${this.label ?? this.kind}.lookAt`;
    wt(pt, e, "target", n), wt(yt, a, "up", n), qn.set(this.#e);
    const r = this.#s;
    return r && (pi(Qt, r.worldMatrix), Sf(pt, Qt, pt), Mf(yt, Qt, yt)), jf(this.#t, qn, pt, yt), this.#d(), this;
  }
  /** Adds children, reparenting them if needed. Throws `VGPU-SCENE-CYCLE` on cycles. */
  add(...e) {
    const a = `${this.label ?? this.kind}.add`;
    for (const n of e) {
      for (let r = this; r; r = r.#s)
        if (r === n)
          throw vf(a, n.label ?? n.kind);
      n.#s && n.#s.#h(n), n.#s = this, this.#c.push(n), n.#u();
    }
    return this;
  }
  /** Removes direct children; nodes that are not children are ignored. */
  remove(...e) {
    for (const a of e)
      a.#s === this && this.#h(a);
    return this;
  }
  /** Detaches this node from its parent, keeping its local transform. */
  removeFromParent() {
    return this.#s && this.#s.#h(this), this;
  }
  /** Depth-first visit of this node and all descendants. */
  traverse(e) {
    e(this);
    for (const a of this.#c)
      a.traverse(e);
  }
  get parent() {
    return this.#s;
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
    return this.#a;
  }
  /** Column-major local TRS matrix, recomputed lazily. Stable array identity. */
  get localMatrix() {
    return this.#o && (kf(this.#n, this.#e, this.#t, this.#a), this.#o = !1), this.#n;
  }
  /** Column-major world matrix, recomputed lazily for dirty subtrees. Stable array identity. */
  get worldMatrix() {
    if (this.#l || this.#o) {
      const e = this.localMatrix, a = this.#s;
      a ? gi(this.#i, a.worldMatrix, e) : If(this.#i, e), this.#l = !1, this._worldVersion++;
    }
    return this.#i;
  }
  /** World-space position derived from `worldMatrix`. Stable array identity. */
  get worldPosition() {
    const e = this.worldMatrix;
    return this.#r[0] = e[12], this.#r[1] = e[13], this.#r[2] = e[14], this.#r;
  }
  #d() {
    this.#o = !0, this.#u(!0);
  }
  #u(e = !1) {
    if (!(this.#l && !e)) {
      this.#l = !0;
      for (const a of this.#c)
        a.#u();
    }
  }
  #h(e) {
    const a = this.#c.indexOf(e);
    a >= 0 && this.#c.splice(a, 1), e.#s = null, e.#u(!0);
  }
}
function wt(t, e, a, n) {
  if (e.length !== 3)
    throw be(n, a, "an array of 3 numbers");
  t[0] = e[0], t[1] = e[1], t[2] = e[2];
}
class Tf extends Cf {
  #e = et(new Float32Array(16));
  #t = et(new Float32Array(16));
  #a = et(new Float32Array(16));
  _projectionDirty = !0;
  #n = -1;
  #i = !0;
  get projection() {
    return this._projectionDirty && (this._updateProjection(this.#e), this._projectionDirty = !1, this.#i = !0), this.#e;
  }
  get view() {
    return this.#r(), this.#t;
  }
  get viewProjection() {
    const e = this.projection;
    return this.#r(), this.#i && (gi(this.#a, e, this.#t), this.#i = !1), this.#a;
  }
  get viewProjectionMatrix() {
    return this.viewProjection;
  }
  #r() {
    const e = this.worldMatrix;
    this.#n !== this._worldVersion && (pi(this.#t, e), this.#n = this._worldVersion, this.#i = !0);
  }
}
class Af extends Tf {
  #e;
  #t;
  #a;
  #n;
  constructor(e) {
    Xn("perspectiveCamera", e.fov), e.aspect !== void 0 && Jn("perspectiveCamera", e.aspect), Kn("perspectiveCamera", e.near ?? 0.1, e.far ?? 100), Of("perspectiveCamera", e.target, e.up), super("perspective-camera", e), this.#e = e.fov, this.#t = e.aspect, this.#a = e.near ?? 0.1, this.#n = e.far ?? 100, e.target && this.lookAt(e.target, e.up);
  }
  set(e) {
    super.set(e);
    const a = `${this.label ?? this.kind}.set`;
    if (e.fov !== void 0 && (Xn(a, e.fov), this.#e = e.fov, this._projectionDirty = !0), e.aspect !== void 0 && (Jn(a, e.aspect), this.#t = e.aspect, this._projectionDirty = !0), e.near !== void 0 || e.far !== void 0) {
      const n = e.near ?? this.#a, r = e.far ?? this.#n;
      Kn(a, n, r), this.#a = n, this.#n = r, this._projectionDirty = !0;
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
    return this.#a;
  }
  get far() {
    return this.#n;
  }
  _updateProjection(e) {
    e.set(xf(wf(this.#e), this.#t ?? 1, this.#a, this.#n));
  }
}
function Lf(t) {
  return new Af(t);
}
function Of(t, e, a) {
  if (e !== void 0) {
    if (e.length !== 3)
      throw be(t, "target", "an array of 3 numbers");
    if (a !== void 0 && a.length !== 3)
      throw be(t, "up", "an array of 3 numbers");
  }
}
function Xn(t, e) {
  if (!(e > 0 && e < 180))
    throw be(t, "fov", "a field of view in degrees between 0 and 180 (exclusive)");
}
function Kn(t, e, a) {
  if (!(e > 0))
    throw be(t, "near", "a positive near plane distance");
  if (!(a > e))
    throw be(t, "far", "a far plane distance greater than `near`");
}
function Jn(t, e) {
  if (!(e > 0) || !Number.isFinite(e))
    throw be(t, "aspect", "a positive, finite width/height ratio");
}
const Ff = { version: 1, wgsl: "@group(1) @binding(0) var<storage,read> bvhNodes:array<vec4f>;@group(1) @binding(1) var<storage,read> bvhTriangles:array<vec4f>;@group(0) @binding(0) var<uniform> crystal:_vgsl_fcdb83dd__CrystalUniforms;struct _vgsl_5757f583__VertexInput{@location(0) position:vec3f,@location(1) normal:vec3f,}struct _vgsl_5757f583__VertexOutput{@builtin(position) clipPosition:vec4f,@location(0) localPosition:vec3f,@location(1) localNormal:vec3f,}@vertex fn vs_main(a:_vgsl_5757f583__VertexInput)-> _vgsl_5757f583__VertexOutput{let rotation=H(crystal.rotation.x)*G(crystal.rotation.y);let b=rotation*a.position*crystal.scale+vec3f(crystal.positionOffset,0.0);return _vgsl_5757f583__VertexOutput(crystal.viewProjection*vec4f(b,1.0),a.position,a.normal);}fn d(a:vec3f)-> vec3f{return D(a,crystal.lightDirection,2.0,crystal.time,crystal.paperBackground);}fn e(a:vec3f,b:vec3f,normal:vec3f,c:u32)-> f32{let rotation=H(crystal.rotation.x)*G(crystal.rotation.y);let ior=L(crystal.ior,crystal.dispersion*crystal.opticsEnabled,c);let f=K(crystal.color,crystal.transmission)[c];var g=refract(b,normal,1.0/ior);var h=a+g*0.0003;var i=1.0;var p=0.0;for(var q=0u;q<u32(crystal.maxBounces);q++){let r=I(&bvhNodes,&bvhTriangles,h,g,true);if(r.distance>1e5){p+=i*d(rotation*g)[c];break;}h+=g*r.distance;i*=exp(-f*r.distance*crystal.scale);let s=select(-r.normal,r.normal,dot(g,r.normal)>=0.0);let t=refract(g,-s,ior);let u=J(dot(g,s),ior,1.0);if(dot(t,t)>0.01){p+=i*(1.0-u)*d(rotation*t)[c];}i*=u;if(i<0.008){break;}g=reflect(g,s);h+=g*0.0003;}return p;}fn j(a:vec3f,b:vec3f,normal:vec3f)-> vec3f{let rotation=H(crystal.rotation.x)*G(crystal.rotation.y);let c=K(crystal.color,crystal.transmission);var f=refract(b,normal,1.0/crystal.ior);var g=a+f*0.0003;var h=vec3f(1.0);var i=vec3f(0.0);for(var p=0u;p<u32(crystal.maxBounces);p++){let q=I(&bvhNodes,&bvhTriangles,g,f,true);if(q.distance>1e5){i+=h*d(rotation*f);break;}g+=f*q.distance;h*=exp(-c*q.distance*crystal.scale);let r=select(-q.normal,q.normal,dot(f,q.normal)>=0.0);var s=vec3f(1.0);for(var t=0u;t<3u;t++){let ior=L(crystal.ior,crystal.dispersion*crystal.opticsEnabled,t);let u=refract(f,-r,ior);s[t]=J(dot(f,r),ior,1.0);if(dot(u,u)>0.01){i[t]+=h[t]*(1.0-s[t])*d(rotation*u)[t];}}h*=s;if(max(max(h.x,h.y),h.z)<0.008){break;}f=reflect(f,r);g+=f*0.0003;}return i;}@fragment fn fs_main(a:_vgsl_5757f583__VertexOutput,@builtin(front_facing) b:bool)-> @location(0) vec4f{let rotation=H(crystal.rotation.x)*G(crystal.rotation.y);let c=transpose(rotation);let f=rotation*a.localPosition*crystal.scale+vec3f(crystal.positionOffset,0.0);let g=normalize(crystal.cameraPosition-f);var h=normalize(a.localNormal);if(!b){h=-h;}let i=rotation*h;let p=c*-g;let q=max(dot(g,i),0.0);let r=J(q,1.0,crystal.ior);var s=vec3f(0.0);if(crystal.maxBounces>4.0){for(var t=0u;t<3u;t++){s[t]=e(a.localPosition,p,h,t);}}else{s=j(a.localPosition,p,h);}let u=d(reflect(-g,i));let v=max(dot(i,crystal.lightDirection),0.0)*crystal.lightVisible;let w=pow(max(dot(i,normalize(g+crystal.lightDirection)),0.0),220.0);let z=pow(max(crystal.color,vec3f(0.02)),vec3f(1.6));let M=z*(0.024+v*0.16+crystal.globalLight*0.20)*(1.0-crystal.transmission);var color=u*r+s*(1.0-r)+M;color+=vec3f(1.0,0.97,0.91)*w*crystal.lightVisible*r*5.0;color+=z*crystal.globalLight*(0.035+pow(1.0-q,3.0)*0.09);if(crystal.modeIndex>0.5&&crystal.modeIndex<1.5){let N=0.5+0.5*sin((a.localPosition.x+a.localPosition.y*1.6)*17.0);color*=mix(vec3f(0.9),vec3f(1.04),N);}if(crystal.modeIndex>1.5&&crystal.modeIndex<2.5){color*=mix(vec3f(1.0),n(crystal.wavelength)*1.5,0.12*crystal.opticsEnabled);}if(crystal.modeIndex>2.5&&crystal.modeIndex<3.5){color+=vec3f(pow(1.0-q,7.0))*0.08;}return vec4f(max(color,vec3f(0.0)),1.0);}const _vgsl_91e135ae__SUN_COLOR=vec3f(1.0,0.68,0.34);fn k(a:f32)-> f32{return clamp(a,0.0,1.0);}fn l(a:vec3f)-> vec2f{let b=abs(a);var c=a.xy/max(b.z,0.0001);if(b.x> b.y&&b.x> b.z){c=a.zy/max(b.x,0.0001);}if(b.y> b.x&&b.y> b.z){c=a.xz/max(b.y,0.0001);}return c;}fn m(a:vec3f,b:f32,c:f32,f:f32)-> vec3f{let g=l(a)*b;let h=vec3u(vec3i(floor(vec3f(g,b*0.031))));let i=E(h);let p=smoothstep(c,1.0,F(i.x));let q=(vec2f(F(i.y),F(i.z))-0.5)*0.68;let r=fract(g)-0.5-q;let s=fract(F(i.y)*11.73+F(i.z)*7.19);let t=mix(0.032,0.128,s*s);let u=smoothstep(t,t*0.16,length(r));let v=smoothstep(t*1.9,t*0.42,length(r));let w=mix(0.46,1.54,F(i.z));let M=0.67+0.33*sin(f*w+F(i.x)*6.28318);let N=0.86+0.14*sin(f*(w*2.73+0.31)+F(i.y)*8.31);let O=clamp(M*N,0.28,1.18);let P=mix(vec3f(0.86,0.91,1.0),vec3f(1.0,0.985,0.94),F(i.y));return P*pow(p,1.28)*(u*(0.82+O*0.26)+v*0.075)*O*mix(1.14,3.62,s);}fn n(a:f32)-> vec3f{let b=clamp((a-380.0)/340.0,0.0,1.0);let c=smoothstep(0.42,0.78,b)+(1.0-smoothstep(0.78,0.98,b))*0.13;let f=smoothstep(0.08,0.42,b)*(1.0-smoothstep(0.60,0.84,b));let g=1.0-smoothstep(0.25,0.54,b);return normalize(vec3f(max(c,0.08),max(f,0.05),max(g,0.08)));}fn o(a:vec3f,b:vec3f,c:vec2f,f:f32,)-> f32{let g=vec3f(0.0,1.0,0.0);let h=normalize(cross(g,b));let i=normalize(cross(b,h));let p=dot(a,b);if(p<=0.02){return 0.0;}let q=vec2f(dot(a,h),dot(a,i))/p;let r=max(abs(q)-c,vec2f(0.0));return(1.0-smoothstep(0.0,f,length(r)))*smoothstep(0.02,0.18,p);}fn A(a:vec3f)-> vec3f{let b=normalize(a);let c=o(b,normalize(vec3f(-0.52,0.22,-1.0)),vec2f(0.075,0.46),0.085);let f=o(b,normalize(vec3f(0.64,0.08,-1.0)),vec2f(0.055,0.34),0.075);let g=o(b,normalize(vec3f(0.04,0.74,-1.0)),vec2f(0.38,0.045),0.075);let h=o(b,normalize(vec3f(-0.06,-0.18,1.0)),vec2f(0.24,0.18),0.16);return vec3f(0.82,0.93,1.0)*c*3.2+vec3f(1.0,0.985,0.95)*f*2.15+vec3f(0.90,0.96,1.0)*g*2.8+vec3f(0.20,0.44,0.72)*h*0.58;}fn B(a:vec3f,b:vec3f,c:f32,f:f32)-> vec3f{let g=normalize(a);let h=normalize(b);let i=normalize(vec3f(0.28,0.92,-0.22));let p=1.0-abs(dot(g,i));let q=0.5+0.5*sin(g.x*39.0+sin(g.z*23.0)*3.0);let r=pow(k(p),12.0)*(0.016+q*0.032);var s=vec3f(0.0012,0.0015,0.0024);s+=vec3f(0.075,0.085,0.115)*r;s+=m(g,24.0,0.820,f);s+=m(g,58.0,0.930,f*0.87);s+=m(g,126.0,0.978,f*1.14);let t=k(dot(g,h));let u=smoothstep(0.99935,0.99986,t);let v=pow(t,360.0)*1.65;let w=pow(t,118.0)*0.11;s+=_vgsl_91e135ae__SUN_COLOR*(u*4.8+v+w)*clamp(c,0.0,1.0);return s;}fn C(a:vec3f)-> vec3f{let b=normalize(a);let c=l(b);let f=0.5+0.5*sin(c.x*1180.0+sin(c.y*91.0)*3.2);let g=0.5+0.5*sin(c.y*730.0+sin(c.x*63.0)*2.4);let h=vec3u(vec3i(floor(vec3f((c+2.0)*360.0,19.0))));let i=F(E(h).x);let p=(f-0.5)*0.026+(g-0.5)*0.018+(i-0.5)*0.032;let q=vec3f(0.79,0.765,0.72);return q*(0.94+p);}fn D(a:vec3f,b:vec3f,c:f32,f:f32,g:f32,)-> vec3f{let h=B(a,b,c,f);let i=step(1.5,c);let p=A(a)*i;let q=vec3f(0.10,0.13,0.19)*(0.55+0.45*abs(a.y));let r=h+p+q*i;let s=C(a)+p*0.34;return mix(r,s,clamp(g,0.0,1.0));}fn E(a:vec3u)-> vec3u{var b=a*1664525u+1013904223u;b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));return b;}fn F(a:u32)-> f32{return f32(a>>8u)*(1.0/16777216.0);}struct _vgsl_fcdb83dd__CrystalUniforms{viewProjection:mat4x4f,cameraPosition:vec3f,time:f32,lightDirection:vec3f,transmission:f32,color:vec3f,ior:f32,rotation:vec2f,dispersion:f32,wavelength:f32,positionOffset:vec2f,scale:f32,modeIndex:f32,spectralPurity:f32,raysEnabled:f32,lightVisible:f32,globalLight:f32,paperBackground:f32,pointer:vec2f,floorY:f32,causticsEnabled:f32,opticsEnabled:f32,photonGrid:f32,maxBounces:f32,}struct _vgsl_fcdb83dd__RayHit{distance:f32,normal:vec3f,}fn G(a:f32)-> mat3x3f{let b=cos(a);let c=sin(a);return mat3x3f(1.0,0.0,0.0,0.0,b,c,0.0,-c,b);}fn H(a:f32)-> mat3x3f{let b=cos(a);let c=sin(a);return mat3x3f(b,0.0,-c,0.0,1.0,0.0,c,0.0,b);}fn I(a:ptr<storage,array<vec4f>,read>,b:ptr<storage,array<vec4f>,read>,c:vec3f,f:vec3f,g:bool)-> _vgsl_fcdb83dd__RayHit{var h=_vgsl_fcdb83dd__RayHit(1e6,vec3f(0.0));let i=select(vec3f(-1e-8),vec3f(1e-8),f>=vec3f(0.0));let p=1.0/select(i,f,abs(f)> vec3f(1e-8));var q=0u;let r=arrayLength(a)/3u;loop{if(q>=r){break;}let s=(*a)[q*3u];let t=(*a)[q*3u+1u];let u=(s.xyz-c)*p;let v=(t.xyz-c)*p;let M=min(u,v);let N=max(u,v);let O=max(max(M.x,M.y),max(M.z,0.0));let P=min(min(N.x,N.y),N.z);if(P<O||O> h.distance){q=u32(s.w);continue;}let Q=u32((*a)[q*3u+2u].x);let R=u32(t.w);for(var S=0u;S<Q;S++){let T=(R+S)*3u;let U=(*b)[T].xyz;let V=(*b)[T+1u].xyz;let W=(*b)[T+2u].xyz;let X=cross(f,W);let Y=dot(V,X);if(abs(Y)<1e-10||(g&&Y>0.0)){continue;}let Z=1.0/Y;let aa=c-U;let ab=dot(aa,X)*Z;let ac=cross(aa,V);let ad=dot(f,ac)*Z;let distance=dot(W,ac)*Z;if(ab>=-0.00001&&ad>=-0.00001&&ab+ad<=1.00001&&distance>0.00008&&distance<h.distance){h=_vgsl_fcdb83dd__RayHit(distance,normalize(cross(V,W)));}}q++;}return h;}fn J(a:f32,b:f32,c:f32)-> f32{let f=clamp(abs(a),0.0,1.0);let g=(b*b)/(c*c)*(1.0-f*f);if(g>=1.0){return 1.0;}let h=sqrt(max(0.0,1.0-g));let i=(b*f-c*h)/max(b*f+c*h,1e-5);let p=(c*f-b*h)/max(c*f+b*h,1e-5);return(i*i+p*p)*0.5;}fn K(a:vec3f,b:f32)-> vec3f{let c=pow(max(a,vec3f(0.035)),vec3f(1.65));return vec3f(-log(clamp(b,0.01,1.0)))+(vec3f(1.0)-c)*(0.42+(1.0-b)*0.80);}fn L(a:f32,b:f32,c:u32)-> f32{let f=array<f32,3>(-0.010,0.0,0.018);return max(1.001,a+f[c]*b);}" }, Pf = { version: 1, wgsl: "struct _vgsl_1899ac0c__SpaceUniforms{right:vec3f,tanHalfFov:f32,up:vec3f,aspect:f32,forward:vec3f,time:f32,lightDirection:vec3f,modeIndex:f32,posterColor:vec3f,wavelength:f32,dispersion:f32,spectralPurity:f32,transmission:f32,raysEnabled:f32,pointer:vec2f,lightVisible:f32,paperBackground:f32,}@group(0) @binding(0) var<uniform> space:_vgsl_1899ac0c__SpaceUniforms;fn c(a:vec2f,b:vec2f,g:vec2f)-> vec2f{let r=g-b;let t=max(length(r),0.0001);let u=r/t;let v=dot(a-b,u);let w=clamp(v/t,0.0,1.0);let x=b+r*w;return vec2f(length(a-x),w);}fn d(a:vec2f,b:vec2f,g:vec2f,r:f32,t:f32,u:f32,v:f32,w:vec3f,)-> vec3f{let z=g-b;let A=max(length(z),0.0001);let B=z/A;let C=vec2f(-B.y,B.x);let D=dot(a-b,B)/A;let E=floor(D*t);let F=fract(sin(E*91.173+u*17.137)*43758.5453);let G=fract(sin(E*37.217+u*43.713)*17621.923);let H=(E+0.18+F*0.64)/t*A;let I=b+B*H+C*(G-0.5)*r*1.7;let J=mix(0.0024,0.0092,G*G);let K=smoothstep(J,J*0.15,length(a-I));let L=step(0.0,D)*step(D,1.0);let M=1.0-smoothstep(r,r*1.8,abs(dot(a-b,C)));let N=0.74+0.26*sin(v*mix(0.8,2.8,G)+F*18.0);return w*K*L*M*N*mix(0.9,3.0,F);}fn e(a:vec2f)-> vec3f{let b=clamp(space.raysEnabled*space.lightVisible,0.0,1.0);if(b<0.5){return vec3f(0.0);}let g=vec2f(a.x*space.aspect,a.y);let r=clamp(space.pointer,vec2f(-1.0),vec2f(1.0));let t=vec2f(1.38,-0.26-r.y*0.34);let u=vec2f(0.12+r.x*0.045,-0.018-r.y*0.075);let v=vec2f(-0.10+r.x*0.028,0.018+r.y*0.052);let w=c(g,t,u);let z=smoothstep(0.01,0.11,w.y)*(1.0-smoothstep(0.90,1.0,w.y));let A=1.0-smoothstep(0.003,0.010,w.x);let B=1.0-smoothstep(0.010,0.042,w.x);var C=vec3f(1.0,0.99,0.96)*(A*3.8+B*0.34)*z;C+=d(g,t,u,0.044,82.0,1.0,space.time,vec3f(1.0,0.99,0.96))*1.35;let D=0.045+space.dispersion*0.235;let E=r.y*0.31+r.x*0.09;let F=clamp(space.spectralPurity,0.0,1.0);for(var G=0;G<7;G=G+1){let H=f32(G)/6.0;let wavelength=400.0+H*300.0;let I=k(wavelength);let J=vec2f(-1.34,0.30+E+(H-0.5)*D);let K=c(g,v,J);let L=smoothstep(0.015,0.12,K.y)*(1.0-smoothstep(0.90,1.0,K.y));let M=1.0-smoothstep(0.002,0.008+space.dispersion*0.003,K.x);let N=1.0-smoothstep(0.008,0.028+space.dispersion*0.009,K.x);C+=I*(M*2.15+N*0.19)*L*(0.62+space.transmission*0.42);C+=d(g,v,J,0.026,44.0,10.0+f32(G),space.time*1.11,I)*(0.16+space.dispersion*0.38);}let O=vec2f(-1.34,0.30+E+clamp((space.wavelength-550.0)/340.0,-0.5,0.5)*D);let P=c(g,v,O);let Q=1.0-smoothstep(0.002,0.008,P.x);let R=normalize(mix(k(space.wavelength),space.posterColor,F*0.35));C+=R*Q*0.7*smoothstep(0.0,0.15,P.y);return C;}fn f(a:vec2f,b:vec3f,g:vec3f,r:f32)-> vec3f{let t=-0.34;let u=1.0-smoothstep(t-0.018,t+0.025,a.y);let v=0.010+0.018*(a.y*0.5+0.5);let w=exp(-dot(vec2f(a.x*0.70,a.y-0.10),vec2f(a.x*0.70,a.y-0.10))*2.2);let z=vec3f(0.0045,0.0065,0.0090)+b*0.72+g*w*0.014;let A=clamp((t-a.y)/0.66,0.0,1.0);let B=0.5+0.5*sin((a.x*913.0+a.y*617.0)+sin(a.x*121.0)*2.4);var C=vec3f(0.0012,0.0020,0.0030)+g*(0.010-A*0.006);C+=vec3f(B)*0.0022;var D=mix(z+vec3f(v),C,u);let E=exp(-abs(a.y-t)*150.0);D+=mix(vec3f(0.025),g*0.16,0.35)*E;let F=exp(-pow(a.x/0.34,2.0)-pow((a.y-(t-0.055))/0.052,2.0));D*=1.0-F*u*0.72;let G=exp(-pow(a.x/0.42,2.0)-pow((a.y-(t-0.19))/0.22,2.0));D+=g*G*u*0.009*(0.92+0.08*sin(r*0.31));return D;}@fragment fn fs_main(@location(0) a:vec2f)-> @location(0) vec4f{let b=vec2f(a.x,1.0-a.y)*2.0-1.0;let g=normalize(space.forward+space.right*b.x*space.aspect*space.tanHalfFov+space.up*b.y*space.tanHalfFov);let r=p(g,space.lightDirection,0.0,space.time,space.paperBackground);let t=f(b,r,space.posterColor,space.time);var u=mix(t,r,clamp(space.paperBackground,0.0,1.0));u+=e(b)*select(0.065,0.32,space.modeIndex>1.5&&space.modeIndex<2.5);let v=1.0-smoothstep(0.48,1.38,length(vec2f(b.x*0.72,b.y)));u*=mix(mix(0.62,0.93,space.paperBackground),1.0,v);if(space.modeIndex>1.5&&space.modeIndex<2.5){u*=vec3f(0.95,0.98,1.04);}return vec4f(u,1.0);}const _vgsl_91e135ae__SUN_COLOR=vec3f(1.0,0.68,0.34);fn h(a:f32)-> f32{return clamp(a,0.0,1.0);}fn i(a:vec3f)-> vec2f{let b=abs(a);var g=a.xy/max(b.z,0.0001);if(b.x> b.y&&b.x> b.z){g=a.zy/max(b.x,0.0001);}if(b.y> b.x&&b.y> b.z){g=a.xz/max(b.y,0.0001);}return g;}fn j(a:vec3f,b:f32,g:f32,r:f32)-> vec3f{let t=i(a)*b;let u=vec3u(vec3i(floor(vec3f(t,b*0.031))));let v=q(u);let w=smoothstep(g,1.0,s(v.x));let A=(vec2f(s(v.y),s(v.z))-0.5)*0.68;let B=fract(t)-0.5-A;let C=fract(s(v.y)*11.73+s(v.z)*7.19);let D=mix(0.032,0.128,C*C);let E=smoothstep(D,D*0.16,length(B));let F=smoothstep(D*1.9,D*0.42,length(B));let G=mix(0.46,1.54,s(v.z));let H=0.67+0.33*sin(r*G+s(v.x)*6.28318);let I=0.86+0.14*sin(r*(G*2.73+0.31)+s(v.y)*8.31);let J=clamp(H*I,0.28,1.18);let K=mix(vec3f(0.86,0.91,1.0),vec3f(1.0,0.985,0.94),s(v.y));return K*pow(w,1.28)*(E*(0.82+J*0.26)+F*0.075)*J*mix(1.14,3.62,C);}fn k(a:f32)-> vec3f{let b=clamp((a-380.0)/340.0,0.0,1.0);let g=smoothstep(0.42,0.78,b)+(1.0-smoothstep(0.78,0.98,b))*0.13;let r=smoothstep(0.08,0.42,b)*(1.0-smoothstep(0.60,0.84,b));let t=1.0-smoothstep(0.25,0.54,b);return normalize(vec3f(max(g,0.08),max(r,0.05),max(t,0.08)));}fn l(a:vec3f,b:vec3f,g:vec2f,r:f32,)-> f32{let t=vec3f(0.0,1.0,0.0);let u=normalize(cross(t,b));let v=normalize(cross(b,u));let w=dot(a,b);if(w<=0.02){return 0.0;}let x=vec2f(dot(a,u),dot(a,v))/w;let y=max(abs(x)-g,vec2f(0.0));return(1.0-smoothstep(0.0,r,length(y)))*smoothstep(0.02,0.18,w);}fn m(a:vec3f)-> vec3f{let b=normalize(a);let g=l(b,normalize(vec3f(-0.52,0.22,-1.0)),vec2f(0.075,0.46),0.085);let r=l(b,normalize(vec3f(0.64,0.08,-1.0)),vec2f(0.055,0.34),0.075);let t=l(b,normalize(vec3f(0.04,0.74,-1.0)),vec2f(0.38,0.045),0.075);let u=l(b,normalize(vec3f(-0.06,-0.18,1.0)),vec2f(0.24,0.18),0.16);return vec3f(0.82,0.93,1.0)*g*3.2+vec3f(1.0,0.985,0.95)*r*2.15+vec3f(0.90,0.96,1.0)*t*2.8+vec3f(0.20,0.44,0.72)*u*0.58;}fn n(a:vec3f,b:vec3f,g:f32,r:f32)-> vec3f{let t=normalize(a);let u=normalize(b);let v=normalize(vec3f(0.28,0.92,-0.22));let w=1.0-abs(dot(t,v));let y=0.5+0.5*sin(t.x*39.0+sin(t.z*23.0)*3.0);let A=pow(h(w),12.0)*(0.016+y*0.032);var B=vec3f(0.0012,0.0015,0.0024);B+=vec3f(0.075,0.085,0.115)*A;B+=j(t,24.0,0.820,r);B+=j(t,58.0,0.930,r*0.87);B+=j(t,126.0,0.978,r*1.14);let C=h(dot(t,u));let D=smoothstep(0.99935,0.99986,C);let E=pow(C,360.0)*1.65;let F=pow(C,118.0)*0.11;B+=_vgsl_91e135ae__SUN_COLOR*(D*4.8+E+F)*clamp(g,0.0,1.0);return B;}fn o(a:vec3f)-> vec3f{let b=normalize(a);let g=i(b);let r=0.5+0.5*sin(g.x*1180.0+sin(g.y*91.0)*3.2);let t=0.5+0.5*sin(g.y*730.0+sin(g.x*63.0)*2.4);let u=vec3u(vec3i(floor(vec3f((g+2.0)*360.0,19.0))));let v=s(q(u).x);let w=(r-0.5)*0.026+(t-0.5)*0.018+(v-0.5)*0.032;let z=vec3f(0.79,0.765,0.72);return z*(0.94+w);}fn p(a:vec3f,b:vec3f,g:f32,r:f32,t:f32,)-> vec3f{let u=n(a,b,g,r);let v=step(1.5,g);let w=m(a)*v;let x=vec3f(0.10,0.13,0.19)*(0.55+0.45*abs(a.y));let z=u+w+x*v;let A=o(a)+w*0.34;return mix(z,A,clamp(t,0.0,1.0));}fn q(a:vec3u)-> vec3u{var b=a*1664525u+1013904223u;b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));b.x=b.x+b.y*b.z;b.y=b.y+b.z*b.x;b.z=b.z+b.x*b.y;b=b^(b>> vec3u(16u));return b;}fn s(a:u32)-> f32{return f32(a>>8u)*(1.0/16777216.0);}" }, Bf = { version: 1, wgsl: "@group(0) @binding(0) var skyTexture:texture_2d<f32>;@group(0) @binding(1) var crystalTexture:texture_2d<f32>;@group(0) @binding(2) var sceneSampler:sampler;fn c(a:vec3f)-> vec3f{let b=a*(a+0.0245786)-0.000090537;let i=a*(0.983729*a+0.4329510)+0.238081;return b/i;}fn d(a:vec3f)-> vec3f{let b=mat3x3f(vec3f(0.59719,0.07600,0.02840),vec3f(0.35458,0.90834,0.13383),vec3f(0.04823,0.01566,0.83777));let i=mat3x3f(vec3f(1.60475,-0.10208,-0.00327),vec3f(-0.53108,1.10813,-0.07276),vec3f(-0.07367,-0.00605,1.07602));return clamp(i*c(b*a),vec3f(0.0),vec3f(1.0));}fn e(b:vec2f)-> vec3f{let i=textureSample(skyTexture,sceneSampler,b);let j=textureSample(crystalTexture,sceneSampler,b);return i.rgb*(1.0-clamp(j.a,0.0,1.0))+j.rgb;}fn f(a:vec2f)-> vec3f{let b=e(a);return max(b-vec3f(0.88),vec3f(0.0));}@fragment fn fs_main(@builtin(position) a:vec4f,@location(0) b:vec2f)-> @location(0) vec4f{let i=b;var j=e(i);let k=vec2f(textureDimensions(skyTexture));let l=vec2f(1.0)/max(k,vec2f(1.0));let m=l*2.4;var n=f(i+vec2f(m.x,0.0))+f(i-vec2f(m.x,0.0));n+=f(i+vec2f(0.0,m.y))+f(i-vec2f(0.0,m.y));n+=f(i+m)+f(i-m);n+=f(i+vec2f(m.x,-m.y))+f(i+vec2f(-m.x,m.y));j+=n*0.026;let o=smoothstep(0.92,0.20,length(i-0.5)*1.25);j*=0.72+o*0.28;j=d(j);let p=(h(g(vec2u(a.xy)).x)-0.5)/255.0;j+=vec3f(p);return vec4f(pow(max(j,vec3f(0.0)),vec3f(1.0/2.2)),1.0);}fn g(a:vec2u)-> vec2u{var b=a*1664525u+1013904223u;b.x=b.x+b.y*1664525u;b.y=b.y+b.x*1664525u;b=b^(b>> vec2u(16u));b.x=b.x+b.y*1664525u;b.y=b.y+b.x*1664525u;b=b^(b>> vec2u(16u));return b;}fn h(a:u32)-> f32{return f32(a>>8u)*(1.0/16777216.0);}" }, $f = { version: 1, wgsl: "@group(1) @binding(0) var<storage,read> bvhNodes:array<vec4f>;@group(1) @binding(1) var<storage,read> bvhTriangles:array<vec4f>;@group(0) @binding(0) var<uniform> crystal:_vgsl_fcdb83dd__CrystalUniforms;@group(0) @binding(1) var<storage,read_write> photons:array<vec4f>;@compute @workgroup_size(64) fn cs_main(@builtin(global_invocation_id) a:vec3u){let b=u32(crystal.photonGrid);let c=b*b;if(a.x>=c*3u){return;}let h=a.x*2u;photons[h]=vec4f(0.0);photons[h+1u]=vec4f(0.0);let i=a.x/c;let l=a.x%c;let m=(vec2f(f32(l%b),f32(l/b))+0.5)/f32(b)*2.0-1.0;let rotation=e(crystal.rotation.x)*d(crystal.rotation.y);let n=transpose(rotation);let o=normalize(crystal.lightDirection);let p=normalize(cross(vec3f(0.0,0.0,1.0),o));let q=normalize(cross(o,p));var r=n*(o*3.0+(p*m.x+q*m.y)*1.72);var s=n*-o;let t=f(&bvhNodes,&bvhTriangles,r,s,false);if(t.distance>1e5){return;}r+=s*t.distance;let normal=select(-t.normal,t.normal,dot(s,t.normal)<0.0);let ior=k(crystal.ior,crystal.dispersion*crystal.opticsEnabled,i);var u=1.0-g(dot(-s,normal),1.0,ior);s=refract(s,normal,1.0/ior);r+=s*0.0003;let v=j(crystal.color,crystal.transmission)[i];for(var w=0u;w<4u;w++){let z=f(&bvhNodes,&bvhTriangles,r,s,true);if(z.distance>1e5){return;}u*=exp(-v*z.distance*crystal.scale);r+=s*z.distance;let A=select(-z.normal,z.normal,dot(s,z.normal)>=0.0);let B=refract(s,-A,ior);if(dot(B,B)>0.01){u*=1.0-g(dot(s,A),ior,1.0);let C=rotation*r*crystal.scale+vec3f(crystal.positionOffset,0.0);let D=rotation*B;if(D.y>=-0.04){return;}let distance=(crystal.floorY-C.y)/D.y;if(distance<=0.0||distance>9.0){return;}let E=C+D*distance;let F=3.44/f32(b)*crystal.scale*2.5;var G=vec3f(0.0);G[i]=u*crystal.lightVisible*crystal.causticsEnabled*0.4125;photons[h]=vec4f(E,F);photons[h+1u]=vec4f(G,1.0);return;}s=reflect(s,A);r+=s*0.0003;}}struct _vgsl_fcdb83dd__CrystalUniforms{viewProjection:mat4x4f,cameraPosition:vec3f,time:f32,lightDirection:vec3f,transmission:f32,color:vec3f,ior:f32,rotation:vec2f,dispersion:f32,wavelength:f32,positionOffset:vec2f,scale:f32,modeIndex:f32,spectralPurity:f32,raysEnabled:f32,lightVisible:f32,globalLight:f32,paperBackground:f32,pointer:vec2f,floorY:f32,causticsEnabled:f32,opticsEnabled:f32,photonGrid:f32,maxBounces:f32,}struct _vgsl_fcdb83dd__RayHit{distance:f32,normal:vec3f,}fn d(a:f32)-> mat3x3f{let b=cos(a);let c=sin(a);return mat3x3f(1.0,0.0,0.0,0.0,b,c,0.0,-c,b);}fn e(a:f32)-> mat3x3f{let b=cos(a);let c=sin(a);return mat3x3f(b,0.0,-c,0.0,1.0,0.0,c,0.0,b);}fn f(a:ptr<storage,array<vec4f>,read>,b:ptr<storage,array<vec4f>,read>,c:vec3f,h:vec3f,i:bool)-> _vgsl_fcdb83dd__RayHit{var l=_vgsl_fcdb83dd__RayHit(1e6,vec3f(0.0));let m=select(vec3f(-1e-8),vec3f(1e-8),h>=vec3f(0.0));let n=1.0/select(m,h,abs(h)> vec3f(1e-8));var o=0u;let p=arrayLength(a)/3u;loop{if(o>=p){break;}let q=(*a)[o*3u];let r=(*a)[o*3u+1u];let s=(q.xyz-c)*n;let t=(r.xyz-c)*n;let u=min(s,t);let v=max(s,t);let A=max(max(u.x,u.y),max(u.z,0.0));let B=min(min(v.x,v.y),v.z);if(B<A||A> l.distance){o=u32(q.w);continue;}let C=u32((*a)[o*3u+2u].x);let D=u32(r.w);for(var E=0u;E<C;E++){let F=(D+E)*3u;let G=(*b)[F].xyz;let H=(*b)[F+1u].xyz;let I=(*b)[F+2u].xyz;let J=cross(h,I);let K=dot(H,J);if(abs(K)<1e-10||(i&&K>0.0)){continue;}let L=1.0/K;let M=c-G;let N=dot(M,J)*L;let O=cross(M,H);let P=dot(h,O)*L;let distance=dot(I,O)*L;if(N>=-0.00001&&P>=-0.00001&&N+P<=1.00001&&distance>0.00008&&distance<l.distance){l=_vgsl_fcdb83dd__RayHit(distance,normalize(cross(H,I)));}}o++;}return l;}fn g(a:f32,b:f32,c:f32)-> f32{let h=clamp(abs(a),0.0,1.0);let i=(b*b)/(c*c)*(1.0-h*h);if(i>=1.0){return 1.0;}let l=sqrt(max(0.0,1.0-i));let m=(b*h-c*l)/max(b*h+c*l,1e-5);let n=(c*h-b*l)/max(c*h+b*l,1e-5);return(m*m+n*n)*0.5;}fn j(a:vec3f,b:f32)-> vec3f{let c=pow(max(a,vec3f(0.035)),vec3f(1.65));return vec3f(-log(clamp(b,0.01,1.0)))+(vec3f(1.0)-c)*(0.42+(1.0-b)*0.80);}fn k(a:f32,b:f32,c:u32)-> f32{let h=array<f32,3>(-0.010,0.0,0.018);return max(1.001,a+h[c]*b);}" }, Rf = { version: 1, wgsl: "@group(0) @binding(0) var<uniform> viewProjection:mat4x4f;@group(0) @binding(1) var<storage,read> photons:array<vec4f>;struct SplatVertex{@builtin(position) clip:vec4f,@location(0) local:vec2f,@location(1) energy:vec3f,}@vertex fn vs_main(@builtin(vertex_index) a:u32,@builtin(instance_index) b:u32)-> SplatVertex{let c=array<vec2f,6>(vec2f(-1.0,-1.0),vec2f(1.0,-1.0),vec2f(-1.0,1.0),vec2f(-1.0,1.0),vec2f(1.0,-1.0),vec2f(1.0,1.0));let d=photons[b*2u];let e=photons[b*2u+1u];let f=c[a];let g=d.xyz+vec3f(f.x,0.0,f.y)*d.w;var h=viewProjection*vec4f(g,1.0);if(e.w<0.5){h=vec4f(2.0,2.0,2.0,1.0);}return SplatVertex(h,f,e.rgb);}@fragment fn fs_main(a:SplatVertex)-> @location(0) vec4f{let b=dot(a.local,a.local);let c=exp(-b*3.5)*(1.0-smoothstep(0.70,1.0,b));return vec4f(a.energy*c,0.0);}" };
function Df(t) {
  const e = new DataView(t);
  if (t.byteLength < 84) throw new Error("STL header is incomplete");
  const a = e.getUint32(80, !0);
  if (84 + a * 50 > t.byteLength) throw new Error("STL triangle table is incomplete");
  const n = new Array(a);
  for (let d = 0; d < a; d++) {
    const l = 84 + d * 50 + 12, f = (e.getFloat32(l, !0) + e.getFloat32(l + 12, !0) + e.getFloat32(l + 24, !0)) / 3;
    n[d] = { triangle: d, x: f };
  }
  const r = n.slice().sort((d, l) => d.x - l.x), i = r.slice(1).map((d, l) => ({ index: l + 1, size: d.x - r[l].x })).sort((d, l) => l.size - d.size).slice(0, 7).sort((d, l) => d.index - l.index);
  if (i.length !== 7) throw new Error("STL does not contain eight spatial clusters");
  const s = i.map((d) => (r[d.index - 1].x + r[d.index].x) / 2), o = Array.from({ length: 8 }, () => []);
  return n.forEach(({ triangle: d, x: l }) => {
    let f = 0;
    for (; f < s.length && l > s[f]; ) f++;
    o[f].push(d);
  }), o.map((d, l) => {
    if (!d.length) throw new Error(`STL cluster ${l + 1} is empty`);
    const f = [1 / 0, 1 / 0, 1 / 0], m = [-1 / 0, -1 / 0, -1 / 0];
    d.forEach((b) => {
      const y = 84 + b * 50 + 12;
      for (let w = 0; w < 3; w++) for (let x = 0; x < 3; x++) {
        const M = e.getFloat32(y + w * 12 + x * 4, !0);
        f[x] = Math.min(f[x], M), m[x] = Math.max(m[x], M);
      }
    });
    const p = f.map((b, y) => (b + m[y]) / 2), I = m.map((b, y) => b - f[y]), S = 2.05 / Math.max(...I), N = new Float32Array(d.length * 18);
    let C = 0;
    return d.forEach((b) => {
      const y = 84 + b * 50;
      let w = e.getFloat32(y, !0), x = e.getFloat32(y + 4, !0), M = e.getFloat32(y + 8, !0);
      const U = Math.hypot(w, x, M) || 1;
      w /= U, x /= U, M /= U;
      for (let h = 0; h < 3; h++) {
        const g = y + 12 + h * 12;
        N[C++] = (e.getFloat32(g, !0) - p[0]) * S, N[C++] = (e.getFloat32(g + 4, !0) - p[1]) * S, N[C++] = (e.getFloat32(g + 8, !0) - p[2]) * S, N[C++] = w, N[C++] = x, N[C++] = M;
      }
    }), { vertices: N, vertexCount: d.length * 3, triangleCount: d.length, extent: I };
  });
}
var Yn = (function() {
  var t = "b9H79Tebbbe:6eO9Geueu9Geub9Gbb9Gsuuuuuuuuuuuu99uueu9Gvuuuuub9Gruuuuuuub9Gouuuuuue999Gvuuuuueu9Gzuuuuuuuuuuu99uuuub9Gquuuuuuu99uueu9GPuuuuuuuuuuu99uueu9Gquuuuuuuu99ueu9Gruuuuuu99eu9Gwuuuuuu99ueu9Giuuue999Gluuuueu9Gluuuub9GiuuueuiLQdilvorlwDiqkxmPszbHHbelve9Weiiviebeoweuec:G:Pdkr:Bdxo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bbz9TW79O9V9Wt9F79P9T9W29P9M95bw8E9TW79O9V9Wt9F79P9T9W29P9M959x9Pt9OcttV9P9I91tW7bD8A9TW79O9V9Wt9F79P9T9W29P9M959x9Pt9O9v9W9K9HtWbqQ9TW79O9V9Wt9F79P9T9W29P9M959t29V9W9W95bkX9TW79O9V9Wt9F79P9T9W29P9M959qV919UWbxQ9TW79O9V9Wt9F79P9T9W29P9M959q9V9P9Ut7bmX9TW79O9V9Wt9F79P9T9W29P9M959t9J9H2WbPa9TW79O9V9Wt9F9V9Wt9P9T9P96W9wWVtW94SWt9J9O9sW9T9H9Wbs59TW79O9V9Wt9F9NW9UWV9HtW9q9V79Pt9P9V9U9sW9T9H9Wbzl79IV9RbHDwebcekdCXqM;YeQdbk;A1er3ue99euE99Que9:r998Jjjjjbcj;sb9Rgs8Kjjjjbcbhzasc:Cefcbc;Kbz:tjjjb8AdnabaeSmbabaeadcdtzMjjjb8AkdnamcdGTmbalcrfci4cbyd1:jjjbHjjjjbbhHasc:Cefasyd;8egecdtfaHBdbasaecefBd;8ecbhlcbhednadTmbabheadhOinaHaeydbci4fcb86bbaeclfheaOcufgOmbkcbhlabheadhOinaHaeydbgAci4fgCaCRbbgCceaAcrGgAtV86bbaCcu7aA4ceGalfhlaeclfheaOcufgOmbkcualcdtalcFFFFi0Ehekaecbyd1:jjjbHjjjjbbhzasc:Cefasyd;8egecdtfazBdbasaecefBd;8ealcd4alfhOcehHinaHgecethHaeaO6mbkcbhXcuaecdtgOaecFFFFi0Ecbyd1:jjjbHjjjjbbhHasc:Cefasyd;8egAcdtfaHBdbasaAcefBd;8eaHcFeaOz:tjjjbhQdnadTmbaecufhLcbhKindndnaQabaXcdtfgYydbgAc:v;t;h;Ev2aLGgOcdtfgCydbgHcuSmbceheinazaHcdtfydbaASmdaOaefhHaecefheaQaHaLGgOcdtfgCydbgHcu9hmbkkazaKcdtfaABdbaCaKBdbaKhHaKcefhKkaYaHBdbaXcefgXad9hmbkkaQcbyd:m:jjjbH:bjjjbbasasyd;8ecufBd;8ekcbh8AcualcefgecdtaecFFFFi0Ecbyd1:jjjbHjjjjbbhXasc:Cefasyd;8egecdtfaXBdbasaXBdNeasaecefBd;8ecuadcitadcFFFFe0Ecbyd1:jjjbHjjjjbbhEasc:Cefasyd;8egecdtfaEBdbasaEBd:yeasaecefBd;8eascNefabadalcbz:cjjjbcualcdtgealcFFFFi0Eg3cbyd1:jjjbHjjjjbbhAasc:Cefasyd;8egHcdtfaABdbasaHcefBd;8ea3cbyd1:jjjbHjjjjbbhKasc:Cefasyd;8egHcdtfaKBdbasaHcefBd;8eaAaKaialavazasc:Cefz:djjjbalcbyd1:jjjbHjjjjbbh5asc:Cefasyd;8egHcdtfa5BdbasaHcefBd;8ea3cbyd1:jjjbHjjjjbbhHasc:Cefasyd;8egOcdtfaHBdbasaOcefBd;8ea3cbyd1:jjjbHjjjjbbhOasc:Cefasyd;8egCcdtfaOBdbasaCcefBd;8eaHcFeaez:tjjjbh8EaOcFeaez:tjjjbh8FdnalTmbaEcwfhaindnaXa8AgOcefg8AcdtfydbgCaXaOcdtgefydbgHSmbaCaH9RhhaEaHcitfhga8Faefh8Ja8Eaefh8KcbhQindndnagaQcitfydbgLaO9hmba8KaOBdba8JaOBdbxekdnaXaLcdtg8LfgeclfydbgHaeydbgeSmbaEaecitgCfydbaOSmeaHae9Rh8Maecu7aHfhYaaaCfhHcbheinaYaeSmeaecefheaHydbhCaHcwfhHaCaO9hmbkaea8M6meka8Fa8LfgeaOaLaeydbcuSEBdba8KaLaOa8KydbcuSEBdbkaQcefgQah9hmbkka8Aal9hmbkaAhHaKhOa8FhCa8EhQcbheindndnaeaHydbgL9hmbdnaeaOydbgL9hmbaQydbhLdnaCydbgYcu9hmbaLcu9hmba5aefcb86bbxikdnaYcuSmbaLcuSmbaeaYSmbaAaYcdtfydbaAaLcdtfydb9hmba5aefcd86bbxika5aefh8KdnaeaYSmbaeaLSmba8Kce86bbxika8Kcl86bbxdkdnaeaKaLcdtgYfydb9hmbdnaCydbg8KcuSmbaea8KSmbaQydbghcuSmbaeahSmba8FaYfydbggcuSmbagaLSmba8EaYfydbgYcuSmbaYaLSmbdnaAa8KcdtfydbgLaAaYcdtfydb9hmbaLaAahcdtfydbgYSmbaYaAagcdtfydb9hmba5aefcd86bbxlka5aefcl86bbxika5aefcl86bbxdka5aefcl86bbxeka5aefa5aLfRbb86bbkaHclfhHaOclfhOaCclfhCaQclfhQalaecefge9hmbkdnamcaGTmbaEcwfh8Jcbh8Nindndna5a8NfgyRbbg8Pc9:fPibebekdndndnaAa8Ncdtfydbgea8N9hmbdnaqmbcbhgxdkdnazTmbcbhga8NheinagaqazaecdtgefydbfRbbcdGce4VhgaKaefydbgea8N9hmbxikkcbhga8NheinagaqaefRbbcdGce4VhgaKaecdtfydbgea8N9hmbxdkka5aefRbbhexeka8NheindnaXaecdtgafgeclfydbgHaeydbgeSmbaHae9Rh8AaEaecitfh8MaAaafh8Lcbh8Kina8Ma8KcitfydbgYhednindnaXaecdtgLfgeclfydbgHaeydbgeSmbdnaAaEaecitgOfydbcdtfydba8LydbgQ9hmbcehexikaHae9Rhhaecu7aHfhCa8JaOfhHcbheinaCaeSmeaecefheaHydbhOaHcwfhHaAaOcdtfydbaQ9hmbkaeah6hexdkaKaLfydbgeaY9hmbkcbhekagaece7Vhga8Kcefg8Ka8A9hmbkkaKaafydbgea8N9hmbka8PciagceGEhekayae86bbka8Ncefg8Nal9hmbkkdnaqTmbdndnazTmbazheaAhHalhOindnaqaeydbfRbbceGTmba5aHydbfcl86bbkaeclfheaHclfhHaOcufgOmbxdkkaqheaAhHalhOindnaeRbbceGTmba5aHydbfcl86bbkaecefheaHclfhHaOcufgOmbkkaAhealhOa5hHindna5aeydbfRbbcl9hmbaHcl86bbkaeclfheaHcefhHaOcufgOmbkkamceGTmba5healhHindnaeRbbce9hmbaecl86bbkaecefheaHcufgHmbkkcbhIcualcx2alc;v:Q;v:Qe0Ecbyd1:jjjbHjjjjbbhaasc:Cefasyd;8egecdtfaaBdbasaecefBd;8easc:qefcbBdbas9cb83i1eaaaialavazasc1efz:ejjjbh8RdndnaDmbcbhycbhCxekcbhCawhecbhHindnaeIdbJbbbb9ETmbasaCcdtfaHBdbaCcefhCkaeclfheaDaHcefgH9hmbkcuaCal2gecdtaecFFFFi0Ecbyd1:jjjbHjjjjbbhyasc:Cefasyd;8egecdtfayBdbasaecefBd;8ealTmbdnaCmbcbhCxekarcd4h8KdnazTmbaCcdthhcbhXayhYinaoazaXcdtfydba8K2cdtfhLasheaYhHaChOinaHaLaeydbcdtgQfIdbawaQfIdbNUdbaeclfheaHclfhHaOcufgOmbkaYahfhYaXcefgXal9hmbxdkkaCcdthhcbhXayhYinaoaXa8K2cdtfhLasheaYhHaChOinaHaLaeydbcdtgQfIdbawaQfIdbNUdbaeclfheaHclfhHaOcufgOmbkaYahfhYaXcefgXal9hmbkkcualc8S2gHalc;D;O;f8U0EgQcbyd1:jjjbHjjjjbbheasc:Cefasyd;8egOcdtfaeBdbasaOcefBd;8eaecbaHz:tjjjbh8ScbhDcbh8KdnaCTmbcbhIaQcbyd1:jjjbHjjjjbbh8Kasc:Cefasyd;8egecdtfa8KBdbasaecefBd;8ea8KcbaHz:tjjjb8AcuaCal2gecltgHaecFFFFb0Ecbyd1:jjjbHjjjjbbhDasc:Cefasyd;8egecdtfaDBdbasaecefBd;8eaDcbaHz:tjjjb8AamcjjjjdGTmbcualcltgealcFFFFb0Ecbyd1:jjjbHjjjjbbhIasc:Cefasyd;8egHcdtfaIBdbasaHcefBd;8eaIcbaez:tjjjb8AkdnadTmbcbhLabhHinaaaHclfydbgXcx2fgeIdbaaaHydbgYcx2fgOIdbgR:tg8UaaaHcwfydbghcx2fgQIdlaOIdlg8V:tg8WNaQIdbaR:tg8XaeIdla8V:tg8YN:tg8Zh80aeIdwaOIdwg81:tgBa8XNaQIdwa81:tg83a8UN:tgUh8Xa8Ya83Na8WaBN:tg8Yh8Udna8Za8ZNa8Ya8YNaUaUNMM:rgBJbbbb9EgOTmba8ZaB:vh80aUaB:vh8Xa8YaB:vh8Uka8SaAaYcdtfydbgQc8S2fgea8UaB:rg8Wa8UNNg85aeIdbMUdbaea8Xa8Wa8XNg86Ng87aeIdlMUdlaea80a8Wa80Ng83Ng88aeIdwMUdwaea86a8UNg86aeIdxMUdxaea83a8UNg89aeIdzMUdzaea83a8XNg8:aeIdCMUdCaea8Ua8Wa80a81Na8UaRNa8Va8XNMM:mgZNg83Ng8UaeIdKMUdKaea8Xa83Ng8XaeId3MUd3aea80a83Ng80aeIdaMUdaaea83aZNg83aeId8KMUd8Kaea8WaeIdyMUdya8SaAaXcdtfydbgXc8S2fgea85aeIdbMUdbaea87aeIdlMUdlaea88aeIdwMUdwaea86aeIdxMUdxaea89aeIdzMUdzaea8:aeIdCMUdCaea8UaeIdKMUdKaea8XaeId3MUd3aea80aeIdaMUdaaea83aeId8KMUd8Kaea8WaeIdyMUdya8SaAahcdtfydbgYc8S2fgea85aeIdbMUdbaea87aeIdlMUdlaea88aeIdwMUdwaea86aeIdxMUdxaea89aeIdzMUdzaea8:aeIdCMUdCaea8UaeIdKMUdKaea8XaeId3MUd3aea80aeIdaMUdaaea83aeId8KMUd8Kaea8WaeIdyMUdydnaITmbdnaOTmba8ZaB:vh8ZaUaB:vhUa8YaB:vh8YkaIaQcltfgeaBJbbbZNg8UaUNg8WaeIdlMUdlaea8Ua8ZNg8XaeIdwMUdwaea8Ua8YNg80aeIdbMUdbaea8UaR:ma8YNaUa8VN:ta81a8ZN:tNg8UaeIdxMUdxaIaXcltfgea8WaeIdlMUdlaea8XaeIdwMUdwaea80aeIdbMUdbaea8UaeIdxMUdxaIaYcltfgea8WaeIdlMUdlaea8XaeIdwMUdwaea80aeIdbMUdbaea8UaeIdxMUdxkaHcxfhHaLcifgLad6mbkkdnalTmbJ;n;m;m89J:v:;;w8ZamczGEh8YcbhOaAhQaahHa8SheindnaOaQydb9hmbaecxfgLaLIdbJbbbbMUdbaeczfgLaLIdbJbbbbMUdbaecCfgLaLIdbJbbbbMUdbaea8YaecyfgLIdbg8ZNg8UaeIdbMUdbaeclfgXa8UaXIdbMUdbaecwfgXa8UaXIdbMUdbaecKfgXaXIdbaHIdbg8Xa8UN:tUdbaHcwfIdbh8Waec3fgXaXIdba8UaHclfIdbg80N:tUdbaecafgXaXIdba8Ua8WN:tUdbaec8KfgXIdbhUaLa8Za8UMUdbaXaUa8Ua8Wa8WNa8Xa8XNa80a80NMMNMUdbkaQclfhQaHcxfhHaec8SfhealaOcefgO9hmbkkdnadTmbcbhhabhYinabahcdtfhXcbhHina5aXaHc:G1jjbfydbcdtfydbgOfRbbhedndna5aYaHfydbgQfRbbgLc99fcFeGcpe0mbaec99fcFeGc;:e6mekdnaLcufcFeGce0mba8EaQcdtfydbaO9hmekdnaecufcFeGce0mba8FaOcdtfydbaQ9hmekJbbacJbbacJbbbZaecFeGceSEaLcFeGceSEh88aaaOcx2fgeIdwaaaQcx2fgLIdwgB:tg80:mh86aeIdlaLIdlg83:tg8Z:mh89aeIdbaLIdbgR:tgU:mh8:dnaaaXaHc:K1jjbfydbcdtfydbcx2fgeIdwaB:tg8Va80a80NaUaUNa8Za8ZNMMg8YNa8Va80NaeIdbaR:tg81aUNa8ZaeIdla83:tg85NMMg8Wa80N:tg8Xa8XNa81a8YNa8WaUN:tg8Ua8UNa85a8YNa8Wa8ZN:tg8Wa8WNMM:rg87Jbbbb9ETmba8Xa87:vh8Xa8Wa87:vh8Wa8Ua87:vh8Uka88a8Y:rNg8Ya8XaBNa8UaRNa83a8WNMM:mgZNg87aZNhZa8Xa87Nhna8Wa87Nhca8Ua87Nh9ca8Ya8XNg87a8WNhJa87a8UNh9ea8Ya8WNgTa8UNhSa8Xa87Nh87a8WaTNhTa8Ua8Ya8UNNh9hdnaUa85Na81a89NMg8Xa8XNa8Za8VNa85a86NMg8Ua8UNa80a81Na8Va8:NMg8Wa8WNMM:rg80Jbbbb9ETmba8Xa80:vh8Xa8Wa80:vh8Wa8Ua80:vh8Uka8SaAaQcdtfydbc8S2fgeaeIdba9ha8Ua88a80:rNg80a8UNNMgUMUdbaeaTa8Wa80a8WNg8VNMg81aeIdlMUdlaea87a8Xa80a8XNg8ZNMg85aeIdwMUdwaeaSa8Va8UNMg8VaeIdxMUdxaea9ea8Za8UNMg87aeIdzMUdzaeaJa8Za8WNMg8ZaeIdCMUdCaea9ca8Ua80a8XaBNa8UaRNa83a8WNMMgB:mNg80NMg8UaeIdKMUdKaeaca8Wa80NMg8WaeId3MUd3aeana8Xa80NMg8XaeIdaMUdaaeaZaBa80N:tg80aeId8KMUd8Kaea8YJbbbbMg8YaeIdyMUdya8SaAaOcdtfydbc8S2fgeaUaeIdbMUdbaea81aeIdlMUdlaea85aeIdwMUdwaea8VaeIdxMUdxaea87aeIdzMUdzaea8ZaeIdCMUdCaea8UaeIdKMUdKaea8WaeId3MUd3aea8XaeIdaMUdaaea80aeId8KMUd8Kaea8YaeIdyMUdykaHclfgHcx9hmbkaYcxfhYahcifghad6mbkaCTmbcbhYinJbbbbh8YaaabaYcdtfgeclfydbghcx2fgHIdwaaaeydbggcx2fgOIdwg81:tg8Wa8WNaHIdbaOIdbg85:tg8Xa8XNaHIdlaOIdlg87:tg80a80NMMgRaaaecwfydbgEcx2fgeIdwa81:tg8ZNa8Wa8Wa8ZNa8XaeIdba85:tgUNa80aeIdla87:tgBNMMg8UN:tJbbbbJbbjZaRa8Za8ZNaUaUNaBaBNMMg8VNa8Ua8UN:tg83:va83Jbbbb9BEg83Nh89a8Va8WNa8Za8UN:ta83Nh8:aRaBNa80a8UN:ta83NhZa8Va80NaBa8UN:ta83NhnaRaUNa8Xa8UN:ta83Nhca8Va8XNaUa8UN:ta83Nh9ca8XaBNaUa80N:tg8Ua8UNa80a8ZNaBa8WN:tg8Ua8UNa8WaUNa8Za8XN:tg8Ua8UNMM:rJbbbZNh8UayagaC2g8LcdtfhHayaEaC2g8JcdtfhOayahaC2g8AcdtfhQa81:mhJa87:mh9ea85:mhTcbhLaChXJbbbbhBJbbbbh83JbbbbhRJbbbbh8VJbbbbh81Jbbbbh85Jbbbbh87Jbbbbh88Jbbbbh86inascjdfaLfgecwfa8Ua8:aQIdbaHIdbg8Z:tg80Na89aOIdba8Z:tgUNMg8WNUdbaeclfa8Uana80NaZaUNMg8XNUdbaea8Ua9ca80NacaUNMg80NUdbaecxfa8UaJa8WNa9ea8XNa8ZaTa80NMMMg8ZNUdba8Ua8Wa8XNNa8VMh8Va8Ua8Wa80NNa81Mh81a8Ua8Xa80NNa85Mh85a8Ua8Za8ZNNa8YMh8Ya8Ua8Wa8ZNNaBMhBa8Ua8Xa8ZNNa83Mh83a8Ua80a8ZNNaRMhRa8Ua8Wa8WNNa87Mh87a8Ua8Xa8XNNa88Mh88a8Ua80a80NNa86Mh86aHclfhHaQclfhQaOclfhOaLczfhLaXcufgXmbka8Kagc8S2fgea86aeIdbMUdbaea88aeIdlMUdlaea87aeIdwMUdwaea85aeIdxMUdxaea81aeIdzMUdzaea8VaeIdCMUdCaeaRaeIdKMUdKaea83aeId3MUd3aeaBaeIdaMUdaaea8YaeId8KMUd8Kaea8UaeIdyMUdya8Kahc8S2fgea86aeIdbMUdbaea88aeIdlMUdlaea87aeIdwMUdwaea85aeIdxMUdxaea81aeIdzMUdzaea8VaeIdCMUdCaeaRaeIdKMUdKaea83aeId3MUd3aeaBaeIdaMUdaaea8YaeId8KMUd8Kaea8UaeIdyMUdya8KaEc8S2fgea86aeIdbMUdbaea88aeIdlMUdlaea87aeIdwMUdwaea85aeIdxMUdxaea81aeIdzMUdzaea8VaeIdCMUdCaeaRaeIdKMUdKaea83aeId3MUd3aeaBaeIdaMUdaaea8YaeId8KMUd8Kaea8UaeIdyMUdyaDa8LcltfhXcbhHaChQinaXaHfgeascjdfaHfgOIdbaeIdbMUdbaeclfgLaOclfIdbaLIdbMUdbaecwfgLaOcwfIdbaLIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaQcufgQmbkaDa8AcltfhXcbhHaChQinaXaHfgeascjdfaHfgOIdbaeIdbMUdbaeclfgLaOclfIdbaLIdbMUdbaecwfgLaOcwfIdbaLIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaQcufgQmbkaDa8JcltfhXcbhHaChQinaXaHfgeascjdfaHfgOIdbaeIdbMUdbaeclfgLaOclfIdbaLIdbMUdbaecwfgLaOcwfIdbaLIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaQcufgQmbkaYcifgYad6mbkkcbhOdndnamcwGg9imbJbbbbhRcbh6cbh9kcbh0xekcbh6a3cbyd1:jjjbHjjjjbbh0asc:Cefasyd;8egecdtfa0BdbasaecefBd;8ecua0alabadaAz:fjjjbgQcltaQcjjjjiGEcbyd1:jjjbHjjjjbbh9kasc:Cefasyd;8egecdtfa9kBdbasaecefBd;8ea9kaQa0aaalz:gjjjbJFFuuhRaQTmba9kheaQhHinaeIdbg8UaRaRa8U9EEhRaeclfheaHcufgHmbkaQh6kasydNeh9mdnalTmba9mclfhea9mydbhQa5hHalhLcbhOincbaeydbgXaQ9RaHRbbcpeGEaOfhOaHcefhHaeclfheaXhQaLcufgLmbkaOce4hOkcuadaO9Rcifg9ncx2a9nc;v:Q;v:Qe0Ecbyd1:jjjbHjjjjbbh9oasc:Cefasyd;8egecdtfa9oBdbasaecefBd;8ecua9ncdta9ncFFFFi0Ecbyd1:jjjbHjjjjbbh9pasc:Cefasyd;8egecdtfa9pBdbasaecefBd;8ea3cbyd1:jjjbHjjjjbbh8Pasc:Cefasyd;8egecdtfa8PBdbasaecefBd;8ealcbyd1:jjjbHjjjjbbh9qasc:Cefasyd;8egecdtfa9qBdbasaecefBd;8eaxaxNa8RJbbjZamclGEgnanN:vh88Jbbbbh86dnadak9nmbdna9nci6mbasyd:yeh9raCclth9sa9ocwfh9tJbbbbh87Jbbbbh86inascNefabadalaAz:cjjjbabhgcbh8Ncbh3inaba3cdtfh8LcbheindnaAagaefydbgOcdtghfydbgQaAa8Laec:W1jjbfydbcdtfydbgHcdtgEfydbgLSmba5aHfRbbgYcv2a5aOfRbbgXfc;a1jjbfRbbg8AaXcv2aYfg8Jc;a1jjbfRbbg8MVcFeGTmbdnaLaQ9nmba8Jc;G1jjbfRbbcFeGmekdnaXcufcFeGce0mbaYTmba8EahfydbaH9hmekdnaXTmbaYcufcFeGce0mba8FaEfydbaO9hmeka9oa8Ncx2fgQaHaOa8McFeGgLEBdlaQaOaHaLEBdbaQaLa8AGcb9hBdwa8Ncefh8Nkaeclfgecx9hmbkdna3cifg3ad9pmbagcxfhga8Ncifa9n9nmekka8NTmdcbh8Jina8SaAa9oa8Jcx2fghydbgLcdtgQfydbggc8S2fgeIdwaaahydlgXcx2fgHIdwg8XNaeIdzaHIdbg80NaeIdaMg8Ua8UMMa8XNaeIdlaHIdlg8ZNaeIdCa8XNaeId3Mg8Ua8UMMa8ZNaeIdba80NaeIdxa8ZNaeIdKMg8Ua8UMMa80NaeId8KMMM:lh8UJbbbbJbbjZaeIdyg8W:va8WJbbbb9BEh8Wdndnahydwg8LmbJFFuuh83xekJbbbbJbbjZa8SaAaXcdtfydbc8S2fgeIdygU:vaUJbbbb9BEaeIdwaaaLcx2fgHIdwgUNaeIdzaHIdbg8YNaeIdaMgBaBMMaUNaeIdlaHIdlgBNaeIdCaUNaeId3MgUaUMMaBNaeIdba8YNaeIdxaBNaeIdKMgUaUMMa8YNaeId8KMMM:lNh83ka8Wa8UNhBdnaCTmba8KaLc8S2fgOIdwa8XNaOIdza80NaOIdaMg8Ua8UMMa8XNaOIdla8ZNaOIdCa8XNaOId3Mg8Ua8UMMa8ZNaOIdba80NaOIdxa8ZNaOIdKMg8Ua8UMMa80NaOId8KMMMh8UayaXaC2gYcdtfhHaDaLaC2gEcltfheaOIdyhUaChOinaHIdbg8Wa8WaUNaecxfIdba8XaecwfIdbNa80aeIdbNa8ZaeclfIdbNMMMg8Wa8WM:tNa8UMh8UaHclfhHaeczfheaOcufgOmbkdndna8LmbJbbbbh8Wxeka8KaXc8S2fgOIdwaaaLcx2fgeIdwg80NaOIdzaeIdbg8ZNaOIdaMg8Wa8WMMa80NaOIdlaeIdlgUNaOIdCa80NaOId3Mg8Wa8WMMaUNaOIdba8ZNaOIdxaUNaOIdKMg8Wa8WMMa8ZNaOId8KMMMh8WayaEcdtfhHaDaYcltfheaOIdyh8YaChOinaHIdbg8Xa8Xa8YNaecxfIdba80aecwfIdbNa8ZaeIdbNaUaeclfIdbNMMMg8Xa8XM:tNa8WMh8WaHclfhHaeczfheaOcufgOmbka8W:lh8WkaBa8U:lMhBa83a8WMh83dndndna5aLfRbbc9:fPddbekaKaQfydbgQaLSmbaAaXcdtfydbhEindndna8EaQcdtgYfydbgecuSmbaAaecdtfydbaESmekdna8FaYfydbgecuSmbaAaecdtfydbaESmekaXheka8KaQc8S2fgOIdwaaaecx2fgHIdwg8XNaOIdzaHIdbg80NaOIdaMg8Ua8UMMa8XNaOIdlaHIdlg8ZNaOIdCa8XNaOId3Mg8Ua8UMMa8ZNaOIdba80NaOIdxa8ZNaOIdKMg8Ua8UMMa80NaOId8KMMMh8UayaeaC2cdtfhHaDaQaC2cltfheaOIdyhUaChOinaHIdbg8Wa8WaUNaecxfIdba8XaecwfIdbNa80aeIdbNa8ZaeclfIdbNMMMg8Wa8WM:tNa8UMh8UaHclfhHaeczfheaOcufgOmbkaBa8U:lMhBaKaYfydbgQaL9hmbkka5aXfRbbci9hmea8LTmeaKaXcdtfydbgQaXSmeindndna8EaQcdtgYfydbgecuSmbaAaecdtfydbagSmekdna8FaYfydbgecuSmbaAaecdtfydbagSmekaLheka8KaQc8S2fgOIdwaaaecx2fgHIdwg8XNaOIdzaHIdbg80NaOIdaMg8Ua8UMMa8XNaOIdlaHIdlg8ZNaOIdCa8XNaOId3Mg8Ua8UMMa8ZNaOIdba80NaOIdxa8ZNaOIdKMg8Ua8UMMa80NaOId8KMMMh8UayaeaC2cdtfhHaDaQaC2cltfheaOIdyhUaChOinaHIdbg8Wa8WaUNaecxfIdba8XaecwfIdbNa80aeIdbNa8ZaeclfIdbNMMMg8Wa8WM:tNa8UMh8UaHclfhHaeczfheaOcufgOmbka83a8U:lMh83aKaYfydbgQaX9hmbxdkkdna8Fa8Ea8EaQfydbaXSEaKaQfydbgYcdtfydbgQcu9hmbaKaXcdtfydbhQka8KaYc8S2fgOIdwaaaQcx2fgeIdwg8XNaOIdzaeIdbg80NaOIdaMg8Ua8UMMa8XNaOIdlaeIdlg8ZNaOIdCa8XNaOId3Mg8Ua8UMMa8ZNaOIdba80NaOIdxa8ZNaOIdKMg8Ua8UMMa80NaOId8KMMMh8UayaQaC2ggcdtfhHaDaYaC2gEcltfheaOIdyhUaChOinaHIdbg8Wa8WaUNaecxfIdba8XaecwfIdbNa80aeIdbNa8ZaeclfIdbNMMMg8Wa8WM:tNa8UMh8UaHclfhHaeczfheaOcufgOmbkdndna8LmbJbbbbh8Wxeka8KaQc8S2fgOIdwaaaYcx2fgeIdwg80NaOIdzaeIdbg8ZNaOIdaMg8Wa8WMMa80NaOIdlaeIdlgUNaOIdCa80NaOId3Mg8Wa8WMMaUNaOIdba8ZNaOIdxaUNaOIdKMg8Wa8WMMa8ZNaOId8KMMMh8WayaEcdtfhHaDagcltfheaOIdyh8YaChOinaHIdbg8Xa8Xa8YNaecxfIdba80aecwfIdbNa8ZaeIdbNaUaeclfIdbNMMMg8Xa8XM:tNa8WMh8WaHclfhHaeczfheaOcufgOmbka8W:lh8WkaBa8U:lMhBa83a8WMh83kaha83aBa83aB9DgeEUdwahaLaXaea8Lcb9hGgeEBdlahaXaLaeEBdba8Jcefg8Ja8N9hmbkascjdfcbcj;qbz:tjjjb8Aa9thea8NhHinascjdfaeydbcA4cF8FGgOcFAaOcFA6EcdtfgOaOydbcefBdbaecxfheaHcufgHmbkcbhecbhHinascjdfaefgOydbhQaOaHBdbaQaHfhHaeclfgecj;qb9hmbkcbhea9thHinascjdfaHydbcA4cF8FGgOcFAaOcFA6EcdtfgOaOydbgOcefBdba9paOcdtfaeBdbaHcxfhHa8Naecefge9hmbkadak9RgOci9Uh9udnalTmbcbhea8PhHinaHaeBdbaHclfhHalaecefge9hmbkkcbh9va9qcbalz:tjjjbh9waOcO9Uh9xa9uce4h9ycbh3cbh8Adnina9oa9pa8Acdtfydbcx2fg8JIdwg8Ua889Emea3a9u9pmeJFFuuh8Wdna9ya8N9pmba9oa9pa9ycdtfydbcx2fIdwJbb;aZNh8Wkdna8Ua8W9ETmba8Ua869ETmba3a9x0mdkdna9waAa8Jydlg8Mcdtg9zfgEydbgQfg9ARbba9waAa8Jydbggcdtg9Bfydbgefg9CRbbVmba5agfRbbh9Ddna9maecdtfgHclfydbgOaHydbgHSmbaOaH9RhLaaaQcx2fhYaaaecx2fhha9raHcitfhecbhHceh8Ldnindna8PaeydbcdtfydbgOaQSmba8PaeclfydbcdtfydbgXaQSmbaOaXSmbaaaXcx2fgXIdbaaaOcx2fgOIdbg8X:tg8UahIdlaOIdlg80:tg8YNahIdba8X:tgBaXIdla80:tg8WN:tg8Za8UaYIdla80:tg83NaYIdba8X:tg8Va8WN:tg80Na8WahIdwaOIdwgU:tg81Na8YaXIdwaU:tg8XN:tg8Ya8WaYIdwaU:tg85Na83a8XN:tg8WNa8XaBNa81a8UN:tgUa8Xa8VNa85a8UN:tg8UNMMa8Za8ZNa8Ya8YNaUaUNMMa80a80Na8Wa8WNa8Ua8UNMMN:rJbbj8:N9FmdkaecwfheaHcefgHaL6h8LaLaH9hmbkka8LceGTmba9ycefh9yxekdndndndna9Dc9:fPdebdkagheinaEydbhOdndna8EaecdtgHfydbgecuSmbaAaecdtfydbaOSmekdna8FaHfydbgecuSmbaAaecdtfydbaOSmeka8Mheka8PaHfaeBdbaKaHfydbgeag9hmbxikkdna8Fa8Ea8Ea9Bfydba8MSEaKa9Bfydbggcdtfydbgecu9hmbaKa9zfydbheka8Pa9Bfa8MBdbaeh8Mka8Pagcdtfa8MBdbka9Cce86bba9Ace86bba8JIdwg8Ua86a86a8U9DEh86a9vcefh9vcecda9DceSEa3fh3ka8Acefg8Aa8N9hmbkka9vTmddnalTmbcbhXcbhhindna8PahcdtgefydbgOahSmbaAaOcdtfydbhgdnahaAaefydb9hgEmba8Sagc8S2fgea8Sahc8S2fgHIdbaeIdbMUdbaeaHIdlaeIdlMUdlaeaHIdwaeIdwMUdwaeaHIdxaeIdxMUdxaeaHIdzaeIdzMUdzaeaHIdCaeIdCMUdCaeaHIdKaeIdKMUdKaeaHId3aeId3MUd3aeaHIdaaeIdaMUdaaeaHId8KaeId8KMUd8KaeaHIdyaeIdyMUdyaITmbaIagcltfgeaIahcltfgHIdbaeIdbMUdbaeaHIdlaeIdlMUdlaeaHIdwaeIdwMUdwaeaHIdxaeIdxMUdxkaCTmba8KaOc8S2fgea8Kahc8S2g8LfgHIdbaeIdbMUdbaeaHIdlaeIdlMUdlaeaHIdwaeIdwMUdwaeaHIdxaeIdxMUdxaeaHIdzaeIdzMUdzaeaHIdCaeIdCMUdCaeaHIdKaeIdKMUdKaeaHId3aeId3MUd3aeaHIdaaeIdaMUdaaeaHId8KaeId8KMUd8KaeaHIdyaeIdyMUdya9saO2hYaDhHaChQinaHaYfgeaHaXfgOIdbaeIdbMUdbaeclfgLaOclfIdbaLIdbMUdbaecwfgLaOcwfIdbaLIdbMUdbaecxfgeaOcxfIdbaeIdbMUdbaHczfhHaQcufgQmbkaEmbJbbbbJbbjZa8Sa8LfgeIdyg8U:va8UJbbbb9BEaeIdwaaagcx2fgHIdwg8UNaeIdzaHIdbg8WNaeIdaMg8Xa8XMMa8UNaeIdlaHIdlg8XNaeIdCa8UNaeId3Mg8Ua8UMMa8XNaeIdba8WNaeIdxa8XNaeIdKMg8Ua8UMMa8WNaeId8KMMM:lNg8Ua87a87a8U9DEh87kaXa9sfhXahcefghal9hmbkcbhHa8EheindnaeydbgOcuSmbdnaHa8PaOcdtgQfydbgO9hmbcuhOa8EaQfydbgQcuSmba8PaQcdtfydbhOkaeaOBdbkaeclfhealaHcefgH9hmbkcbhHa8FheindnaeydbgOcuSmbdnaHa8PaOcdtgQfydbgO9hmbcuhOa8FaQfydbgQcuSmba8PaQcdtfydbhOkaeaOBdbkaeclfhealaHcefgH9hmbkka87a86aCEh87cbhHabhecbhOindnaAa8PaeydbcdtfydbgXcdtfydbgQaAa8PaeclfydbcdtfydbgYcdtfydbgLSmbaQaAa8PaecwfydbcdtfydbggcdtfydbghSmbaLahSmbabaHcdtfgQaXBdbaQcwfagBdbaQclfaYBdbaHcifhHkaecxfheaOcifgOad6mbkdndna9imbaHhdxekdnaHak0mbaHhdxekdnaRa879FmbaHhdxekJFFuuhRcbhdabhecbhOindna9ka0aeydbgQcdtfydbcdtfIdbg8Ua879ETmbaeclf8Pdbh9EabadcdtfgLaQBdbaLclfa9E83dba8UaRaRa8U9EEhRadcifhdkaecxfheaOcifgOaH6mbkkadak0mbxdkkascNefabadalaAz:cjjjbkdndnadak0mbadhhxekdna9imbadhhxekdnaRa889FmbadhhxekcehLinaRJbb;aZNg8Ua88a8Ua889DEh8XJbbbbh8Udna6Tmba9khea6hHinaeIdbg8Wa8Ua8Wa8X9FEa8Ua8Wa8U9EEh8UaeclfheaHcufgHmbkkJFFuuhRcbhhabhecbhHindna9ka0aeydbgOcdtfydbcdtfIdbg8Wa8X9ETmbaeclf8Pdbh9EabahcdtfgQaOBdbaQclfa9E83dba8WaRaRa8W9EEhRahcifhhkaecxfheaHcifgHad6mbkdnaLahad9hVceGmbadhhxdka8Ua86a86a8U9DEh86ahak9nmecbhLahhdaRa889FmbkkdnamcjjjjdGTmba9qcbalz:tjjjbh8LdnahTmbabheahhHina8LaeydbgOfce86bba8LaAaOcdtfydbfce86bbaeclfheaHcufgHmbkkascNefabahalaAz:cjjjbdndndnalTmbcbhQasyd:yehEindna8LaQfRbbTmbdna5aQfRbbgecl0mbceaetcQGmekdnaAaQcdtgXfydbgeaQSmbaaaQcx2fgHaaaecx2fge8Pdb83dbaHcwfaecwfydbBdbxeka8SaQc8S2fgLIdyg9ca9cJL:3;rUNg8UMh88aLIdwg9ha8UMhRaLIdlgxa8UMh8VaLIdbg9Fa8UMhUaLIdag9Ga8UaaaQcx2fggIdwg89N:th81aLId3g9Ha8UagIdlg8:N:th85aLIdKg9IagIdbgZa8UN:th8YJbbbbhcaLIdCg9JJbbbbMh87aLIdzg9KJbbbbMhBaLIdxgWJbbbbMh83dndnaCTmbaQhOinJbbbba88a8KaOc8S2fgHIdyg8U:va8UJbbbb9BEh8UaDaOaC2cltfheaHIdaa88Na81Mh81aHId3a88Na85Mh85aHIdKa88Na8YMh8YaHIdCa88Na87Mh87aHIdza88NaBMhBaHIdxa88Na83Mh83aHIdwa88NaRMhRaHIdla88Na8VMh8VaHIdba88NaUMhUaChHina81aecxfIdbg8ZaecwfIdbg8WNa8UN:th81a85a8ZaeclfIdbg8XNa8UN:th85a87a8Wa8XNa8UN:th87aUaeIdbg80a80Na8UN:thUa8Ya8Za80Na8UN:th8YaBa8Wa80Na8UN:thBa83a8Xa80Na8UN:th83aRa8Wa8WNa8UN:thRa8Va8Xa8XNa8UN:th8VaeczfheaHcufgHmbkaKaOcdtfydbgOaQ9hmbkaITmbaIaQcltfgeIdxhSaeIdwhJaeIdlh9eaeIdbh8UxekJbbbbhSJbbbbhJJbbbbh9eJbbbbh8UkaBaU:vg8Xa8YNa81:ta87aBa83aU:vg8WN:tg81a8Va83a8WN:tg8Z:vg80a8Wa8YNa85:tg8VN:th85aJa8Ua8XN:ta9ea8Ua8WN:tg83a80N:tg87aRaBa8XN:ta81a80N:tgB:vgR:mh81a83a8Z:vgJ:mh9ednJbbbba8Ua8UaU:vgTN:ta83aJN:ta87aRN:tg83:la88J:983:g81Ng8U9ETmba81a85Na9ea8VNaTa8YNaS:tMMa83:vhckaU:la8U9ETmba8Z:la8U9ETmbaB:la8U9ETmbaT:macNa8X:ma81acNa85aB:vMgBNa8W:ma9eacNa80:maBNa8Va8Z:vMMg87Na8Y:maU:vMMMh88a9maXfgeclfydbgHaeydbge9RhYaEaecitfhXJbbbbh8UdnaHaeSg8JmbJbbbbh8UaXheaYhOinaaaeclfydbcx2fgHIdwa89:tg8Wa8WNaHIdbaZ:tg8Wa8WNaHIdla8::tg8Wa8WNMMg8Waaaeydbcx2fgHIdwa89:tg8Xa8XNaHIdbaZ:tg8Xa8XNaHIdla8::tg8Xa8XNMMg8Xa8Ua8Ua8X9DEg8Ua8Ua8W9DEh8UaecwfheaOcufgOmbkkaBa89:tg8Wa8WNa88aZ:tg8Wa8WNa87a8::tg8Wa8WNMMa8U:rg8Ua8UN9EmbaLId8Khcdna8JmbcbhOcehLdninaaaXclfydbcx2fgeIdbaaaXydbcx2fgHIdbg8X:tg8Ua8:aHIdlg80:tg8YNaZa8X:tg83aeIdla80:tg8WN:tg8Za8Ua87a80:tgRNa88a8X:tg8Va8WN:tg80Na8Wa89aHIdwgU:tg81Na8YaeIdwaU:tg8XN:tg8Ya8WaBaU:tg85NaRa8XN:tg8WNa8Xa83Na81a8UN:tgUa8Xa8VNa85a8UN:tg8UNMMa8Za8ZNa8Ya8YNaUaUNMMa80a80Na8Wa8WNa8Ua8UNMMN:rJbbj8:N9FmeaXcwfhXaOcefgOaY6hLaYaO9hmbkkaLceGmekJbbbbJbbjZa9c:va9cJbbbb9BEg8Ua9haBNa9Ka88Na9GMg8Wa8WMMaBNaxa87Na9JaBNa9HMg8Wa8WMMa87Na9Fa88NaWa87Na9IMg8Wa8WMMa88NacMMM:lNa8Ua9ha89Na9KaZNa9GMg8Wa8WMMa89Naxa8:Na9Ja89Na9HMg8Wa8WMMa8:Na9FaZNaWa8:Na9IMg8Wa8WMMaZNacMMM:lNJbb;aZNJ:983:g81M9EmbagaBUdwaga87Udlaga88UdbkaQcefgQal9hmbkaCTmecbhLindna8LaLfRbbTmbaAaLcdtgefydbaL9hmba5aLfhEaaaLcx2fhOaKaefh8JayaLaC2cdtfh8AcbhgincuhQdnaERbbci9hmbaLhQa8JydbgeaLSmbayagcdtgHfhXa8AaHfIdbh8UaLhQinaQhHcuhQdnaXaeaC2cdtfIdba8U9CmbaHcuSmbaHhQa8Kaec8S2fIdya8KaHc8S2fIdy9ETmbaehQkaKaecdtfydbgeaL9hmbkkayagcdtfhXaDagcltfhYaLheinaXaeaC2cdtfJbbbbJbbjZa8KaeaQaQcuSEgHc8S2fIdyg8U:va8UJbbbb9BEaYaHaC2cltfgHIdwaOIdwNaHIdbaOIdbNaHIdlaOIdlNMMaHIdxMNUdbaKaecdtfydbgeaL9hmbkagcefggaC9hmbkkaLcefgLalSmixbkkaCmekcbhCkaiavaoarawaCalaaayazasa8Rasc1efa5a8Laqz:hjjjbkdnamcjjjjlGTmbazmbahTmbcbhQabheina5aeydbgAfRbbc3thLaecwfgKydbhHdndna8EaAcdtgYfydbaeclfgXydbgOSmbcbhCa8FaOcdtfydbaA9hmekcjjjj94hCkaeaLaCVaAVBdba5aOfRbbc3thLdndna8EaOcdtfydbaHSmbcbhCa8FaHcdtfydbaO9hmekcjjjj94hCkaXaLaCVaOVBdba5aHfRbbc3thCdndna8EaHcdtfydbaASmbcbhOa8FaYfydbaH9hmekcjjjj94hOkaKaCaOVaHVBdbaecxfheaQcifgQah6mbkkdnazTmbahTmbahheinabazabydbcdtfydbBdbabclfhbaecufgembkkdnaPTmbaPana86:rNUdbkasyd;8egecdtasc:Ceffc98fhHdninaeTmeaHydbcbyd:m:jjjbH:bjjjbbaHc98fhHaecufhexbkkascj;sbf8Kjjjjbahk;Yieouabydlhvabydbclfcbaicdtz:tjjjbhoadci9UhrdnadTmbdnalTmbaehwadhDinaoalawydbcdtfydbcdtfgqaqydbcefBdbawclfhwaDcufgDmbxdkkaehwadhDinaoawydbcdtfgqaqydbcefBdbawclfhwaDcufgDmbkkdnaiTmbcbhDaohwinawydbhqawaDBdbawclfhwaqaDfhDaicufgimbkkdnadci6mbinaecwfydbhwaeclfydbhDaeydbhidnalTmbalawcdtfydbhwalaDcdtfydbhDalaicdtfydbhikavaoaicdtfgqydbcitfaDBdbavaqydbcitfawBdlaqaqydbcefBdbavaoaDcdtfgqydbcitfawBdbavaqydbcitfaiBdlaqaqydbcefBdbavaoawcdtfgwydbcitfaiBdbavawydbcitfaDBdlawawydbcefBdbaecxfhearcufgrmbkkabydbcbBdbk:todDue99aicd4aifhrcehwinawgDcethwaDar6mbkcuaDcdtgraDcFFFFi0Ecbyd1:jjjbHjjjjbbhwaoaoyd9GgqcefBd9GaoaqcdtfawBdbawcFearz:tjjjbhkdnaiTmbalcd4hlaDcufhxcbhminamhDdnavTmbavamcdtfydbhDkcbadaDal2cdtfgDydlgwawcjjjj94SEgwcH4aw7c:F:b:DD2cbaDydbgwawcjjjj94SEgwcH4aw7c;D;O:B8J27cbaDydwgDaDcjjjj94SEgDcH4aD7c:3F;N8N27axGhwamcdthPdndndnavTmbakawcdtfgrydbgDcuSmeadavaPfydbal2cdtfgsIdbhzcehqinaqhrdnadavaDcdtfydbal2cdtfgqIdbaz9CmbaqIdlasIdl9CmbaqIdwasIdw9BmlkarcefhqakawarfaxGgwcdtfgrydbgDcu9hmbxdkkakawcdtfgrydbgDcuSmbadamal2cdtfgsIdbhzcehqinaqhrdnadaDal2cdtfgqIdbaz9CmbaqIdlasIdl9CmbaqIdwasIdw9BmikarcefhqakawarfaxGgwcdtfgrydbgDcu9hmbkkaramBdbamhDkabaPfaDBdbamcefgmai9hmbkkakcbyd:m:jjjbH:bjjjbbaoaoyd9GcufBd9GdnaeTmbaiTmbcbhDaehwinawaDBdbawclfhwaiaDcefgD9hmbkcbhDaehwindnaDabydbgrSmbawaearcdtfgrydbBdbaraDBdbkawclfhwabclfhbaiaDcefgD9hmbkkk:hrdvuv998Jjjjjbca9Rgoczfcwfcbyd11jjbBdbaocb8Pdj1jjb83izaocwfcbydN1jjbBdbaocb8Pd:m1jjb83ibdnadTmbaicd4hrdnabmbdnalTmbcbhwinaealawcdtfydbar2cdtfhDcbhiinaoczfaifgqaDaifIdbgkaqIdbgxaxak9EEUdbaoaifgqakaqIdbgxaxak9DEUdbaiclfgicx9hmbkawcefgwad9hmbxikkarcdthwcbhDincbhiinaoczfaifgqaeaifIdbgkaqIdbgxaxak9EEUdbaoaifgqakaqIdbgxaxak9DEUdbaiclfgicx9hmbkaeawfheaDcefgDad9hmbxdkkdnalTmbcbhwinabawcx2fgiaealawcdtfydbar2cdtfgDIdbUdbaiaDIdlUdlaiaDIdwUdwcbhiinaoczfaifgqaDaifIdbgkaqIdbgxaxak9EEUdbaoaifgqakaqIdbgxaxak9DEUdbaiclfgicx9hmbkawcefgwad9hmbxdkkarcdthlcbhwaehDinabawcx2fgiaeawar2cdtfgqIdbUdbaiaqIdlUdlaiaqIdwUdwcbhiinaoczfaifgqaDaifIdbgkaqIdbgxaxak9EEUdbaoaifgqakaqIdbgxaxak9DEUdbaiclfgicx9hmbkaDalfhDawcefgwad9hmbkkJbbbbaoIdbaoIdzgx:tgkakJbbbb9DEgkaoIdlaoIdCgm:tgPaPak9DEgkaoIdwaoIdKgP:tgsasak9DEhsdnabTmbadTmbJbbbbJbbjZas:vasJbbbb9BEhkinabakabIdbax:tNUdbabclfgoakaoIdbam:tNUdbabcwfgoakaoIdbaP:tNUdbabcxfhbadcufgdmbkkdnavTmbavaPUdwavamUdlavaxUdbkask:ZlewudnaeTmbcbhvabhoinaoavBdbaoclfhoaeavcefgv9hmbkkdnaiTmbcbhrinadarcdtfhwcbhDinalawaDcdtgvc:G1jjbfydbcdtfydbcdtfydbhodnabalawavfydbcdtfydbgqcdtfgkydbgvaqSmbinakabavgqcdtfgxydbgvBdbaxhkaqav9hmbkkdnabaocdtfgkydbgvaoSmbinakabavgocdtfgxydbgvBdbaxhkaoav9hmbkkdnaqaoSmbabaqaoaqao0Ecdtfaqaoaqao6EBdbkaDcefgDci9hmbkarcifgrai6mbkkdnaembcbskcbhxindnalaxcdtgvfydbax9hmbaxhodnabavfgDydbgvaxSmbaDhqinaqabavgocdtfgkydbgvBdbakhqaoav9hmbkkaDaoBdbkaxcefgxae9hmbkcbhvabhocbhkindndnavalydbgq9hmbdnavaoydbgq9hmbaoakBdbakcefhkxdkaoabaqcdtfydbBdbxekaoabaqcdtfydbBdbkaoclfhoalclfhlaeavcefgv9hmbkakk;Jiilud99duabcbaecltz:tjjjbhvdnalTmbadhoaihralhwinarcwfIdbhDarclfIdbhqavaoydbcltfgkarIdbakIdbMUdbakclfgxaqaxIdbMUdbakcwfgxaDaxIdbMUdbakcxfgkakIdbJbbjZMUdbaoclfhoarcxfhrawcufgwmbkkdnaeTmbavhraehkinarcxfgoIdbhDaocbBdbararIdbJbbbbJbbjZaD:vaDJbbbb9BEgDNUdbarclfgoaDaoIdbNUdbarcwfgoaDaoIdbNUdbarczfhrakcufgkmbkkdnalTmbinavadydbcltfgrcxfgkaicwfIdbarcwfIdb:tgDaDNaiIdbarIdb:tgDaDNaiclfIdbarclfIdb:tgDaDNMMgDakIdbgqaqaD9DEUdbadclfhdaicxfhialcufglmbkkdnaeTmbavcxfhrinabarIdbUdbarczfhrabclfhbaecufgembkkk:moerudnaoTmbaecd4hzdnavTmbaicd4hHavcdthOcbhAindnaPaAfRbbTmbaAhednaDTmbaDaAcdtfydbhekdnasTmbasaefRbbceGmekdnamaAfRbbclSmbabaeaz2cdtfgiaraAcx2fgCIdbakNaxIdbMUdbaiaCIdlakNaxIdlMUdlaiaCIdwakNaxIdwMUdwkadaeaH2cdtfhXaqheawhiavhCinaXaeydbcdtgQfaiIdbalaQfIdb:vUdbaeclfheaiclfhiaCcufgCmbkkawaOfhwaAcefgAao9hmbxdkkdnasmbcbheaDhiindnaPaefRbbTmbaehCdnaDTmbaiydbhCkamaefRbbclSmbabaCaz2cdtfgCarIdbakNaxIdbMUdbaCarclfIdbakNaxIdlMUdlaCarcwfIdbakNaxIdwMUdwkaiclfhiarcxfhraoaecefge9hmbxdkkdnaDTmbindnaPRbbTmbasaDydbgefRbbceGmbamRbbclSmbabaeaz2cdtfgearIdbakNaxIdbMUdbaearclfIdbakNaxIdlMUdlaearcwfIdbakNaxIdwMUdwkaPcefhPaDclfhDamcefhmarcxfhraocufgombxdkkazcdthicbheindnaPaefRbbTmbasaefRbbceGmbamaefRbbclSmbabarIdbakNaxIdbMUdbabclfarclfIdbakNaxIdlMUdbabcwfarcwfIdbakNaxIdwMUdbkarcxfhrabaifhbaoaecefge9hmbkkk8MbabaeadaialavcbcbcbcbcbaoarawaDz:bjjjbk8MbabaeadaialavaoarawaDaqakaxamaPz:bjjjbkRbababaeadaialavaoarawaDaqakaxcjjjjdVamz:bjjjbk:d8Koque99due99duq998Jjjjjbc;Wb9Rgq8Kjjjjbcbhkaqcxfcbc;Kbz:tjjjb8Aaqcualcx2alc;v:Q;v:Qe0Ecbyd1:jjjbHjjjjbbgxBdxaqceBd2axaialavcbcbz:ejjjb8AaqcualcdtalcFFFFi0Egmcbyd1:jjjbHjjjjbbgiBdzaqcdBd2dndnJFF959eJbbjZawJbbjZawJbbjZ9DE:vawJ9VO:d869DEgw:lJbbb9p9DTmbaw:OhPxekcjjjj94hPkadci9Uhsarco9UhzdndnaombaPcd9imekdnalTmbaPcuf:YhwdnaoTmbcbhvaihHaxhOindndnaoavfRbbceGTmbavcjjjjlVhAxekdndnaOclfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhAxekcjjjj94hAkaAcqthAdndnaOcwfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaAaXVhAdndnaOIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaAaXcCtVhAkaHaABdbaHclfhHaOcxfhOalavcefgv9hmbxdkkaxhvaihOalhHindndnavIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhAxekcjjjj94hAkaAcCthAdndnavclfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaXcqtaAVhAdndnavcwfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaOaAaXVBdbavcxfhvaOclfhOaHcufgHmbkkadTmbcbhkaehvcbhOinakaiavclfydbcdtfydbgHaiavcwfydbcdtfydbgA9haiavydbcdtfydbgXaH9haXaA9hGGfhkavcxfhvaOcifgOad6mbkkarci9UhQdndnaz:Z:rJbbbZMgw:lJbbb9p9DTmbaw:Ohvxekcjjjj94hvkaQ:ZhLcbhKc:bwhzdninakaQ9pmeazaP9Rcd9imeavazcufavaz9iEaPcefavaP9kEhYdnalTmbaYcuf:YhwdnaoTmbcbhOaihHaxhvindndnaoaOfRbbceGTmbaOcjjjjlVhAxekdndnavclfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhAxekcjjjj94hAkaAcqthAdndnavcwfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaAaXVhAdndnavIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaAaXcCtVhAkaHaABdbaHclfhHavcxfhvalaOcefgO9hmbxdkkaxhvaihOalhHindndnavIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhAxekcjjjj94hAkaAcCthAdndnavclfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaXcqtaAVhAdndnavcwfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaOaAaXVBdbavcxfhvaOclfhOaHcufgHmbkkcbhOdnadTmbaehvcbhHinaOaiavclfydbcdtfydbgAaiavcwfydbcdtfydbgX9haiavydbcdtfydbgraA9haraX9hGGfhOavcxfhvaHcifgHad6mbkkJbbbbh8Adnas:ZgCaL:taY:Ygwaz:Y:tgENak:Zg3aO:Zg5:tNa3aL:tawaP:Y:tg8ENa5aC:tNMg8FJbbbb9BmbaCa3:ta8EaEa5aL:tNNNa8F:vh8AkdndnaOaQ0mbaOhkaYhPxekaOhsaYhzkdndnaKcl0mbdna8AawMJbbbZMgw:lJbbb9p9DTmbaw:Ohvxdkcjjjj94hvxekaPazfcd9ThvkaKcefgKcs9hmbkkdndndnakmbJbbjZhwcbhicdhvaDmexdkalcd4alfhHcehOinaOgvcethOavaH6mbkcbhOaqcuavcdtgYavcFFFFi0Ecbyd1:jjjbHjjjjbbgKBdCaqciBd2aqamcbyd1:jjjbHjjjjbbgzBdKaqclBd2dndndndnalTmbaPcuf:YhwaoTmecbhOaihAaxhHindndnaoaOfRbbceGTmbaOcjjjjlVhXxekdndnaHclfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaXcqthXdndnaHcwfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:Ohrxekcjjjj94hrkaXarVhXdndnaHIdbawNJbbbZMgC:lJbbb9p9DTmbaC:Ohrxekcjjjj94hrkaXarcCtVhXkaAaXBdbaAclfhAaHcxfhHalaOcefgO9hmbxikkaKcFeaYz:tjjjb8AcbhPcbhvxdkaxhOaihHalhAindndnaOIdbawNJbbbZMgC:lJbbb9p9DTmbaC:OhXxekcjjjj94hXkaXcCthXdndnaOclfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:Ohrxekcjjjj94hrkarcqtaXVhXdndnaOcwfIdbawNJbbbZMgC:lJbbb9p9DTmbaC:Ohrxekcjjjj94hrkaHaXarVBdbaOcxfhOaHclfhHaAcufgAmbkkaKcFeaYz:tjjjbhravcufhocbhPcbhYindndndnaraiaYcdtgKfydbgAcm4aA7c:v;t;h;Ev2gvcs4av7aoGgHcdtfgXydbgOcuSmbcehvinaiaOcdtgOfydbaASmdaHavfhOavcefhvaraOaoGgHcdtfgXydbgOcu9hmbkkaXaYBdbaPhvaPcefhPxekazaOfydbhvkazaKfavBdbaYcefgYal9hmbkcuaPc8S2gOaPc;D;O;f8U0Ehvkcbhraqavcbyd1:jjjbHjjjjbbgvBd3aqcvBd2avcbaOz:tjjjbhOdnadTmbaehiinJbbnnJbbjZazaiydbgAcdtfydbgvazaiclfydbgHcdtfydbgYSavazaicwfydbgXcdtfydbgKSGgoEh8EdnaxaHcx2fgHIdbaxaAcx2fgAIdbg5:tgCaxaXcx2fgXIdlaAIdlg8A:tgwNaXIdba5:tg3aHIdla8A:tg8FN:tgLaLNa8FaXIdwaAIdwgE:tgaNawaHIdwaE:tg8FN:tgwawNa8Fa3NaaaCN:tgCaCNMM:rg3Jbbbb9ETmbaLa3:vhLaCa3:vhCawa3:vhwkaOavc8S2fgvavIdbawa8Ea3:rNg3awNNg8FMUdbavaCa3aCNgaNghavIdlMUdlavaLa3aLNg8ENggavIdwMUdwavaaawNgaavIdxMUdxava8EawNg8JavIdzMUdzava8EaCNg8EavIdCMUdCavawa3aLaENawa5Na8AaCNMM:mg8ANg5NgwavIdKMUdKavaCa5NgCavId3MUd3avaLa5NgLavIdaMUdaava5a8ANg5avId8KMUd8Kava3avIdyMUdydnaombaOaYc8S2fgva8FavIdbMUdbavahavIdlMUdlavagavIdwMUdwavaaavIdxMUdxava8JavIdzMUdzava8EavIdCMUdCavawavIdKMUdKavaCavId3MUd3avaLavIdaMUdaava5avId8KMUd8Kava3avIdyMUdyaOaKc8S2fgva8FavIdbMUdbavahavIdlMUdlavagavIdwMUdwavaaavIdxMUdxava8JavIdzMUdzava8EavIdCMUdCavawavIdKMUdKavaCavId3MUd3avaLavIdaMUdaava5avId8KMUd8Kava3avIdyMUdykaicxfhiarcifgrad6mbkkcbhAaqcuaPcdtgvaPcFFFFi0Egicbyd1:jjjbHjjjjbbgHBdaaqcoBd2aqaicbyd1:jjjbHjjjjbbgiBd8KaqcrBd2aHcFeavz:tjjjbhYdnalTmbazhHinJbbbbJbbjZaOaHydbgXc8S2fgvIdygw:vawJbbbb9BEavIdwaxcwfIdbgwNavIdzaxIdbgCNavIdaMgLaLMMawNavIdlaxclfIdbgLNavIdCawNavId3MgwawMMaLNavIdbaCNavIdxaLNavIdKMgwawMMaCNavId8KMMM:lNhwdndnaYaXcdtgvfgXydbcuSmbaiavfIdbaw9ETmekaXaABdbaiavfawUdbkaHclfhHaxcxfhxalaAcefgA9hmbkkJbbbbhwdnaPTmbinaiIdbgCawawaC9DEhwaiclfhiaPcufgPmbkkakcd4akfhOcehiinaigvcethiavaO6mbkcbhiaqcuavcdtgOavcFFFFi0Ecbyd1:jjjbHjjjjbbgHBdyaHcFeaOz:tjjjbhXdnadTmbavcufhrcbhPcbhxindnazaeaxcdtfgvydbcdtfydbgiazavclfydbcdtfydbgOSmbaiazavcwfydbcdtfydbgvSmbaOavSmbaYavcdtfydbhAdndnaYaOcdtfydbgvaYaicdtfydbgi9pmbavaA9pmbaAhlaihoavhAxekdnaAai9pmbaAav9pmbaihlavhoxekavhlaAhoaihAkabaPcx2fgvaABdbavcwfaoBdbavclfalBdbdnaXaoc:3F;N8N2alc:F:b:DD27aAc;D;O:B8J27arGgOcdtfgvydbgicuSmbcehHinaHhvdnabaicx2fgiydbaA9hmbaiydlal9hmbaiydwaoSmikavcefhHaXaOavfarGgOcdtfgvydbgicu9hmbkkavaPBdbaPcefhPkaxcifgxad6mbkaPci2hikdnaDmbcwhvxdkaw:rhwcwhvkaDawUdbkavcdthvdninavTmeavc98fgvaqcxffydbcbyd:m:jjjbH:bjjjbbxbkkaqc;Wbf8Kjjjjbaik:2ldwue9:8Jjjjjbc;Wb9Rgr8Kjjjjbcbhwarcxfcbc;Kbz:tjjjb8AdnabaeSmbabaeadcdtzMjjjb8AkarcualcdtalcFFFFi0EgDcbyd1:jjjbHjjjjbbgqBdxarceBd2aqcbaialavcbarcxfz:djjjbcualcx2alc;v:Q;v:Qe0Ecbyd1:jjjbHjjjjbbhkarcxfaryd2gxcdtgmfakBdbaraxcefgPBd2akaialavcbcbz:ejjjb8AarcxfaPcdtfaDcbyd1:jjjbHjjjjbbgvBdbaraxcdfgiBd2arcxfaicdtfcuavalaeadaqz:fjjjbgecltaecjjjjiGEcbyd1:jjjbHjjjjbbgiBdbaiaeavakalz:gjjjbdnadTmbaoaoNhocbhwabhlcbhkindnaiavalydbgecdtfydbcdtfIdbao9ETmbalclf8PdbhsabawcdtfgqaeBdbaqclfas83dbawcifhwkalcxfhlakcifgkad6mbkkaxcifhlamarcxffcwfhkdninalTmeakydbcbyd:m:jjjbH:bjjjbbakc98fhkalcufhlxbkkarc;Wbf8Kjjjjbawk:XCoDud99vue99vuo998Jjjjjbc;Wb9Rgw8KjjjjbdndnarmbcbhDxekawcxfcbc;Kbz:tjjjb8Aawcuadcx2adc;v:Q;v:Qe0Ecbyd1:jjjbHjjjjbbgqBdxawceBd2aqaeadaicbcbz:ejjjb8AawcuadcdtadcFFFFi0Egkcbyd1:jjjbHjjjjbbgxBdzawcdBd2adcd4adfhmceheinaegicetheaiam6mbkcbhPawcuaicdtgsaicFFFFi0Ecbyd1:jjjbHjjjjbbgzBdCawciBd2dndnar:ZgH:rJbbbZMgO:lJbbb9p9DTmbaO:Ohexekcjjjj94hekaicufhAc:bwhDcbhCadhXcbhQinaeaDcufaeaD9iEaPcefaeaP9kEhLdndnadTmbaLcuf:YhOaqhiaxheadhmindndnaiIdbaONJbbbZMgK:lJbbb9p9DTmbaK:OhYxekcjjjj94hYkaYcCthYdndnaiclfIdbaONJbbbZMgK:lJbbb9p9DTmbaK:Oh8Axekcjjjj94h8Aka8AcqtaYVhYdndnaicwfIdbaONJbbbZMgK:lJbbb9p9DTmbaK:Oh8Axekcjjjj94h8AkaeaYa8AVBdbaicxfhiaeclfheamcufgmmbkazcFeasz:tjjjbhEcbh3cbh5indnaEaxa5cdtfydbgYcm4aY7c:v;t;h;Ev2gics4ai7aAGgmcdtfg8AydbgecuSmbaeaYSmbcehiinaEamaifaAGgmcdtfg8AydbgecuSmeaicefhiaeaY9hmbkka8AaYBdba3aecuSfh3a5cefg5ad9hmbxdkkazcFeasz:tjjjb8Acbh3kJbbbbh8EdnaX:ZgKaH:taL:YgOaD:Y:tg8FNaC:Zgaa3:Zgh:tNaaaH:taOaP:Y:tggNahaK:tNMg8JJbbbb9BmbaKaa:taga8FahaH:tNNNa8J:vh8EkaPaLa3ar0giEhPaCa3aiEhCdna3arSmbaLaDaiEgDaP9Rcd9imbdndnaQcl0mbdna8EaOMJbbbZMgO:lJbbb9p9DTmbaO:Ohexdkcjjjj94hexekaPaDfcd9Theka3aXaiEhXaQcefgQcs9hmekkdndnaCmbcihicbhDxekcbhiawakcbyd1:jjjbHjjjjbbg5BdKawclBd2aPcuf:YhKdndnadTmbaqhiaxheadhmindndnaiIdbaKNJbbbZMgO:lJbbb9p9DTmbaO:OhYxekcjjjj94hYkaYcCthYdndnaiclfIdbaKNJbbbZMgO:lJbbb9p9DTmbaO:Oh8Axekcjjjj94h8Aka8AcqtaYVhYdndnaicwfIdbaKNJbbbZMgO:lJbbb9p9DTmbaO:Oh8Axekcjjjj94h8AkaeaYa8AVBdbaicxfhiaeclfheamcufgmmbkazcFeasz:tjjjbhEcbhDcbh3indndndnaEaxa3cdtgLfydbgYcm4aY7c:v;t;h;Ev2gics4ai7aAGgmcdtfg8AydbgecuSmbcehiinaxaecdtgefydbaYSmdamaifheaicefhiaEaeaAGgmcdtfg8Aydbgecu9hmbkka8Aa3BdbaDhiaDcefhDxeka5aefydbhika5aLfaiBdba3cefg3ad9hmbkcuaDc32giaDc;j:KM;jb0EhexekazcFeasz:tjjjb8AcbhDcbhekawaecbyd1:jjjbHjjjjbbgeBd3awcvBd2aecbaiz:tjjjbh8Aavcd4hxdnadTmbdnalTmbaxcdthEa5hYaqhealhmadhAina8AaYydbc32fgiaeIdbaiIdbMUdbaiaeclfIdbaiIdlMUdlaiaecwfIdbaiIdwMUdwaiamIdbaiIdxMUdxaiamclfIdbaiIdzMUdzaiamcwfIdbaiIdCMUdCaiaiIdKJbbjZMUdKaYclfhYaecxfheamaEfhmaAcufgAmbxdkka5hmaqheadhYina8Aamydbc32fgiaeIdbaiIdbMUdbaiaeclfIdbaiIdlMUdlaiaecwfIdbaiIdwMUdwaiaiIdxJbbbbMUdxaiaiIdzJbbbbMUdzaiaiIdCJbbbbMUdCaiaiIdKJbbjZMUdKamclfhmaecxfheaYcufgYmbkkdnaDTmba8AhiaDheinaiaiIdbJbbbbJbbjZaicKfIdbgO:vaOJbbbb9BEgONUdbaiclfgmaOamIdbNUdbaicwfgmaOamIdbNUdbaicxfgmaOamIdbNUdbaiczfgmaOamIdbNUdbaicCfgmaOamIdbNUdbaic3fhiaecufgembkkcbhYawcuaDcdtgLaDcFFFFi0Egicbyd1:jjjbHjjjjbbgeBdaawcoBd2awaicbyd1:jjjbHjjjjbbgEBd8KaecFeaLz:tjjjbh3dnadTmbJbbjZJbbjZaK:vaPceSEaoNgOaONhKaxcdthxalheinaKaec;81jjbalEgmIdwa8Aa5ydbgAc32fgiIdC:tgOaONamIdbaiIdx:tgOaONamIdlaiIdz:tgOaONMMNaqcwfIdbaiIdw:tgOaONaqIdbaiIdb:tgOaONaqclfIdbaiIdl:tgOaONMMMhOdndna3aAcdtgifgmydbcuSmbaEaifIdbaO9ETmekamaYBdbaEaifaOUdbka5clfh5aqcxfhqaeaxfheadaYcefgY9hmbkkaba3aLzMjjjb8AcrhikaicdthiinaiTmeaic98fgiawcxffydbcbyd:m:jjjbH:bjjjbbxbkkawc;Wbf8KjjjjbaDk:Ydidui99ducbhi8Jjjjjbca9Rglczfcwfcbyd11jjbBdbalcb8Pdj1jjb83izalcwfcbydN1jjbBdbalcb8Pd:m1jjb83ibdndnaembJbbjFhvJbbjFhoJbbjFhrxekadcd4cdthwincbhdinalczfadfgDabadfIdbgvaDIdbgoaoav9EEUdbaladfgDavaDIdbgoaoav9DEUdbadclfgdcx9hmbkabawfhbaicefgiae9hmbkalIdwalIdK:thralIdlalIdC:thoalIdbalIdz:thvkJbbbbavavJbbbb9DEgvaoaoav9DEgvararav9DEk9DeeuabcFeaicdtz:tjjjbhlcbhbdnadTmbindnalaeydbcdtfgiydbcu9hmbaiabBdbabcefhbkaeclfheadcufgdmbkkabk;7idqui998Jjjjjbc;Wb9Rgl8Kjjjjbalcxfcbc;Kbz:tjjjb8Aadcd4adfhvcehoinaogrcethoarav6mbkalcuarcdtgoarcFFFFi0Ecbyd1:jjjbHjjjjbbgvBdxavcFeaoz:tjjjbhwdnadTmbaicd4hDarcufhqcbhkindndnawcbaeakaD2cdtfgrydlgiaicjjjj94SEgocH4ao7c:F:b:DD2cbarydbgxaxcjjjj94SEgocH4ao7c;D;O:B8J27cbarydwgmamcjjjj94SEgrcH4ar7c:3F;N8N27aqGgvcdtfgrydbgocuSmbam::hPai::hsax::hzcehiinaihrdnaeaoaD2cdtfgiIdbaz9CmbaiIdlas9CmbaiIdwaP9BmikarcefhiawavarfaqGgvcdtfgrydbgocu9hmbkkarakBdbakhokabakcdtfaoBdbakcefgkad9hmbkkcbhrdninarc98Smealcxfarfydbcbyd:m:jjjbH:bjjjbbarc98fhrxbkkalc;Wbf8Kjjjjbk9teiucbcbyd:q:jjjbgeabcifc98GfgbBd:q:jjjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;teeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiaeydlBdlaiaeydwBdwaiaeydxBdxaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk:3eedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdxaialBdwaialBdlaialBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabk9teiucbcbyd:q:jjjbgeabcrfc94GfgbBd:q:jjjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikTeeucbabcbyd:q:jjjbge9Rcifc98GaefgbBd:q:jjjbdnabZbcztge9nmbabae9RcFFifcz4nb8Akkk:Iedbcjwk1eFFuuFFuuFFuuFFuFFFuFFFuFbbbbbbbbebbbdbbbbbbbebbbebbbdbbbbbbbbbbbeeeeebebbebbebebbbeebbbbbbbbbbbbeeeeeebebbeeebeebbbbebebbbbbbbbbbbbbbbbbbc1Dkxebbbdbbb:GNbb", e = new Uint8Array([
    32,
    0,
    65,
    2,
    1,
    106,
    34,
    33,
    3,
    128,
    11,
    4,
    13,
    64,
    6,
    253,
    10,
    7,
    15,
    116,
    127,
    5,
    8,
    12,
    40,
    16,
    19,
    54,
    20,
    9,
    27,
    255,
    113,
    17,
    42,
    67,
    24,
    23,
    146,
    148,
    18,
    14,
    22,
    45,
    70,
    69,
    56,
    114,
    101,
    21,
    25,
    63,
    75,
    136,
    108,
    28,
    118,
    29,
    73,
    115
  ]);
  if (typeof WebAssembly != "object")
    return {
      supported: !1
    };
  var a, n = WebAssembly.instantiate(r(t), {}).then(function(b) {
    a = b.instance, a.exports.__wasm_call_ctors();
  });
  function r(b) {
    for (var y = new Uint8Array(b.length), w = 0; w < b.length; ++w) {
      var x = b.charCodeAt(w);
      y[w] = x > 96 ? x - 97 : x > 64 ? x - 39 : x + 4;
    }
    for (var M = 0, w = 0; w < b.length; ++w)
      y[M++] = y[w] < 60 ? e[y[w]] : (y[w] - 60) * 64 + y[++w];
    return y.buffer.slice(0, M);
  }
  function i(b) {
    if (!b)
      throw new Error("Assertion failed");
  }
  function s(b) {
    return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  }
  function o(b, y, w, x) {
    var M = a.exports.sbrk, U = M(w * 4), h = M(w * x * 4), g = new Uint8Array(a.exports.memory.buffer);
    g.set(s(y), h), b(U, h, w, x * 4), g = new Uint8Array(a.exports.memory.buffer);
    var v = new Uint32Array(w);
    return new Uint8Array(v.buffer).set(g.subarray(U, U + w * 4)), M(U - M(0)), v;
  }
  function c(b, y, w) {
    var x = a.exports.sbrk, M = x(y.length * 4), U = x(w * 4), h = new Uint8Array(a.exports.memory.buffer), g = s(y);
    h.set(g, M);
    var v = b(U, M, y.length, w);
    h = new Uint8Array(a.exports.memory.buffer);
    var k = new Uint32Array(w);
    new Uint8Array(k.buffer).set(h.subarray(U, U + w * 4)), g.set(h.subarray(M, M + y.length * 4)), x(M - x(0));
    for (var E = 0; E < y.length; ++E) y[E] = k[y[E]];
    return [k, v];
  }
  function d(b) {
    for (var y = 0, w = 0; w < b.length; ++w) {
      var x = b[w];
      y = y < x ? x : y;
    }
    return y;
  }
  function l(b, y, w, x, M, U, h, g, v) {
    var k = a.exports.sbrk, E = k(4), L = k(w * 4), O = k(M * U), A = k(w * 4), P = new Uint8Array(a.exports.memory.buffer);
    P.set(s(x), O), P.set(s(y), A);
    var B = b(L, A, w, O, M, U, h, g, v, E);
    P = new Uint8Array(a.exports.memory.buffer);
    var D = new Uint32Array(B);
    s(D).set(P.subarray(L, L + B * 4));
    var W = new Float32Array(1);
    return s(W).set(P.subarray(E, E + 4)), k(E - k(0)), [D, W[0]];
  }
  function f(b, y, w, x, M, U, h, g, v, k, E, L, O) {
    var A = a.exports.sbrk, P = A(4), B = A(w * 4), D = A(M * U), W = A(M * g), Z = A(v.length * 4), ge = A(w * 4), $ = k ? A(M) : 0, K = new Uint8Array(a.exports.memory.buffer);
    K.set(s(x), D), K.set(s(h), W), K.set(s(v), Z), K.set(s(y), ge), k && K.set(s(k), $);
    var de = b(
      B,
      ge,
      w,
      D,
      M,
      U,
      W,
      g,
      Z,
      v.length,
      $,
      E,
      L,
      O,
      P
    );
    K = new Uint8Array(a.exports.memory.buffer);
    var Xe = new Uint32Array(de);
    s(Xe).set(K.subarray(B, B + de * 4));
    var Ba = new Float32Array(1);
    return s(Ba).set(K.subarray(P, P + 4)), A(P - A(0)), [Xe, Ba[0]];
  }
  function m(b, y, w, x, M, U, h, g, v, k, E, L, O) {
    var A = a.exports.sbrk, P = A(4), B = A(M * U), D = A(M * g), W = A(v.length * 4), Z = A(w * 4), ge = k ? A(M) : 0, $ = new Uint8Array(a.exports.memory.buffer);
    $.set(s(x), B), $.set(s(h), D), $.set(s(v), W), $.set(s(y), Z), k && $.set(s(k), ge);
    var K = b(
      Z,
      w,
      B,
      M,
      U,
      D,
      g,
      W,
      v.length,
      ge,
      E,
      L,
      O,
      P
    );
    $ = new Uint8Array(a.exports.memory.buffer), s(y).set($.subarray(Z, Z + K * 4)), s(x).set($.subarray(B, B + M * U)), s(h).set($.subarray(D, D + M * g));
    var de = new Float32Array(1);
    return s(de).set($.subarray(P, P + 4)), A(P - A(0)), [K, de[0]];
  }
  function p(b, y, w, x) {
    var M = a.exports.sbrk, U = M(w * x), h = new Uint8Array(a.exports.memory.buffer);
    h.set(s(y), U);
    var g = b(U, w, x);
    return M(U - M(0)), g;
  }
  function I(b, y, w, x, M, U, h, g) {
    var v = a.exports.sbrk, k = v(g * 4), E = v(w * x), L = v(w * U), O = new Uint8Array(a.exports.memory.buffer);
    O.set(s(y), E), M && O.set(s(M), L);
    var A = b(k, E, w, x, L, U, h, g);
    O = new Uint8Array(a.exports.memory.buffer);
    var P = new Uint32Array(A);
    return s(P).set(O.subarray(k, k + A * 4)), v(k - v(0)), P;
  }
  function S(b, y, w, x, M, U, h, g, v) {
    var k = a.exports.sbrk, E = k(4), L = k(w * 4), O = k(M * U), A = k(w * 4), P = h ? k(M) : 0, B = new Uint8Array(a.exports.memory.buffer);
    B.set(s(x), O), B.set(s(y), A), h && B.set(s(h), P);
    var D = b(L, A, w, O, M, U, P, g, v, E);
    B = new Uint8Array(a.exports.memory.buffer);
    var W = new Uint32Array(D);
    s(W).set(B.subarray(L, L + D * 4));
    var Z = new Float32Array(1);
    return s(Z).set(B.subarray(E, E + 4)), k(E - k(0)), [W, Z[0]];
  }
  function N(b, y, w, x, M, U, h) {
    var g = a.exports.sbrk, v = g(w * 4), k = g(M * U), E = g(w * 4), L = new Uint8Array(a.exports.memory.buffer);
    L.set(s(x), k), L.set(s(y), E);
    var O = b(v, E, w, k, M, U, h);
    L = new Uint8Array(a.exports.memory.buffer);
    var A = new Uint32Array(O);
    return s(A).set(L.subarray(v, v + O * 4)), g(v - g(0)), A;
  }
  var C = {
    LockBorder: 1,
    Sparse: 2,
    ErrorAbsolute: 4,
    Prune: 8,
    Regularize: 16,
    Permissive: 32,
    _InternalDebug: 1 << 30
    // internal, don't use!
  };
  return {
    ready: n,
    supported: !0,
    compactMesh: function(b) {
      i(
        b instanceof Uint32Array || b instanceof Int32Array || b instanceof Uint16Array || b instanceof Int16Array
      ), i(b.length % 3 == 0);
      var y = b.BYTES_PER_ELEMENT == 4 ? b : new Uint32Array(b);
      return c(a.exports.meshopt_optimizeVertexFetchRemap, y, d(b) + 1);
    },
    generatePositionRemap: function(b, y) {
      return i(b instanceof Float32Array), i(b.length % y == 0), i(y >= 3), o(
        a.exports.meshopt_generatePositionRemap,
        b,
        b.length / y,
        y
      );
    },
    simplify: function(b, y, w, x, M, U) {
      i(
        b instanceof Uint32Array || b instanceof Int32Array || b instanceof Uint16Array || b instanceof Int16Array
      ), i(b.length % 3 == 0), i(y instanceof Float32Array), i(y.length % w == 0), i(w >= 3), i(x >= 0 && x <= b.length), i(x % 3 == 0), i(M >= 0);
      for (var h = 0, g = 0; g < (U ? U.length : 0); ++g)
        i(U[g] in C), h |= C[U[g]];
      var v = b.BYTES_PER_ELEMENT == 4 ? b : new Uint32Array(b), k = l(
        a.exports.meshopt_simplify,
        v,
        b.length,
        y,
        y.length / w,
        w * 4,
        x,
        M,
        h
      );
      return k[0] = b instanceof Uint32Array ? k[0] : new b.constructor(k[0]), k;
    },
    simplifyWithAttributes: function(b, y, w, x, M, U, h, g, v, k) {
      i(
        b instanceof Uint32Array || b instanceof Int32Array || b instanceof Uint16Array || b instanceof Int16Array
      ), i(b.length % 3 == 0), i(y instanceof Float32Array), i(y.length % w == 0), i(w >= 3), i(x instanceof Float32Array), i(x.length == M * (y.length / w)), i(M >= 0), i(h == null || h instanceof Uint8Array), i(h == null || h.length == y.length / w), i(g >= 0 && g <= b.length), i(g % 3 == 0), i(v >= 0), i(Array.isArray(U)), i(M >= U.length), i(U.length <= 32);
      for (var E = 0; E < U.length; ++E)
        i(U[E] >= 0);
      for (var L = 0, E = 0; E < (k ? k.length : 0); ++E)
        i(k[E] in C), L |= C[k[E]];
      var O = b.BYTES_PER_ELEMENT == 4 ? b : new Uint32Array(b), A = f(
        a.exports.meshopt_simplifyWithAttributes,
        O,
        b.length,
        y,
        y.length / w,
        w * 4,
        x,
        M * 4,
        new Float32Array(U),
        h,
        g,
        v,
        L
      );
      return A[0] = b instanceof Uint32Array ? A[0] : new b.constructor(A[0]), A;
    },
    simplifyWithUpdate: function(b, y, w, x, M, U, h, g, v, k) {
      i(
        b instanceof Uint32Array || b instanceof Int32Array || b instanceof Uint16Array || b instanceof Int16Array
      ), i(b.length % 3 == 0), i(y instanceof Float32Array), i(y.length % w == 0), i(w >= 3), i(x instanceof Float32Array), i(x.length == M * (y.length / w)), i(M >= 0), i(h == null || h instanceof Uint8Array), i(h == null || h.length == y.length / w), i(g >= 0 && g <= b.length), i(g % 3 == 0), i(v >= 0), i(Array.isArray(U)), i(M >= U.length), i(U.length <= 32);
      for (var E = 0; E < U.length; ++E)
        i(U[E] >= 0);
      for (var L = 0, E = 0; E < (k ? k.length : 0); ++E)
        i(k[E] in C), L |= C[k[E]];
      var O = b.BYTES_PER_ELEMENT == 4 ? b : new Uint32Array(b), A = m(
        a.exports.meshopt_simplifyWithUpdate,
        O,
        b.length,
        y,
        y.length / w,
        w * 4,
        x,
        M * 4,
        new Float32Array(U),
        h,
        g,
        v,
        L
      );
      if (b !== O)
        for (var E = 0; E < A[0]; ++E)
          b[E] = O[E];
      return A;
    },
    getScale: function(b, y) {
      return i(b instanceof Float32Array), i(b.length % y == 0), i(y >= 3), p(
        a.exports.meshopt_simplifyScale,
        b,
        b.length / y,
        y * 4
      );
    },
    simplifyPoints: function(b, y, w, x, M, U) {
      return i(b instanceof Float32Array), i(b.length % y == 0), i(y >= 3), i(w >= 0 && w <= b.length / y), x ? (i(x instanceof Float32Array), i(x.length % M == 0), i(M >= 3), i(b.length / y == x.length / M), I(
        a.exports.meshopt_simplifyPoints,
        b,
        b.length / y,
        y * 4,
        x,
        M * 4,
        U,
        w
      )) : I(
        a.exports.meshopt_simplifyPoints,
        b,
        b.length / y,
        y * 4,
        void 0,
        0,
        0,
        w
      );
    },
    simplifySloppy: function(b, y, w, x, M, U) {
      i(
        b instanceof Uint32Array || b instanceof Int32Array || b instanceof Uint16Array || b instanceof Int16Array
      ), i(b.length % 3 == 0), i(y instanceof Float32Array), i(y.length % w == 0), i(w >= 3), i(x == null || x instanceof Uint8Array), i(x == null || x.length == y.length / w), i(M >= 0 && M <= b.length), i(M % 3 == 0), i(U >= 0);
      var h = b.BYTES_PER_ELEMENT == 4 ? b : new Uint32Array(b), g = S(
        a.exports.meshopt_simplifySloppy,
        h,
        b.length,
        y,
        y.length / w,
        w * 4,
        x,
        M,
        U
      );
      return g[0] = b instanceof Uint32Array ? g[0] : new b.constructor(g[0]), g;
    },
    simplifyPrune: function(b, y, w, x) {
      i(
        b instanceof Uint32Array || b instanceof Int32Array || b instanceof Uint16Array || b instanceof Int16Array
      ), i(b.length % 3 == 0), i(y instanceof Float32Array), i(y.length % w == 0), i(w >= 3), i(x >= 0);
      var M = b.BYTES_PER_ELEMENT == 4 ? b : new Uint32Array(b), U = N(
        a.exports.meshopt_simplifyPrune,
        M,
        b.length,
        y,
        y.length / w,
        w * 4,
        x
      );
      return U = b instanceof Uint32Array ? U : new b.constructor(U), U;
    }
  };
})();
async function Zn(t) {
  await Yn.ready;
  const e = [], a = /* @__PURE__ */ new Map(), n = new Uint32Array(t.length / 6);
  for (let o = 0; o < n.length; o++) {
    const c = [...t.subarray(o * 6, o * 6 + 3)], d = c.map((f) => Math.round(f * 1e5)).join(",");
    let l = a.get(d);
    l === void 0 && (l = e.length / 3, a.set(d, l), e.push(...c)), n[o] = l;
  }
  const r = new Float32Array(e), [i] = Yn.simplify(n, r, 3, 384 * 3, 0.01), s = new Float32Array(i.length * 6);
  return i.forEach((o, c) => s.set(r.subarray(o * 3, o * 3 + 3), c * 6)), s;
}
function Qn(t) {
  if (!t.length || t.length % 18 !== 0) throw new Error("Invalid STL vertex buffer");
  const e = t.length / 18, a = new Float32Array(e * 6), n = new Float32Array(e * 3);
  for (let c = 0; c < e; c++)
    for (let d = 0; d < 3; d++) {
      const l = t[c * 18 + d], f = t[c * 18 + 6 + d], m = t[c * 18 + 12 + d];
      if (![l, f, m].every(Number.isFinite)) throw new Error("Non-finite STL coordinates");
      a[c * 6 + d] = Math.min(l, f, m) - 1e-5, a[c * 6 + 3 + d] = Math.max(l, f, m) + 1e-5, n[c * 3 + d] = (l + f + m) / 3;
    }
  const r = [], i = [];
  function s(c) {
    const d = r.length / 12, l = [1 / 0, 1 / 0, 1 / 0], f = [-1 / 0, -1 / 0, -1 / 0];
    for (const m of c)
      for (let p = 0; p < 3; p++)
        l[p] = Math.min(l[p], a[m * 6 + p]), f[p] = Math.max(f[p], a[m * 6 + p + 3]);
    if (r.push(...l, 0, ...f, i.length, 0, 0, 0, 0), c.length <= 8)
      r[d * 12 + 8] = c.length, i.push(...c);
    else {
      const m = f.map((S, N) => S - l[N]), p = m.indexOf(Math.max(...m));
      c.sort((S, N) => n[S * 3 + p] - n[N * 3 + p]);
      const I = Math.floor(c.length / 2);
      s(c.slice(0, I)), s(c.slice(I));
    }
    r[d * 12 + 3] = r.length / 12;
  }
  s(Array.from({ length: e }, (c, d) => d));
  const o = new Float32Array(e * 12);
  return i.forEach((c, d) => {
    for (let l = 0; l < 3; l++) {
      const f = t[c * 18 + l];
      o[d * 12 + l] = f, o[d * 12 + 4 + l] = t[c * 18 + 6 + l] - f, o[d * 12 + 8 + l] = t[c * 18 + 12 + l] - f;
    }
  }), { nodes: new Float32Array(r), triangles: o, nodeCount: r.length / 12 };
}
function zf(t, e) {
  if (!e.length || e.length % 18 !== 0 || !e.every(Number.isFinite))
    throw new Error("Invalid fallback mesh");
  const a = new Float32Array(e);
  for (let n = 0; n < a.length; n += 18) {
    const r = a[n + 6] - a[n], i = a[n + 7] - a[n + 1], s = a[n + 8] - a[n + 2], o = a[n + 12] - a[n], c = a[n + 13] - a[n + 1], d = a[n + 14] - a[n + 2], l = i * d - s * c, f = s * o - r * d, m = r * c - i * o, p = Math.hypot(l, f, m) || 1;
    for (let I = 0; I < 3; I++)
      a[n + I * 6 + 3] = l / p, a[n + I * 6 + 4] = f / p, a[n + I * 6 + 5] = m / p;
  }
  return { vertices: a, vertexCount: a.length / 6, triangleCount: a.length / 18, extent: t.extent };
}
function Hf(t, e, a) {
  const n = Math.cos(e), r = Math.sin(e), i = Math.cos(a), s = Math.sin(a);
  function o(d, l, f) {
    const m = d * n + f * r, p = -d * r + f * n;
    return [m, l * i - p * s, l * s + p * i];
  }
  const c = [];
  for (let d = 0; d < t.triangleCount; d++) {
    const l = d * 18, f = [];
    let m = 0;
    for (let p = 0; p < 3; p++) {
      const I = l + p * 6, [S, N, C] = o(t.vertices[I], t.vertices[I + 1], t.vertices[I + 2]);
      f.push(S, -N), m += C;
    }
    c.push({
      z: m / 3,
      points: f,
      normal: o(t.vertices[l + 3], t.vertices[l + 4], t.vertices[l + 5])
    });
  }
  return c.sort((d, l) => d.z - l.z);
}
const ie = [
  { id: "monoclinic", code: "MONOCLINIC", label: { zh: "单斜晶体", ja: "単斜晶系", en: "Monoclinic" }, color: "#8b60c8", shape: "polygon(51% 0,76% 0,76% 100%,24% 100%)", source: "8晶体.stl · CLUSTER 01" },
  { id: "isometric", code: "ISOMETRIC", label: { zh: "等轴晶体", ja: "等軸晶系", en: "Isometric" }, color: "#52a9d5", shape: "polygon(50% 0,100% 50%,50% 100%,0 50%)", source: "8晶体.stl · CLUSTER 02" },
  { id: "hexagonal", code: "HEXAGONAL", label: { zh: "六方晶体", ja: "六方晶系", en: "Hexagonal" }, color: "#4e6fc7", shape: "polygon(25% 7%,75% 7%,100% 50%,75% 93%,25% 93%,0 50%)", source: "8晶体.stl · CLUSTER 03" },
  { id: "trigonal", code: "TRIGONAL", label: { zh: "三方晶体", ja: "三方晶系", en: "Trigonal" }, color: "#f0c635", shape: "polygon(0 8%,100% 8%,50% 92%)", source: "8晶体.stl · CLUSTER 04" },
  { id: "triclinic", code: "TRICLINIC", label: { zh: "三斜晶体", ja: "三斜晶系", en: "Triclinic" }, color: "#d95b5f", shape: "polygon(77% 0,89% 100%,11% 100%)", source: "8晶体.stl · CLUSTER 05" },
  { id: "tetragonal", code: "TETRAGONAL", label: { zh: "四方晶体", ja: "正方晶系", en: "Tetragonal" }, color: "#47aa51", shape: "polygon(10% 0,90% 0,90% 100%,10% 100%)", source: "8晶体.stl · CLUSTER 06" },
  { id: "square", code: "SQUARE", label: { zh: "正方晶体", ja: "正方結晶", en: "Square" }, color: "#9da43e", shape: "polygon(0 0,100% 0,100% 100%,0 100%)", source: "8晶体.stl · CLUSTER 07" },
  { id: "orthorhombic", code: "ORTHORHOMBIC", label: { zh: "斜方晶体", ja: "斜方晶系", en: "Orthorhombic" }, color: "#a3684f", shape: "polygon(48% 0,96% 0,52% 100%,4% 100%)", source: "8晶体.stl · CLUSTER 08" }
], T = (t) => document.querySelector(t), R = (t) => [...document.querySelectorAll(t)], Gf = [
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
], Vf = [
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
], Wf = [1, 0, 1, 0, 4, 0, 4, 0, 0, 1, 0, 1, 0, 1, 1, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 6, 0, 3, 0, 2, 1, 4, 0, 2, 1, 3, 3, 1, 3, 2, 4, 0, 1, 1, 3], _n = [
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
function qf(t) {
  let e = 0, a = 0, n = 0;
  t < 440 ? (e = (440 - t) / 60, n = 1) : t < 490 ? (a = (t - 440) / 50, n = 1) : t < 510 ? (a = 1, n = (510 - t) / 20) : t < 580 ? (e = (t - 510) / 70, a = 1) : t < 645 ? (e = 1, a = (645 - t) / 65) : e = 1;
  const r = t < 420 ? 0.3 + 0.7 * (t - 380) / 40 : t > 700 ? 0.3 + 0.7 * (720 - t) / 20 : 1, i = 0.8;
  return [Math.pow(Math.max(0, e * r), i), Math.pow(Math.max(0, a * r), i), Math.pow(Math.max(0, n * r), i)];
}
function yi(t) {
  const [e, a, n] = qe(t), r = Math.max(e, a, n), i = Math.min(e, a, n), s = r <= 1e-3 ? 0 : (r - i) / r;
  if (s < 0.12) return { wavelength: 560, purity: 0 };
  const o = [e / r, a / r, n / r];
  let c = 560, d = Number.POSITIVE_INFINITY;
  for (let l = 380; l <= 720; l += 1) {
    const f = qf(l), m = Math.max(...f) || 1, p = f.reduce((I, S, N) => I + Math.pow(S / m - o[N], 2), 0);
    p < d && (d = p, c = l);
  }
  return { wavelength: c, purity: Math.min(1, Math.max(0, s)) };
}
const V = Gf.map((t, e) => {
  const a = yi(_n[e]);
  return {
    name: t,
    cn: Vf[e],
    type: Wf[e],
    color: _n[e],
    wavelength: a.wavelength,
    spectralPurity: a.purity,
    transmission: 0.34 + e * 17 % 55 / 100,
    ior: 1.28 + e * 13 % 70 / 100,
    dispersion: 0.12 + e * 19 % 66 / 100
  };
}), X = {
  zh: { brand: "新-天象图库", modeSample: "样本", modeComposition: "成分", modeSpectrum: "光谱", modeCrystal: "晶系", modeCompare: "对照", camera: "视角", layers: "图层", explain: "解读", filter: "筛选", language: "语言", size: "尺寸", data: "资料", scale: "观察尺度", cosmic: "宇宙", earth: "地球", material: "物质", headline: "把陨石继续放大<br>直到看见晶体", intro: "颜色、晶系与透光不是装饰，它们共同组成一块陨石的微观档案。", dragHint: "拖动旋转 · 滚轮推进 · 点击外环切换矿物", selected: "当前选中", system: "晶体类别", color: "海报色相", transmission: "透光率", refraction: "折射率", simulationNote: "透光率、折射率及代表波长为网页视觉模拟参数，不作为矿物学测量数据。", pin: "固定到对照", optics: "光学模拟", dispersion: "色散", wavelength: "代表波长", compare: "对照", reset: "复位", cameraLead: "不同视角对应不同的晶面阅读方式。", layersLead: "把海报中的视觉变量拆开，单独阅读。", layerRing: "矿物外环", layerGrid: "晶格坐标", layerLabels: "文字标记", layerOptics: "光学色散", explainLead: "原海报负责看见整体；网页负责进入单个晶体并比较它们。", posterCaption: "陨石成分图 / 原始海报比例 3508 × 4962", explainIconTitle: "外环图标", explainIcon: "每个几何图标代表一种陨石矿物；点击后把对应色相、晶体形态和光学参数送入中央模型。", explainColorTitle: "色相与代表波长", explainColor: "无法为每种矿物指定一个固定可见波长；网页把原稿色相匹配为代表波长和色纯度，用于驱动光束与粒子，不改变矿物身份。", explainCoreTitle: "中央晶体", explainCore: "中央展示直接读取 8晶体.stl，并按模型在文件中的空间位置拆成八个真实网格；透明、折射与色散由网页材质实时计算。", explainBoundaryTitle: "数据边界", explainBoundary: "矿物真实光学特征是随波长变化的完整光谱。本页的透光、折射、色散与代表波长均为视觉模拟，不是矿物学实测数据库。", catalogCaption: "平面晶体图标与英文名称对照", filterLead: "按八类源模型或海报色系缩小外环目录。", showAll: "显示全部 / SHOW ALL", sizeLead: "只改变界面信息，不缩放中央晶体。", dataLead: "唯一三维模型源为 8晶体.stl；网页将其中八个空间分组对应到海报的八类晶体。" },
  ja: { brand: "新・天象図庫", modeSample: "標本", modeComposition: "成分", modeSpectrum: "スペクトル", modeCrystal: "晶系", modeCompare: "比較", camera: "視角", layers: "レイヤー", explain: "解説", filter: "選別", language: "言語", size: "サイズ", data: "資料", scale: "観測スケール", cosmic: "宇宙", earth: "地球", material: "物質", headline: "隕石をさらに拡大し<br>結晶まで観察する", intro: "色、晶系、透過性は装飾ではなく、隕石の微視的アーカイブを構成します。", dragHint: "ドラッグで回転 · ホイールで接近 · 外周から鉱物を選択", selected: "選択中", system: "結晶形状", color: "ポスター色", transmission: "透過率", refraction: "屈折率", simulationNote: "透過率と屈折率は視覚シミュレーション用で、鉱物学的な実測値ではありません。", pin: "比較に固定", optics: "光学シミュレーション", dispersion: "分散", wavelength: "波長", compare: "比較", reset: "リセット", cameraLead: "視点ごとに異なる結晶面の読み方を示します。", layersLead: "ポスターの視覚変数を分解して個別に読みます。", layerRing: "鉱物リング", layerGrid: "結晶格子", layerLabels: "ラベル", layerOptics: "光学分散", explainLead: "原ポスターは全体を見せ、ウェブは個別の結晶と比較へ入ります。", posterCaption: "隕石成分図 / 原ポスター比率 3508 × 4962", explainIconTitle: "外周アイコン", explainIcon: "各アイコンは隕石鉱物を表し、選択すると色、形状、光学パラメータが中央モデルへ反映されます。", explainColorTitle: "連続色環", explainColor: "色相は原稿の分類変数です。波長操作は照明応答を変えますが、鉱物の同一性は変えません。", explainCoreTitle: "中央結晶", explainCore: "中央表示は 8晶体.stl を直接読み込み、ファイル内の位置から8つの実メッシュへ分割します。透過・屈折・分散はウェブでリアルタイム計算します。", explainBoundaryTitle: "データ境界", explainBoundary: "透過・屈折・分散は視覚シミュレーションであり、鉱物学的な実測データではありません。", catalogCaption: "平面結晶アイコンと英語名の対応", filterLead: "8つの形状またはポスター色から外周を絞り込みます。", showAll: "すべて表示 / SHOW ALL", sizeLead: "中央結晶を変えず、UI情報だけを拡大します。", dataLead: "唯一の3Dモデルソースは 8晶体.stl。内部の8グループをポスターの8結晶形に対応させます。" },
  en: { brand: "NEW CELESTIAL ARCHIVE", modeSample: "Sample", modeComposition: "Composition", modeSpectrum: "Spectrum", modeCrystal: "Crystal", modeCompare: "Compare", camera: "Camera", layers: "Layers", explain: "Explain", filter: "Filter", language: "Language", size: "UI Size", data: "Data", scale: "Observation Scale", cosmic: "Cosmic", earth: "Earth", material: "Material", headline: "Magnify the meteorite<br>until crystals appear", intro: "Color, crystal form and transmission are not decoration; together they form a microscopic material archive.", dragHint: "Drag to rotate · Wheel to move · Select a mineral on the ring", selected: "Selected", system: "Crystal form", color: "Poster color", transmission: "Transmission", refraction: "Refraction", simulationNote: "Transmission and refraction are visual simulation parameters, not mineralogical measurements.", pin: "Pin to compare", optics: "Optical simulation", dispersion: "Dispersion", wavelength: "Wavelength", compare: "Compare", reset: "Reset", cameraLead: "Each camera preset reveals a different way to read the crystal facets.", layersLead: "Separate the poster's visual variables and read them independently.", layerRing: "Mineral ring", layerGrid: "Lattice grid", layerLabels: "Labels", layerOptics: "Optical dispersion", explainLead: "The poster shows the whole; the web page enters and compares individual crystals.", posterCaption: "Meteorite composition / original poster ratio 3508 × 4962", explainIconTitle: "Outer icons", explainIcon: "Each geometric icon represents a meteorite mineral. Selecting it sends its hue, form and optical parameters to the central model.", explainColorTitle: "Continuous color ring", explainColor: "Hue is a classification variable from the poster. Wavelength changes lighting response without changing mineral identity.", explainCoreTitle: "Central crystal", explainCore: "The center reads 8晶体.stl directly and separates its eight spatial groups into real meshes. Transmission, refraction and dispersion are rendered live.", explainBoundaryTitle: "Data boundary", explainBoundary: "Transmission, refraction and dispersion are visual simulations, not mineralogical measurements.", catalogCaption: "Flat crystal icons and English-name reference", filterLead: "Filter the outer ring by one of eight source forms.", showAll: "Show all", sizeLead: "Change interface scale without resizing the central crystal.", dataLead: "The only 3D source is 8晶体.stl; its eight spatial groups map to the poster's eight crystal forms." }
};
Object.assign(X.zh, {
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
Object.assign(X.ja, {
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
Object.assign(X.en, {
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
Object.assign(X.zh, { layerCaustics: "折射焦散", layerRays: "光谱示意线", qualityTitle: "渲染质量", qualityAuto: "自适应", qualityBalanced: "流畅", qualityHigh: "精细", qualityNote: "真实网格折射 · RGB 色散 · 厚度吸收 · 焦散。自适应模式根据帧率调整分辨率。", retryRenderer: "重试 WebGPU 渲染" });
Object.assign(X.ja, { layerCaustics: "集光模様", layerRays: "スペクトル図解", qualityTitle: "描画品質", qualityAuto: "自動", qualityBalanced: "軽量", qualityHigh: "高精細", qualityNote: "実メッシュ屈折・RGB分散・厚さによる吸収・集光。自動モードは解像度を調整します。", retryRenderer: "WebGPUを再試行" });
Object.assign(X.en, { layerCaustics: "Refracted caustics", layerRays: "Spectrum diagram", qualityTitle: "Render quality", qualityAuto: "Adaptive", qualityBalanced: "Balanced", qualityHigh: "Fine", qualityNote: "Mesh refraction · RGB dispersion · thickness absorption · caustics. Adaptive mode adjusts resolution to frame rate.", retryRenderer: "Retry WebGPU renderer" });
Object.assign(X.zh, { layerStory: "左侧介绍", layerTypeSummary: "当前晶体名称", layerTypeList: "晶体选择列表", rendererFallback: "兼容预览：当前未启用 WebGPU，使用完整简化网格显示晶体；不模拟同等级的折射与焦散。可点击下方按钮重试。", rendererBasic: "兼容预览测试模式。点击下方按钮可尝试启用 WebGPU。", rendererLoadError: "晶体模型未能加载，请检查网络或本地服务后重试。" });
Object.assign(X.ja, { layerStory: "左側の紹介", layerTypeSummary: "選択中の結晶名", layerTypeList: "結晶の選択リスト", rendererFallback: "互換プレビュー：WebGPUが利用できないため、完全な簡略メッシュを表示しています。同等の屈折・集光は再現しません。下のボタンで再試行できます。", rendererBasic: "互換プレビューのテストモードです。下のボタンでWebGPUを再試行できます。", rendererLoadError: "結晶モデルを読み込めません。接続またはローカルサーバーを確認してください。" });
Object.assign(X.en, { layerStory: "Left introduction", layerTypeSummary: "Current crystal name", layerTypeList: "Crystal selector", rendererFallback: "Compatibility preview: WebGPU is not active. The complete simplified mesh is shown, without equivalent refraction or caustics. Retry below.", rendererBasic: "Compatibility preview test mode. Retry below to enable WebGPU.", rendererLoadError: "The crystal model could not load. Check the connection or local server and retry." });
Object.assign(X.zh, { layerInspector: "当前选中卡片" });
Object.assign(X.ja, { layerInspector: "選択中の標本カード" });
Object.assign(X.en, { layerInspector: "Selected material card" });
const Xf = {
  zh: { sampleTitle: "真实样本", sampleBody: "当前矿物使用对应的 STL 晶体网格，拖动观察晶面，滚轮改变距离。", compositionTitle: "成分关系", compositionBody: "相同晶系的矿物被归为一组；颜色来自原海报的分类色相。", spectrumTitle: "光谱响应", spectrumBody: "波长与色散共同改变穿过晶体的光，不改变矿物名称和类别。", crystalTitle: "八个 STL 网格", crystalBody: "点击下方任一网格，直接切换 8晶体.stl 中对应的空间分组。", compareTitle: "并置比较", compareBody: "左侧为当前选择，右侧为已固定样本；两者使用同一个画外光源。", triangles: "三角面", sameType: "同晶系", source: "模型源", slotA: "当前 A", slotB: "固定 B", loading: "正在解析 STL…" },
  ja: { sampleTitle: "実メッシュ標本", sampleBody: "STLの実形状をドラッグして結晶面を観察し、ホイールで距離を変えます。", compositionTitle: "成分関係", compositionBody: "同じ晶系の鉱物をまとめ、原ポスターの色相で分類します。", spectrumTitle: "スペクトル応答", spectrumBody: "波長と分散が透過光を変えますが、鉱物の同一性は変えません。", crystalTitle: "8つのSTLメッシュ", crystalBody: "8晶体.stl 内の空間グループを選択します。", compareTitle: "並置比較", compareBody: "左は現在、右は固定標本。同じ画面外光源で比較します。", triangles: "三角面", sameType: "同晶系", source: "ソース", slotA: "現在 A", slotB: "固定 B", loading: "STLを解析中…" },
  en: { sampleTitle: "Real mesh sample", sampleBody: "The current mineral uses its STL mesh. Drag to inspect facets; use the wheel to change distance.", compositionTitle: "Composition relation", compositionBody: "Minerals sharing a crystal form are grouped; color comes from the poster taxonomy.", spectrumTitle: "Spectral response", spectrumBody: "Wavelength and dispersion alter transmitted light without changing mineral identity.", crystalTitle: "Eight STL meshes", crystalBody: "Choose one spatial cluster parsed from 8晶体.stl.", compareTitle: "Side-by-side", compareBody: "Current and pinned samples share one offscreen light.", triangles: "Triangles", sameType: "Same form", source: "Source", slotA: "Current A", slotB: "Pinned B", loading: "Parsing STL…" }
}, wi = {
  sample: { zh: "01 SAMPLE / 单体材质观察", ja: "01 SAMPLE / 単体材料観察", en: "01 SAMPLE / SINGLE MATERIAL" },
  composition: { zh: "02 COMPOSITION / 成分关系拆解", ja: "02 COMPOSITION / 成分分解", en: "02 COMPOSITION / MATERIAL RELATIONS" },
  spectrum: { zh: "03 SPECTRUM / 波长与色相响应", ja: "03 SPECTRUM / 波長応答", en: "03 SPECTRUM / WAVELENGTH RESPONSE" },
  crystal: { zh: "04 CRYSTAL / 八类源模型", ja: "04 CRYSTAL / 8つの形状", en: "04 CRYSTAL / EIGHT SOURCE FORMS" },
  compare: { zh: "05 COMPARE / 并置比较", ja: "05 COMPARE / 並置比較", en: "05 COMPARE / SIDE-BY-SIDE" }
}, st = T("#crystalCanvas"), se = 34, u = {
  selected: se,
  typeIndex: V[se].type,
  typeSelection: !1,
  color: qe(V[se].color),
  transmission: V[se].transmission,
  ior: V[se].ior,
  dispersion: V[se].dispersion,
  wavelength: V[se].wavelength,
  spectralPurity: V[se].spectralPurity,
  pointer: [-0.12, 0.16],
  lightPointer: [0, 0],
  zoom: 1,
  autoRotate: 1,
  raysEnabled: 1,
  causticsEnabled: 1,
  opticsEnabled: 1,
  lightVisible: 1,
  globalLight: 0,
  paperBackground: 0,
  focusMode: !1,
  modeIndex: 0,
  pinned: 0,
  pinnedSample: { ...V[0] },
  quality: "auto",
  lang: localStorage.getItem("nca-lang") || "zh",
  size: localStorage.getItem("nca-ui-size") || "fine"
};
let xi = () => {
}, Pt = 0, er = 0, Q = [], Ne = [], te = 0, la = 0, Fe, Bt = () => {
}, xt = [], tt = 0, we = 1, Aa = new URLSearchParams(location.search).get("renderer") === "basic", Re = "";
const Kf = matchMedia("(prefers-reduced-motion: reduce)").matches;
Kf && (u.autoRotate = 0);
function qe(t) {
  const e = t.replace("#", "");
  return [parseInt(e.slice(0, 2), 16) / 255, parseInt(e.slice(2, 4), 16) / 255, parseInt(e.slice(4, 6), 16) / 255];
}
function Jf(t) {
  return ie[t].shape;
}
function Yf() {
  const t = T("#typeRail"), e = T("#filterTypes");
  ie.forEach((a, n) => {
    const r = document.createElement("button");
    r.className = "type-button", r.dataset.type = String(n), r.style.setProperty("--type-color", a.color), r.style.setProperty("--shape", a.shape), r.innerHTML = `<i class="mini-glyph"></i><b>${a.label[u.lang]}</b><small>${String(n + 1).padStart(2, "0")} · ${a.code}</small>`, r.addEventListener("click", () => Ii(n)), t.append(r);
    const i = document.createElement("button");
    i.dataset.filterType = String(n), i.innerHTML = `<b>${String(n + 1).padStart(2, "0")} ${a.label[u.lang]}</b><small>${a.code}</small>`, i.addEventListener("click", () => Qf(n, i)), e.append(i);
  });
}
function Zf() {
  const t = T("#mineralRing");
  V.forEach((e, a) => {
    const n = -90 + a * (360 / V.length), r = n * Math.PI / 180, i = document.createElement("button"), s = Math.cos(r) < -0.15 ? " label-left" : " label-right", o = Math.sin(r) < -0.72 ? " label-top" : Math.sin(r) > 0.72 ? " label-bottom" : "";
    i.className = `mineral-node${a % 4 === 0 ? " major" : ""}${s}${o}`, i.dataset.index = String(a), i.dataset.type = String(e.type), i.dataset.label = `${e.name} · ${e.cn}`, i.title = `${e.name} / ${e.cn}`, i.setAttribute("aria-label", `${e.name} / ${e.cn}`), i.style.setProperty("--x", `${50 + Math.cos(r) * 50}%`), i.style.setProperty("--y", `${50 + Math.sin(r) * 50}%`), i.style.setProperty("--r", `${n + 90}deg`), i.style.setProperty("--node-color", e.color), i.style.setProperty("--shape", Jf(e.type)), i.innerHTML = "<i></i>", i.addEventListener("click", () => La(a)), t.append(i);
  });
}
function Ce() {
  const t = T("#crystalLab"), e = T("#mineralRing"), a = document.querySelector(".ring-scale"), n = document.querySelector(".topbar"), r = document.querySelector(".control-deck");
  if (!a || !n || !r) return;
  const i = t.getBoundingClientRect(), s = n.getBoundingClientRect(), o = r.getBoundingClientRect(), c = Math.max(i.top, s.bottom + 30), d = Math.min(i.bottom, o.top - 30), l = Math.max(260, d - c), f = Math.max(240, Math.min(700, i.width - 48, l - 58)), m = (c + d) / 2 - i.top;
  [e, a].forEach((p) => {
    p.style.width = `${f}px`, p.style.top = `${m}px`, p.style.transform = "translate(-50%,-50%)";
  });
}
function vi() {
  cancelAnimationFrame(la), st.style.removeProperty("width"), st.style.removeProperty("height"), la = requestAnimationFrame(() => {
    Ce();
  });
}
function Ii(t) {
  const e = V.findIndex((n) => n.type === t);
  if (e >= 0) {
    const n = V[e];
    u.selected = e, u.transmission = Math.max(0.68, n.transmission), u.ior = Math.max(1.42, n.ior), u.dispersion = Math.max(0.24, n.dispersion);
  } else
    u.transmission = 0.68, u.ior = 1.52, u.dispersion = 0.28;
  u.typeSelection = !0, u.typeIndex = t, u.color = qe(ie[t].color);
  const a = yi(ie[t].color);
  u.wavelength = a.wavelength, u.spectralPurity = a.purity, R(".mineral-node").forEach((n) => n.classList.remove("active")), R(".type-button").forEach((n) => n.classList.toggle("active", Number(n.dataset.type) === t)), Oa(), ot(), Y();
}
function La(t, e = !1) {
  const a = V[t];
  u.selected = t, u.typeSelection = !1, u.typeIndex = a.type, u.color = qe(a.color), e || (u.transmission = a.transmission, u.ior = a.ior, u.dispersion = a.dispersion, u.wavelength = a.wavelength, u.spectralPurity = a.spectralPurity), R(".mineral-node").forEach((n) => n.classList.toggle("active", Number(n.dataset.index) === t)), R(".type-button").forEach((n) => n.classList.toggle("active", Number(n.dataset.type) === a.type)), Oa(), ot(), Y();
}
function Oa() {
  const t = V[u.selected], e = ie[u.typeIndex];
  T("#mineralNumber").textContent = u.typeSelection ? `STL ${String(u.typeIndex + 1).padStart(2, "0")} / 08` : `${String(u.selected + 1).padStart(2, "0")} / ${V.length}`, T("#mineralName").textContent = u.typeSelection ? e.code : t.name, T("#mineralCn").textContent = u.typeSelection ? e.label[u.lang] : u.lang === "en" ? e.code : t.cn, T("#specSystem").textContent = e.label[u.lang], T("#specColor").textContent = (u.typeSelection ? e.color : t.color).toUpperCase(), T("#specTransmission").textContent = `${Math.round(u.transmission * 100)}%`, T("#specIor").textContent = u.ior.toFixed(2), T("#activeTypeName").textContent = e.label[u.lang], T("#activeTypeCode").textContent = `${e.code} · STL ${String(u.typeIndex + 1).padStart(2, "0")}`, lt();
}
function lt() {
  const t = document.querySelector("#modeDetail");
  if (!t) return;
  const e = Xf[u.lang], a = V[u.selected], n = ie[u.typeIndex], r = Q[u.typeIndex], i = r ? r.triangleCount.toLocaleString() : e.loading, s = document.body.dataset.mode || "sample";
  if (s === "composition") {
    const o = V.filter((d) => d.type === u.typeIndex), c = u.typeSelection ? n.color : a.color;
    t.innerHTML = `<div class="mode-summary"><small>02 / COMPOSITION</small><b>${e.compositionTitle}</b><p>${e.compositionBody}</p></div><div class="mode-kpis"><span><small>${e.sameType}</small><b>${o.length}</b></span><span><small>POSTER HUE</small><b style="color:${c}">${c.toUpperCase()}</b></span></div><div class="mode-tags">${o.slice(0, 7).map((d) => `<span>${d.name}</span>`).join("") || "<span>SOURCE-ONLY STL FORM</span>"}</div>`;
  } else if (s === "spectrum") {
    const o = (u.wavelength - 380) / 340 * 100;
    t.innerHTML = `<div class="mode-summary"><small>03 / SPECTRUM</small><b>${e.spectrumTitle}</b><p>${e.spectrumBody}</p></div><div class="spectrum-viz"><i style="left:${o}%"></i></div><div class="mode-kpis"><span><small>POSTER-MAPPED WAVELENGTH</small><b>${Math.round(u.wavelength)} nm</b></span><span><small>COLOR PURITY / DISPERSION</small><b>${Math.round(u.spectralPurity * 100)}% · ${u.dispersion.toFixed(2)}</b></span></div>`;
  } else if (s === "crystal")
    t.innerHTML = `<div class="mode-summary"><small>04 / CRYSTAL</small><b>${e.crystalTitle}</b><p>${e.crystalBody}</p></div><div class="mode-mesh-grid">${ie.map((o, c) => `<button class="${c === u.typeIndex ? "active" : ""}" data-mode-type="${c}" style="--mesh-color:${o.color}" aria-label="STL ${String(c + 1).padStart(2, "0")} · ${o.code}"><i style="--shape:${o.shape}"></i><span>${String(c + 1).padStart(2, "0")}</span><small>${o.code}<br>${Q[c]?.triangleCount.toLocaleString() || "—"}</small></button>`).join("")}</div>`;
  else if (s === "compare") {
    const o = u.pinnedSample;
    t.innerHTML = `<div class="mode-summary"><small>05 / COMPARE</small><b>${e.compareTitle}</b><p>${e.compareBody}</p></div><div class="compare-grid"><div><small>${e.slotA}</small><b>${u.typeSelection ? n.code : a.name}</b><span>${n.code} · ${Math.round(u.transmission * 100)}%</span></div><div><small>${e.slotB}</small><b>${o.name}</b><span>${ie[o.type].code} · ${Math.round(o.transmission * 100)}%</span></div></div>`;
  } else
    t.innerHTML = `<div class="mode-summary"><small>01 / SAMPLE</small><b>${e.sampleTitle}</b><p>${e.sampleBody}</p></div><div class="mode-kpis"><span><small>${e.triangles}</small><b>${i}</b></span><span><small>${e.source}</small><b>STL ${String(u.typeIndex + 1).padStart(2, "0")}</b></span></div>`;
}
function ot() {
  const t = T("#transmissionRange"), e = T("#iorRange"), a = T("#dispersionRange"), n = T("#wavelengthRange");
  t.value = String(Math.round(u.transmission * 100)), e.value = String(Math.round(u.ior * 100)), a.value = String(Math.round(u.dispersion * 100)), n.value = String(Math.round(u.wavelength)), T("#transmissionOut").textContent = `${t.value}%`, T("#iorOut").textContent = (Number(e.value) / 100).toFixed(2), T("#dispersionOut").textContent = (Number(a.value) / 100).toFixed(2), T("#wavelengthOut").textContent = `${Math.round(u.wavelength)} nm`, T("#specTransmission").textContent = `${t.value}%`, T("#specIor").textContent = (Number(e.value) / 100).toFixed(2);
}
function Y() {
  xi({
    typeIndex: u.typeIndex,
    pointer: u.pointer,
    color: u.color,
    transmission: u.transmission,
    ior: u.ior,
    dispersion: u.dispersion,
    wavelength: u.wavelength,
    spectralPurity: u.spectralPurity,
    zoom: u.zoom,
    autoRotate: u.autoRotate,
    raysEnabled: u.raysEnabled,
    modeIndex: u.modeIndex
  });
}
function Qf(t, e) {
  const a = e.classList.contains("active");
  R("#filterTypes button").forEach((n) => n.classList.remove("active")), R(".mineral-node").forEach((n) => n.classList.remove("filtered-out")), !a && (e.classList.add("active"), R(".mineral-node").forEach((n) => n.classList.toggle("filtered-out", Number(n.dataset.type) !== t)));
}
function _t(t) {
  const e = R("#modeNav button"), a = e.findIndex((n) => n.dataset.mode === t);
  u.modeIndex = Math.max(0, a), document.body.dataset.mode = t, e.forEach((n) => n.classList.toggle("active", n.dataset.mode === t)), T("#modeCaption").textContent = wi[t][u.lang], t === "spectrum" && (u.dispersion = Math.max(u.dispersion, 0.58)), t === "crystal" && (u.transmission = Math.max(u.transmission, 0.62)), ot(), lt(), Y();
}
function ki(t) {
  u.lang = t, localStorage.setItem("nca-lang", t), document.documentElement.lang = t === "zh" ? "zh-CN" : t, R("[data-i18n]").forEach((a) => {
    const n = a.dataset.i18n;
    X[t][n] && (a.innerHTML = X[t][n]);
  }), R("#languageSet button").forEach((a) => a.classList.toggle("active", a.dataset.lang === t)), R(".type-button").forEach((a, n) => {
    const r = a.querySelector("b");
    r && (r.textContent = ie[n].label[t]);
  }), R("#filterTypes button").forEach((a, n) => {
    const r = a.querySelector("b");
    r && (r.textContent = `${String(n + 1).padStart(2, "0")} ${ie[n].label[t]}`);
  });
  const e = document.body.dataset.mode || "sample";
  T("#modeCaption").textContent = wi[e][t], u.focusMode && (T("#focusToggle [data-i18n='collapsePanels']").textContent = t === "zh" ? "展开两侧" : t === "ja" ? "両側を開く" : "Expand sides"), Oa(), lt(), $t();
}
function $t() {
  const t = T("#rendererNotice");
  t.hidden = !Re, t.textContent = Re ? X[u.lang][Re] : "";
}
function Fa() {
  const t = [
    ["story", "#materialStory"],
    ["type-summary", "#focusToggle"],
    ["type-list", "#typeRail"],
    ["inspector", "#materialInspector"]
  ];
  t.forEach(([e, a]) => {
    const n = !document.body.classList.contains(`hide-${e}`), r = T(a);
    r.inert = !n || (e === "type-list" || e === "inspector") && u.focusMode, r.setAttribute("aria-hidden", String(r.inert));
  }), T(".stage-copy").classList.toggle(
    "all-content-hidden",
    t.filter(([e]) => e !== "inspector").every(([e]) => document.body.classList.contains(`hide-${e}`))
  );
}
function tr(t) {
  u.focusMode = t, document.body.classList.toggle("focus-mode", t), T("#focusToggle").setAttribute("aria-expanded", String(!t)), T("#focusToggle [data-i18n='collapsePanels']").textContent = t ? u.lang === "zh" ? "展开两侧" : u.lang === "ja" ? "両側を開く" : "Expand sides" : X[u.lang].collapsePanels, Fa(), requestAnimationFrame(() => {
    Ce(), vi();
  });
}
function _f() {
  R("#modeNav button").forEach((o) => o.addEventListener("click", () => _t(o.dataset.mode))), R(".top-tools button[data-panel]").forEach((o) => o.addEventListener("click", () => eu(o.dataset.panel))), R("[data-close]").forEach((o) => o.addEventListener("click", () => o.closest(".drawer")?.classList.remove("open"))), R("#languageSet button").forEach((o) => o.addEventListener("click", () => ki(o.dataset.lang))), R("#sizeSet button").forEach((o) => o.addEventListener("click", () => {
    u.size = o.dataset.size, localStorage.setItem("nca-ui-size", u.size), document.body.dataset.uiSize = u.size, R("#sizeSet button").forEach((c) => c.classList.toggle("active", c === o)), requestAnimationFrame(Ce);
  })), R("#cameraPresets button").forEach((o) => o.addEventListener("click", () => {
    const c = o.dataset.camera, d = c === "front" ? [0, 0, 1] : c === "edge" ? [0.76, -0.18, 1.03] : c === "macro" ? [-0.32, 0.24, 1.32] : [-0.12, 0.16, 1];
    u.pointer = [d[0], d[1]], u.zoom = d[2], Y(), R("#cameraPresets button").forEach((l) => l.classList.toggle("active", l === o));
  })), T("#focusToggle").addEventListener("click", () => {
    tr(!u.focusMode), ea(u.focusMode ? "FOCUS · PANELS COLLAPSED" : "PANELS · RESTORED");
  }), R("#layerSet button").forEach((o) => {
    o.setAttribute("aria-pressed", String(o.classList.contains("active"))), o.addEventListener("click", () => {
      o.classList.toggle("active");
      const c = o.dataset.layer;
      o.setAttribute("aria-pressed", String(o.classList.contains("active"))), document.body.classList.toggle(`hide-${c}`, !o.classList.contains("active")), (c === "type-list" || c === "inspector") && o.classList.contains("active") && u.focusMode && tr(!1), ["story", "type-summary", "type-list", "inspector"].includes(c) && Fa(), c === "rays" && (u.raysEnabled = o.classList.contains("active") ? 1 : 0, Y()), c === "caustics" && (u.causticsEnabled = o.classList.contains("active") ? 1 : 0, Y()), c === "optics" && (u.opticsEnabled = o.classList.contains("active") ? 1 : 0, Y()), c === "light" && (u.lightVisible = o.classList.contains("active") ? 1 : 0, Y()), c === "global-light" && (u.globalLight = o.classList.contains("active") ? 1 : 0, document.body.classList.toggle("global-light", u.globalLight > 0), Y()), c === "paper" && (u.paperBackground = o.classList.contains("active") ? 1 : 0, document.body.classList.toggle("paper-background", u.paperBackground > 0), Y());
    });
  }), T("#clearFilter").addEventListener("click", () => {
    R("#filterTypes button").forEach((o) => o.classList.remove("active")), R(".mineral-node").forEach((o) => o.classList.remove("filtered-out"));
  }), T("#playBtn").addEventListener("click", () => {
    u.autoRotate = u.autoRotate > 0 ? 0 : 1, T("#playBtn").classList.toggle("active", u.autoRotate > 0), T("#playBtn b").textContent = u.autoRotate > 0 ? "Ⅱ" : "▶", Y();
  }), T("#resetBtn").addEventListener("click", () => {
    u.pointer = [-0.12, 0.16], u.lightPointer = [0, 0], u.zoom = 1, La(se), ot(), ea("RESET · ANATASE");
  }), T("#pinBtn").addEventListener("click", () => {
    u.pinned = u.selected, u.pinnedSample = {
      ...V[u.selected],
      type: u.typeIndex,
      name: u.typeSelection ? ie[u.typeIndex].code : V[u.selected].name,
      color: u.typeSelection ? ie[u.typeIndex].color : V[u.selected].color,
      transmission: u.transmission,
      ior: u.ior,
      dispersion: u.dispersion,
      wavelength: u.wavelength,
      spectralPurity: u.spectralPurity
    }, ea(`${u.pinnedSample.name} · PINNED`), _t("compare");
  }), T("#compareBtn").addEventListener("click", () => _t("compare")), T("#modeDetail").addEventListener("click", (o) => {
    const c = o.target.closest("[data-mode-type]");
    c && Ii(Number(c.dataset.modeType));
  }), [
    ["#transmissionRange", (o) => u.transmission = o / 100],
    ["#iorRange", (o) => u.ior = o / 100],
    ["#dispersionRange", (o) => u.dispersion = o / 100],
    ["#wavelengthRange", (o) => {
      u.wavelength = o, u.spectralPurity = 1;
    }]
  ].forEach(([o, c]) => T(o).addEventListener("input", (d) => {
    c(Number(d.target.value)), ot(), lt(), Y();
  }));
  const e = T("#crystalLab");
  let a = !1, n = 0, r = 0;
  const i = () => {
    a = !1, document.body.classList.remove("crystal-dragging"), e.classList.remove("is-dragging");
  };
  e.addEventListener("selectstart", (o) => o.preventDefault()), e.addEventListener("pointerdown", (o) => {
    o.target.closest(".ui,button,input,label,a") || (o.preventDefault(), document.getSelection()?.removeAllRanges(), a = !0, document.body.classList.add("crystal-dragging"), e.classList.add("is-dragging"), n = o.clientX, r = o.clientY, e.setPointerCapture(o.pointerId));
  }), e.addEventListener("pointermove", (o) => {
    const c = e.getBoundingClientRect();
    u.lightPointer = [
      Math.max(-1, Math.min(1, (o.clientX - c.left) / Math.max(1, c.width) * 2 - 1)),
      Math.max(-1, Math.min(1, 1 - (o.clientY - c.top) / Math.max(1, c.height) * 2))
    ], a && (o.preventDefault(), u.pointer[0] += (o.clientX - n) / 360, u.pointer[1] += (o.clientY - r) / 360, u.pointer[1] = Math.max(-0.7, Math.min(0.7, u.pointer[1])), n = o.clientX, r = o.clientY, Y());
  }), e.addEventListener("pointerup", i), e.addEventListener("pointercancel", i), e.addEventListener("lostpointercapture", i), e.addEventListener("wheel", (o) => {
    o.preventDefault(), u.zoom = Math.max(0.72, Math.min(1.42, u.zoom - o.deltaY * 65e-5)), Y();
  }, { passive: !1 });
  const s = new ResizeObserver(Ce);
  s.observe(e), s.observe(T(".topbar")), s.observe(T(".control-deck")), addEventListener("resize", Ce), R("[data-quality]").forEach((o) => o.addEventListener("click", () => {
    u.quality = o.dataset.quality, R("[data-quality]").forEach((c) => c.classList.toggle("active", c === o)), ua();
  })), T("#retryRenderer").addEventListener("click", () => {
    Aa = !1, ua();
  }), document.addEventListener("keydown", (o) => {
    o.key === "Escape" && R(".drawer.open").forEach((c) => c.classList.remove("open"));
  }), document.addEventListener("dragstart", (o) => o.preventDefault());
}
function eu(t) {
  const e = T(`[data-drawer="${t}"]`), a = !e.classList.contains("open");
  R(".drawer.open").forEach((n) => n.classList.remove("open")), R(".top-tools button").forEach((n) => n.classList.remove("active")), a && (e.classList.add("open"), T(`.top-tools button[data-panel="${t}"]`).classList.add("active"));
}
function ea(t) {
  const e = T("#toast");
  e.textContent = t, e.classList.add("visible"), window.clearTimeout(er), er = window.setTimeout(() => e.classList.remove("visible"), 1800);
}
async function tu() {
  const t = await fetch("models/8-crystals.stl?v=material-r15-20260928");
  if (!t.ok) throw new Error(`STL ${t.status}`);
  return Df(await t.arrayBuffer());
}
function fa(t) {
  const e = Math.hypot(...t) || 1;
  return [t[0] / e, t[1] / e, t[2] / e];
}
function ar(t, e, a, n, r = !1) {
  const i = r ? u.pinnedSample : V[u.selected], s = (document.body.dataset.mode || "sample") === "compare";
  return {
    viewProjection: a,
    cameraPosition: n,
    time: t,
    lightDirection: e,
    transmission: r ? i.transmission : u.transmission,
    color: r ? qe(i.color) : u.color,
    ior: r ? i.ior : u.ior,
    rotation: [u.pointer[0] * 2.1 + t * 0.12, u.pointer[1] * 1.7 + 0.24],
    dispersion: r ? i.dispersion : u.dispersion,
    wavelength: r ? i.wavelength : u.wavelength,
    spectralPurity: r ? i.spectralPurity : u.spectralPurity,
    raysEnabled: u.raysEnabled,
    lightVisible: u.lightVisible,
    globalLight: u.globalLight,
    paperBackground: u.paperBackground,
    pointer: u.lightPointer,
    floorY: -1.08,
    causticsEnabled: u.causticsEnabled,
    opticsEnabled: u.opticsEnabled,
    photonGrid: u.quality === "high" ? 96 : 64,
    maxBounces: u.quality === "high" ? 6 : u.quality === "balanced" ? 2 : 4,
    positionOffset: s ? [r ? innerWidth <= 700 ? 0.47 : 0.72 : -(innerWidth <= 700 ? 0.47 : 0.72), innerWidth <= 700 ? 0.18 : 0] : [0, innerWidth <= 700 ? 0.18 : 0],
    scale: innerWidth <= 700 ? s ? 0.38 : 0.47 : s ? 0.58 : 0.7,
    modeIndex: u.modeIndex
  };
}
async function ua() {
  const t = ++te;
  cancelAnimationFrame(Pt), Bt(), Fe?.dispose(), Fe = void 0, st.style.visibility = "visible", document.body.dataset.render = "loading", Re = "", $t(), T("#retryRenderer").setAttribute("hidden", ""), T("#renderStatus").textContent = "WEBGPU · BUILDING OPTICAL BVH";
  let e;
  try {
    if (Q.length || (Q = await tu()), t !== te) return;
    if (lt(), !Ne.length)
      try {
        const g = await Promise.all(Q.map((v) => Zn(v.vertices)));
        if (t !== te) return;
        Ne = Q.map((v, k) => zf(v, g[k])), xt = g.map((v) => Qn(v));
      } catch (g) {
        throw Ne = Q, g;
      }
    if (Aa) {
      ta(t);
      return;
    }
    if (!navigator.gpu) throw new Error("WebGPU unavailable");
    if (xt.length || (xt = await Promise.all(Q.map(async (g) => Qn(await Zn(g.vertices))))), t !== te) return;
    if (e = await yf({ powerPreference: "high-performance" }), t !== te) {
      e.dispose();
      return;
    }
    Fe = e;
    const a = e;
    let n = !1;
    const r = (g) => {
      n || t !== te || (n = !0, console.warn("Material optical renderer unavailable", g), window.setTimeout(() => {
        t === te && (a.dispose(), Fe = void 0, ta(t));
      }, 0));
    };
    e.onError(r), e.gpu.lost.then((g) => {
      a.disposed || r(g.message);
    });
    const i = Kd(e, st, { dpr: [1, 1.65], label: "NCA optical surface" });
    we = u.quality === "high" ? 1 : u.quality === "balanced" ? 0.72 : 0.9;
    const s = () => [
      Math.max(1, Math.round(i.size[0] * we)),
      Math.max(1, Math.round(i.size[1] * we))
    ], o = Wn(e, { size: s(), format: "rgba16float", label: "NCA HDR environment and caustics" }), c = Wn(e, { size: s(), format: "rgba16float", depth: !0, msaa: 4, label: "NCA refractive STL" }), d = ll(e, { minFilter: "linear", magFilter: "linear" }), l = Vn(e, Pf, { set: { space: { right: [1, 0, 0], tanHalfFov: Math.tan(45 * Math.PI / 360), up: [0, 1, 0], aspect: i.size[0] / i.size[1], forward: [0, 0, -1], time: 0, lightDirection: [-0.5, 1.5, 0.8], modeIndex: 0, posterColor: u.color, wavelength: u.wavelength, dispersion: u.dispersion, spectralPurity: u.spectralPurity, transmission: u.transmission, raysEnabled: u.raysEnabled, pointer: u.lightPointer, lightVisible: u.lightVisible, paperBackground: u.paperBackground } } }), f = Vn(e, Bf, { set: { skyTexture: o.color, crystalTexture: c.color, sceneSampler: d } }), m = Lf({ fov: 45, aspect: i.size[0] / i.size[1], near: 0.1, far: 50, position: [0, 0, 4.4], target: [0, 0, 0] }), p = fa([-0.5, 1.5, 0.8]), I = Q.map((g, v) => {
      const k = xt[v], E = Zt(a, k.nodes.byteLength, "read"), L = Zt(a, k.triangles.byteLength, "read");
      E.write(k.nodes), L.write(k.triangles);
      const O = Xs(a, { buffers: [{ data: g.vertices, stride: 24, attributes: { position: { format: "float32x3", offset: 0, location: 0 }, normal: { format: "float32x3", offset: 12, location: 1 } } }], vertexCount: g.vertexCount });
      return { bvhNodes: E, bvhTriangles: L, geometry: O };
    }), S = [!1, !0].map((g) => {
      const v = g ? u.pinnedSample.type : u.typeIndex, k = I[v], E = ar(tt, p, m.viewProjection, [0, 0, 4.4], g), L = Zt(a, 9216 * 3 * 32, "read-write"), O = Jl(a, $f, { set: { crystal: E, photons: L, bvhNodes: k.bvhNodes, bvhTriangles: k.bvhTriangles } }), A = Nn(a, { shader: Rf, vertices: 6, blend: { color: { src: "one", dst: "one" }, alpha: { src: "zero", dst: "one" } }, depth: !1, set: { viewProjection: m.viewProjection, photons: L } }), P = I.map((B, D) => Nn(a, { shader: Ff, geometry: B.geometry, cull: "back", set: { crystal: E, bvhNodes: B.bvhNodes, bvhTriangles: B.bvhTriangles }, label: `BVH crystal ${g ? "B" : "A"} ${D + 1}` }));
      return { tracer: O, splat: A, draws: P };
    }), N = () => {
      o.resize(s()), c.resize(s()), f.set({ skyTexture: o.color, crystalTexture: c.color });
    };
    let C = !1;
    i.onResize(N);
    let b = performance.now(), y = 0, w = b, x = 0, M = 0, U = -1, h = "";
    _l(a, (g) => {
      if (t !== te || n || document.hidden) {
        b = performance.now(), g.cancel();
        return;
      }
      C && (N(), C = !1);
      const v = performance.now(), k = Math.min((v - b) / 1e3, 0.06);
      if (b = v, u.autoRotate === 0) {
        const $ = JSON.stringify([u, i.size, we]);
        if ($ === h) {
          g.cancel();
          return;
        }
        h = $;
      } else
        h = "";
      tt += k * u.autoRotate;
      const E = tt, L = E * 0.085 + 1.15, O = fa([-0.65 + Math.cos(L) * 0.16 + u.lightPointer[0] * 0.35, 1.5 + u.lightPointer[1] * 0.25, 0.85 + Math.sin(L) * 0.16]), A = 4.4 / Math.max(0.72, u.zoom);
      m.set({ aspect: i.size[0] / Math.max(1, i.size[1]), position: [0, 0, A] });
      const P = m.viewProjection;
      l.set({ space: { aspect: i.size[0] / Math.max(1, i.size[1]), time: E, lightDirection: O, modeIndex: u.modeIndex, posterColor: u.color, wavelength: u.wavelength, dispersion: u.dispersion * u.opticsEnabled, spectralPurity: u.spectralPurity, transmission: u.transmission, raysEnabled: u.raysEnabled, pointer: u.lightPointer, lightVisible: u.lightVisible, paperBackground: u.paperBackground } });
      const B = document.body.dataset.mode === "compare", D = [u.typeIndex, u.pinnedSample.type], W = u.quality === "high" ? 96 : 64, Z = u.causticsEnabled > 0 && u.lightVisible > 0;
      S.forEach(($, K) => {
        if (K === 1 && !B) return;
        const de = D[K], Xe = ar(E, O, P, [0, 0, A], K === 1);
        $.draws[de].set({ crystal: Xe }), Z && ($.tracer.set({ crystal: Xe, bvhNodes: I[de].bvhNodes, bvhTriangles: I[de].bvhTriangles }), $.tracer.dispatch(Math.ceil(W * W * 3 / 64)), $.splat.set({ viewProjection: P }));
      }), g.pass({ target: o, clear: [0, 0, 0, 1] }, ($) => {
        $.draw(l), Z && ($.draw(S[0].splat, { instances: W * W * 3 }), B && $.draw(S[1].splat, { instances: W * W * 3 }));
      }), g.pass({ target: c, clear: [0, 0, 0, 0], clearDepth: 1 }, ($) => {
        $.draw(S[0].draws[D[0]]), B && $.draw(S[1].draws[D[1]]);
      }), g.pass(i, f), y++, v - w > 1800 && (M = y * 1e3 / (v - w), y = 0, w = v, x = M < 28 ? x + 1 : 0, u.quality === "auto" && x >= 2 && we > 0.55 && (we = Math.max(0.55, we - 0.12), C = !0, x = 0));
      const ge = Math.floor(v / 1e3);
      ge !== U && (U = ge, T("#sunStatus").textContent = `LIGHT ${String(Math.round(L * 180 / Math.PI) % 360).padStart(3, "0")}° · ${u.lightVisible ? "KEY ON" : "KEY OFF"}${u.globalLight ? " + FILL" : ""}`, T("#renderStatus").textContent = `WEBGPU · BVH / RGB · ${u.quality.toUpperCase()} ${Math.round(we * 100)}%${M ? ` · ${Math.round(M)} FPS` : ""}`);
    }), document.body.dataset.render = "webgpu", T("#rendererLabel").textContent = "WEBGPU · SPECTRAL REFRACTION / CAUSTICS", T("#retryRenderer").setAttribute("hidden", ""), Re = "", $t();
  } catch (a) {
    if (e?.dispose(), t !== te) return;
    Fe = void 0, console.warn("WebGPU fallback", a), ta(t);
  }
}
function ta(t = te) {
  cancelAnimationFrame(Pt), Bt(), document.body.dataset.render = "fallback", Re = Q.length ? Aa ? "rendererBasic" : "rendererFallback" : "rendererLoadError", $t(), T("#rendererLabel").textContent = "CPU · BASIC STL PREVIEW", T("#renderStatus").textContent = Q.length ? "CPU · BASIC PREVIEW / WEBGPU REQUIRED FOR OPTICS" : "STL LOAD FAILED · RETRY IN CAMERA", T("#retryRenderer").removeAttribute("hidden");
  const e = document.createElement("canvas");
  e.id = "fallbackCanvas", e.setAttribute("aria-label", "晶体基础预览；完整折射与焦散需要 WebGPU"), document.body.prepend(e), st.style.visibility = "hidden";
  const a = e.getContext("2d");
  if (!a) return;
  const n = Array.from({ length: 620 }, (l, f) => ({ x: Math.sin(f * 91.713) * 43758.5453 % 1, y: Math.sin(f * 37.217) * 17621.923 % 1, r: 0.45 + f % 11 / 6, a: 0.16 + f % 7 / 11, phase: f * 0.731, speed: 0.42 + f % 9 / 11 })).map((l) => ({ ...l, x: Math.abs(l.x), y: Math.abs(l.y) })), r = () => {
    const l = Math.min(devicePixelRatio || 1, 1.6);
    e.width = innerWidth * l, e.height = innerHeight * l, a.setTransform(l, 0, 0, l, 0, 0);
  };
  addEventListener("resize", r), r(), xi = () => {
  }, Bt = () => {
    removeEventListener("resize", r), e.remove();
  };
  const i = (l, f, m, p, I, S, N, C, b) => {
    const y = fa([C, -b, 0.8]);
    for (const w of Hf(l, S, N)) {
      const x = Math.abs(w.normal[2]), M = Math.max(0, w.normal[0] * y[0] + w.normal[1] * y[1] + w.normal[2] * y[2]), U = Math.pow(Math.max(0, w.normal[0] * 0.22 + w.normal[1] * 0.48 + w.normal[2] * 0.85), 18), h = 0.22 + M * 0.64 + u.globalLight * 0.22, g = (1 - x) * 0.06, v = I.map((E) => Math.round(Math.min(1, E * h + U * 0.48 + g) * 255)), k = w.points;
      a.beginPath(), a.moveTo(f + k[0] * p, m + k[1] * p), a.lineTo(f + k[2] * p, m + k[3] * p), a.lineTo(f + k[4] * p, m + k[5] * p), a.closePath(), a.fillStyle = `rgb(${v[0]},${v[1]},${v[2]})`, a.fill(), a.strokeStyle = a.fillStyle, a.lineWidth = 0.5, a.stroke();
    }
  };
  let s = performance.now(), o = 0, c = "";
  const d = () => {
    if (t !== te) return;
    Pt = requestAnimationFrame(d);
    const l = performance.now(), f = Math.min((l - s) / 1e3, 0.06);
    if (s = l, document.hidden || (tt += f * u.autoRotate, l - o < 1e3 / 30)) return;
    const m = JSON.stringify([u.typeIndex, u.pointer, u.zoom, u.modeIndex, u.paperBackground, u.globalLight, u.lightPointer, u.raysEnabled, u.lightVisible, u.dispersion, u.pinnedSample, u.color, innerWidth, innerHeight, devicePixelRatio]);
    if (u.autoRotate === 0 && m === c) return;
    c = m, o = l;
    const p = innerWidth, I = innerHeight, S = tt;
    if (u.paperBackground > 0) {
      a.fillStyle = "#f2eee6", a.fillRect(0, 0, p, I), a.strokeStyle = "rgba(82,72,62,.045)", a.lineWidth = 0.55;
      for (let v = 0; v < 180; v++) {
        const k = v * 73.17 % I;
        a.beginPath(), a.moveTo(0, k), a.lineTo(p, k + Math.sin(v) * 2), a.stroke();
      }
    } else
      a.fillStyle = "#020305", a.fillRect(0, 0, p, I), n.forEach((v) => {
        const k = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(S * v.speed * 1.35 + v.phase)), E = v.a * k;
        a.fillStyle = `rgba(238,244,255,${E})`, a.beginPath(), a.arc(v.x * p, v.y * I, v.r * (0.88 + k * 0.2), 0, Math.PI * 2), a.fill();
      });
    const N = S * 0.085 + 1.15;
    if (u.raysEnabled > 0 && u.lightVisible > 0) {
      a.save(), a.globalCompositeOperation = u.paperBackground > 0 ? "source-over" : "lighter";
      const v = p * 0.5, k = I * 0.49, E = k - u.lightPointer[1] * I * 0.12, L = k - I * 0.08 - u.lightPointer[1] * I * 0.16, O = a.createLinearGradient(p * 1.04, L, v, E);
      O.addColorStop(0, "rgba(255,255,255,0)"), O.addColorStop(0.62, u.paperBackground > 0 ? "rgba(120,126,136,.28)" : "rgba(255,255,255,.34)"), O.addColorStop(1, "rgba(255,255,255,.95)"), a.strokeStyle = O, a.lineWidth = 8, a.beginPath(), a.moveTo(p * 1.04, L), a.lineTo(v, E), a.stroke(), ["#6f45ff", "#3285ff", "#36d8e5", "#58d86a", "#f3df47", "#ff8a3a", "#ff3f5b"].forEach((P, B) => {
        a.strokeStyle = P, a.globalAlpha = 0.22 + u.dispersion * 0.38, a.lineWidth = 3.2, a.beginPath(), a.moveTo(v, E), a.lineTo(-p * 0.04, k + I * 0.08 + u.lightPointer[1] * I * 0.18 + (B - 3) * u.dispersion * 23), a.stroke();
      }), a.restore();
    }
    const C = (document.body.dataset.mode || "sample") === "compare", b = Math.min(p, I) * 0.205 * u.zoom, y = u.pointer[0] * 2.1 + S * 0.12, w = u.pointer[1] * 1.7 + 0.24, x = Math.cos(N), M = Math.sin(N), U = (Ne.length ? Ne : Q)[u.typeIndex];
    U && i(U, p * 0.5 + (C ? -b * 0.72 : 0), I * 0.49, b * (C ? 0.62 : 1), u.color, y, w, x, M);
    const h = (Ne.length ? Ne : Q)[u.pinnedSample.type];
    C && h && i(h, p * 0.5 + b * 0.72, I * 0.49, b * 0.62, qe(u.pinnedSample.color), y, w, x, M);
    const g = document.querySelector("#sunStatus");
    g && (g.textContent = `LIGHT ${String(Math.round(N * 180 / Math.PI % 360)).padStart(3, "0")}° · ${u.lightVisible > 0 ? "OFFSCREEN" : "SPOT OFF"}${u.globalLight > 0 ? " + GLOBAL" : ""}`);
  };
  d();
}
function Pa() {
  Ce(), vi();
}
document.addEventListener("visibilitychange", () => {
  document.hidden || Pa();
});
addEventListener("pageshow", Pa);
addEventListener("focus", Pa);
Yf();
Zf();
_f();
Fa();
document.body.dataset.uiSize = u.size;
ki(u.lang);
La(se);
Ce();
ua();
T("#playBtn").classList.toggle("active", u.autoRotate > 0);
T("#playBtn b").textContent = u.autoRotate > 0 ? "Ⅱ" : "▶";
addEventListener("beforeunload", () => {
  te++, Fe?.dispose(), Bt(), cancelAnimationFrame(Pt), cancelAnimationFrame(la);
});
