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

      // color the pixel with the color of the closest intersecting sphere
      //var pixel = ctx.createImageData(1, 1);
      if (closest == null) { // no intersecting sphere
        ctx.fillStyle = "rgb(255, 255, 255)"; // background color (white)
        /*
        pixel.data[0] = 255;
        pixel.data[1] = 255;
        pixel.data[2] = 255;
        pixel.data[3] = 255;
        */
      } else {
        ctx.fillStyle = "rgb(" + closest.r + ", " + closest.g + "," +
                             closest.b + ")";
        /*
        pixel.data[0] = closest.r;
        pixel.data[1] = closest.g;
        pixel.data[2] = closest.b;
        pixel.data[3] = 255;
        */
      }
      ctx.fillRect(i, canvas.height - 1 - j, 1, 1);
      //ctx.putImageData(pixel, i, canvas.height - 1 - j);
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
