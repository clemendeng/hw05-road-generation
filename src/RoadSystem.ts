import {vec2, vec4, mat4} from 'gl-matrix';
import Turtle from './Turtle';
import {floor, fbmWorley} from './globals';
import { on } from 'cluster';

class Road {
    a : vec2;
    b : vec2;
    constructor(a : vec2, b : vec2) {
        this.a = a;
        this.b = b;
    }
}

//Returns whether point is on the road
function isOn(point: vec2, road: Road) {
    let a = road.a;
    let b = road.b;
    let c = point;
    let crossproduct = (c[1] - a[1]) * (b[0] - a[0]) - (c[0] - a[0]) * (b[1] - a[1]);
    let epsilon = 0.01;
    // compare versus epsilon for floating point values, or != 0 if using integers
    if(Math.abs(crossproduct) > epsilon) {
        return false;
    }

    let dotproduct = (c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1])*(b[1] - a[1]);
    if(dotproduct < 0) {
        return false;
    }

    let squaredlengthba = (b[0] - a[0])*(b[0] - a[0]) + (b[1] - a[1])*(b[1] - a[1])
    if(dotproduct > squaredlengthba) {
        return false;
    }
    return true;
}

//Returns closest point on road to point
function roadInt(point: vec2, road: Road) {
    //Road: y = m * x + b
    let m : number;
    if(road.b[0] - road.a[0] == 0) {
        m = 100000;
    } else {
        m = (road.b[1] - road.a[1]) / (road.b[0] - road.a[0]);
    }
    let b = road.a[1] - m * road.a[0];

    //Point: y = pm * x + pb
    let pm : number;
    if(m == 0) {
        pm = 10000;
    } else {
        pm = -1 / m;
    }
    let pb = point[1] - pm * point[0];

    //m * x + b = pm * x + pb
    //m * x - pm * x = pb - b
    //x = (pb - b) / (m - pm)
    let x = (pb - b) / (m - pm);
    let y = m * x + b;
    if((x > road.a[0] && x > road.b[0]) ||
       (x < road.a[0] && x < road.b[0]) ||
       (y > road.a[1] && y > road.b[1]) ||
       (y < road.a[1] && y < road.b[1])) {
        if(vec2.distance(point, road.a) > vec2.distance(point, road.b)) {
            return vec2.clone(road.b);
        }
        return vec2.clone(road.a);
    }
    let target = vec2.fromValues(x, y);
    if(vec2.distance(target, road.a) < 1) {
        return vec2.clone(road.a);
    }
    if(vec2.distance(target, road.b) < 1) {
        return vec2.clone(road.b);
    }
    return target;
}

//Returns distance to intersection point
function roadsInt(r1: Road, r2: Road) {
    if(vec2.equals(r1.b, r2.a) || vec2.equals(r1.b, r2.b)) {
        return vec2.distance(r1.a, r1.b);
    }
    //y = mx + b
    let m1 : number;
    if(r1.b[0] - r1.a[0] == 0) {
        m1 = 100000;
    } else {
        m1 = (r1.b[1] - r1.a[1]) / (r1.b[0] - r1.a[0]);
    }
    let b1 = r1.a[1] - m1 * r1.a[0];

    let m2 : number;
    if(r2.b[0] - r2.a[0] == 0) {
        m2 = 100000;
    } else {
        m2 = (r2.b[1] - r2.a[1]) / (r2.b[0] - r2.a[0]);
    }
    let b2 = r2.a[1] - m2 * r2.a[0];

    if(m1 - m2 != 0) {
        let x = (b2 - b1) / (m1 - m2);
        let y = m1 * x + b1;
        let point = vec2.fromValues(x, y);
        let dist1 = vec2.distance(r1.a, r1.b);
        let dist2 = vec2.distance(r2.a, r2.b);
        if(vec2.distance(point, r1.a) <= dist1 && vec2.distance(point, r1.b) <= dist1 &&
           vec2.distance(point, r2.a) <= dist2 && vec2.distance(point, r2.b) <= dist2) {
            return vec2.distance(r1.a, point);
        }
    }
}

class RoadSystem {
    width : number;
    height : number;
    stepSize : number;
    highwayAngle : number;
    highwayDensity : number;
    roadSize : number;

    turtle : Turtle;
    stack : Turtle[];

    //Arrays to keep track of map
    //Grid unit of 1
    roads : Road[][][];
    filled : boolean[][];
    //Grid unit of stepSize
    highways : Road[][][];
    highwayIntersections : vec2[][][];

    //Instanced arrays to give to GPU
    transform1Array : number[];
    transform2Array : number[];
    transform3Array : number[];
    transform4Array : number[];
    colorsArray : number[];
    numRoads : number;

    toScreen(coord: vec2) : vec2 {
        //Converts to [-1, 1]
        vec2.divide(coord, coord, vec2.fromValues(this.width, this.height));
        vec2.scale(coord, coord, 2);
        vec2.subtract(coord, coord, vec2.fromValues(1, 1));
        return coord;
    }

    terrain(coord: vec2) : number {
        //Computes same terrain value as flat shader
        let fs_Pos: vec2 = this.toScreen(vec2.clone(coord));
        //Computing terrain from fs_Pos
        let terrain = 1 - fbmWorley(vec2.subtract(
                                        vec2.create(), vec2.scale(vec2.create(), fs_Pos, 1 / 1.2), vec2.fromValues(0, 1)
                                    ), 8, 1.46);
        terrain = (terrain - 0.55) / 0.45;
        return terrain;
    }
    
    population(coord: vec2) : number {
        //Computes same population value as flat shader
        let fs_Pos: vec2 = this.toScreen(vec2.clone(coord));
        //Computing population from fs_Pos
        let population = 1 - fbmWorley(vec2.scale(vec2.create(), fs_Pos, 2), 8, 3.2049);
        population = Math.pow(population, 2);
        //Computes smoothstep(0.1, 0.8, population)
        population = Math.max(Math.min((population - 0.0) / (0.8 - 0.0), 1), 0);
        population = population * population * (3 - 2 * population);
        return population;
    }

    highIndex(coord: vec2) : vec2 {
        let t = vec2.create();
        vec2.scale(t, coord, 1 / this.stepSize);
        return floor(t);
    }

    constructor(width: number, height: number, stepSize: number, hAngle: number, hDensity: number, rSize: number) {
        this.width = width;
        this.height = height;
        this.stepSize = stepSize;
        this.highwayAngle = hAngle;
        this.highwayDensity = hDensity;
        this.roadSize = rSize;
        //Initialize turtle
        this.turtle = new Turtle();
        //Initialize arrays
        this.stack = [];
        this.roads = [];
        this.filled = [];
        this.highways = [];
        this.highwayIntersections = [];
        for(let i = 0; i < width; i++) {
            this.roads[i] = [];
            this.filled[Math.floor(i / stepSize)] = [];
            this.highways[Math.floor(i / stepSize)] = [];
            this.highwayIntersections[Math.floor(i / stepSize)] = [];
            for(let j = 0; j < height; j++) {
                this.roads[i][j] = [];
                this.highways[Math.floor(i / stepSize)][Math.floor(j / stepSize)] = [];
                this.highwayIntersections[Math.floor(i / stepSize)][Math.floor(j / stepSize)] = [];
            }
        }
        this.transform1Array = [];
        this.transform2Array = [];
        this.transform3Array = [];
        this.transform4Array = [];
        this.colorsArray = [];
        this.numRoads = 0;
    }

    terrainTest() {
        //visualize CPU terrain
        this.turtle.scale = .5;
        this.turtle.orientation = vec2.fromValues(0, 1);
        for(let i = 0; i < this.width / this.stepSize; i++) {
            for(let j = 0; j < this.height / this.stepSize; j++) {
                let pos = vec2.fromValues(i * this.stepSize, j * this.stepSize);
                if(this.terrain(pos) >= 0) {
                    this.turtle.color = vec4.fromValues(0, 0.5, 0, 1);
                    this.turtle.position = pos;
                    this.drawRoad(.5);
                }
            }
        }
    }

    movePos(t: Turtle, dist: number) {
        return vec2.add(vec2.create(), t.position, vec2.scale(vec2.create(), t.orientation, dist));
    }

    checkValid(pos: vec2) {
        if(this.terrain(pos) < 0 || pos[0] >= this.width || pos[0] < 0 ||
                                    pos[1] >= this.height || pos[1] < 0) {
            return false;
        }
        return true;
    }

    checkHighwayIntersection(dist: number) {
        //Check surrounding 9 cells for intersections
        let minDist = 100;
        let target = 0;
        let o = vec2.create();
        for(let incr = 0.5; incr <= dist; incr += 0.5) {
            let test = this.movePos(this.turtle, incr);
            let index = this.highIndex(test);
            for(let x = -1; x <= 1; x++) {
                for(let y = -1; y <= 1; y++) {
                    if(index[0] + x >= 0 && index[0] + x < this.highwayIntersections.length && 
                        index[1] + y >= 0 && index[1] + y < this.highwayIntersections[index[0] + x].length) {
                        let ints = this.highwayIntersections[index[0] + x][index[1] + y];
                        for(let i = 0; i < ints.length; i++) {
                            if(!vec2.equals(ints[i], this.turtle.position) && vec2.distance(ints[i], test) < minDist
                                && vec2.dot(
                                    vec2.normalize(vec2.create(), vec2.subtract(vec2.create(), ints[i], this.turtle.position)), 
                                    this.turtle.orientation) > 0.7) {
                                //If there's nearby intersections, orient turtle towards closest and return distance
                                minDist = vec2.distance(ints[i], test);
                                target = vec2.distance(ints[i], this.turtle.position);
                                o = vec2.normalize(vec2.create(), vec2.subtract(vec2.create(), ints[i], this.turtle.position));
                            }
                        }
                    }
                }
            }
        }
        if(minDist < this.stepSize / 3) {
            this.turtle.orientation = o;
            return target;
        }
        //Check surrounding 9 cells for roads
        minDist = 100;
        target = 0;
        o = vec2.create();
        for(let incr = 0.5; incr <= dist; incr += 0.5) {
            let test = this.movePos(this.turtle, incr);
            let index = this.highIndex(test);
            for(let x = -1; x <= 1; x++) {
                for(let y = -1; y <= 1; y++) {
                    if(index[0] + x >= 0 && index[0] + x < this.highways.length && 
                       index[1] + y >= 0 && index[1] + y < this.highways[index[0] + x].length) {
                        let highs = this.highways[index[0] + x][index[1] + y];
                        for(let i = 0; i < highs.length; i++) {
                            if(!vec2.equals(highs[i].a, this.turtle.position) && !vec2.equals(highs[i].b, this.turtle.position)) {
                                //If there's highways in target grid square, orient turtle towards closest and return distance
                                let inter = roadInt(test, highs[i]);
                                if(vec2.distance(inter, test) < minDist) {
                                    minDist = vec2.distance(inter, test);
                                    target = vec2.distance(inter, this.turtle.position);
                                    o = vec2.normalize(vec2.create(), vec2.subtract(vec2.create(), inter, this.turtle.position));
                                }
                            }
                        }
                    }
                }
            }
        }
        if(minDist < this.stepSize / 2) {
            this.turtle.orientation = o;
            let test = this.movePos(this.turtle, target);
            let index = this.highIndex(test);
            this.highwayIntersections[index[0]][index[1]].push(test);
            return target;
        }
    }

    onHighway() {
        let index = this.highIndex(this.turtle.position);
        let highs = this.highways[index[0]][index[1]];
        for(let i = 0; i < highs.length; i++) {
            let h = highs[i];
            if(isOn(this.turtle.position, h)) {
                return true;
            }
        }
        return false;
    }

    checkGridRoad(dist: number) {
        //Check cells for roads
        let target = 1000;
        let prevIndex = vec2.create();
        for(let incr = 0; incr <= dist; incr += 0.5) {
            let test = this.movePos(this.turtle, incr);
            let index = floor(test);
            if(this.checkValid(test) && !vec2.equals(index, prevIndex)) {
                prevIndex = vec2.clone(index);
                let roads = this.roads[index[0]][index[1]];
                for(let i = 0; i < roads.length; i++) {
                    if(!vec2.equals(roads[i].a, this.turtle.position) && !vec2.equals(roads[i].b, this.turtle.position)) {
                        //If there's roads in target grid square, check if intersects and return distance
                        let x = roadsInt(new Road(this.turtle.position, this.movePos(this.turtle, dist)), roads[i]);
                        if(x && x < target) {
                            target = x;
                        }
                    }
                }
            }
        }
        //Check cells for highways
        prevIndex = vec2.create();
        for(let incr = 0; incr <= dist; incr += 0.5) {
            let test = this.movePos(this.turtle, incr);
            let index = this.highIndex(test);
            if(this.checkValid(test) && !vec2.equals(index, prevIndex)) {
                prevIndex = vec2.clone(index);
                let highs = this.highways[index[0]][index[1]];
                for(let i = 0; i < highs.length; i++) {
                    if(!vec2.equals(highs[i].a, this.turtle.position) && !vec2.equals(highs[i].b, this.turtle.position)) {
                        //If there's highways in target grid square, check if intersects and return distance
                        let x = roadsInt(new Road(this.turtle.position, this.movePos(this.turtle, dist)), highs[i]);
                        if(x && x < target) {
                            target = x;
                        }
                    }
                }
            }
        }
        if(target <= dist) {
            return target;
        }
    }

    //Orients turtle towards valid ground, sampling 5 directions
    orientValid(maxAngle: number, dist: number) {
        if(this.checkValid(this.movePos(this.turtle, dist))) {
            return dist;
        }
        if(this.checkValid(this.movePos(this.turtle, dist / 2))) {
            return dist / 2;
        }
        this.turtle.rotate(maxAngle / 2);
        if(this.checkValid(this.movePos(this.turtle, dist / 2))) {
            return dist / 2;
        }
        this.turtle.rotate(-maxAngle);
        if(this.checkValid(this.movePos(this.turtle, dist / 2))) {
            return dist / 2;
        }
        this.turtle.rotate(-maxAngle / 2);
        if(this.checkValid(this.movePos(this.turtle, dist / 2))) {
            return dist / 2;
        }
        this.turtle.rotate(maxAngle * 2);
        if(this.checkValid(this.movePos(this.turtle, dist / 2))) {
            return dist / 2;
        }
        this.turtle.rotate(-maxAngle / 2);
        if(this.checkValid(this.movePos(this.turtle, dist))) {
            return dist;
        }
        this.turtle.rotate(-maxAngle);
        if(this.checkValid(this.movePos(this.turtle, dist))) {
            return dist;
        }
        this.turtle.rotate(-maxAngle);
        if(this.checkValid(this.movePos(this.turtle, dist))) {
            return dist;
        }
        this.turtle.rotate(maxAngle * 2);
        if(this.checkValid(this.movePos(this.turtle, dist))) {
            return dist;
        }
    }

    //Orients turtle towards high population
    orientPopulation(maxAngle: number, dist: number) {
        //5 sample directions for population sampling
        let t = new Turtle();
        let max = 0;
        let target = 0;
        for(let a = -maxAngle; a <= maxAngle; a += maxAngle / 2) {
            t.copy(this.turtle);
            t.rotate(a);
            let sum = 0;
            //5 steps for ray marching
            for(let i = dist / 5; i <= dist; i++) {
                if(this.checkValid(this.movePos(t, i))) {
                    sum += this.population(this.movePos(t, i)) / i;
                }
            }
            if(sum > max) {
                max = sum;
                target = a;
            }
        }
        if(max > 0) {
            this.turtle.rotate(target);
            return true;
        }
        //returns false if all directions are invalid
        return false;
    }

    startPopulation() {
        this.turtle.scale = 0.5;
        //Towards population
        this.turtle.position = vec2.fromValues(this.width / 4, 5);
        this.turtle.orientation = vec2.fromValues(0, 1);
        this.branch(this.stepSize);
        this.turtle.position = vec2.fromValues(this.width * 3 / 4, 5);
        this.turtle.orientation = vec2.fromValues(0, 1);
        this.branch(this.stepSize);
        this.turtle.position = vec2.fromValues(this.width / 2, this.height / 2);
        this.turtle.orientation = vec2.fromValues(0, -1);
        this.pushBack();
        this.branch(this.stepSize);
        while(true) {
            this.orientPopulation(this.highwayAngle, this.stepSize);
            let step = this.orientValid(60, this.stepSize);
            if(step) {
                let c = this.checkHighwayIntersection(step);
                if(c) {
                    //Reaches intersection, doesn't branch
                    this.drawHighway(c);
                    if(this.stack.length == 0) {
                        return;
                    }
                    this.turtle = this.stack.pop();
                } else {
                    this.drawHighway(step);
                    if(Math.random() > 1 - this.highwayDensity) {
                        this.branch(this.stepSize);
                    }
                }
            } else {
                if(this.stack.length == 0) {
                    return;
                }
                this.turtle = this.stack.pop();
            }
        }
    }

    startGrid() {
        //Grid structure
        this.turtle.scale = 0.2;
        for(let x = 1; x < this.width / this.stepSize; x++) {
            for(let y = 1; y < this.height / this.stepSize; y++) {
                //If grid square is empty, start a perpendicular road system
                if(!this.filled[x][y] && this.highways[x][y].length != 0) {
                    //If there's highways in this grid square, choose one at random
                    //And have our grid direction be perpendicular to it
                    
                    //Calculating start turtle position
                    let h = this.highways[x][y][Math.floor(Math.random() * this.highways[x][y].length)];
                    let start = vec2.scale(vec2.create(), vec2.add(vec2.create(), h.a, h.b), 0.5);
                    let slope: number;
                    if(h.b[0] - h.a[0] == 0) {
                        slope = 0;
                    } else if(h.b[1] - h.a[1] == 0) {
                        slope = 10000;
                    } else {
                        slope = (h.b[1] - h.a[1]) / (h.b[0] - h.a[0]);
                        slope = -1 / slope;
                    }
                    let orient = vec2.normalize(vec2.create(), vec2.fromValues(5, 5 * slope));
                    this.turtle.position = start;
                    this.turtle.orientation = orient;
                    this.pushBack();

                    let cont = true;
                    let incr = 0;
                    let count = 0;
                    this.stack = [];
                    while(cont && incr < 1000) {
                        incr++;
                        let mmm = this.checkGridRoad(this.stepSize * this.roadSize / 5);
                        if(mmm) {
                            this.drawGridRoad(mmm);
                            if(this.stack.length == 0) {
                                cont = false;
                            } else {
                                this.turtle = this.stack.pop();
                                count++;
                            }
                        } else {
                            if(this.checkValid(this.movePos(this.turtle, this.stepSize * this.roadSize / 5))) {
                                this.drawGridRoad(this.stepSize * this.roadSize / 5);
                                if(this.onHighway()) {
                                    if(this.stack.length == 0) {
                                        cont = false;
                                    } else {
                                        this.turtle = this.stack.pop();
                                        count++;
                                    }
                                } else if(Math.random() > 0.5) {
                                    this.branch(this.stepSize * this.roadSize / 5);
                                }
                            } else {
                                if(this.stack.length == 0) {
                                    cont = false;
                                } else {
                                    this.turtle = this.stack.pop();
                                    count++;
                                }
                            }
                        }
                    }
                    console.log(x + " and " + y);
                    console.log(count);
                }
            }
        }
    }

    branch(s: number) {
        //Creates branches perpendicular left and right
        let index = this.highIndex(this.turtle.position);
        this.highwayIntersections[index[0]][index[1]].push(this.turtle.position);
        let t1 = new Turtle();
        t1.copy(this.turtle)
        t1.rotate(90);
        if(this.checkValid(this.movePos(t1, s))) {
            this.stack.push(t1);
        }
        let t2 = new Turtle();
        t2.copy(this.turtle)
        t2.rotate(-90);
        if(this.checkValid(this.movePos(t2, s))) {
            this.stack.push(t2);
        }
    }

    pushBack() {
        //Creates branches perpendicular left and right
        let index = this.highIndex(this.turtle.position);
        this.highwayIntersections[index[0]][index[1]].push(this.turtle.position);
        let t = new Turtle();
        t.copy(this.turtle)
        t.rotate(180);
        this.stack.push(t);
    }

    drawHighway(dist: number) {
        let index = this.highIndex(this.turtle.position);
        this.highwayIntersections[index[0]][index[1]].push(vec2.clone(this.turtle.position));
        let prevIndex = vec2.create();
        for(let i = 0; i <= dist; i += 0.5) {
            let test = this.movePos(this.turtle, i);
            index = this.highIndex(test);
            if(!vec2.equals(index, prevIndex)) {
                this.highways[index[0]][index[1]].push(new Road(vec2.clone(this.turtle.position), this.movePos(this.turtle, dist)));
                prevIndex = vec2.clone(index);
            }
        }
        this.drawRoad(dist);
    }

    drawGridRoad(dist: number) {
        let index = floor(this.turtle.position);
        let prevIndex = vec2.create();
        let highIndex = this.highIndex(this.turtle.position);
        let prevHighIndex = vec2.create();
        for(let i = 0; i <= dist; i += 0.25) {
            let test = this.movePos(this.turtle, i);
            index = floor(test);
            highIndex = this.highIndex(test);
            if(this.checkValid(test) && !vec2.equals(index, prevIndex)) {
                this.roads[index[0]][index[1]].push(new Road(vec2.clone(this.turtle.position), this.movePos(this.turtle, dist)));
                prevIndex = vec2.clone(index);
            }
            if(this.checkValid(test) && !vec2.equals(highIndex, prevHighIndex)) {
                this.filled[highIndex[0]][highIndex[1]] = true;
                prevHighIndex = vec2.clone(highIndex);
            }
        }
        this.drawRoad(dist);
    }

    drawRoad(dist: number) {
        let t : mat4 = this.turtle.getTransform(dist);

        this.transform1Array.push(t[0]);
        this.transform1Array.push(t[1]);
        this.transform1Array.push(t[2]);
        this.transform1Array.push(t[3]);

        this.transform2Array.push(t[4]);
        this.transform2Array.push(t[5]);
        this.transform2Array.push(t[6]);
        this.transform2Array.push(t[7]);

        this.transform3Array.push(t[8]);
        this.transform3Array.push(t[9]);
        this.transform3Array.push(t[10]);
        this.transform3Array.push(t[11]);

        this.transform4Array.push(t[12]);
        this.transform4Array.push(t[13]);
        this.transform4Array.push(t[14]);
        this.transform4Array.push(t[15]);

        this.colorsArray.push(this.turtle.color[0]);
        this.colorsArray.push(this.turtle.color[1]);
        this.colorsArray.push(this.turtle.color[2]);
        this.colorsArray.push(this.turtle.color[3]);
        
        this.numRoads++;

        this.turtle.forward(dist);
    }
};

export default RoadSystem;