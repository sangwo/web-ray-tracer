const { vec3, mat4 } = glMatrix;
import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";
import { Triangle } from "./Triangle.js";
import { Light } from "./Light.js";
import { Texture } from "./Texture.js";
import * as util from "./utility.js";

const light = new Light(
  vec3.fromValues(-1, 0, 6),      // corner
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
const MAX_RECURSION = 4;

// shading option
let softShadowOn = false;

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

// Given an array of objects, Ray object, and how far the ray can go, return the
// closest object that intersects with the ray
function closestIntersectObj(objects, ray, tMin) {
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

// Given an array of color values r, g, b at the point, normal to that point,
// and light direction, compute and return diffuse component (Lambertian
// shading) as an array in the range between 0 and 1
function computeDiffuse(color, normal, lightDirection) {
  let diffuse = [];
  for (let c = 0; c < 3; c++) {
    diffuse[c] = (color[c] / 255) * (light.color[c] / 255) *
        Math.max(0, vec3.dot(normal, lightDirection));
  }
  return diffuse;
}

// Given an array of color values r, g, b at the point, compute and return
// ambient component as an array in the range between 0 and 1
function computeAmbient(color) {
  const ambientLightIntensity = [150, 150, 150];
  let ambient = [];
  for (let c = 0; c < 3; c++) {
    ambient[c] = (color[c] / 255) * (ambientLightIntensity[c] / 255);
  }
  return ambient;
}

// Given specular color, normal, view direcion, and light direction, compute and
// return specular component (Phong shading) as an array in the range between 0
// and 1
function computeSpecular(specularColor, normal, viewDirection, lightDirection) {
  const halfVector = vec3.normalize(vec3.create(), vec3.add(vec3.create(),
      viewDirection, lightDirection));
  const specularLightIntensity = [255, 255, 255];
  // TODO: add as an argument; 50 for the Earth
  const shininess = 400; // Phong exponent
  let specular = [];
  for (let c = 0; c < 3; c++) {
    specular[c] = (specularColor[c] / 255) * (specularLightIntensity[c] / 255) *
        Math.pow(Math.max(0, vec3.dot(normal, halfVector)), shininess);
  }
  return specular;
}

// Given a point, normal, and a bias, compute and return a biased point to avoid
// self-intersection
function biasedPoint(point, normal, bias) {
  return vec3.add(vec3.create(), point, vec3.scale(vec3.create(), normal, bias));
}

// Given a point, normal, light position, light direction as vec3 objects and an
// array of objects, return 0 if the point is in shadow, 1 otherwise
function isInShadow(point, normal, lightPosition, lightDirection, objects) {
  // to avoid shadow-acne
  const overPoint = biasedPoint(point, normal, Math.pow(10, -4));
  const shadowRay = new Ray(overPoint, lightDirection);
  // intersects with an object in-between the point and the light
  const tLight = vec3.distance(point, lightPosition);
  const shadowObj = closestIntersectObj(objects, shadowRay, tLight);
  return shadowObj == null;
}

// Given an object, array of ambient, diffuse, specualr that contains r, g, b
// values, and shadow value between 0 and 1, return the array of final color
// (not clamped yet)
// TODO: remove?
function computeFinalColor(closest, ambient, diffuse, specular, shadow) {
  let finalColor = [];
  for (let c = 0; c < 3; c++) {
    finalColor[c] = shadow * (closest.diffuseOn * diffuse[c] +
        closest.specularOn * specular[c]) + closest.ambientOn * ambient[c];
  }
  return finalColor;
}

// Given a ray direction and a normal, compute and return a direction of
// reflected ray
function reflect(rayDirection, normal) {
  return vec3.subtract(vec3.create(), rayDirection, vec3.scale(vec3.create(),
      normal, 2 * vec3.dot(rayDirection, normal)));
}

// Given a ray directon, normal, and the object's index of refraction, compute
// and return a direction of refracted ray
function refract(rayDirection, normal, ior) {
  let cosi = vec3.dot(rayDirection, normal);
  const etaOut = 1;
  const etaIn = ior;
  let eta = etaOut / etaIn;
  if (cosi < 0) {
    cosi = -cosi;
  } else { // ray hits from inside the object
    eta = 1 / eta; // swap etaOut and etaIn
    vec3.negate(normal, normal);
  }

  const determinant = 1 - eta * eta * (1 - cosi * cosi);
  if (determinant < 0) { // total internal reflection
    return vec3.create(); // no ray is generated; TODO: right?
  }
  return vec3.add(vec3.create(), vec3.scale(vec3.create(), rayDirection, eta),
      vec3.scale(vec3.create(), normal, eta * cosi - Math.sqrt(determinant)));
}

// Given a ray, array of objects, and recursion depth, return the color of
// sub-pixel
function subpixelColor(ray, objects, recursionDepth) {
  // determine the closest intersecting object
  const closest = closestIntersectObj(objects, ray, Infinity);

  // compute color of each sub-pixel
  let resultColor = backgroundColor;
  if (closest != null) { // hit an object
    // TODO: repetitive
    // TODO: make a pre-computing function?
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = util.transformPosition(ray.origin, closest.inverseTransform);
    const transDirection = util.transformDirection(ray.direction, closest.inverseTransform);
    const transRay = new Ray(transOrigin, transDirection);

    // compute intersection of the (transformed) ray and the untransformed object
    const tVal = closest.intersects(ray);
    const transPoint = transRay.pointAtParameter(tVal);
    const transNormal = closest.normal(transPoint, transRay.direction);

    // transform back to get intersection of the original ray and the transformed object
    const point = util.transformPosition(transPoint, closest.transform);
    let normal = util.transformDirection(transNormal, mat4.transpose(mat4.create(), closest.inverseTransform));
    vec3.normalize(normal, normal);
    const viewDirection = vec3.normalize(vec3.create(),
        vec3.subtract(vec3.create(), ray.origin, point));
    const color = closest.colorAt(transPoint);
    const specularColor = closest.specularColorAt(transPoint);

    const ambient = computeAmbient(color); // independent of light
    let diffuse = [];
    let specular = [];
    let shadow;
    if (softShadowOn) {
      // for each sampling point in area light, compute diffuse, specular, and
      // shadow and accumulate
      let totalDiffuse = [0, 0, 0];
      let totalSpecular = [0, 0, 0];
      let totalShadow = 0;
      for (let uc = 0; uc < light.usteps; uc++) {
        for (let vc = 0; vc < light.vsteps; vc++) {
          const lightPoint = light.pointAt(uc, vc);
          const lightDirection = vec3.normalize(vec3.create(),
              vec3.subtract(vec3.create(), lightPoint, point));

          // intermediates
          const diffuseI = computeDiffuse(color, normal, lightDirection);
          const specularI = computeSpecular(specularColor, normal, viewDirection, lightDirection);
          const shadowI = isInShadow(point, normal, lightPoint, lightDirection, objects);

          // accumulate
          for (let c = 0; c < 3; c++) {
            totalDiffuse[c] += diffuseI[c];
            totalSpecular[c] += specularI[c];
          }
          totalShadow += shadowI;
        }
      }
      // compute average diffuse, specular, and shadow
      for (let c = 0; c < 3; c++) {
        diffuse[c] = totalDiffuse[c] / light.samples;
      }
      for (let c = 0; c < 3; c++) {
        specular[c] = totalSpecular[c] / light.samples;
      }
      shadow = totalShadow / light.samples;
    } else {
      // treat area light as point light
      const lightDirection = vec3.normalize(vec3.create(),
          vec3.subtract(vec3.create(), light.position, point));

      diffuse = computeDiffuse(color, normal, lightDirection);
      specular = computeSpecular(specularColor, normal, viewDirection, lightDirection);
      shadow = isInShadow(point, normal, light.position, lightDirection, objects);
    }
    // compute final color of the sub-pixel
    resultColor = computeFinalColor(closest, ambient, diffuse, specular, shadow);

    // reflection and refraction
    if (recursionDepth < MAX_RECURSION) {
      if (closest.reflective) {
        // compute reflection ray
        const reflectOrigin = biasedPoint(point, normal, Math.pow(10, -4));
        const reflectDirection = reflect(ray.direction, normal);
        const reflectRay = new Ray(reflectOrigin, reflectDirection);

        // cast reflection ray and accumulate reflected color
        const reflectedColor = subpixelColor(reflectRay, objects, recursionDepth + 1);
        for (let c = 0; c < 3; c++) {
          resultColor[c] += 0.8 * closest.reflective * (reflectedColor[c] / 255); // TODO: remove 0.8?
        }
      }

      if (closest.transparent) {
        // compute refraction (transmittance) ray
        const rayFromOutside = vec3.dot(ray.direction, normal) < 0;
        const refractOrigin = rayFromOutside ? biasedPoint(point, normal,
            -Math.pow(10, -4)) : biasedPoint(point, normal, Math.pow(10, -4));
        const refractDirection = refract(ray.direction, normal, closest.ior);
        const refractRay = new Ray(refractOrigin, refractDirection);

        // cast refraction ray and accumulate refracted color
        const refractedColor = subpixelColor(refractRay, objects, recursionDepth + 1);
        for (let c = 0; c < 3; c++) {
          resultColor[c] += closest.transparent * (refractedColor[c] / 255);
        }
      }
    }
  }

  // clamp between 0 and 1, then multiply by 255
  for (let c = 0; c < 3; c++) {
    resultColor[c] = Math.min(1, Math.max(0, resultColor[c])) * 255;
  }
  return resultColor;
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
      const rayOrigin = vec3.fromValues(0, 0, 15);
      const rayDirection = vec3.normalize(vec3.create(), vec3.fromValues(u, v, -d));
      const ray = new Ray(rayOrigin, rayDirection);

      // compute and accumulate color of sub-pixels
      const finalColor = subpixelColor(ray, objects, 0);
      for (let c = 0; c < 3; c++) {
        totalColor[c] += finalColor[c];
      }
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

// Given an Image object, canvas, canvas context, and a texture file name,
// return an array of color values r, g, b, a of pixels in the image
async function loadTexture(img, canvas, ctx, fileName) {
  return new Promise((resolve, reject) => {
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imgData.data);
    }
    img.src = "textures/" + fileName;
  });
}

// render the volume on the image
async function render() {
  let objects = [];

  /*
  // prepare to load textures
  const img = new Image();
  const canvasT = document.createElement("canvas");
  const ctxT = canvasT.getContext("2d");

  // load textures and add objects
  // earth
  const earthData = await loadTexture(img, canvasT, ctxT, "earth_day.jpg");
  const earthTexture = new Texture(earthData, canvasT.width, canvasT.height);
  const earthNormalData = await loadTexture(img, canvasT, ctxT, "earth_normal.tiff");
  const earthNormal = new Texture(earthNormalData, canvasT.width, canvasT.height);
  const earthSpecularData = await loadTexture(img, canvasT, ctxT, "earth_specular.tiff");
  const earthSpecular = new Texture(earthSpecularData, canvasT.width, canvasT.height);
  const earth = new Sphere(0, 0, 0, 2, 255, 255, 255, true, true, true, earthTexture, earthNormal, earthSpecular);
  earth.rotate(vec3.fromValues(0, 0, 1), -0.41); // 23.5 degrees tilted
  earth.rotate(vec3.fromValues(Math.cos(1.16), Math.sin(1.16), 0), -Math.PI / 3); // Earth's rotation
  objects.push(earth);

  // starfield
  const starData = await loadTexture(img, canvasT, ctxT, "8k_stars_milky_way.jpg");
  const starTexture = new Texture(starData, canvasT.width, canvasT.height);
  objects.push(new Sphere(0, 0, 0, 20, 0, 0, 0, false, true, false, starTexture)); // TODO: make it bigger
  */

  const testObj = new Sphere(2, 0, -3, 1, 0, 0, 255, true, false, true);
  //const testObj = new Sphere(2, 0, 1, 1, 0, 0, 255, true, false, true);
  objects.push(testObj);
  const testObj2 = new Sphere(0, 0, 1, 1, 255, 0, 0, false, false, false);
  testObj2.transparency(1, 1);
  //testObj2.reflectivity(1);
  //objects.push(testObj2);
  const more = new Sphere(-1, 0, -3, 1, 0, 255, 0, true, false, true);
  objects.push(more);
  const more2 = new Sphere(0, 0, -3, 1, 255, 0, 0, true, false, true);
  objects.push(more2);
  //const more = new Sphere(0, -2, 1, 1, 0, 255, 0, true, false, true);
  //objects.push(more);

  // for each pixel, cast a ray and color the pixel
  const canvas = document.getElementById("rendered-image");
  const ctx = canvas.getContext("2d");
  let pixelNumber = 1;
  let percent = 0;
  $("#log").text("loading... 0%");
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      setTimeout(function() {
        renderPixel(i, j, objects, ctx);
        if (pixelNumber % ((nx * ny) / 100) == 0) {
          percent++;
          $("#log").text("loading... " + percent + "%");
        }
        pixelNumber++;
      }, 0);
    }
  }
}

$(document).ready(function() {
  // TODO: for debugging
  $("#submit-button").on("click", function() {
    try {

      render();
    } catch(err) {
      //alert(err);
      console.log(err);
    } finally {
      return false;
    }
  });
});
