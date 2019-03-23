#version 300 es
precision highp float;

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;

uniform int u_Terrain;
uniform bool u_Population;

in vec2 fs_Pos;
out vec4 out_Col;

vec2 random2( vec2 p , vec2 seed) {
  return fract(
            sin(
              vec2(
                dot(p + seed, vec2(311.7, 127.1)), 
                dot(p + seed, vec2(269.5, 183.3)))
            ));
}

vec2 worleyPoint(float x, float y, float seed) {
  //The random point inside grid cell (x, y)
  return random2(vec2(13.72 * x * seed, 2.38 * y * seed), vec2(0.28, 0.328));
}

float worley(vec2 pos, float seed) {
  //Calculating which unit the pixel lies in
  float x = floor(pos[0]);
  float y = floor(pos[1]);
  //Calculating closest distance
  float dist = 100000.f;
  for(float i = x - 1.f; i < x + 2.f; i++) {
    for(float j = y - 1.f; j < y + 2.f; j++) {
      vec2 point = vec2(i + worleyPoint(i, j, seed)[0], j + worleyPoint(i, j, seed)[1]);
      if(distance(pos, point) < dist) {
        dist = distance(pos, point);
      }
    }
  }
  return clamp(dist, 0.f, 1.f);
}

float fbmWorley(vec2 pos, float octaves, float seed) {
  float total = 0.f;
  float persistence = 0.5f;

  for(float i = 0.f; i < octaves; i++) {
    float freq = pow(2.f, i);
    //divide by 2 so that max is 1
    float amp = pow(persistence, i) / 2.f;
    total += worley(pos * float(freq), seed) * amp;
  }

  return total;
}

void main() {
  vec3 target = vec3(0);
  float terrain = 1.f - fbmWorley(fs_Pos / 1.2 - vec2(0, 1), 8.f, 1.46);
  terrain = (terrain - 0.55) / 0.45;

  if(u_Terrain != 0) {
    if(terrain < 0.f) {
      target = vec3(0.5, 0.8, 1);
    } else if(u_Terrain == 1) {
      target = vec3(0, 0.5, 0);
    } else {
      target = vec3(0, terrain * 0.7 + 0.3, 0);
    }
  }

  float population = 1.f - fbmWorley(fs_Pos * 2.f, 8.f, 3.2049);
  population = pow(population, 2.f);
  population = smoothstep(0.f, 0.8, population);

  if(u_Population) {
    if(u_Terrain == 0 || target.z == 0.f) {
      target = clamp(target + vec3(population, -population * 0.2, 0), 0.f, 1.f);
    }
  }
  //target = vec3(0.5, 0.8, 1);
  out_Col = vec4(target, 1.0);
}
