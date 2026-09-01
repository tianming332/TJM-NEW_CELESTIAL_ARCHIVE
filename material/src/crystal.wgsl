import { environmentColor, wavelengthTint } from './space-common.wgsl';

struct CrystalUniforms {
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
  reflectionPass: f32,
  floorY: f32,
}

@group(0) @binding(0) var<uniform> crystal: CrystalUniforms;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
}

struct VertexOutput {
  @builtin(position) clipPosition: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) worldNormal: vec3f,
}

fn rotX(a: f32) -> mat3x3f {
  let c = cos(a); let s = sin(a);
  return mat3x3f(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}

fn rotY(a: f32) -> mat3x3f {
  let c = cos(a); let s = sin(a);
  return mat3x3f(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

fn sparkleHash(position: vec3f) -> f32 {
  return fract(sin(dot(position, vec3f(127.1, 311.7, 74.7))) * 43758.5453);
}

fn facetSparkle(position: vec3f, time: f32) -> f32 {
  let scaled = position * 34.0;
  let cell = floor(scaled);
  let local = fract(scaled) - 0.5;
  let seed = sparkleHash(cell);
  let offset = vec3f(
    sparkleHash(cell + vec3f(13.1, 1.7, 9.2)),
    sparkleHash(cell + vec3f(4.6, 17.3, 2.8)),
    sparkleHash(cell + vec3f(8.4, 5.1, 21.9))
  ) - 0.5;
  let delta = local - offset * 0.58;
  let distance = min(length(delta.xy), min(length(delta.xz), length(delta.yz)));
  let point = smoothstep(0.115, 0.018, distance);
  let enabled = step(0.86, seed);
  let twinkle = 0.58 + 0.42 * sin(time * mix(1.4, 4.8, seed) + seed * 19.0);
  return enabled * point * twinkle;
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  let rotation = rotY(crystal.rotation.x) * rotX(crystal.rotation.y);
  var worldPosition = rotation * input.position * crystal.scale;
  worldPosition = vec3f(worldPosition.xy + crystal.positionOffset, worldPosition.z);
  var worldNormal = normalize(rotation * input.normal);
  if (crystal.reflectionPass > 0.5) {
    worldPosition.y = crystal.floorY * 2.0 - worldPosition.y;
    worldNormal.y = -worldNormal.y;
  }
  var output: VertexOutput;
  output.worldPosition = worldPosition;
  output.worldNormal = worldNormal;
  output.clipPosition = crystal.viewProjection * vec4f(worldPosition, 1.0);
  return output;
}

@fragment
fn fs_main(input: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  var normal = normalize(input.worldNormal);
  if (!frontFacing) { normal = -normal; }
  let viewDirection = normalize(crystal.cameraPosition - input.worldPosition);
  let lightDirection = normalize(crystal.lightDirection);
  let halfVector = normalize(lightDirection + viewDirection);
  let facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
  let f0Base = (crystal.ior - 1.0) / max(crystal.ior + 1.0, 0.001);
  let f0 = f0Base * f0Base;
  let fresnel = f0 + (1.0 - f0) * pow(1.0 - facing, 5.0);
  let lightGate = clamp(crystal.lightVisible, 0.0, 1.0);
  let diffuse = max(dot(normal, lightDirection), 0.0) * lightGate;
  let backLight = max(dot(-normal, lightDirection), 0.0) * lightGate;
  let specular = pow(max(dot(normal, halfVector), 0.0), 92.0) * lightGate;
  let globalGate = clamp(crystal.globalLight, 0.0, 1.0);
  let fillDirection = normalize(vec3f(-0.42, 0.72, 0.56));
  let fillOpposite = normalize(vec3f(0.58, -0.24, 0.78));
  let globalDiffuse = globalGate * (0.20 + max(dot(normal, fillDirection), 0.0) * 0.48 + max(dot(normal, fillOpposite), 0.0) * 0.22);
  let globalRim = globalGate * pow(1.0 - facing, 2.4) * 0.30;
  let globalHalf = normalize(fillDirection + viewDirection);
  let globalSpecular = globalGate * pow(max(dot(normal, globalHalf), 0.0), 44.0);
  let eta = 1.0 / max(crystal.ior, 1.001);
  let reflectionDirection = reflect(-viewDirection, normal);
  let refractionDirection = refract(-viewDirection, normal, eta);
  let cursorNormal = normalize(normal + vec3f(crystal.pointer.x, crystal.pointer.y, 0.0) * 0.075);
  let spread = crystal.dispersion * 0.031 * crystal.raysEnabled * lightGate;
  let refractedR = environmentColor(normalize(refractionDirection + cursorNormal * spread), lightDirection, 2.0, crystal.time, crystal.paperBackground).r;
  let refractedG = environmentColor(refractionDirection, lightDirection, 2.0, crystal.time, crystal.paperBackground).g;
  let refractedB = environmentColor(normalize(refractionDirection - cursorNormal * spread), lightDirection, 2.0, crystal.time, crystal.paperBackground).b;
  let refractedBase = vec3f(refractedR, refractedG, refractedB);
  let internalA = environmentColor(normalize(refractionDirection + normal * 0.115), lightDirection, 2.0, crystal.time, crystal.paperBackground);
  let internalB = environmentColor(normalize(refractionDirection - normal * 0.075), lightDirection, 2.0, crystal.time, crystal.paperBackground);
  let refracted = mix(refractedBase, (internalA + internalB) * 0.5, 0.19 + crystal.dispersion * 0.08);
  let reflected = environmentColor(reflectionDirection, lightDirection, 2.0, crystal.time, crystal.paperBackground);
  let wave = wavelengthTint(crystal.wavelength);
  let spectralMix = clamp(crystal.dispersion * crystal.raysEnabled * (0.30 + crystal.spectralPurity * 0.48), 0.0, 0.82);
  var tint = mix(crystal.color, normalize(wave * 0.82 + crystal.color * 0.18), spectralMix);
  if (crystal.modeIndex > 1.5 && crystal.modeIndex < 2.5) { tint = mix(tint, wave, 0.24 + crystal.dispersion * 0.46); }
  let opticalDepth = clamp(0.38 + (1.0 - facing) * 1.38 + length(input.worldPosition.xy) * 0.12, 0.28, 2.25);
  let absorbance = max(vec3f(0.035), (vec3f(1.0) - tint) * (1.15 + (1.0 - crystal.transmission) * 2.35));
  let volumeTransmission = exp(-absorbance * opticalDepth);
  let absorptionStrength = clamp(0.22 + (1.0 - crystal.transmission) * 0.42 + crystal.paperBackground * 0.18, 0.0, 0.86);
  let absorption = mix(vec3f(1.0), volumeTransmission, absorptionStrength);
  let volumeScatter = tint * (vec3f(1.0) - volumeTransmission) * (0.13 + backLight * 0.32 + globalDiffuse * 0.10);
  let transmitted = refracted * absorption * (0.72 + crystal.transmission * 0.74) + volumeScatter + tint * 0.014;
  var color = mix(tint * (0.035 + diffuse * 0.16 + backLight * 0.09), transmitted, 0.34 + crystal.transmission * 0.62);
  color = mix(color, reflected * 0.92 + tint * 0.15, fresnel * 0.86);
  color += tint * (0.04 + (1.0 - crystal.transmission) * 0.10);
  color += tint * crystal.paperBackground * (0.10 + fresnel * 0.20);
  color += tint * specular * 3.8;
  color += mix(tint, vec3f(1.0), 0.10) * globalDiffuse * (0.58 + crystal.paperBackground * 0.20 + (1.0 - crystal.transmission) * 0.20);
  color += reflected * globalRim * 0.42;
  color += mix(vec3f(1.0), tint, 0.42) * globalSpecular * 1.45;
  let studioStrip = pow(max(dot(normal, normalize(vec3f(-0.40, 0.66, 0.63) + viewDirection)), 0.0), 30.0);
  color += mix(vec3f(0.82, 0.94, 1.0), tint, 0.18) * studioStrip * (0.32 + lightGate * 0.54 + globalGate * 0.42);
  // Keep the illuminated interior chromatic while allowing the soft-box
  // reflections themselves to stay nearly white, as in a studio photograph.
  color += tint * (0.055 + crystal.transmission * 0.10) * (0.35 + backLight * 0.82 + globalDiffuse * 0.46);
  let chromaticBody = vec3f(0.40) + tint * 1.28;
  color = mix(color, color * chromaticBody, (1.0 - fresnel) * (0.26 + (1.0 - crystal.transmission) * 0.12));
  color += mix(vec3f(1.0), wave, crystal.raysEnabled) * backLight * crystal.transmission * (0.10 + crystal.raysEnabled * 0.22);
  let sparkle = facetSparkle(input.worldPosition, crystal.time);
  let spectralShare = clamp((crystal.transmission * 0.60 + backLight * 1.05 + crystal.dispersion * 0.48) * crystal.spectralPurity * crystal.raysEnabled, 0.0, 1.0);
  let sparkleTint = mix(vec3f(0.90, 0.94, 1.0), normalize(wave * 0.78 + crystal.color * 0.22), spectralShare);
  let sparkleGate = 0.15 + diffuse * 0.65 + backLight * 0.48 + globalDiffuse * 0.34 + fresnel * 0.34;
  color += sparkleTint * sparkle * sparkleGate * (1.50 + crystal.dispersion * crystal.raysEnabled * lightGate * 3.0);
  if (crystal.modeIndex > 0.5 && crystal.modeIndex < 1.5) {
    let band = 0.78 + 0.22 * sin((input.worldPosition.x + input.worldPosition.y * 1.6) * 17.0);
    color *= mix(vec3f(0.72), wave * 1.2, band * 0.35);
  }
  if (crystal.modeIndex > 2.5 && crystal.modeIndex < 3.5) {
    color += vec3f(pow(1.0 - facing, 7.0)) * 0.32;
  }
  // High transmission lowers interior coverage while Fresnel keeps the edges
  // readable. The composite pass reveals the same black-space or paper field
  // behind the mesh, matching the transmission example's environment logic.
  let bodyAlpha = mix(0.88, 0.16, clamp(crystal.transmission, 0.0, 1.0));
  var alpha = clamp(bodyAlpha + fresnel * 0.58 + specular * 0.12 + crystal.paperBackground * 0.08, 0.14, 0.94);
  if (crystal.reflectionPass > 0.5) {
    let reflectionDepth = clamp((input.worldPosition.y - crystal.floorY) / 1.35, 0.0, 1.0);
    let surfaceFade = (1.0 - smoothstep(0.06, 0.96, reflectionDepth)) * (1.0 - crystal.paperBackground * 0.88);
    let breakup = 0.72 + 0.28 * sin(input.worldPosition.x * 71.0 + input.worldPosition.z * 47.0);
    color = mix(color, tint * dot(color, vec3f(0.2126, 0.7152, 0.0722)), 0.52) * (0.30 + breakup * 0.14);
    alpha *= surfaceFade * 0.42;
  }
  return vec4f(max(color, vec3f(0.0)), alpha);
}
