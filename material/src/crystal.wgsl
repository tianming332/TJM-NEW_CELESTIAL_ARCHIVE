import { environmentColor, wavelengthTint } from './space-common.wgsl';
import { CrystalUniforms, rotX, rotY, traceMesh, fresnelDielectric, absorptionCoefficient, channelIor } from './optics-common.wgsl';

@group(1) @binding(0) var<storage, read> bvhNodes: array<vec4f>;
@group(1) @binding(1) var<storage, read> bvhTriangles: array<vec4f>;

@group(0) @binding(0) var<uniform> crystal: CrystalUniforms;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
}
struct VertexOutput {
  @builtin(position) clipPosition: vec4f,
  @location(0) localPosition: vec3f,
  @location(1) localNormal: vec3f,
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  let rotation = rotY(crystal.rotation.x) * rotX(crystal.rotation.y);
  let world = rotation * input.position * crystal.scale + vec3f(crystal.positionOffset, 0.0);
  return VertexOutput(crystal.viewProjection * vec4f(world, 1.0), input.position, input.normal);
}

fn environment(direction: vec3f) -> vec3f {
  return environmentColor(direction, crystal.lightDirection, 2.0, crystal.time, crystal.paperBackground);
}

fn transmittedChannel(entry: vec3f, incident: vec3f, normal: vec3f, channel: u32) -> f32 {
  let rotation = rotY(crystal.rotation.x) * rotX(crystal.rotation.y);
  let ior = channelIor(crystal.ior, crystal.dispersion * crystal.opticsEnabled, channel);
  let absorb = absorptionCoefficient(crystal.color, crystal.transmission)[channel];
  var direction = refract(incident, normal, 1.0 / ior);
  var position = entry + direction * 0.0003;
  var throughput = 1.0;
  var radiance = 0.0;
  // Split off escaping light at each interface; follow reflected light further,
  // including total internal reflection. Ray distances give actual STL thickness.
  for (var bounce = 0u; bounce < u32(crystal.maxBounces); bounce++) {
    let hit = traceMesh(&bvhNodes, &bvhTriangles, position, direction, true);
    if (hit.distance > 1e5) {
      radiance += throughput * environment(rotation * direction)[channel];
      break;
    }
    position += direction * hit.distance;
    throughput *= exp(-absorb * hit.distance * crystal.scale);
    let outward = select(-hit.normal, hit.normal, dot(direction, hit.normal) >= 0.0);
    let escaping = refract(direction, -outward, ior);
    let f = fresnelDielectric(dot(direction, outward), ior, 1.0);
    if (dot(escaping, escaping) > 0.01) {
      radiance += throughput * (1.0 - f) * environment(rotation * escaping)[channel];
    }
    throughput *= f;
    if (throughput < 0.008) { break; }
    direction = reflect(direction, outward);
    position += direction * 0.0003;
  }
  return radiance;
}

// Interactive quality shares the green geometric path, then disperses all three
// wavelengths at its exit facets. Fine quality traces three independent paths.
fn transmittedInteractive(entry: vec3f, incident: vec3f, normal: vec3f) -> vec3f {
  let rotation = rotY(crystal.rotation.x) * rotX(crystal.rotation.y);
  let absorb = absorptionCoefficient(crystal.color, crystal.transmission);
  var direction = refract(incident, normal, 1.0 / crystal.ior);
  var position = entry + direction * 0.0003;
  var throughput = vec3f(1.0);
  var radiance = vec3f(0.0);
  for (var bounce = 0u; bounce < u32(crystal.maxBounces); bounce++) {
    let hit = traceMesh(&bvhNodes, &bvhTriangles, position, direction, true);
    if (hit.distance > 1e5) {
      radiance += throughput * environment(rotation * direction);
      break;
    }
    position += direction * hit.distance;
    throughput *= exp(-absorb * hit.distance * crystal.scale);
    let outward = select(-hit.normal, hit.normal, dot(direction, hit.normal) >= 0.0);
    var fresnel = vec3f(1.0);
    for (var channel = 0u; channel < 3u; channel++) {
      let ior = channelIor(crystal.ior, crystal.dispersion * crystal.opticsEnabled, channel);
      let escaping = refract(direction, -outward, ior);
      fresnel[channel] = fresnelDielectric(dot(direction, outward), ior, 1.0);
      if (dot(escaping, escaping) > 0.01) {
        radiance[channel] += throughput[channel] * (1.0 - fresnel[channel]) *
          environment(rotation * escaping)[channel];
      }
    }
    throughput *= fresnel;
    if (max(max(throughput.x, throughput.y), throughput.z) < 0.008) { break; }
    direction = reflect(direction, outward);
    position += direction * 0.0003;
  }
  return radiance;
}

@fragment
fn fs_main(input: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
  let rotation = rotY(crystal.rotation.x) * rotX(crystal.rotation.y);
  let inverse = transpose(rotation);
  let world = rotation * input.localPosition * crystal.scale + vec3f(crystal.positionOffset, 0.0);
  let view = normalize(crystal.cameraPosition - world);
  var normal = normalize(input.localNormal);
  if (!frontFacing) { normal = -normal; }
  let worldNormal = rotation * normal;
  let incident = inverse * -view;
  let facing = max(dot(view, worldNormal), 0.0);
  let f = fresnelDielectric(facing, 1.0, crystal.ior);
  var transmitted = vec3f(0.0);
  if (crystal.maxBounces > 4.0) {
    for (var channel = 0u; channel < 3u; channel++) {
      transmitted[channel] = transmittedChannel(input.localPosition, incident, normal, channel);
    }
  } else {
    transmitted = transmittedInteractive(input.localPosition, incident, normal);
  }
  let reflected = environment(reflect(-view, worldNormal));
  let key = max(dot(worldNormal, crystal.lightDirection), 0.0) * crystal.lightVisible;
  let spec = pow(max(dot(worldNormal, normalize(view + crystal.lightDirection)), 0.0), 220.0);
  let tint = pow(max(crystal.color, vec3f(0.02)), vec3f(1.6));
  let body = tint * (0.024 + key * 0.16 + crystal.globalLight * 0.20) * (1.0 - crystal.transmission);
  var color = reflected * f + transmitted * (1.0 - f) + body;
  color += vec3f(1.0, 0.97, 0.91) * spec * crystal.lightVisible * f * 5.0;
  color += tint * crystal.globalLight * (0.035 + pow(1.0 - facing, 3.0) * 0.09);
  if (crystal.modeIndex > 0.5 && crystal.modeIndex < 1.5) {
    let band = 0.5 + 0.5 * sin((input.localPosition.x + input.localPosition.y * 1.6) * 17.0);
    color *= mix(vec3f(0.9), vec3f(1.04), band);
  }
  if (crystal.modeIndex > 1.5 && crystal.modeIndex < 2.5) {
    color *= mix(vec3f(1.0), wavelengthTint(crystal.wavelength) * 1.5, 0.12 * crystal.opticsEnabled);
  }
  if (crystal.modeIndex > 2.5 && crystal.modeIndex < 3.5) {
    color += vec3f(pow(1.0 - facing, 7.0)) * 0.08;
  }
  // Full coverage: light has already travelled through the volume. Blending
  // the unbent background over it a second time would erase the refraction.
  return vec4f(max(color, vec3f(0.0)), 1.0);
}
