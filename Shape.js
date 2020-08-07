// parent class for different objects (sphere, triangle, etc)
const { vec3, mat4 } = glMatrix;

export class Shape {
  // Given color values r, g, b and whether diffuse, ambient, specular
  // components are on, construct a shape
  constructor(r, g, b, diffuseOn, ambientOn, specularOn) {
    // color
    this.color = [r, g, b];
    this.ambientPercent = 0.5;
    this.specularColor = [255, 255, 255];
    this.specularLight = [255, 255, 255];
    this.glowColor = null;
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

  /********** TEXTURES **********/
  // Given a point as a vec3 object, compute and return a texture coordinate u,
  // v as an array
  getUV(point) {
    throw "This function needs to be overriden";
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

  /********** SHADING OPTIONS **********/
  // Given a shininess, set it as the object's shininess
  setShininess(shininess) {
    this.shininess = shininess;
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

  // Given a color filter for each color channel (r, g, b), set it as the
  // object's color filter
  setColorFilter(cr, cg, cb) {
    this.colorFilter = [cr, cg, cb];
  }

  // Given color values r, g, b, set it as the object's glow color
  setGlowColor(r, g, b) {
    this.glowColor = [r, g, b];
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
    const result = mat4.multiply(mat4.create(), mat4.multiply(mat4.create(),
        worldToObject, rotationMat), objectToWorld);
    mat4.multiply(this.transform, result, this.transform);
    mat4.multiply(this.inverseTransform, this.inverseTransform,
        mat4.invert(mat4.create(), result));
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
    mat4.multiply(this.inverseTransform, this.inverseTransform,
        mat4.invert(mat4.create(), scalingMat));
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
    mat4.multiply(this.inverseTransform, this.inverseTransform,
        mat4.invert(mat4.create(), translMat));
  }
}
