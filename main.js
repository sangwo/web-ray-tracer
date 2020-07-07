const { vec3 } = glMatrix;
import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";
import { Triangle } from "./Triangle.js";

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

// Given an object, normal to that object, light direction, and an (empty)
// array, compute the final color and store it in the given array
function color(closest, normal, lightDirection, finalColor) {
  // diffuse (Lambertian shading)
  var lightIntensity = [255, 255, 255].map(function(x) {
    return x / 255;
  });
  var diffuse = [
    closest.r * lightIntensity[0] * Math.max(0, vec3.dot(normal,
        lightDirection)), // r
    closest.g * lightIntensity[1] * Math.max(0, vec3.dot(normal,
        lightDirection)), // g
    closest.b * lightIntensity[2] * Math.max(0, vec3.dot(normal,
        lightDirection))  // b
  ];

  // ambient
  var ambientLightIntensity = [127.5, 127.5, 127.5].map(function(x) {
    return x / 255;
  });
  var ambient = [
    closest.r * ambientLightIntensity[0], // r
    closest.g * ambientLightIntensity[1], // g
    closest.b * ambientLightIntensity[2]  // b
  ];

  // compute final color
  for (var c = 0; c < 3; c++) {
    finalColor[c] = (diffuse[c] + ambient[c]) / 2;
  }
}

// render the volume on the image
function render() {
  var light = vec3.fromValues(0, 1, -0.5); // top light
  //var light = vec3.fromValues(0, 0, -0.5); // front light

  // parse input data into objects
  var input = document.getElementById("input-data").value;
  var objects = [];
  parseObjects(input, objects);

  // for each pixel, cast a ray
  var canvas = document.getElementById("rendered-image");
  var ctx = canvas.getContext("2d");
  for (var i = 0; i < canvas.width; i++) {
    for (var j = 0; j < canvas.height; j++) {
      var ray = new Ray(i, j);

      // determine the closest intersecting object
      var tMin = Infinity;
      var closest = null;
      for (var k = 0; k < objects.length; k++) {
        var t = objects[k].intersects(ray);
        // intersects, not behind the eye, and the closest
        if (t != null && t > 0 && t < tMin) {
          closest = objects[k];
          tMin = t;
        }
      }

      // color the pixel
      if (tMin != Infinity) {
        var point = ray.pointAtParameter(tMin);
        var normal = closest.normal(point, ray.direction);
        var lightDirection = vec3.normalize(vec3.create(),
            vec3.subtract(vec3.create(), light, point));

        var finalColor = [];
        color(closest, normal, lightDirection, finalColor);

        ctx.fillStyle = "rgb(" + finalColor[0] + ", " + finalColor[1] + ", " +
                             finalColor[2] + ")";
      } else {
        ctx.fillStyle = "rgb(255, 255, 255)"; // background color (white)
      }
      ctx.fillRect(i, canvas.height - 1 - j, 1, 1);
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
