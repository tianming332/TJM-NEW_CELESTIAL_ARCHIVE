import { CrystalUniforms, rotX, rotY, traceMesh, fresnelDielectric, absorptionCoefficient, channelIor } from './optics-common.wgsl';

@group(1) @binding(0) var<storage, read> bvhNodes: array<vec4f>;
@group(1) @binding(1) var<storage, read> bvhTriangles: array<vec4f>;

@group(0) @binding(0) var<uniform> crystal: CrystalUniforms;
// Two vec4s per photon: world-space landing position/radius, RGB energy/valid.
@group(0) @binding(1) var<storage, read_write> photons: array<vec4f>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let grid = u32(crystal.photonGrid);
  let count = grid * grid;
  if (id.x >= count * 3u) { return; }
  let offset = id.x * 2u;
  photons[offset] = vec4f(0.0);
  photons[offset + 1u] = vec4f(0.0);
  let channel = id.x / count;
  let index = id.x % count;
  // Stable stratification avoids randomly flickering caustics.
  let uv = (vec2f(f32(index % grid), f32(index / grid)) + 0.5) / f32(grid) * 2.0 - 1.0;
  let rotation = rotY(crystal.rotation.x) * rotX(crystal.rotation.y);
  let inverse = transpose(rotation);
  let light = normalize(crystal.lightDirection);
  let right = normalize(cross(vec3f(0.0, 0.0, 1.0), light));
  let up = normalize(cross(light, right));
  var position = inverse * (light * 3.0 + (right * uv.x + up * uv.y) * 1.72);
  var direction = inverse * -light;
  let entry = traceMesh(&bvhNodes, &bvhTriangles, position, direction, false);
  if (entry.distance > 1e5) { return; }
  position += direction * entry.distance;
  let normal = select(-entry.normal, entry.normal, dot(direction, entry.normal) < 0.0);
  let ior = channelIor(crystal.ior, crystal.dispersion * crystal.opticsEnabled, channel);
  var energy = 1.0 - fresnelDielectric(dot(-direction, normal), 1.0, ior);
  direction = refract(direction, normal, 1.0 / ior);
  position += direction * 0.0003;
  let absorption = absorptionCoefficient(crystal.color, crystal.transmission)[channel];
  for (var bounce = 0u; bounce < 4u; bounce++) {
    let hit = traceMesh(&bvhNodes, &bvhTriangles, position, direction, true);
    if (hit.distance > 1e5) { return; }
    energy *= exp(-absorption * hit.distance * crystal.scale);
    position += direction * hit.distance;
    let outward = select(-hit.normal, hit.normal, dot(direction, hit.normal) >= 0.0);
    let escaped = refract(direction, -outward, ior);
    if (dot(escaped, escaped) > 0.01) {
      energy *= 1.0 - fresnelDielectric(dot(direction, outward), ior, 1.0);
      let world = rotation * position * crystal.scale + vec3f(crystal.positionOffset, 0.0);
      let outgoing = rotation * escaped;
      if (outgoing.y >= -0.04) { return; }
      let distance = (crystal.floorY - world.y) / outgoing.y;
      if (distance <= 0.0 || distance > 9.0) { return; }
      let landing = world + outgoing * distance;
      // Constant flux per footprint: overlapping rays concentrate real mesh
      // transmission, not a decorative noise texture unrelated to the specimen.
      let radius = 3.44 / f32(grid) * crystal.scale * 2.5;
      var rgb = vec3f(0.0);
      rgb[channel] = energy * crystal.lightVisible * crystal.causticsEnabled * 0.4125;
      photons[offset] = vec4f(landing, radius);
      photons[offset + 1u] = vec4f(rgb, 1.0);
      return;
    }
    direction = reflect(direction, outward);
    position += direction * 0.0003;
  }
}
