const { vec3 } = glMatrix;
import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";

// Given a string of input data and an (empty) array of spheres, parse the input
// as an array of Sphere objects
function parseSpheres(input, spheres) {
  // remove empty lines and spaces
  input = input.replace(/^\n+|\n+$|\n(?=\n)| /g, "");
  // throw error if empty input
  if (input.trim().length == 0) {
    throw "Empty input";
  }

  var lines = input.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var tokens = lines[i].split(",").filter(function(token) {
      return token != "";
    });

    // throw error if missing input
    if (tokens.length < 7) {
      throw "Missing input";
    }
    // throw error if invalid range of r, g, b
    if (tokens[4] < 0 || tokens[4] > 255 || tokens[5] < 0 || tokens[5] > 255 ||
        tokens[6] < 0 || tokens[6] > 255) {
      throw "Invalid range of r, g, b"
    }

    spheres.push(new Sphere(tokens[0], tokens[1], tokens[2], tokens[3],
        tokens[4], tokens[5], tokens[6]));
  }
}

// render the volume on the image
function render() {
  const light = vec3.fromValues(0, 5, -2);

  // parse input data into spheres
  var input = document.getElementById("spheres-data").value;
  var spheres = [];
  parseSpheres(input, spheres);

  // for each pixel, cast a ray
  var canvas = document.getElementById("rendered-image");
  var ctx = canvas.getContext("2d");
  for (var i = 0; i < canvas.width; i++) {
    for (var j = 0; j < canvas.height; j++) {
      var ray = new Ray(i, j);

      // determine the closest intersecting sphere
      var tMin = Infinity;
      var closest = null;
      for (var k = 0; k < spheres.length; k++) {
        var t = spheres[k].intersects(ray);
        // intersects, not behind the eye, and the closest
        if (t != null && t > 0 && t < tMin) {
          closest = spheres[k];
          tMin = t;
        }
      }

      // color the pixel, adding Lambertian shading
      if (tMin != Infinity) {
        var point = ray.pointAtParameter(tMin);
        var normal = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(),
            point, closest.center));
        var l = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(),
            light, point));

        // 1 = light intensity (255, 255, 255) scaled out of 1
        var r = closest.r * 1 * Math.max(0, vec3.dot(normal, l));
        var g = closest.g * 1 * Math.max(0, vec3.dot(normal, l));
        var b = closest.b * 1 * Math.max(0, vec3.dot(normal, l));
        ctx.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
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
