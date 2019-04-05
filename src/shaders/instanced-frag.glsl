#version 300 es
precision highp float;

in vec4 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col;

void main()
{
    vec3 target = vec3(0);

    //Key light
    vec3 sunColor = vec3(252.f / 255.f, 212.f / 255.f, 196.f / 255.f) * 1.25;
    vec3 sunPos = vec3(-50, 50, -50);
    vec3 toSun = normalize(sunPos - vec3(fs_Pos));
    float sunIntensity = clamp(dot(toSun, vec3(fs_Nor)), 0.f, 1.f);
    target += vec3(fs_Col) * sunColor * sunIntensity;

    //Back light
    vec3 sunColor2 = vec3(0.5, 1, 1) * vec3(252.f / 255.f, 212.f / 255.f, 196.f / 255.f) * 1.25 * 0.2;
    vec3 sunPos2 = vec3(50, 0, 50);
    vec3 toSun2 = normalize(sunPos2 - vec3(fs_Pos));
    float sunIntensity2 = clamp(dot(toSun2, vec3(fs_Nor)), 0.f, 1.f);
    target += vec3(fs_Col) * sunColor2 * sunIntensity2;

    //Fill lights
    vec3 skyColor = vec3(132.f / 255.f, 214.f / 255.f, 255.f / 255.f) * 0.15;
    vec3 skyPos = vec3(50, 100, -50);
    vec3 toSky = normalize(skyPos - vec3(fs_Pos));
    float skyIntensity = clamp(dot(toSky, vec3(fs_Nor)), 0.f, 1.f);
    target += vec3(fs_Col) * skyColor * skyIntensity;
    
    vec3 skyColor2 = vec3(132.f / 255.f, 214.f / 255.f, 255.f / 255.f) * 0.15;
    vec3 skyPos2 = vec3(-50, 100, 50);
    vec3 toSky2 = normalize(skyPos2 - vec3(fs_Pos));
    float skyIntensity2 = clamp(dot(toSky2, vec3(fs_Nor)), 0.f, 1.f);
    target += vec3(fs_Col) * skyColor2 * skyIntensity2;

    target = pow(target, vec3(1.f / 3.5));
    out_Col = vec4(target, 1);
}
