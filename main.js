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
  var light = vec3.fromValues(0, 1, -0.5);

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

      // color the pixel
      if (tMin != Infinity) {
        var point = ray.pointAtParameter(tMin);
        var normal = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(),
            point, closest.center));
        var lightDirection = vec3.normalize(vec3.create(),
            vec3.subtract(vec3.create(), light, point));

        // diffuse (Lambertian shading)
        var lightIntensity = 1;
        var diffuse = [
          closest.r * lightIntensity * Math.max(0, vec3.dot(normal,
              lightDirection)), // r
          closest.g * lightIntensity * Math.max(0, vec3.dot(normal,
              lightDirection)), // g
          closest.b * lightIntensity * Math.max(0, vec3.dot(normal,
              lightDirection))  // b
        ];

        // ambient
        var ambientLightIntensity = 0.5;
        var ambient = [
          closest.r * ambientLightIntensity, // r
          closest.g * ambientLightIntensity, // g
          closest.b * ambientLightIntensity  // b
        ];

        var finalColor = [];
        for (var c = 0; c < 3; c++) {
          finalColor[c] = (diffuse[c] + ambient[c]) / 2;
        }

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
