import { vec2, vec3, vec4, mat4, quat } from 'gl-matrix';
import {radians} from './globals';

class Turtle {
  position: vec2 = vec2.create();
  orientation: vec2 = vec2.create();
  color: vec4 = vec4.fromValues(0, 0, 0, 1);
  scale: number = 1;

  constructor() {}

  copy(t : Turtle) {
    this.position = vec2.clone(t.position);
    this.orientation = vec2.clone(t.orientation);
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
    quat.rotationTo(q, vec3.fromValues(0, 1, 0), vec3.fromValues(this.orientation[0], this.orientation[1], 0));
    let target : mat4 = mat4.create();
    mat4.fromRotationTranslationScale(target, q, vec3.fromValues(this.position[0], this.position[1], 0), 
      vec3.fromValues(this.scale, dist, 1));
    return target;
  }
};

export default Turtle;