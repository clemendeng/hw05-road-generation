import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Turtle from './Turtle';
import Mesh from './geometry/Mesh';
import {random1, fbmWorley} from './globals';

class BuildingSystem {
    turtle : Turtle;
    shapes: Mesh[];
    seed: number;
    verts: vec2[];
    //Instanced arrays to give to GPU
    //One array for each shape
    transform1Arrays : number[][];
    transform2Arrays : number[][];
    transform3Arrays : number[][];
    transform4Arrays : number[][];
    colorsArrays : number[][];
    nums : number[];
    
    constructor(builds : Mesh[]) {
        //Initialization
        this.turtle = new Turtle();
        this.shapes = builds;
        this.seed = 0.3;
        this.transform1Arrays = [];
        this.transform2Arrays = [];
        this.transform3Arrays = [];
        this.transform4Arrays = [];
        this.colorsArrays = [];
        this.nums = [0, 0, 0, 0];
        for(let i = 0; i < 4; i++) {
            this.transform1Arrays[i] = [];
            this.transform2Arrays[i] = [];
            this.transform3Arrays[i] = [];
            this.transform4Arrays[i] = [];
            this.colorsArrays[i] = [];
        }
    }

    toScreen(coord: vec2) : vec2 {
        //Converts to [-50, 50]
        vec2.divide(coord, coord, vec2.fromValues(100, 100));
        vec2.scale(coord, coord, 2);
        vec2.subtract(coord, coord, vec2.fromValues(1, 1));
        vec2.scale(coord, coord, 50);
        return coord;
    }
    
    population(coord: vec2) : number {
        //Computes same population value as flat shader
        let vs_Pos: vec2 = this.toScreen(vec2.clone(coord));
        //Computing population from vs_Pos
        let population = 1 - fbmWorley(vec2.scale(vec2.create(), vs_Pos, 12 / 250), 8, 3.2049);
        population = Math.pow(population, 2);
        //Computes smoothstep(0.f, 0.8, population)
        population = Math.max(Math.min((population - 0.0) / (0.8 - 0.0), 1), 0);
        population = population * population * (3 - 2 * population);
        return population;
    }

    updateVerts(vs: vec2[], c: vec2) {
        for(let i = 0; i < this.verts.length; i++) {
            if(vec2.equals(this.verts[i], c)) {
                this.verts.splice(i, 1);
                break;
            }
        }
        for(let i = 0; i < vs.length; i++) {
            this.verts.push(vec2.clone(vs[i]));
        }
    }

    generateBuildings(locations: vec2[]) {
        //Max height: 5, up to 4 different shapes
        for(let i = 0; i < locations.length; i++) {
            let type = Math.floor(this.population(locations[i]) * 3);
            if(this.population(locations[i]) < 0.25) {
                type = 0;
            } else if(this.population(locations[i]) < 0.45) {
                type = 1;
            } else {
                type = 2;
            }
            if(type == 0) {
                this.generateBuilding(locations[i], 0.75, 1.5, type);
            } else if(type == 1) {
                this.generateBuilding(locations[i], 1.5, 0.8, type);
            } else if(type == 2) {
                this.generateBuilding(locations[i], 3, 1.0, type);
            }
        }
    }

    //Ground is at y = 1
    generateBuilding(pos: vec2, height: number, gap: number, type: number) {
        this.turtle.color = vec4.fromValues(1, 1, 1, 1);
        if(type == 0) {
            this.turtle.scale = 2;
            this.turtle.color = vec4.fromValues(50 / 255, 70 / 255, 114 / 255, 1);
            vec4.multiply(this.turtle.color, this.turtle.color, vec4.fromValues(0.2, 0.2, 0.2, 1));
        } else if(type == 1) {
            this.turtle.scale = 1;
            this.turtle.color = vec4.fromValues(68 / 255, 187 / 255, 164 / 255, 1);
            vec4.multiply(this.turtle.color, this.turtle.color, vec4.fromValues(0.2, 0.2, 0.2, 1));
        } else if(type == 2) {
            this.turtle.scale = 1;
            this.turtle.color = vec4.fromValues(120 / 255, 140 / 255, 1, 1);
            vec4.multiply(this.turtle.color, this.turtle.color, vec4.fromValues(0.2, 0.2, 0.2, 1));
        }
        this.turtle.bPos = vec3.fromValues(pos[0], height + 1, pos[1]);
        let curr = height + 1;
        this.verts = [];
        let center = pos;
        do {
            //Choose random source primitive
            let shape = Math.floor(random1(this.seed) * 4);
            this.seed++;

            //Draw the primitive
            this.draw(shape, curr, center);
            curr -= gap;
            vec3.subtract(this.turtle.bPos, this.turtle.bPos, vec3.fromValues(0, gap, 0));
            //Update list of vertices
            let positions = this.shapes[shape].positions;
            let newVerts: vec2[] = [];
            for(let i = 0; i < positions.length; i += 8) {
                newVerts.push(vec2.fromValues(center[0] + positions[i], center[1] + positions[i + 2]));
            }
            this.updateVerts(newVerts, center);
            //Choose a new center point for additional geometry
            center = this.verts[Math.floor(random1(this.seed) * this.verts.length)];
            this.seed++;
        } while(curr > 0);
    }

    draw(i: number, dist: number, center: vec2) {
        let t : mat4 = this.turtle.getBTransform(dist);

        this.transform1Arrays[i].push(t[0]);
        this.transform1Arrays[i].push(t[1]);
        this.transform1Arrays[i].push(t[2]);
        this.transform1Arrays[i].push(t[3]);

        this.transform2Arrays[i].push(t[4]);
        this.transform2Arrays[i].push(t[5]);
        this.transform2Arrays[i].push(t[6]);
        this.transform2Arrays[i].push(t[7]);

        this.transform3Arrays[i].push(t[8]);
        this.transform3Arrays[i].push(t[9]);
        this.transform3Arrays[i].push(t[10]);
        this.transform3Arrays[i].push(t[11]);

        this.transform4Arrays[i].push(center[0]);
        this.transform4Arrays[i].push(t[13]);
        this.transform4Arrays[i].push(center[1]);
        this.transform4Arrays[i].push(t[15]);

        this.colorsArrays[i].push(this.turtle.color[0]);
        this.colorsArrays[i].push(this.turtle.color[1]);
        this.colorsArrays[i].push(this.turtle.color[2]);
        this.colorsArrays[i].push(this.turtle.color[3]);
        
        this.nums[i]++;
    }

}

export default BuildingSystem;