import {vec2} from 'gl-matrix';

export var gl: WebGL2RenderingContext;
export function setGL(_gl: WebGL2RenderingContext) {
  gl = _gl;
}

// Converts from degrees to radians.
export function radians(degrees : number) {
  return degrees * Math.PI / 180;
};

export function floor(v: vec2) {
    return vec2.floor(vec2.create(), v);
}

function random2( p: vec2 , seed: vec2) {
  // let v = vec2.fromValues(vec2.dot(vec2.add(vec2.create(), p, seed), vec2.fromValues(311.7, 127.1)), 
  //                         vec2.dot(vec2.add(vec2.create(), p, seed), vec2.fromValues(269.5, 183.3)));
  let x1 = p[0] + seed[0];
  let x2 = p[1] + seed[1];
  let v = vec2.fromValues(x1 * 311.7 + x2 * 127.1,
                          x1 * 269.5 + x2 * 183.3);
  //sin
  v = vec2.fromValues(Math.sin(v[0]), Math.sin(v[1]));
  //fract
  return vec2.fromValues(v[0] - Math.floor(v[0]), v[1] - Math.floor(v[1]));
}

function worleyPoint(x: number, y: number, seed: number) {
  //The random point inside grid cell (x, y)
  return random2(vec2.fromValues(13.72 * x * seed, 2.38 * y * seed), vec2.fromValues(0.28, 0.328));
}

function worley(pos: vec2, seed: number) {
  //Calculating which unit the pixel lies in
  let x = Math.floor(pos[0]);
  let y = Math.floor(pos[1]);
  //Calculating closest distance
  let dist = 100000;
  for(let i = x - 1; i < x + 2; i++) {
    for(let j = y - 1; j < y + 2; j++) {
      let point = vec2.fromValues(i + worleyPoint(i, j, seed)[0], j + worleyPoint(i, j, seed)[1]);
      if(vec2.distance(pos, point) < dist) {
        dist = vec2.distance(pos, point);
      }
    }
  }
  return Math.min(Math.max(dist, 0), 1);
}

export function fbmWorley(pos: vec2, octaves: number, seed: number) {
  let total = 0;
  let persistence = 0.5;

  for(let i = 0; i < octaves; i++) {
    let freq = Math.pow(2, i);
    //divide by 2 so that max is 1
    let amp = Math.pow(persistence, i) / 2;
    total += worley(vec2.scale(vec2.create(), pos, freq), seed) * amp;
  }

  return total;
}