import { vec2, vec3, vec4, mat4, quat } from 'gl-matrix';
import {radians} from './globals';

class Turtle {
  position: vec2 = vec2.create();
  orientation: vec2 = vec2.create();
  bPos: vec3 = vec3.create();
  color: vec4 = vec4.fromValues(0, 0, 0, 1);
  scale: number = 1;

  constructor() {}

  copy(t : Turtle) {
    this.position = vec2.clone(t.position);
    this.orientation = vec2.clone(t.orientation);
    this.bPos = vec3.clone(t.bPos);
    this.color = vec4.clone(t.color);
    this.scale = t.scale;
    return this;
  }

  forward(d : number) {
    vec2.add(this.position, this.position, vec2.scale(vec2.create(), this.orientation, d));
  }

  rotate(d : number) {
    //Rotates d degrees counterclockwise
    let sind = Math.sin(radians(d));
    let cosd = Math.cos(radians(d));
    this.orientation = vec2.fromValues(cosd * this.orientation[0] - sind * this.orientation[1],
                                       sind * this.orientation[0] + cosd * this.orientation[1]);
  }

  getTransform(dist: number) : mat4 {
    let q: quat = quat.create();
    quat.rotationTo(q, vec3.fromValues(0, 0, 1), vec3.fromValues(this.orientation[0], 0, this.orientation[1]));
    let target : mat4 = mat4.create();
    mat4.fromRotationTranslationScale(target, q, vec3.fromValues(this.position[0], 1, this.position[1]), 
      vec3.fromValues(this.scale, 0.01, dist));
    return target;
  }

  getBTransform(dist: number) : mat4 {
    let q: quat = quat.create();
    quat.identity(q);
    let target : mat4 = mat4.create();
    mat4.fromRotationTranslationScale(target, q, this.bPos, vec3.fromValues(this.scale, dist, this.scale));
    return target;
  }
};

export default Turtle;