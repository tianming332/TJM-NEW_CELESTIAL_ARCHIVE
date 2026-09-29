// Camera and light rays share an optical LOD derived from the source STL.
export struct CrystalUniforms {
  viewProjection: mat4x4f,
  cameraPosition: vec3f,
  time: f32,
  lightDirection: vec3f,
  transmission: f32,
  color: vec3f,
  ior: f32,
  rotation: vec2f,
  dispersion: f32,
  wavelength: f32,
  positionOffset: vec2f,
  scale: f32,
  modeIndex: f32,
  spectralPurity: f32,
  raysEnabled: f32,
  lightVisible: f32,
  globalLight: f32,
  paperBackground: f32,
  pointer: vec2f,
  floorY: f32,
  causticsEnabled: f32,
  opticsEnabled: f32,
  photonGrid: f32,
  maxBounces: f32,
}

export struct RayHit {
  distance: f32,
  normal: vec3f,
}

export fn rotX(a: f32) -> mat3x3f {
  let c = cos(a); let s = sin(a);
  return mat3x3f(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

export fn rotY(a: f32) -> mat3x3f {
  let c = cos(a); let s = sin(a);
  return mat3x3f(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

export fn traceMesh(bvhNodes: ptr<storage, array<vec4f>, read>, bvhTriangles: ptr<storage, array<vec4f>, read>, origin: vec3f, direction: vec3f, exitOnly: bool) -> RayHit {
  var nearest = RayHit(1e6, vec3f(0.0));
  // Preserve the sign for axis-parallel rays, without infinities / NaNs.
  let safeDirection = select(vec3f(-1e-8), vec3f(1e-8), direction >= vec3f(0.0));
  let inverse = 1.0 / select(safeDirection, direction, abs(direction) > vec3f(1e-8));
  var node = 0u;
  let nodeCount = arrayLength(bvhNodes) / 3u;
  loop {
    if (node >= nodeCount) { break; }
    let low = (*bvhNodes)[node * 3u];
    let high = (*bvhNodes)[node * 3u + 1u];
    let a = (low.xyz - origin) * inverse;
    let b = (high.xyz - origin) * inverse;
    let near = min(a, b);
    let far = max(a, b);
    let entry = max(max(near.x, near.y), max(near.z, 0.0));
    let exit = min(min(far.x, far.y), far.z);
    if (exit < entry || entry > nearest.distance) {
      node = u32(low.w);
      continue;
    }
    let count = u32((*bvhNodes)[node * 3u + 2u].x);
    let first = u32(high.w);
    for (var i = 0u; i < count; i++) {
      let v = (first + i) * 3u;
      let p = (*bvhTriangles)[v].xyz;
      let e1 = (*bvhTriangles)[v + 1u].xyz;
      let e2 = (*bvhTriangles)[v + 2u].xyz;
      let h = cross(direction, e2);
      let determinant = dot(e1, h);
      if (abs(determinant) < 1e-10 || (exitOnly && determinant > 0.0)) { continue; }
      let invDet = 1.0 / determinant;
      let s = origin - p;
      let u = dot(s, h) * invDet;
      let q = cross(s, e1);
      let vCoord = dot(direction, q) * invDet;
      let distance = dot(e2, q) * invDet;
      if (u >= -0.00001 && vCoord >= -0.00001 && u + vCoord <= 1.00001 &&
          distance > 0.00008 && distance < nearest.distance) {
        nearest = RayHit(distance, normalize(cross(e1, e2)));
      }
    }
    node++;
  }
  return nearest;
}

export fn fresnelDielectric(cosine: f32, etaI: f32, etaT: f32) -> f32 {
  let cosI = clamp(abs(cosine), 0.0, 1.0);
  let sinT2 = (etaI * etaI) / (etaT * etaT) * (1.0 - cosI * cosI);
  if (sinT2 >= 1.0) { return 1.0; }
  let cosT = sqrt(max(0.0, 1.0 - sinT2));
  let rs = (etaI * cosI - etaT * cosT) / max(etaI * cosI + etaT * cosT, 1e-5);
  let rp = (etaT * cosI - etaI * cosT) / max(etaT * cosI + etaI * cosT, 1e-5);
  return (rs * rs + rp * rp) * 0.5;
}

// Transmission is measured per unit path, not used as a surface-alpha shortcut.
export fn absorptionCoefficient(color: vec3f, transmission: f32) -> vec3f {
  let tint = pow(max(color, vec3f(0.035)), vec3f(1.65));
  return vec3f(-log(clamp(transmission, 0.01, 1.0))) +
    (vec3f(1.0) - tint) * (0.42 + (1.0 - transmission) * 0.80);
}

export fn channelIor(base: f32, dispersion: f32, channel: u32) -> f32 {
  // Three wavelengths of a Cauchy-like dispersion curve (red -> blue).
  let shifts = array<f32, 3>(-0.010, 0.0, 0.018);
  return max(1.001, base + shifts[channel] * dispersion);
}
