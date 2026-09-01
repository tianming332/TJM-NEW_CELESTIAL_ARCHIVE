import { pcg2d, unitFloat } from '@vgpu/wgsl-std/hash';

@group(0) @binding(0) var skyTexture: texture_2d<f32>;
@group(0) @binding(1) var crystalTexture: texture_2d<f32>;
@group(0) @binding(2) var sceneSampler: sampler;

fn rrtAndOdtFit(v: vec3f) -> vec3f {
  let a = v * (v + 0.0245786) - 0.000090537;
  let b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}

fn acesToneMap(color: vec3f) -> vec3f {
  let inputMat = mat3x3f(
    vec3f(0.59719, 0.07600, 0.02840),
    vec3f(0.35458, 0.90834, 0.13383),
    vec3f(0.04823, 0.01566, 0.83777)
  );
  let outputMat = mat3x3f(
    vec3f(1.60475, -0.10208, -0.00327),
    vec3f(-0.53108, 1.10813, -0.07276),
    vec3f(-0.07367, -0.00605, 1.07602)
  );
  return clamp(outputMat * rrtAndOdtFit(inputMat * color), vec3f(0.0), vec3f(1.0));
}

fn sceneAt(uv: vec2f) -> vec3f {
  let sky = textureSample(skyTexture, sceneSampler, uv);
  let crystal = textureSample(crystalTexture, sceneSampler, uv);
  return mix(sky.rgb, crystal.rgb, clamp(crystal.a, 0.0, 1.0));
}

fn highlightAt(uv: vec2f) -> vec3f {
  let sampleColor = sceneAt(uv);
  return max(sampleColor - vec3f(0.88), vec3f(0.0));
}

@fragment
fn fs_main(@builtin(position) coord: vec4f, @location(0) uvTop: vec2f) -> @location(0) vec4f {
  let uv = vec2f(uvTop.x, 1.0 - uvTop.y);
  var color = sceneAt(uv);
  let textureSize = vec2f(textureDimensions(skyTexture));
  let pixel = vec2f(1.0) / max(textureSize, vec2f(1.0));
  let radius = pixel * 2.4;
  var bloom = highlightAt(uv + vec2f(radius.x, 0.0)) + highlightAt(uv - vec2f(radius.x, 0.0));
  bloom += highlightAt(uv + vec2f(0.0, radius.y)) + highlightAt(uv - vec2f(0.0, radius.y));
  bloom += highlightAt(uv + radius) + highlightAt(uv - radius);
  bloom += highlightAt(uv + vec2f(radius.x, -radius.y)) + highlightAt(uv + vec2f(-radius.x, radius.y));
  color += bloom * 0.026;
  let vignette = smoothstep(0.92, 0.20, length(uv - 0.5) * 1.25);
  color *= 0.72 + vignette * 0.28;
  color = acesToneMap(color);
  let grain = (unitFloat(pcg2d(vec2u(coord.xy)).x) - 0.5) / 255.0;
  color += vec3f(grain);
  return vec4f(pow(max(color, vec3f(0.0)), vec3f(1.0 / 2.2)), 1.0);
}
