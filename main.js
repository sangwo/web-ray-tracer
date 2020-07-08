const { vec3 } = glMatrix;
import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";
import { Triangle } from "./Triangle.js";

const light = vec3.fromValues(0, 2, -12);
const l = -2;   // position of the left edge of the image
const r = 2;    // position of the right edge of the image
const b = -2;   // position of the bottom edge of the image
const t = 2;    // position of the top edge of the image
const nx = 500; // canvas width
const ny = 500; // canvas height
const d = 8;    // distance from origin to the image

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

// Given a string of input data and an (empty) array, parse the input into an
// array of objects
function parseObjects(input, objects) {
  // remove empty lines and spaces
  input = input.replace(/^\n+|\n+$|\n(?=\n)| /g, "");
  // throw error if empty input
  if (input.trim().length == 0) {
    throw "Empty input";
  }

  var lines = input.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var tokens = lines[i].split(",").filter(function(token) {
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
}

// Given an array of objects and a Ray object, return the closest object that
// intersects with the ray
function closestIntersectObj(objects, ray) {
  var tMin = Infinity;
  var closest = null;
  for (var k = 0; k < objects.length; k++) {
    let t = objects[k].intersects(ray);
    // intersects, not behind the eye, and the closest
    if (t != null && t > 0 && t < tMin) {
      closest = objects[k];
      tMin = t;
    }
  }
  return closest;
}

// Given an object, normal to that object, light direction, and an (empty)
// array, compute diffuse component (Lambertian shading) and store it in the
// given array
function computeDiffuse(closest, normal, lightDirection, arr) {
  var lightIntensity = [255, 255, 255].map(function(x) {
    return x / 255;
  });
  arr[0] = closest.r * lightIntensity[0] * Math.max(0, vec3.dot(normal,
      lightDirection)); // r
  arr[1] = closest.g * lightIntensity[1] * Math.max(0, vec3.dot(normal,
      lightDirection)); // g
  arr[2] = closest.b * lightIntensity[2] * Math.max(0, vec3.dot(normal,
      lightDirection)); // b
}

// Given an object and an (empty) array, compute ambient component and store it
// in the given array
function computeAmbient(closest, arr) {
  var ambientLightIntensity = [150, 150, 150].map(function(x) {
    return x / 255;
  });
  arr[0] = closest.r * ambientLightIntensity[0]; // r
  arr[1] = closest.g * ambientLightIntensity[1]; // g
  arr[2] = closest.b * ambientLightIntensity[2]; // b
}

// Given normal, view direcion, light direction, and an (empty) array, compute
// specular component (Phong shading) and store it in the given array
function computeSpecular(normal, viewDirection, lightDirection, arr) {
  var halfVector = vec3.normalize(vec3.create(), vec3.add(vec3.create(),
      viewDirection, lightDirection));
  var specularColor = [255, 255, 255];
  var specularLightIntensity = [255, 255, 255].map(function(x) {
    return x / 255;
  });
  var shininess = 50; // Phong exponent
  for (var c = 0; c < 3; c++) {
    arr[c] = specularColor[c] * specularLightIntensity[c] *
        Math.pow(Math.max(0, vec3.dot(normal, halfVector)), shininess);
  }
}

// Given a point, normal, light direction as vec3 objects and an array of
// objects, return whether the point is in a shadow
function isInShadow(point, normal, lightDirection, objects) {
  var shadowBias = Math.pow(10, -4); // to avoid shadow-acne
  var biasedPoint = vec3.add(vec3.create(), point,
      vec3.scale(vec3.create(), normal, shadowBias));
  var shadowRay = new Ray(biasedPoint, lightDirection);
  var shadowObj = closestIntersectObj(objects, shadowRay);
  return shadowObj != null;
}

// render the volume on the image
function render() {
  // parse input data into objects
  var input = document.getElementById("input-data").value;
  var objects = [];
  parseObjects(input, objects);

  // for each pixel, cast a ray and color the pixel
  var canvas = document.getElementById("rendered-image");
  var ctx = canvas.getContext("2d");
  for (var i = 0; i < nx; i++) {
    for (var j = 0; j < ny; j++) {
      // cast a ray
      var u = l + (r - l) * (i + 0.5) / nx;
      var v = b + (t - b) * (j + 0.5) / ny;
      var rayOrigin = vec3.fromValues(0, 0, 0);
      var rayDirection = vec3.normalize(vec3.create(), vec3.fromValues(u, v, -d));
      var ray = new Ray(rayOrigin, rayDirection);

      // determine the closest intersecting object
      var closest = closestIntersectObj(objects, ray);

      // color the pixel
      if (closest != null) { // hit an object
        let t = closest.intersects(ray);
        var point = ray.pointAtParameter(t);
        var normal = closest.normal(point, ray.direction);
        var lightDirection = vec3.normalize(vec3.create(),
            vec3.subtract(vec3.create(), light, point));
        var viewDirection = vec3.normalize(vec3.create(),
            vec3.subtract(vec3.create(), ray.origin, point));

        // compute final color
        var [diffuse, ambient, specular] = [[], [], []];
        computeDiffuse(closest, normal, lightDirection, diffuse);
        computeAmbient(closest, ambient);
        computeSpecular(normal, viewDirection, lightDirection, specular);
        var shadow = isInShadow(point, normal, lightDirection, objects);
        var finalColor = [];
        for (var c = 0; c < 3; c++) {
          finalColor[c] = (!shadow * (diffuse[c] + specular[c]) + ambient[c]) / 3;
        }

        ctx.fillStyle = "rgb(" + finalColor[0] + ", " + finalColor[1] + ", " +
                             finalColor[2] + ")";
      } else { // no intersecting object
        ctx.fillStyle = "rgb(255, 255, 255)"; // background color (white)
      }
      ctx.fillRect(i, ny - 1 - j, 1, 1);
    }
  }
}

var submitButton = document.getElementById("submit-button");
submitButton.onclick = function() {
  try {
    render();
  } catch(err) {
    alert(err);
  } finally {
    return false;
  }
}
