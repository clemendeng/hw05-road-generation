#version 300 es
precision highp float;

uniform int u_Terrain;
uniform bool u_Population;

in float terrain;
in float population;
out vec4 out_Col;

void main()
{
    vec3 target = vec3(0);
    if(u_Terrain != 0) {
        if(terrain < 0.f) {
            target = vec3(68.f / 255.f, 96.f / 255.f, 122.f / 255.f);
        } else if(u_Terrain == 1) {
            target = vec3(0.7, 0.7, 0.7);
        } else {
            target = vec3(0.5, terrain * 0.5 + 0.5, 0.5);
        }
    }
    if(u_Population) {
        float p;
        if(population < 0.25) {
            p = smoothstep(0.f, 0.25, population) / 3.f;
            p = 0.0;
        } else if(population < 0.45) {
            p = smoothstep(0.25, 0.45, population) / 3.f + 1.f / 3.f;
            p = 0.5;
        } else {
            p = smoothstep(0.45, 1.f, population) / 3.f + 2.f / 3.f;
            p = 1.0;
        }
        if(u_Terrain == 0 || target.z >= 0.5) {
            target = clamp(target + vec3(p * -0.2, -p * 0.2, -p * 0.2), 0.f, 1.f);
        }
    }
    out_Col = vec4(target, 1.0);
}
