const { vec3, mat4 } = glMatrix;
import { Sphere } from "./Sphere.js";
import { Ray } from "./Ray.js";
import { Triangle } from "./Triangle.js";
import { Light } from "./Light.js";
import { Texture } from "./Texture.js";
import * as util from "./utility.js";

const light = new Light(
  vec3.fromValues(4, 4, 10),      // corner
  vec3.fromValues(0, 0, 0), 4,    // uvecFull, usteps
  vec3.fromValues(0, 0, 0), 4,    // vvecFull, vsteps
  255, 255, 255                   // r, g, b
);
const nx = document.body.clientWidth; // canvas width
const ny = document.body.clientHeight; // canvas height
const imageAspectRatio = nx / ny;
const l = -2;   // position of the left edge of the image
const r = 2;    // position of the right edge of the image
const b = -2;   // position of the bottom edge of the image
const t = 2;    // position of the top edge of the image
const d = 8;    // distance from origin to the image
const backgroundColor = [255, 255, 255];
const [samplingWidth, samplingHeight] = [4, 4];
const MAX_RECURSION = 3;
const softShadowOn = false; // shading option

// Given a Ray object, array of objects, and how far the ray can go, return the
// closest object that intersects with the ray and the t value
function intersection(ray, objects, tMin) {
  let closest = null;
  for (let k = 0; k < objects.length; k++) {
    const t = objects[k].intersects(ray);
    // intersects, not behind the eye, and the closest
    if (t != null && t > 0 && t < tMin) {
      closest = objects[k];
      tMin = t;
    }
  }
  return { obj: closest, tVal: tMin };
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

// Given an ambient color as an array of color values r, g, b, compute and
// return ambient component as an array in the range between 0 and 1
function computeAmbient(ambientColor, ambientLightIntensity) {
  let ambient = [];
  for (let c = 0; c < 3; c++) {
    ambient[c] = (ambientColor[c] / 255) * (ambientLightIntensity[c] / 255);
  }
  return ambient;
}

// Given a specular color and a specular light as arrays of color values r, g,
// b, normal, half vector, and shininess, compute and return specular component
// (Phong shading) as an array in the range between 0 and 1
function computeSpecular(specularColor, specularLightIntensity, normal,
                         halfVector, shininess) {
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

// Given a shadow ray, t value of the intersection between the shadow ray and
// light, light direction, and an array of objects, compute and return shadow
// attenuation as an array of r, g, b values
// TODO: add condition for terminating recursion; if all light is absorbed
function isInShadow(shadowRay, tLight, lightDirection, objects) {
  // intersects with an object in-between the point and the light
  const intersectData = intersection(shadowRay, objects, tLight);
  const shadowObj = intersectData.obj;
  const tVal = intersectData.tVal;
  const inShadow = shadowObj != null;
  let attenuation = [1, 1, 1];
  if (inShadow) {
    attenuation = [0, 0, 0];

    // find the object's transparency at the point of intersection
    // TODO: repetitive (ray -> shadowRay, closest -> shadowObj)
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = util.transformPosition(shadowRay.origin,
        shadowObj.inverseTransform);
    const transDirection = util.transformDirection(shadowRay.direction,
        shadowObj.inverseTransform);
    const transRay = new Ray(transOrigin, transDirection);

    // find intersection of the (transformed) ray and the untransformed object
    const transPoint = transRay.pointAtParameter(tVal);

    // cast a new shadow ray if the object is transparent
    const transparent = shadowObj.getTransparency(transPoint);
    if (transparent) {
      // transform back to get intersection of the original ray and the transformed object
      const point = util.transformPosition(transPoint, shadowObj.transform);
      const transNormal = shadowObj.normal(transPoint, transRay.direction);
      let normal = util.transformDirection(transNormal,
          mat4.transpose(mat4.create(), shadowObj.inverseTransform));
      vec3.normalize(normal, normal);

      // compute new shadow ray
      const rayFromOutside = vec3.dot(shadowRay.direction, normal) < 0;
      const biased = rayFromOutside ? biasedPoint(point, normal,
          -Math.pow(10, -4)) : biasedPoint(point, normal, Math.pow(10, -4));
      const newShadowRay = new Ray(biased, lightDirection);

      // compute shadow attenuation
      const recurseAtten = isInShadow(newShadowRay, tLight - tVal,
          lightDirection, objects);
      for (let c = 0; c < 3; c++) {
        attenuation[c] = transparent * shadowObj.colorFilter[c] * recurseAtten[c];
      }
    }
  }
  return attenuation;
}

// Given an object, arrays of ambient, diffuse, specualr that contain r, g, b
// values of each component, and shadow attenuation, return an array of final
// color (not clamped yet)
function computeFinalColor(closest, ambient, diffuse, specular, shadow) {
  let finalColor = [];
  for (let c = 0; c < 3; c++) {
    finalColor[c] = shadow[c] * (closest.diffuseOn * diffuse[c] +
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
  let etaOut = 1;
  let etaIn = ior;
  if (cosi < 0) {
    cosi = -cosi;
  } else { // ray hits from inside the object
    [etaOut, etaIn] = [etaIn, etaOut]; // swap etaOut and etaIn
    vec3.negate(normal, normal);
  }
  const eta = etaOut / etaIn;

  const determinant = 1 - eta * eta * (1 - cosi * cosi);
  if (determinant < 0) { // total internal reflection
    return vec3.create(); // no ray is generated; TODO: right?
  }
  return vec3.add(vec3.create(), vec3.scale(vec3.create(), rayDirection, eta),
      vec3.scale(vec3.create(), normal, eta * cosi - Math.sqrt(determinant)));
}

// Given a ray directon, normal, and the object's index of refraction, compute
// and return reflectance following the Schlick's approximation
function schlick(rayDirection, normal, ior) {
  // TODO: repetitive
  let cosi = vec3.dot(rayDirection, normal);
  let etaOut = 1;
  let etaIn = ior;
  if (cosi < 0) {
    cosi = -cosi;
  } else { // ray hits from inside the object
    [etaOut, etaIn] = [etaIn, etaOut]; // swap etaOut and etaIn
  }
  const eta = etaOut / etaIn;

  const determinant = 1 - eta * eta * (1 - cosi * cosi);
  if (determinant < 0) { // total internal reflection
    return 1; // all reflection, no refraction
  } else {
    let r0 = (etaOut - etaIn) / (etaOut + etaIn);
    r0 = r0 * r0;
    return r0 + (1 - r0) * Math.pow((1 - cosi), 5);
  }
}

// Given a ray, array of objects, and recursion depth, return the color of
// sub-pixel
function subpixelColor(ray, objects, recursionDepth) {
  // determine the closest intersecting object
  const intersectData = intersection(ray, objects, Infinity);
  const closest = intersectData.obj;
  const tVal = intersectData.tVal;

  // compute color of each sub-pixel
  let resultColor = backgroundColor;
  if (closest != null) { // hit an object
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = util.transformPosition(ray.origin,
        closest.inverseTransform);
    const transDirection = util.transformDirection(ray.direction,
        closest.inverseTransform);
    const transRay = new Ray(transOrigin, transDirection);

    // find intersection of the (transformed) ray and the untransformed object
    const transPoint = transRay.pointAtParameter(tVal);
    const transNormal = closest.normal(transPoint, transRay.direction);

    // transform back to get intersection of the original ray and the transformed object
    // TODO: make a pre-computing function?
    const point = util.transformPosition(transPoint, closest.transform);
    let normal = util.transformDirection(transNormal,
        mat4.transpose(mat4.create(), closest.inverseTransform));
    vec3.normalize(normal, normal);
    let viewDirection = vec3.subtract(vec3.create(), ray.origin, point);
    vec3.normalize(viewDirection, viewDirection);
    const color = closest.colorAt(transPoint);
    const ambientColor = closest.ambientColorAt(transPoint);
    const ambientLight = closest.ambientLightAt(transPoint);
    const specularColor = closest.specularColorAt(transPoint);
    const specularLight = closest.specularLightAt(transPoint);
    const shininess = closest.shininess;
    const overPoint = biasedPoint(point, normal, Math.pow(10, -4)); // for shadow

    const ambient = computeAmbient(ambientColor, ambientLight); // independent of light
    let diffuse = [];
    let specular = [];
    let shadow = [];
    if (softShadowOn) {
      // for each sampling point in area light, compute diffuse, specular, and
      // shadow and accumulate
      let totalDiffuse = [0, 0, 0];
      let totalSpecular = [0, 0, 0];
      let totalShadow = [0, 0, 0];
      for (let uc = 0; uc < light.usteps; uc++) {
        for (let vc = 0; vc < light.vsteps; vc++) {
          const lightPoint = light.pointAt(uc, vc);
          let lightDirection = vec3.subtract(vec3.create(), lightPoint, point);
          vec3.normalize(lightDirection, lightDirection);

          // intermediates
          const diffuseI = computeDiffuse(color, normal, lightDirection);
          let halfVector = vec3.add(vec3.create(), viewDirection, lightDirection);
          vec3.normalize(halfVector, halfVector);
          const specularI = computeSpecular(specularColor, specularLight,
              normal, halfVector, shininess);
          const shadowRayI = new Ray(overPoint, lightDirection);
          const tLightI = vec3.distance(point, lightPoint);
          const shadowI = isInShadow(shadowRayI, tLightI, lightDirection, objects);

          // accumulate
          for (let c = 0; c < 3; c++) {
            totalDiffuse[c] += diffuseI[c];
            totalSpecular[c] += specularI[c];
            totalShadow[c] += shadowI[c];
          }
        }
      }
      // compute average diffuse, specular, and shadow
      for (let c = 0; c < 3; c++) {
        diffuse[c] = totalDiffuse[c] / light.samples;
      }
      for (let c = 0; c < 3; c++) {
        specular[c] = totalSpecular[c] / light.samples;
      }
      for (let c = 0; c < 3; c++) {
        shadow[c] = totalShadow[c] / light.samples;
      }
    } else {
      // treat area light as point light
      const lightDirection = vec3.subtract(vec3.create(), light.position, point);
      vec3.normalize(lightDirection, lightDirection);

      diffuse = computeDiffuse(color, normal, lightDirection);
      let halfVector = vec3.add(vec3.create(), viewDirection, lightDirection);
      vec3.normalize(halfVector, halfVector);
      specular = computeSpecular(specularColor, specularLight, normal,
          halfVector, shininess);
      const shadowRay = new Ray(overPoint, lightDirection);
      const tLight = vec3.distance(point, light.position);
      shadow = isInShadow(shadowRay, tLight, lightDirection, objects);
    }
    // compute final color of the sub-pixel
    resultColor = computeFinalColor(closest, ambient, diffuse, specular, shadow);

    // reflection and refraction
    // TODO: early termination if no significant color contribution
    if (recursionDepth < MAX_RECURSION) {
      // TODO: implement different materials
      const transparent = closest.getTransparency(transPoint);
      const reflective = closest.getReflectivity(transPoint);

      if (transparent && reflective) { // TODO: implemenet "dielectric" object type
        // compute fresnel (schlick's approximation)
        const reflectance = schlick(ray.direction, normal, closest.ior);

        // compute light attenuation according to beer's law
        const rayFromOutside = vec3.dot(ray.direction, normal) < 0;
        let absorb = [1, 1, 1];
        if (!rayFromOutside) { // ray inside the object
          absorb = closest.colorFilter.map(x => Math.pow(x, tVal));
        }

        // find refracted color
        let refractedColor = [0, 0, 0];
        if (reflectance < 1) { // no total internal reflection
          // cast refraction ray
          const refractOrigin = rayFromOutside ? biasedPoint(point, normal,
              -Math.pow(10, -4)) : biasedPoint(point, normal, Math.pow(10, -4));
          const refractDirection = refract(ray.direction, normal, closest.ior);
          const refractRay = new Ray(refractOrigin, refractDirection);
          refractedColor = subpixelColor(refractRay, objects, recursionDepth + 1);
        }

        // find reflected color
        let reflectedColor = closest.glowColor;
        if (reflectedColor == null) {
          // cast reflection ray
          const reflectOrigin = rayFromOutside ? biasedPoint(point, normal,
              Math.pow(10, -4)) : biasedPoint(point, normal, -Math.pow(10, -4));
          const reflectDirection = reflect(ray.direction, normal);
          const reflectRay = new Ray(reflectOrigin, reflectDirection);
          reflectedColor = subpixelColor(reflectRay, objects, recursionDepth + 1);
        }

        // combine reflected and refracted color and accumulate
        for (let c = 0; c < 3; c++) {
          resultColor[c] += absorb[c] * (reflectance * (reflectedColor[c] / 255) +
              (1 - reflectance) * (refractedColor[c] / 255));
        }
      }

      else if (reflective) {
        // compute reflection ray
        const rayFromOutside = vec3.dot(ray.direction, normal) < 0;
        const reflectOrigin = rayFromOutside ? biasedPoint(point, normal,
            Math.pow(10, -4)) : biasedPoint(point, normal, -Math.pow(10, -4));
        const reflectDirection = reflect(ray.direction, normal);
        const reflectRay = new Ray(reflectOrigin, reflectDirection);

        // cast reflection ray and accumulate reflected color
        const reflectedColor = subpixelColor(reflectRay, objects, recursionDepth + 1);
        for (let c = 0; c < 3; c++) {
          resultColor[c] += 0.8 * reflective * (reflectedColor[c] / 255); // TODO: remove 0.8?
        }
      }

      else if (transparent) {
        // compute refraction (transmittance) ray
        const rayFromOutside = vec3.dot(ray.direction, normal) < 0;
        const refractOrigin = rayFromOutside ? biasedPoint(point, normal,
            -Math.pow(10, -4)) : biasedPoint(point, normal, Math.pow(10, -4));
        const refractDirection = refract(ray.direction, normal, closest.ior);
        const refractRay = new Ray(refractOrigin, refractDirection);

        // cast refraction ray and accumulate refracted color
        const refractedColor = subpixelColor(refractRay, objects, recursionDepth + 1);
        for (let c = 0; c < 3; c++) {
          resultColor[c] += transparent * (refractedColor[c] / 255);
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

// Given pixel position i, j, array of objects, and canvas context, color the
// pixel
function renderPixel(i, j, objects, ctx) {
  let totalColor = [0, 0, 0]; // r, g, b

  // for each sub-pixel, cast a ray and compute color (supersampling)
  for (let ic = i; ic < i + 1; ic += (1 / samplingWidth)) {
    for (let jc = j; jc < j + 1; jc += (1 / samplingHeight)) {
      // cast a ray (random position within the sub-pixel)
      const u = (l + (r - l) * (ic + (Math.random() / samplingWidth)) / nx) * imageAspectRatio;
      const v = b + (t - b) * (jc + (Math.random() / samplingHeight)) / ny;
      const rayOrigin = vec3.fromValues(3, 0, 15);
      let rayDirection = vec3.fromValues(u, v, -d);
      vec3.normalize(rayDirection, rayDirection);
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
    averageColor[c] = totalColor[c] / (samplingWidth * samplingHeight);
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

  // prepare to load textures
  $("#log").text("Loading textures...");
  const img = new Image();
  const canvasT = document.createElement("canvas");
  const ctxT = canvasT.getContext("2d");

  // load textures
  const earthData = await loadTexture(img, canvasT, ctxT, "8k_earth_day.jpg");
  const earthTexture = new Texture(earthData, canvasT.width, canvasT.height);
  //const earthNormalData = await loadTexture(img, canvasT, ctxT, "8k_earth_normal.png");
  //const earthNormal = new Texture(earthNormalData, canvasT.width, canvasT.height);
  const earthSpecularData = await loadTexture(img, canvasT, ctxT, "8k_earth_specular.png");
  const earthSpecular = new Texture(earthSpecularData, canvasT.width, canvasT.height);
  const starData = await loadTexture(img, canvasT, ctxT, "8k_stars_milky_way.jpg");
  const starTexture = new Texture(starData, canvasT.width, canvasT.height);
  const cloudData = await loadTexture(img, canvasT, ctxT, "8k_earth_clouds.jpg");
  const cloudTexture = new Texture(cloudData, canvasT.width, canvasT.height);
  const moonData = await loadTexture(img, canvasT, ctxT, "moon.jpg");
  const moonTexture = new Texture(moonData, canvasT.width, canvasT.height);

  // earth
  const earth = new Sphere(0, 0, 0, 2, 0, 70, 160, true, true, true);
  earth.setTexture(earthTexture);
  //earth.setNormalMap(earthNormal);
  earth.setSpecularMap(earthSpecular);
  earth.rotate(vec3.fromValues(0, 0, 1), -0.41); // 23.5 degrees tilted
  earth.setSpecularColor(150, 150, 150);
  earth.setShininess(50);
  objects.push(earth);

  // starfield
  const starfield = new Sphere(0, 0, 0, 20, 0, 0, 0, false, true, false);
  starfield.setTexture(starTexture);
  starfield.setAmbientLight(255, 255, 255);
  objects.push(starfield); // TODO: make it bigger

  // earth cloud
  const cloud = new Sphere(0, 0, 0, 2.02, 255, 255, 255, true, true, false);
  cloud.setTexture(cloudTexture);
  cloud.setOpacityMap(cloudTexture);
  cloud.rotate(vec3.fromValues(0, 0, 1), -0.41); // 23.5 degrees tilted
  objects.push(cloud);

  // earth atmosphere
  const atmosphere = new Sphere(0, 0, 0, 2.03, 0, 0, 0, false, false, false);
  atmosphere.setTransparency(1, 1);
  atmosphere.setReflectivity(1);
  atmosphere.setGlowColor(110, 190, 255);
  objects.push(atmosphere);

  // moon
  const moon = new Sphere(0, 0, 0, 0.3, 255, 255, 255, true, true, false);
  moon.setTexture(moonTexture);
  moon.rotate(vec3.fromValues(0, 1, 0), -Math.PI / 1.8);
  moon.translate(2, -1, 3);
  objects.push(moon);

  // for each pixel, cast a ray and color the pixel
  const canvas = document.getElementById("rendered-image");
  const ctx = canvas.getContext("2d");
  let pixelNumber = 1;
  let percent = 0;
  $("#log").text("Loading... 0%");
  let promise = new Promise((resolve, reject) => {
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        setTimeout(function() {
          renderPixel(i, j, objects, ctx);
          if (pixelNumber % Math.floor((nx * ny) / 100) == 0) {
            percent++;
            $("#log").text("Loading... " + percent + "%");
          }
          pixelNumber++;
        }, 0);
      }
    }
    setTimeout(function() { resolve("done!"); }, 0);
  });
  // set log to empty text 1 second after rendering finishes
  promise.then((value) => {
    setTimeout(function() {
      $("#log").text("");
    }, 1000);
  });
}

$(document).ready(function() {
  // set width and height of canvas
  const canvas = document.getElementById("rendered-image");
  canvas.width = nx;
  canvas.height = ny;

  // choose a stage
  $("#stages a").on("click", function() {
    const stage = $(this).attr("class");
    $("#stages").fadeTo(500, 0, function() {
      $("#stages").css("visibility", "hidden");
    });
    $(".description." + stage).css("visibility", "visible");
    $(".description." + stage).fadeTo(400, 1);
  });

  // back button
  $(".back").on("click", function() {
    $(".description").fadeTo(500, 0, function() {
      $(".description").css("visibility", "hidden");
    });
    $("#stages").css("visibility", "visible");
    $("#stages").fadeTo(400, 1);
  });

  // render
  try {
    render();
  } catch(err) {
    //alert(err);
    console.log(err);
  } finally {
    return false;
  }
});
