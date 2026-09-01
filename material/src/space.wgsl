import { environmentColor, wavelengthTint } from './space-common.wgsl';

struct SpaceUniforms {
  right: vec3f,
  tanHalfFov: f32,
  up: vec3f,
  aspect: f32,
  forward: vec3f,
  time: f32,
  lightDirection: vec3f,
  modeIndex: f32,
  posterColor: vec3f,
  wavelength: f32,
  dispersion: f32,
  spectralPurity: f32,
  transmission: f32,
  raysEnabled: f32,
  pointer: vec2f,
  lightVisible: f32,
  paperBackground: f32,
}

@group(0) @binding(0) var<uniform> space: SpaceUniforms;

fn segmentInfo(point: vec2f, start: vec2f, end: vec2f) -> vec2f {
  let axis = end - start;
  let axisLength = max(length(axis), 0.0001);
  let direction = axis / axisLength;
  let along = dot(point - start, direction);
  let position = clamp(along / axisLength, 0.0, 1.0);
  let closest = start + axis * position;
  return vec2f(length(point - closest), position);
}

fn beamParticles(
  point: vec2f,
  start: vec2f,
  end: vec2f,
  width: f32,
  count: f32,
  salt: f32,
  time: f32,
  tint: vec3f,
) -> vec3f {
  let axis = end - start;
  let axisLength = max(length(axis), 0.0001);
  let direction = axis / axisLength;
  let perpendicular = vec2f(-direction.y, direction.x);
  let along01 = dot(point - start, direction) / axisLength;
  let cell = floor(along01 * count);
  let seed = fract(sin(cell * 91.173 + salt * 17.137) * 43758.5453);
  let seed2 = fract(sin(cell * 37.217 + salt * 43.713) * 17621.923);
  let centerAlong = (cell + 0.18 + seed * 0.64) / count * axisLength;
  let center = start + direction * centerAlong + perpendicular * (seed2 - 0.5) * width * 1.7;
  let radius = mix(0.0024, 0.0092, seed2 * seed2);
  let particle = smoothstep(radius, radius * 0.15, length(point - center));
  let inside = step(0.0, along01) * step(along01, 1.0);
  let beamMask = 1.0 - smoothstep(width, width * 1.8, abs(dot(point - start, perpendicular)));
  let twinkle = 0.74 + 0.26 * sin(time * mix(0.8, 2.8, seed2) + seed * 18.0);
  return tint * particle * inside * beamMask * twinkle * mix(0.9, 3.0, seed);
}

fn prismLightField(uv: vec2f) -> vec3f {
  let enabled = clamp(space.raysEnabled * space.lightVisible, 0.0, 1.0);
  if (enabled < 0.5) { return vec3f(0.0); }

  let point = vec2f(uv.x * space.aspect, uv.y);
  // The source stays off canvas. Pointer movement changes the incidence point
  // and the outgoing bend, so refraction feels tied to the specimen.
  let cursor = clamp(space.pointer, vec2f(-1.0), vec2f(1.0));
  let entryStart = vec2f(1.38, -0.26 - cursor.y * 0.34);
  let entryEnd = vec2f(0.12 + cursor.x * 0.045, -0.018 - cursor.y * 0.075);
  let exitStart = vec2f(-0.10 + cursor.x * 0.028, 0.018 + cursor.y * 0.052);
  let entry = segmentInfo(point, entryStart, entryEnd);
  let entryFade = smoothstep(0.01, 0.11, entry.y) * (1.0 - smoothstep(0.90, 1.0, entry.y));
  let whiteCore = 1.0 - smoothstep(0.003, 0.010, entry.x);
  let whiteHalo = 1.0 - smoothstep(0.010, 0.042, entry.x);
  var color = vec3f(1.0, 0.99, 0.96) * (whiteCore * 3.8 + whiteHalo * 0.34) * entryFade;
  color += beamParticles(point, entryStart, entryEnd, 0.044, 82.0, 1.0, space.time, vec3f(1.0, 0.99, 0.96)) * 1.35;

  let fanSpread = 0.045 + space.dispersion * 0.235;
  let pointerBend = cursor.y * 0.31 + cursor.x * 0.09;
  let purity = clamp(space.spectralPurity, 0.0, 1.0);
  for (var index = 0; index < 7; index = index + 1) {
    let t = f32(index) / 6.0;
    let wavelength = 400.0 + t * 300.0;
    let tint = wavelengthTint(wavelength);
    let exitEnd = vec2f(-1.34, 0.30 + pointerBend + (t - 0.5) * fanSpread);
    let ray = segmentInfo(point, exitStart, exitEnd);
    let reveal = smoothstep(0.015, 0.12, ray.y) * (1.0 - smoothstep(0.90, 1.0, ray.y));
    let core = 1.0 - smoothstep(0.002, 0.008 + space.dispersion * 0.003, ray.x);
    let halo = 1.0 - smoothstep(0.008, 0.028 + space.dispersion * 0.009, ray.x);
    color += tint * (core * 2.15 + halo * 0.19) * reveal * (0.62 + space.transmission * 0.42);
    color += beamParticles(point, exitStart, exitEnd, 0.026, 44.0, 10.0 + f32(index), space.time * 1.11, tint) * (0.16 + space.dispersion * 0.38);
  }

  let mappedEnd = vec2f(-1.34, 0.30 + pointerBend + clamp((space.wavelength - 550.0) / 340.0, -0.5, 0.5) * fanSpread);
  let mapped = segmentInfo(point, exitStart, mappedEnd);
  let mappedCore = 1.0 - smoothstep(0.002, 0.008, mapped.x);
  let mappedTint = normalize(mix(wavelengthTint(space.wavelength), space.posterColor, purity * 0.35));
  color += mappedTint * mappedCore * 0.7 * smoothstep(0.0, 0.15, mapped.y);
  return color;
}

fn blackStudioField(uv: vec2f, stars: vec3f, tint: vec3f, time: f32) -> vec3f {
  let horizon = -0.34;
  let floorMask = 1.0 - smoothstep(horizon - 0.018, horizon + 0.025, uv.y);
  let wallLift = 0.010 + 0.018 * (uv.y * 0.5 + 0.5);
  let wallSpot = exp(-dot(vec2f(uv.x * 0.70, uv.y - 0.10), vec2f(uv.x * 0.70, uv.y - 0.10)) * 2.2);
  let wall = vec3f(0.0045, 0.0065, 0.0090) + stars * 0.72 + tint * wallSpot * 0.014;
  let floorDepth = clamp((horizon - uv.y) / 0.66, 0.0, 1.0);
  let floorGrain = 0.5 + 0.5 * sin((uv.x * 913.0 + uv.y * 617.0) + sin(uv.x * 121.0) * 2.4);
  var floor = vec3f(0.0012, 0.0020, 0.0030) + tint * (0.010 - floorDepth * 0.006);
  floor += vec3f(floorGrain) * 0.0022;
  var color = mix(wall + vec3f(wallLift), floor, floorMask);
  let horizonLine = exp(-abs(uv.y - horizon) * 150.0);
  color += mix(vec3f(0.025), tint * 0.16, 0.35) * horizonLine;
  let contact = exp(-pow(uv.x / 0.34, 2.0) - pow((uv.y - (horizon - 0.055)) / 0.052, 2.0));
  color *= 1.0 - contact * floorMask * 0.72;
  let reflectionPool = exp(-pow(uv.x / 0.42, 2.0) - pow((uv.y - (horizon - 0.19)) / 0.22, 2.0));
  color += tint * reflectionPool * floorMask * 0.009 * (0.92 + 0.08 * sin(time * 0.31));
  return color;
}

@fragment
fn fs_main(@location(0) uvTop: vec2f) -> @location(0) vec4f {
  let uv = vec2f(uvTop.x, 1.0 - uvTop.y) * 2.0 - 1.0;
  let direction = normalize(
    space.forward +
    space.right * uv.x * space.aspect * space.tanHalfFov +
    space.up * uv.y * space.tanHalfFov
  );
  // The physical light keeps rotating, while its body is always outside the
  // visible camera. The layer toggle controls illumination/rays, not a sun disk.
  let environment = environmentColor(direction, space.lightDirection, 0.0, space.time, space.paperBackground);
  let studio = blackStudioField(uv, environment, space.posterColor, space.time);
  var color = mix(studio, environment, clamp(space.paperBackground, 0.0, 1.0));
  color += prismLightField(uv);
  let vignette = 1.0 - smoothstep(0.48, 1.38, length(vec2f(uv.x * 0.72, uv.y)));
  color *= mix(mix(0.62, 0.93, space.paperBackground), 1.0, vignette);
  if (space.modeIndex > 1.5 && space.modeIndex < 2.5) {
    color *= vec3f(0.95, 0.98, 1.04);
  }
  return vec4f(color, 1.0);
}
