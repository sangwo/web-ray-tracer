# Working with HTML canvas
For our ray tracer, we will be rendering 3d objects on HTML canvas. Hence, first create an HTML file `index.html` and add a canvas element. Note that the unit of the width and height is a pixel and you are free to set them as whatever you want. Also, note that these are different from the width and height of CSS styles.

The canvas (and the whole computer screen after all) consists of pixels—picture elements—that are the smallest controllable units. Rendering an image means coloring these pixels. Hence, we need a way to color each pixel on the canvas. One way is to use the `ImageData` object, however this tutorial uses the `fillRect` method by treating a pixel as a 1x1 rectangle because it’s faster. Note that the pixel at the coordinate `(0, 0)` is located at the top-left corner of the canvas. Hence, the following code colors the pixel at `(i, j)` as red.

```javascript
const canvas = document.getElementById("rendered-image");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "rgb(255, 0, 0)";
ctx.fillRect(i, j, 1, 1);
```
