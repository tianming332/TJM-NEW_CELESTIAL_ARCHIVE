// Shared environment sampled by both the background and the crystal.
// Star scale/twinkle follows the MIT-licensed vgpu optimized-black-hole look;
// the crystal reads this same field for transmission and reflection.
import { pcg3d, unitFloat } from '@vgpu/wgsl-std/hash';

const SUN_COLOR = vec3f(1.0, 0.68, 0.34);

fn saturate(value: f32) -> f32 {
  return clamp(value, 0.0, 1.0);
}

fn faceCoords(direction: vec3f) -> vec2f {
  let a = abs(direction);
  var uv = direction.xy / max(a.z, 0.0001);
  if (a.x > a.y && a.x > a.z) { uv = direction.zy / max(a.x, 0.0001); }
  if (a.y > a.x && a.y > a.z) { uv = direction.xz / max(a.y, 0.0001); }
  return uv;
}

fn starLayer(direction: vec3f, scale: f32, threshold: f32, time: f32) -> vec3f {
  let uv = faceCoords(direction) * scale;
  let cell = vec3u(vec3i(floor(vec3f(uv, scale * 0.031))));
  let hash = pcg3d(cell);
  let intensity = smoothstep(threshold, 1.0, unitFloat(hash.x));
  let offset = (vec2f(unitFloat(hash.y), unitFloat(hash.z)) - 0.5) * 0.68;
  let local = fract(uv) - 0.5 - offset;
  let sizeSeed = fract(unitFloat(hash.y) * 11.73 + unitFloat(hash.z) * 7.19);
  let radius = mix(0.032, 0.128, sizeSeed * sizeSeed);
  let core = smoothstep(radius, radius * 0.16, length(local));
  let halo = smoothstep(radius * 1.9, radius * 0.42, length(local));
  let twinkleSpeed = mix(0.46, 1.54, unitFloat(hash.z));
  let slowPulse = 0.67 + 0.33 * sin(time * twinkleSpeed + unitFloat(hash.x) * 6.28318);
  let quickPulse = 0.86 + 0.14 * sin(time * (twinkleSpeed * 2.73 + 0.31) + unitFloat(hash.y) * 8.31);
  let twinkle = clamp(slowPulse * quickPulse, 0.28, 1.18);
  let starColor = mix(vec3f(0.86, 0.91, 1.0), vec3f(1.0, 0.985, 0.94), unitFloat(hash.y));
  return starColor * pow(intensity, 1.28) * (core * (0.82 + twinkle * 0.26) + halo * 0.075) * twinkle * mix(1.14, 3.62, sizeSeed);
}

export fn wavelengthTint(nm: f32) -> vec3f {
  let t = clamp((nm - 380.0) / 340.0, 0.0, 1.0);
  let r = smoothstep(0.42, 0.78, t) + (1.0 - smoothstep(0.78, 0.98, t)) * 0.13;
  let g = smoothstep(0.08, 0.42, t) * (1.0 - smoothstep(0.60, 0.84, t));
  let b = 1.0 - smoothstep(0.25, 0.54, t);
  return normalize(vec3f(max(r, 0.08), max(g, 0.05), max(b, 0.08)));
}

fn softBox(
  direction: vec3f,
  forward: vec3f,
  halfSize: vec2f,
  softness: f32,
) -> f32 {
  let upHint = vec3f(0.0, 1.0, 0.0);
  let right = normalize(cross(upHint, forward));
  let up = normalize(cross(forward, right));
  let depth = dot(direction, forward);
  if (depth <= 0.02) { return 0.0; }
  let projected = vec2f(dot(direction, right), dot(direction, up)) / depth;
  let outside = max(abs(projected) - halfSize, vec2f(0.0));
  return (1.0 - smoothstep(0.0, softness, length(outside))) * smoothstep(0.02, 0.18, depth);
}

fn studioLightCards(direction0: vec3f) -> vec3f {
  let direction = normalize(direction0);
  let leftCard = softBox(direction, normalize(vec3f(-0.52, 0.22, -1.0)), vec2f(0.075, 0.46), 0.085);
  let rightCard = softBox(direction, normalize(vec3f(0.64, 0.08, -1.0)), vec2f(0.055, 0.34), 0.075);
  let topCard = softBox(direction, normalize(vec3f(0.04, 0.74, -1.0)), vec2f(0.38, 0.045), 0.075);
  let rearCard = softBox(direction, normalize(vec3f(-0.06, -0.18, 1.0)), vec2f(0.24, 0.18), 0.16);
  return vec3f(0.82, 0.93, 1.0) * leftCard * 3.2
    + vec3f(1.0, 0.985, 0.95) * rightCard * 2.15
    + vec3f(0.90, 0.96, 1.0) * topCard * 2.8
    + vec3f(0.20, 0.44, 0.72) * rearCard * 0.58;
}

export fn spaceColor(direction0: vec3f, lightDirection0: vec3f, showSun: f32, time: f32) -> vec3f {
  let direction = normalize(direction0);
  let lightDirection = normalize(lightDirection0);
  let galacticAxis = normalize(vec3f(0.28, 0.92, -0.22));
  let band = 1.0 - abs(dot(direction, galacticAxis));
  let dustNoise = 0.5 + 0.5 * sin(direction.x * 39.0 + sin(direction.z * 23.0) * 3.0);
  let dust = pow(saturate(band), 12.0) * (0.016 + dustNoise * 0.032);
  var color = vec3f(0.0012, 0.0015, 0.0024);
  color += vec3f(0.075, 0.085, 0.115) * dust;
  color += starLayer(direction, 24.0, 0.820, time);
  color += starLayer(direction, 58.0, 0.930, time * 0.87);
  color += starLayer(direction, 126.0, 0.978, time * 1.14);

  let sunDot = saturate(dot(direction, lightDirection));
  let sunDisk = smoothstep(0.99935, 0.99986, sunDot);
  let sunCorona = pow(sunDot, 360.0) * 1.65;
  let sunHalo = pow(sunDot, 118.0) * 0.11;
  color += SUN_COLOR * (sunDisk * 4.8 + sunCorona + sunHalo) * clamp(showSun, 0.0, 1.0);
  return color;
}

fn paperTexture(direction0: vec3f) -> vec3f {
  let direction = normalize(direction0);
  let uv = faceCoords(direction);
  let fine = 0.5 + 0.5 * sin(uv.x * 1180.0 + sin(uv.y * 91.0) * 3.2);
  let crossFiber = 0.5 + 0.5 * sin(uv.y * 730.0 + sin(uv.x * 63.0) * 2.4);
  let cell = vec3u(vec3i(floor(vec3f((uv + 2.0) * 360.0, 19.0))));
  let grain = unitFloat(pcg3d(cell).x);
  let fiber = (fine - 0.5) * 0.026 + (crossFiber - 0.5) * 0.018 + (grain - 0.5) * 0.032;
  let warm = vec3f(0.79, 0.765, 0.72);
  return warm * (0.94 + fiber);
}

export fn environmentColor(
  direction: vec3f,
  lightDirection: vec3f,
  showSun: f32,
  time: f32,
  paperBackground: f32,
) -> vec3f {
  let spaceField = spaceColor(direction, lightDirection, showSun, time);
  let captureCards = step(1.5, showSun);
  let cards = studioLightCards(direction) * captureCards;
  let blackStudio = spaceField + cards;
  let paperStudio = paperTexture(direction) + cards * 0.34;
  return mix(blackStudio, paperStudio, clamp(paperBackground, 0.0, 1.0));
}
