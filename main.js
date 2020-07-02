import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";

// Given a string of input data and an (empty) array of spheres, parse the input
// as an array of Sphere objects
function parseSpheres(input, spheres) {
  // remove empty lines and spaces
  input = input.replace(/^\n+|\n+$|\n(?=\n)|\s/g, "");
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

  // for each pixel, generate a ray
  var canvas = document.getElementById("rendered-image");
  for (var i = 0; i < canvas.width; i++) {
    for (var j = 0; j < canvas.height; j++) {
      var ray = new Ray(i, j);
    }
  }

  // color the center pixel with the color of the first parsed sphere
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgb(" + spheres[0].r + ", " + spheres[0].g + "," +
                       spheres[0].b + ")";
  ctx.fillRect(canvas.width / 2, canvas.height / 2, 1, 1);
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
