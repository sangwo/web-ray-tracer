// class defining a texture
export class Texture {
  // Given an array of color values of pixels (texels), width, and height of the
  // texture image, construct a texture
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }

  // Given a texture coordinate u, v, return the color values r, g, b as an
  // array at the given coordinate
  colorAt(u, v) {
    // convert texture coordinate into texel coordinate (nearest neighbor)
    const iLookUp = Math.round(u * this.width - 0.5);
    const jLookUp = Math.round(v * this.height - 0.5);

    // manage i, j out of range (clamp)
    const iPixel = Math.max(0, Math.min(this.width - 1, iLookUp));
    const jPixel = Math.max(0, Math.min(this.height - 1, jLookUp));

    const indexR = 4 * iPixel + 4 * (this.height - 1 - jPixel) * this.width;
    const indexG = indexR + 1;
    const indexB = indexR + 2;

    return [this.data[indexR], this.data[indexG], this.data[indexB]];
  }
}
