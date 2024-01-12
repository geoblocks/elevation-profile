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
| `tickSize`      | `Object`         | `{x: 100, y: 40}`                            | Size of the ticks in pixels
| `locale`        | `string`         | `navigator.language`                         | Locale for the axis labels
| `tolerance`     | `number`         | `1`                                          | Tolerance for the line simplification. Set to `0` to disable simplification

### Styling

TODO: describe CSS selectors
