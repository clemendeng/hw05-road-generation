import {vec2, vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Plane from './geometry/Plane';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL, readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Mesh from './geometry/Mesh';
import RoadSystem from './RoadSystem';
import BuildingSystem from './BuildingSystem';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  highwayAngle: 20,
  highwayDensity: 0.35,
  roadSize: 3,
  terrain: 1,
  population: true
};

let square: Square;
let cube: Mesh;
let builds: Mesh[] = [];
let plane: Plane;
let screenQuad: ScreenQuad;
let time: number = 0.0;
let gen: boolean = false;

let width: number = 100;
let height: number = 100;
let seed: number = 15.8;

function loadScene() {
  square = new Square();
  square.create();
  square.setNumInstances(1);
  plane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(width, height), 20);
  plane.create();
  plane.setNumInstances(1);
  screenQuad = new ScreenQuad();
  screenQuad.create();

  let obj0: string = readTextFile('./cube.obj');
  cube = new Mesh(obj0, vec3.fromValues(0, 0, 0));
  cube.create();
  
  let obj3: string = readTextFile('./3gon.obj');
  let build3 = new Mesh(obj3, vec3.fromValues(0, 0, 0));
  build3.create();
  
  let obj4: string = readTextFile('./4gon.obj');
  let build4 = new Mesh(obj4, vec3.fromValues(0, 0, 0));
  build4.create();
  
  let obj5: string = readTextFile('./5gon.obj');
  let build5 = new Mesh(obj5, vec3.fromValues(0, 0, 0));
  build5.create();
  
  let obj6: string = readTextFile('./6gon.obj');
  let build6 = new Mesh(obj6, vec3.fromValues(0, 0, 0));
  build6.create();

  builds.push(build3);
  builds.push(build4);
  builds.push(build5);
  builds.push(build6);

  let roads : RoadSystem = new RoadSystem(width, height, controls.highwayAngle, controls.highwayDensity, controls.roadSize, seed);
  seed++;
  roads.startPopulation();
  roads.startGrid();
  //roads.terrainTest();
  //roads.occupiedTest();
  //roads.pointsTest();

  let transform1: Float32Array = new Float32Array(roads.transform1Array);
  let transform2: Float32Array = new Float32Array(roads.transform2Array);
  let transform3: Float32Array = new Float32Array(roads.transform3Array);
  let transform4: Float32Array = new Float32Array(roads.transform4Array);
  let color: Float32Array = new Float32Array(roads.colorsArray);
  cube.setInstanceVBOs(transform1, transform2, transform3, transform4, color);
  cube.setNumInstances(roads.numRoads);

  let buildings : BuildingSystem = new BuildingSystem(builds);
  buildings.generateBuildings(roads.generatePoints(1500));
  let transforms1 = buildings.transform1Arrays;
  let transforms2 = buildings.transform2Arrays;
  let transforms3 = buildings.transform3Arrays;
  let transforms4 = buildings.transform4Arrays;
  let colors = buildings.colorsArrays;
  for(let i = 0; i < builds.length; i++) {
    let t1 = new Float32Array(transforms1[i]);
    let t2 = new Float32Array(transforms2[i]);
    let t3 = new Float32Array(transforms3[i]);
    let t4 = new Float32Array(transforms4[i]);
    let c = new Float32Array(colors[i]);
    builds[i].setInstanceVBOs(t1, t2, t3, t4, c);
    builds[i].setNumInstances(buildings.nums[i]);
  }
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  let button = {generate:function(){gen = true}};
  gui.add(button, 'generate');
  gui.add(controls, 'highwayAngle', 10, 30);
  gui.add(controls, 'highwayDensity', 0.1, 0.5);
  gui.add(controls, 'roadSize', 2, 5);
  gui.add(controls, 'terrain', { Off: 0, LandWater: 1, On: 2 });
  gui.add(controls, 'population');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(40, 20, -40), vec3.fromValues(18.75, 0, -15));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/terrain-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {
    if(gen) {
      let roads : RoadSystem = new RoadSystem(width, height, controls.highwayAngle, controls.highwayDensity, controls.roadSize, seed);
      seed++;
      roads.startPopulation();
      roads.startGrid();

      let transform1: Float32Array = new Float32Array(roads.transform1Array);
      let transform2: Float32Array = new Float32Array(roads.transform2Array);
      let transform3: Float32Array = new Float32Array(roads.transform3Array);
      let transform4: Float32Array = new Float32Array(roads.transform4Array);
      let color: Float32Array = new Float32Array(roads.colorsArray);
      cube.setInstanceVBOs(transform1, transform2, transform3, transform4, color);
      cube.setNumInstances(roads.numRoads);

      let buildings : BuildingSystem = new BuildingSystem(builds);
      buildings.generateBuildings(roads.generatePoints(1500));
      let transforms1 = buildings.transform1Arrays;
      let transforms2 = buildings.transform2Arrays;
      let transforms3 = buildings.transform3Arrays;
      let transforms4 = buildings.transform4Arrays;
      let colors = buildings.colorsArrays;
      for(let i = 0; i < builds.length; i++) {
        let t1 = new Float32Array(transforms1[i]);
        let t2 = new Float32Array(transforms2[i]);
        let t3 = new Float32Array(transforms3[i]);
        let t4 = new Float32Array(transforms4[i]);
        let c = new Float32Array(colors[i]);
        builds[i].setInstanceVBOs(t1, t2, t3, t4, c);
        builds[i].setNumInstances(buildings.nums[i]);
      }

      gen = false;
    }

    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    renderer.clear();

    renderer.render(camera, flat, [square], controls.terrain, controls.population, width, height);

    renderer.render(camera, lambert, [plane], controls.terrain, controls.population, width, height);

    renderer.render(camera, instancedShader, [cube, builds[0], builds[1], builds[2], builds[3]], 
      controls.terrain, controls.population, width, height);
    
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    flat.setDimensions(window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  flat.setDimensions(window.innerWidth, window.innerHeight);

  // Start the render loop
  tick();
}

main();
