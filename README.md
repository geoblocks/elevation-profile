# `<elevation-profile>`

A web component to display an elevation profile of a MultiLineString.

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
| `margin`        | `Object`         | `{top: 20, right: 20, bottom: 20, left: 40}` | Margin in pixels around the elevation profile
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

### Events

If `pointerEvents` is `true`, the component will emit the following custom events on pointer interaction:

| Name            | When                                        | Detail type                                                | Description
| --------------- | ------------------------------------------- | ---------------------------------------------------------- | -----------
| `over`          | The pointer is over the profile  | `{coordinate: number[], position: {x: number, y: number}}` | `coordinate` is the coordinate of the point on the MultiLineString and `position` is the position of the pointer relative to the component
| `out`           | The pointer leaves the profile   |  |

### Styling

FIXME: TBD

| CSS class                 | Description
| ------------------------- | -----------
| `.elevation`              | The elevation line
| `.elevation.highlight`    | On pointer over, the elevation line left to the pointer
| `.area`                   | The area below the elevation line
| `.point`                  | The points on the elevation line
| `.pointer-line.x`         | On pointer over, the vertical that follows the pointer
| `.pointer-line.y`         | On pointer over, the horizontal that follows the pointer
| `.pointer-circle`         | On pointer over, the circle that follows the pointer
| `.pointer-circle-outline` | On pointer over, the outline of the circle that follows the pointer
