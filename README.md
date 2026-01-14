# `<elevation-profile>`

A web component to display an elevation profile of a MultiLineString.

## Demo

[Demo](https://geoblocks.github.io/elevation-profile/index.html)

## Installation

```bash
npm i --save @geoblocks/elevation-profile
```

## Usage

```html
 <elevation-profile .lines="${lines}"></elevation-profile>
```

## API

### Properties/Attributes

| Name            | Type             | Default                                      | Description
| --------------- | ---------------- | -------------------------------------------- | -----------
| `lines`         | `number[][][]`   |                                              | **required** MultiLineString coordinates
| `points`        | `number[][]`     |                                              | Points to be displayed on the profile
| `lineSegments`  | `SegmentData`    | `undefined`                                  | Segments for the elevation line with different visual properties
| `xAxisSegments` | `SegmentData`    | `undefined`                                  | Segments for trail bands below the x-axis
| `margin`        | `Object`         | `{top: 20, right: 20, bottom: 20, left: 20}` | Margin in pixels around the elevation profile
| `pointerEvents` | `Boolean`        | `true`                                       | Whether to emit pointer events
| `tickSize`      | `Object`         | `{x: 100, y: 40}`                            | Size of the ticks in pixels
| `locale`        | `string`         | `navigator.language`                         | Locale for the axis numbers formatting
| `tolerance`     | `number`         | `1`                                          | Tolerance for the line simplification. Set to `0` to disable simplification

### Ticks formating

The value of the tick in the axis can be changed by overriding the `tickFormat` method.

```javascript
profile.tickFormat = (value, axis) => {
  return Math.round(value);
};
```

Where `value` is the value of the tick and `axis` is the axis where the tick is located (`x` or `y`).

### Tick values

Ticks can be set manually using the `tickValues` method, passing an array of values and the desired axis (`x` of `y`).
If values is null or the axis is not specified, ticks will be generated automatically.

```javascript
profile.tickValues([100, 150, 200, 250], 'y');
```

### Adding points

Points can be added to the profile by setting the `points` property. By default, the points will be displayed as circles on the profile.
This can be changed by overriding the `pointSvg` method.

```javascript
profile.pointSvg = (x, y, index) => {
  return `<circle cx="${x}" cy="${y}" r="5" fill="red" />`;
};
```

Where `x` and `y` are the position in pixels and `index` is the index of the point in the `points` array.

### Segments

Segments allow you to style different parts of the elevation profile based on properties like surface type, hiking category, etc.

**Type definition:**
```typescript
type SegmentData = Array<[number, number, string | null]>;
// Format: [startIndex, endIndex, value]
// Use null as value to create "holes" (segments without styling)
```

**Example usage:**
```javascript
profile.lineSegments = [
  [0, 175, "paved"],
  [175, 195, "unpaved"],
  [195, 196, "paved"],
  [196, 213, "unpaved"]
];

profile.xAxisSegments = [
  [0, 5, "bergwanderweg"],
  [5, 102, "other"],
  [102, 113, "bergwanderweg"]
];

// Example with holes (null values won't render)
profile.lineSegments = [
  [0, 50, "paved"],
  [50, 100, null],  // No segment rendered for this range
  [100, 150, "unpaved"]
];
```

**Styling segments:**

Segments are rendered with `data-value` attributes that you can style externally:

- **Line segments** (`lineSegments`): Multiple `<path>` elements with class `elevation` and `data-value` attribute
- **Trail bands** (`xAxisSegments`): Horizontal `<rect>` elements with class `trail-band` and `data-value` attribute

```css
/* Style line segments */
.elevation {
  /* style for segments without a specific value */
  stroke: #000;
}
.elevation[data-value="paved"] {
  stroke: #2ecc71;
}
.elevation[data-value="unpaved"] {
  stroke: #e67e22;
  stroke-dasharray: 5, 5;
}

/* Style trail bands */
.trail-band[data-value="bergwanderweg"] {
  fill: #e74c3c;
}
.trail-band[data-value="other"] {
  fill: #3498db;
}
```

**Note:** Segment indices should match the input coordinate array (before simplification).

### Events

If `pointerEvents` is `true`, the component will emit the following custom events on pointer interaction:

| Name            | When                                        | Detail type                                                | Description
| --------------- | ------------------------------------------- | ---------------------------------------------------------- | -----------
| `over`          | The pointer is over the profile  | `{coordinate: number[], position: {x: number, y: number}, segments?: {line: string | null, xAxis: string | null}}` | `coordinate` is the coordinate of the point on the MultiLineString, `position` is the position of the pointer relative to the component, and `segments` contains the segment values at the pointer location
| `out`           | The pointer leaves the profile   |  |

### Styling

FIXME: TBD

| CSS class                 | SVG type | Description
| ------------------------- | -------- | -----------
| `.elevation`              | `path`   | The elevation line
| `.elevation.highlight`    | `path`   | On pointer over, the elevation line left to the pointer
| `.area`                   | `path`   | The area below the elevation line
| `.point`                  | `circle` | The points on the elevation line
| `.pointer-line.x`         | `line`   | On pointer over, the vertical that follows the pointer
| `.pointer-line.y`         | `line`   | On pointer over, the horizontal that follows the pointer
| `.pointer-circle`         | `circle` | On pointer over, the circle that follows the pointer
| `.pointer-circle-outline` | `circle` | On pointer over, the outline of the circle that follows the pointer
| `.trail-band`             | `rect`   | The trail category bands below the x-axis
