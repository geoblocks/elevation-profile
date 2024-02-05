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
| `lines`         | `number[][][]`   |                                              | MultiLineString coordinates
| `margin`        | `Object`         | `{top: 20, right: 20, bottom: 20, left: 40}` | Margin in pixels around the elevation profile
| `pointerEvents` | `Boolean`        | `true`                                       | Whether to emit pointer events
| `tickSize`      | `Object`         | `{x: 100, y: 40}`                            | Size of the ticks in pixels
| `locale`        | `string`         | `navigator.language`                         | Locale for the axis labels
| `tolerance`     | `number`         | `1`                                          | Tolerance for the line simplification. Set to `0` to disable simplification

The value of the tick in the axis can be changed by overriding the `tickFormat` method.
```javascript
profile.tickFormat = (value, axis) => {
  return Math.round(value);
};
```
Where `value` is the value of the tick and `axis` is the axis where the tick is located (`x` or `y`).


### Events

If `pointerEvents` is `true`, the component will emit the following custom events on pointer interaction:

| Name            | When                                        | Detail type                                                | Description
| --------------- | ------------------------------------------- | ---------------------------------------------------------- | -----------
| `over`          | The pointer is over the profile  | `{coordinate: number[], position: {x: number, y: number}}` | `coordinate` is the coordinate of the point on the MultiLineString and `position` is the position of the pointer relative to the component
| `out`           | The pointer leaves the profile   |  |

### Styling

TODO: describe CSS selectors
