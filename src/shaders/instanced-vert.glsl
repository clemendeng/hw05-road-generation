#version 300 es

in vec4 vs_Pos; // Non-instanced; each particle is the same quad drawn in a different place
in vec4 vs_Col; // An instanced rendering attribute; each particle instance has a different color
in vec4 vs_Transform1;
in vec4 vs_Transform2;
in vec4 vs_Transform3;
in vec4 vs_Transform4;

uniform float u_Width;
uniform float u_Height;

out vec4 fs_Col;

void main()
{
    fs_Col = vs_Col;
    mat4 transform = mat4(vs_Transform1, vs_Transform2, vs_Transform3, vs_Transform4);
    vec4 roadPos = transform * vs_Pos;
    roadPos = vec4((roadPos.x * 2.f / u_Width) - 1.f, (roadPos.y * 2.f / u_Height) - 1.f, 0, 1);
    gl_Position = roadPos;
}
