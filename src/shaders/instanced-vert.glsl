#version 300 es

in vec4 vs_Pos; // Non-instanced; each particle is the same quad drawn in a different place
in vec4 vs_Nor;
in vec4 vs_Col; // An instanced rendering attribute; each particle instance has a different color
in vec4 vs_Transform1;
in vec4 vs_Transform2;
in vec4 vs_Transform3;
in vec4 vs_Transform4;

uniform mat4 u_ViewProj;
uniform float u_Width;
uniform float u_Height;

out vec4 fs_Pos;
out vec4 fs_Nor;
out vec4 fs_Col;

void main()
{
    fs_Pos = vs_Pos;
    fs_Nor = vs_Nor;
    fs_Col = vs_Col;
    mat4 transform = mat4(vs_Transform1, vs_Transform2, vs_Transform3, vs_Transform4);
    vec4 roadPos = transform * vs_Pos;
    roadPos = roadPos - vec4(u_Width / 2.f, 0, u_Height / 2.f, 0);
    gl_Position = u_ViewProj * roadPos;
}
