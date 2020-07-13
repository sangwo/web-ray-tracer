const { vec3 } = glMatrix;
import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";
import { Triangle } from "./Triangle.js";
import { Light } from "./Light.js";

const light = new Light(
  vec3.fromValues(-1, 0, -12),    // corner
  vec3.fromValues(2, 0, 0), 2,    // uvecFull, usteps
  vec3.fromValues(0, 2, 0), 2,    // vvecFull, vsteps
  255, 255, 255                   // r, g, b
);
const l = -2;   // position of the left edge of the image
const r = 2;    // position of the right edge of the image
const b = -2;   // position of the bottom edge of the image
const t = 2;    // position of the top edge of the image
const nx = 500; // canvas width
const ny = 500; // canvas height
const d = 8;    // distance from origin to the image
const samplingWidth = 4; // = sampling height (NxN)
const backgroundColor = [255, 255, 255];

// Given an array of tokens and a required number of tokens, throw an error if
// missing input
function missingInputError(tokens, required) {
  if (tokens.length < required) {
    throw "Missing input";
  }
}

// Given color values r, g, b, thrown an error if invalid range
function invalidColorRangeError(r, g, b) {
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw "Invalid range of r, g, b"
  }
}

// Given a string of input data, return an array of parsed objects
function parseObjects(input) {
  // remove empty lines and spaces
  input = input.replace(/^\n+|\n+$|\n(?=\n)| /g, "");
  // throw error if empty input
  if (input.trim().length == 0) {
    throw "Empty input";
  }

  let objects = [];
  const lines = input.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i].split(",").filter(function(token) {
      return token != ""; // remove empty tokens
    });

    if (tokens[0] == "s") { // sphere
      missingInputError(tokens, 8);
      invalidColorRangeError(tokens[5], tokens[6], tokens[7]);
      // s, x, y, z, radius, r, g, b
      objects.push(new Sphere(tokens[1], tokens[2], tokens[3], tokens[4],
                              tokens[5], tokens[6], tokens[7]));
    } else if (tokens[0] == "t") { // triangle
      missingInputError(tokens, 13);
      invalidColorRangeError(tokens[10], tokens[11], tokens[12]);
      // t, x0, y0, z0, x1, y1, z1, x2, y2, z2, r, g, b
      objects.push(new Triangle(
        vec3.fromValues(tokens[1], tokens[2], tokens[3]), // v0
        vec3.fromValues(tokens[4], tokens[5], tokens[6]), // v1
        vec3.fromValues(tokens[7], tokens[8], tokens[9]), // v2
        tokens[10], tokens[11], tokens[12]) // r, g, b
      );
    } else { // no object identifier
      throw "No object identifier";
    }
  }

  return objects;
}

// Given an array of objects and a Ray object, return the closest object that
// intersects with the ray
function closestIntersectObj(objects, ray) {
  let tMin = Infinity;
  let closest = null;
  for (let k = 0; k < objects.length; k++) {
    const t = objects[k].intersects(ray);
    // intersects, not behind the eye, and the closest
    if (t != null && t > 0 && t < tMin) {
      closest = objects[k];
      tMin = t;
    }
  }
  return closest;
}

// Given an object, normal to that object, and light direction, compute and
// return diffuse component (Lambertian shading) as an array
function computeDiffuse(closest, normal, lightDirection) {
  const diffuse = [
    closest.r * (light.r / 255) * Math.max(0, vec3.dot(normal,
      lightDirection)), // r
    closest.g * (light.g / 255) * Math.max(0, vec3.dot(normal,
      lightDirection)), // g
    closest.b * (light.b / 255) * Math.max(0, vec3.dot(normal,
      lightDirection))  // b
  ];
  return diffuse;
}

// Given an object, compute and return ambient component as an array
function computeAmbient(closest) {
  const ambientLightIntensity = [255, 255, 255].map(function(x) {
    return x / 255;
  });
  const ambient = [
    closest.r * ambientLightIntensity[0], // r
    closest.g * ambientLightIntensity[1], // g
    closest.b * ambientLightIntensity[2]  // b
  ];
  return ambient;
}

// Given normal, view direcion, and light direction, compute and return specular
// component (Phong shading) as an array
function computeSpecular(normal, viewDirection, lightDirection) {
  const halfVector = vec3.normalize(vec3.create(), vec3.add(vec3.create(),
      viewDirection, lightDirection));
  const specularColor = [255, 255, 255];
  const specularLightIntensity = [255, 255, 255].map(function(x) {
    return x / 255;
  });
  const shininess = 300; // Phong exponent
  let specular = [];
  for (let c = 0; c < 3; c++) {
    specular[c] = specularColor[c] * specularLightIntensity[c] *
        Math.pow(Math.max(0, vec3.dot(normal, halfVector)), shininess);
  }
  return specular;
}

// Given a point, normal, light direction as vec3 objects and an array of
// objects, return 0 if the point is in shadow, 1 otherwise
function isInShadow(point, normal, lightDirection, objects) {
  const shadowBias = Math.pow(10, -4); // to avoid shadow-acne
  const biasedPoint = vec3.add(vec3.create(), point,
      vec3.scale(vec3.create(), normal, shadowBias));
  const shadowRay = new Ray(biasedPoint, lightDirection);
  const shadowObj = closestIntersectObj(objects, shadowRay);
  return shadowObj == null;
}

// Given a ray, array of objects, and an array of accumulated color values r, g,
// b (initialized as 0), accumulate color of sub-pixels
function castRay(ray, objects, totalColor) {
  // determine the closest intersecting object
  const closest = closestIntersectObj(objects, ray);

  // accumulate color of each sub-pixel
  if (closest != null) { // hit an object
    const t = closest.intersects(ray);
    const point = ray.pointAtParameter(t);
    const normal = closest.normal(point, ray.direction);
    const viewDirection = vec3.normalize(vec3.create(),
        vec3.subtract(vec3.create(), ray.origin, point));

    // for each sampling point in area light, compute diffuse, specular, and
    // shadow and accumulate
    //const ambient = computeAmbient(closest); // independent of light
    let totalDiffuse = [0, 0, 0];
    let totalSpecular = [0, 0, 0];
    let totalShadow = 0;
    for (let uc = 0; uc < light.usteps; uc++) {
      for (let vc = 0; vc < light.vsteps; vc++) {
        const lightPoint = light.pointAt(uc, vc);
        const lightDirection = vec3.normalize(vec3.create(),
            vec3.subtract(vec3.create(), lightPoint, point));

        const diffuse = computeDiffuse(closest, normal, lightDirection);
        const specular = computeSpecular(normal, viewDirection, lightDirection);
        const shadow = isInShadow(point, normal, lightDirection, objects);

        // accumulate
        for (let c = 0; c < 3; c++) {
          totalDiffuse[c] += diffuse[c];
          totalSpecular[c] += specular[c];
        }
        totalShadow += shadow;
      }
    }
    // compute average diffuse, specular, and shadow
    let averageDiffuse = [];
    for (let c = 0; c < 3; c++) {
      averageDiffuse[c] = totalDiffuse[c] / light.samples;
    }
    let averageSpecular = [];
    for (let c = 0; c < 3; c++) {
      averageSpecular[c] = totalSpecular[c] / light.samples;
    }
    const averageShadow = totalShadow / light.samples;

    // compute final color of the sub-pixel
    let finalColor = [];
    for (let c = 0; c < 3; c++) {
      //finalColor[c] = (averageShadow * (averageDiffuse[c] + averageSpecular[c]) + ambient[c]) / 3;
      finalColor[c] = (averageShadow * (averageDiffuse[c] + averageSpecular[c])) / 2;
    }

    // accumulate final colors of sub-pixels
    for (let c = 0; c < 3; c++) {
      totalColor[c] += finalColor[c];
    }
  } else { // no intersecting object
    for (let c = 0; c < 3; c++) {
      totalColor[c] += backgroundColor[c];
    }
  }
}

// Given text, add it to the log div
function addLog(text) {
    $("#log").append("<span>" + text + "</span><br>");
    $("#log").scrollTop($("#log").prop("scrollHeight")); // keep scroll at bottom
}

// Given pixel position i, j, array of objects, and canvas context, color the
// pixel
function renderPixel(i, j, objects, ctx) {
  let totalColor = [0, 0, 0]; // r, g, b

  // for each sub-pixel, cast a ray and compute color (supersampling)
  for (let ic = i; ic < i + 1; ic += (1 / samplingWidth)) {
    for (let jc = j; jc < j + 1; jc += (1 / samplingWidth)) {
      // cast a ray (random position within the sub-pixel)
      const u = l + (r - l) * (ic + (Math.random() / samplingWidth)) / nx;
      const v = b + (t - b) * (jc + (Math.random() / samplingWidth)) / ny;
      const rayOrigin = vec3.fromValues(0, 0, 0);
      const rayDirection = vec3.normalize(vec3.create(), vec3.fromValues(u, v, -d));
      const ray = new Ray(rayOrigin, rayDirection);
      castRay(ray, objects, totalColor);
    }
  }
  // compute average color of the pixel
  let averageColor = [];
  for (let c = 0; c < 3; c++) {
    averageColor[c] = totalColor[c] / (samplingWidth * samplingWidth);
  }

  ctx.fillStyle = "rgb(" + averageColor[0] + ", " + averageColor[1] +
                       ", " + averageColor[2] + ")";
  ctx.fillRect(i, ny - 1 - j, 1, 1);
}

// render the volume on the image
function render() {
  // parse input data into objects
  const input = document.getElementById("input-data").value;
  const objects = parseObjects(input);

  /*
  // add light as an object
  objects.push(light);
  */

  // for each pixel, cast a ray and color the pixel
  const canvas = document.getElementById("rendered-image");
  const ctx = canvas.getContext("2d");
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const pixel = setInterval(function() {
        renderPixel(i, j, objects, ctx);
        //addLog("position: (" + i + ", " + j + ")");
      }, 0);
    }
  }
  clearInterval(pixel);
}

const submitButton = document.getElementById("submit-button");
submitButton.onclick = function() {
  try {
    render();
  } catch(err) {
    //alert(err);
    console.log(err);
  } finally {
    return false;
  }
}
