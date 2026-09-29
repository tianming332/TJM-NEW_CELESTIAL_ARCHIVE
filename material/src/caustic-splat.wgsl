@group(0) @binding(0) var<uniform> viewProjection: mat4x4f;
@group(0) @binding(1) var<storage, read> photons: array<vec4f>;

struct SplatVertex {
  @builtin(position) clip: vec4f,
  @location(0) local: vec2f,
  @location(1) energy: vec3f,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> SplatVertex {
  let corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  let photon = photons[instance * 2u];
  let energy = photons[instance * 2u + 1u];
  let corner = corners[vertex];
  let world = photon.xyz + vec3f(corner.x, 0.0, corner.y) * photon.w;
  var clip = viewProjection * vec4f(world, 1.0);
  if (energy.w < 0.5) { clip = vec4f(2.0, 2.0, 2.0, 1.0); }
  return SplatVertex(clip, corner, energy.rgb);
}

@fragment
fn fs_main(input: SplatVertex) -> @location(0) vec4f {
  let r2 = dot(input.local, input.local);
  let kernel = exp(-r2 * 3.5) * (1.0 - smoothstep(0.70, 1.0, r2));
  return vec4f(input.energy * kernel, 0.0);
}
