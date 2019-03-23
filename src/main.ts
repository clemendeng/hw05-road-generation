import {vec2, vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL, fbmWorley} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import RoadSystem from './RoadSystem';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  highwayAngle: 20,
  highwayDensity: 0.35,
  roadSize: 3,
  terrain: 2,
  population: true
};

let square: Square;
let screenQuad: ScreenQuad;
let time: number = 0.0;
let gen: boolean = false;

let height: number = 50;
let width: number = height * window.innerWidth / window.innerHeight;

function loadScene() {
  //side length 1 centered at origin
  square = new Square();
  square.create();
  screenQuad = new ScreenQuad();
  screenQuad.create();

  //DIMENSIONS FOR NOISE CALCULATION
  //window.innerWidth, window.innerHeight, fs_Pos is -1 to 1

  let city : RoadSystem = new RoadSystem(width, height, 5, controls.highwayAngle, controls.highwayDensity, controls.roadSize);
  city.startPopulation();
  city.startGrid();

  let transform1: Float32Array = new Float32Array(city.transform1Array);
  let transform2: Float32Array = new Float32Array(city.transform2Array);
  let transform3: Float32Array = new Float32Array(city.transform3Array);
  let transform4: Float32Array = new Float32Array(city.transform4Array);
  let color: Float32Array = new Float32Array(city.colorsArray);
  square.setInstanceVBOs(transform1, transform2, transform3, transform4, color);
  square.setNumInstances(city.numRoads);
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

  const camera = new Camera(vec3.fromValues(50, 50, 10), vec3.fromValues(50, 50, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {
    if(gen) {
      let city : RoadSystem = new RoadSystem(width, height, 5, controls.highwayAngle, controls.highwayDensity, controls.roadSize);
      city.startPopulation();
      city.startGrid();

      let transform1: Float32Array = new Float32Array(city.transform1Array);
      let transform2: Float32Array = new Float32Array(city.transform2Array);
      let transform3: Float32Array = new Float32Array(city.transform3Array);
      let transform4: Float32Array = new Float32Array(city.transform4Array);
      let color: Float32Array = new Float32Array(city.colorsArray);
      square.setInstanceVBOs(transform1, transform2, transform3, transform4, color);
      square.setNumInstances(city.numRoads);
      gen = false;
    }

    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    renderer.clear();
    renderer.render(camera, flat, [screenQuad], controls.terrain, controls.population, width, height);
    renderer.render(camera, instancedShader, [
      square,
    ], controls.terrain, controls.population, width, height);
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
