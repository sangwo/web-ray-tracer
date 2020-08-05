// class defining a sphere
const { vec3, mat3, mat4 } = glMatrix;
import { Ray } from "./Ray.js";
import * as util from "./utility.js";

export class Sphere {
  // Given x, y, z coordinates, radius, color values r, g, b, and whether
  // diffuse, ambient, specular components are on, construct an unit sphere
  // centered at origin transformed according to the coordinates and the radius
  constructor(x, y, z, radius, r, g, b, diffuseOn, ambientOn, specularOn) {
    // color
    this.color = [r, g, b];
    this.ambientPercent = 0.5;
    this.specularColor = [255, 255, 255];
    this.specularLight = [255, 255, 255];
    this.reflectedColor = null; // glow
    // textures
    this.texture = null;
    this.normalMap = null;
    this.specularMap = null;
    this.opacityMap = null;
    this.ambientOcclusion = null;
    // shading options
    this.diffuseOn = diffuseOn;
    this.ambientOn = ambientOn;
    this.specularOn = specularOn;
    this.shininess = 200; // Phong exponent
    // reflection and refraction
    this.reflective = 0;
    this.transparent = 0; // amount of light allowed to go through
    this.ior = 1; // index of refraction
    this.colorFilter = [1, 1, 1]; // Math.exp(-absorbance)
    // transformation
    this.transform = mat4.create(); // identity matrix
    this.inverseTransform = mat4.create(); // inverse identity matrix
    // transform according to x, y, z and radius
    this.scale(radius, radius, radius);
    this.translate(x, y, z);
  }

  // Given a point and ray direction as vec3 objects, return the normal at the
  // point as a vec3 object
  normal(point, rayDirection) {
    let normal = vec3.normalize(vec3.create(), point);
    if (this.normalMap != null) {
      const uv = this.getUV(point);

      // convert rgb to normal in tangent space
      const rgb = this.normalMap.colorAt(uv[0], uv[1]).map(function(x) {
        return 2 * x - 255;
      });
      const normalTangentSpace = vec3.fromValues(rgb[0], rgb[1], rgb[2]);
      vec3.normalize(normalTangentSpace, normalTangentSpace);

      // compute tbn matrix
      let tangent = vec3.fromValues(0, 0, 1); // any vector not collinear with normal
      if (vec3.equals(normal, tangent)) {
        tangent = vec3.fromValues(0, 1, 0);
      }
      const bitangent = vec3.cross(vec3.create(), normal, tangent);
      const tbn = mat3.fromValues(
        tangent[0], tangent[1], tangent[2],
        bitangent[0], bitangent[1], bitangent[2],
        normal[0], normal[1], normal[2]
      );

      // convert normal in tangent space to object space
      vec3.transformMat3(normal, normalTangentSpace, tbn);
    }
    return normal;
  }

  // Given a Ray object, return the t value for the intersection (null if the
  // ray doesn’t intersect with the sphere)
  intersects(ray) {
    // transform the ray according to the object's inverse transformation matrix
    const transOrigin = util.transformPosition(ray.origin, this.inverseTransform);
    const transDirection = util.transformDirection(ray.direction, this.inverseTransform);
    const transRay = new Ray(transOrigin, transDirection);

    // compute intersection of the (transformed) ray and the object
    const a = vec3.dot(transRay.direction, transRay.direction);
    const b = 2 * vec3.dot(transRay.direction, transRay.origin);
    const c = vec3.dot(transRay.origin, transRay.origin) - 1;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    // compute t value
    if (vec3.length(transRay.origin) < 1) { // ray origin inside the sphere
      return (-b + Math.sqrt(discriminant)) / (2 * a);
    } else { // choose smaller (closer) value of t
      return (-b - Math.sqrt(discriminant)) / (2 * a);
    }
  }

  /********** COLOR **********/
  // Given a point as a vec3 object, return an array of color values r, g, b at
  // that point
  colorAt(point) {
    if (this.texture != null) {
      const uv = this.getUV(point);
      return this.texture.colorAt(uv[0], uv[1]);
    }
    return this.color;
  }

  // Given a percentage to tone down the surface color to make an ambient color,
  // set it as an ambient percent
  setAmbientPercent(percent) {
    this.ambientPercent = percent;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // ambient color at that point
  ambientColorAt(point) {
    // compute ambient color by multiplying surface color by ambient percent
    const self = this;
    let ambientColor = this.color.map(function(x) { return self.ambientPercent * x; });
    if (this.texture != null) {
      const surfaceColor = this.colorAt(point);
      ambientColor = surfaceColor.map(function(x) { return self.ambientPercent * x; });
    }
    // check if ambient occlusion map exists
    if (this.ambientOcclusion != null) {
      const uv = this.getUV(point);
      const occlusion = this.ambientOcclusion.colorAt(uv[0], uv[1])[0] / 255;
      ambientColor = ambientColor.map(function(x) { return occlusion * x; });
    }
    return ambientColor;
  }

  // Given an array of color values r, g, b, set it as the object's specular
  // color
  setSpecularColor(r, g, b) {
    this.specularColor = [r, g, b];
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // specular color at that point
  specularColorAt(point) {
    return this.specularColor;
  }

  // Given a point as a vec3 object, return an array of color values r, g, b of
  // specular light at that point
  specularLightAt(point) {
    if (this.specularMap != null) {
      const uv = this.getUV(point);
      return this.specularMap.colorAt(uv[0], uv[1]);
    }
    return this.specularLight;
  }

  /********** SHADING OPTIONS **********/
  // Given a shininess, set it as the object's shininess
  setShininess(shininess) {
    this.shininess = shininess;
  }

  /********** TEXTURES **********/
  // Given a point as a vec3 object, compute and return a texture coordinate u,
  // v as an array
  getUV(point) {
    const theta = Math.acos(point[1]);
    let phi = Math.atan2(point[2], -point[0]);
    if (phi < 0) {
      phi = phi + 2 * Math.PI;
    }
    const u = phi / (2 * Math.PI)
    const v = (Math.PI - theta) / Math.PI;
    return [u, v];
  }

  // Given a Texture object, set the object's texture
  setTexture(texture) {
    this.texture = texture;
  }

  // Given a Texture object, set the object's normal map
  setNormalMap(normalMap) {
    this.normalMap = normalMap;
  }

  // Given a Texture object, set the object's specular map
  setSpecularMap(specularMap) {
    this.specularMap = specularMap;
  }

  // Given a Texture object, set the object's opacity map
  setOpacityMap(opacityMap) {
    this.opacityMap = opacityMap;
  }

  // Given a Texture object, set the object's ambient occlusion map
  setAmbientOcclusion(ambientOcclusionMap) {
    this.ambientOcclusion = ambientOcclusionMap;
  }

  /********** REFLECTION/REFRACTION **********/
  // Given a reflectivity coefficient in the range between 0 and 1, set the
  // object's reflectivity
  setReflectivity(ks) {
    if (ks < 0 || ks > 1) {
      throw new RangeError("The argument must be between 0 and 1");
    }
    this.reflective = ks;
  }

  // Given a point as a vec3 object, return reflectivity at that point
  getReflectivity(point) {
    return this.reflective;
  }

  // Given a transparency coefficient in the range between 0 and 1 and index of
  // refraction, set the object's transparency and index of refraction
  setTransparency(kt, ior) {
    if (kt < 0 || kt > 1) {
      throw new RangeError("The argument must be between 0 and 1");
    }
    this.transparent = kt;
    this.ior = ior;
  }

  // Given a point as a vec3 object, return transparency at that point
  getTransparency(point) {
    if (this.opacityMap != null) {
      const uv = this.getUV(point);
      const opacity = this.opacityMap.colorAt(uv[0], uv[1])[0] / 255;
      return 1 - opacity;
    }
    return this.transparent;
  }

  // Given a color filter for each color channel r, g, b, set it as the object's
  // color filter
  setColorFilter(cr, cg, cb) {
    this.colorFilter = [cr, cg, cb];
  }

  // Given color values r, g, b, set it as the object's reflected (glow) color
  setReflectedColor(r, g, b) {
    this.reflectedColor = [r, g, b];
  }

  /********** TRANSFORMATION **********/
  // Given an axis to rotate about as a vec3 object and an angle to rotate by in
  // radians, compute rotation matrix and multiply it to transformation matrix
  rotate(axis, angle) {
    const w = vec3.normalize(vec3.create(), axis);
    let t = vec3.fromValues(0, 0, 1); // any vector not collinear with w
    if (vec3.equals(w, t)) {
      t = vec3.fromValues(0, 1, 0);
    }
    const u = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), w, t));
    const v = vec3.cross(vec3.create(), w, u);
    const objectToWorld = mat4.fromValues(
      u[0], v[0], w[0], 0,
      u[1],v[1], w[1], 0,
      u[2], v[2], w[2], 0,
      0, 0, 0, 1
    );
    const rotationMat = mat4.fromValues(
      Math.cos(angle), Math.sin(angle), 0, 0,
      -Math.sin(angle), Math.cos(angle), 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    const worldToObject = mat4.transpose(mat4.create(), objectToWorld);
    const result = mat4.multiply(mat4.create(), mat4.multiply(mat4.create(), worldToObject, rotationMat), objectToWorld);
    mat4.multiply(this.transform, result, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform, mat4.invert(mat4.create(), result));
  }

  // Given scaling factors in x, y, z directions, compute scaling matrix and
  // multiply it to transformation matrix
  scale(sx, sy, sz) {
    const scalingMat = mat4.fromValues(
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    );
    mat4.multiply(this.transform, scalingMat, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform, mat4.invert(mat4.create(), scalingMat));
  }

  // Given x, y, z to translate by, compute translation matrix and multiply it
  // to transformation matrix
  translate(x, y, z) {
    const translMat = mat4.fromValues(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    );
    mat4.multiply(this.transform, translMat, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform, mat4.invert(mat4.create(), translMat));
  }
}
