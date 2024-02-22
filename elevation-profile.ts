import {LitElement, svg} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';
import {ResizeController} from '@lit-labs/observers/resize-controller.js';
import {guard} from 'lit/directives/guard.js';
import type {PropertyValues, TemplateResult} from 'lit';

import {extent, bisector} from 'd3-array';
import {scaleLinear} from 'd3-scale';
import {line, area} from 'd3-shape';
import {axisBottom, axisLeft} from 'd3-axis';
import {select, pointer} from 'd3-selection';

import simplify from 'simplify-js';

type PlotPoint = {
  x: number;
  y: number;
  coordinate: number[];
};

export type OverDetails = {
  coordinate: number[];
  position: {x: number; y: number};
};

@customElement('elevation-profile')
export default class ElevationProfile extends LitElement {
  @property({type: Number}) tolerance = 1;
  @property({type: String}) locale = navigator.language;
  @property({type: Array}) lines: number[][][] = [];
  @property({type: Array}) points: number[][] = [];
  @property() updateScale = (x: scaleLinear, y: scaleLinear, width: number, height: number): void => {};
  @property({type: Object}) margin = {top: 20, right: 20, bottom: 20, left: 40};
  @property({type: Object}) tickSize = {x: 100, y: 40};
  @property({type: Boolean}) pointerEvents = true;

  @state() pointer = {x: 0, y: 0};
  private resizeController = new ResizeController(this, {
    callback: () => [this.offsetWidth, this.offsetHeight],
  });

  private plotData: PlotPoint[] = [];
  private pointsData: PlotPoint[] = [];
  private scaleX = scaleLinear();
  private scaleY = scaleLinear();

  private bisectDistance = bisector((point: PlotPoint) => point.x);

  private line = line()
    .defined((point: PlotPoint) => !isNaN(point.y))
    .x((point: PlotPoint) => this.scaleX(point.x))
    .y((point: PlotPoint) => this.scaleY(point.y));
  private area = area()
    .defined((point: PlotPoint) => !isNaN(point.y))
    .x((point: PlotPoint) => this.scaleX(point.x))
    .y1((point: PlotPoint) => this.scaleY(point.y));
  private xAxis = axisBottom(this.scaleX).tickFormat((value: number) => this.tickFormat(value, 'x'));
  private yAxis = axisLeft(this.scaleY).tickFormat((value: number) => this.tickFormat(value, 'y'));
  private xGrid = axisBottom(this.scaleX).tickFormat(() => '');
  private yGrid = axisLeft(this.scaleY).tickFormat(() => '');

  private meterFormat: Intl.NumberFormat | null = null;
  private kilometerFormat: Intl.NumberFormat | null = null;

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('locale')) {
      this.meterFormat = new Intl.NumberFormat(this.locale, {
        style: 'unit',
        unit: 'meter',
      });

      this.kilometerFormat = new Intl.NumberFormat(this.locale, {
        style: 'unit',
        unit: 'kilometer',
      });
    }
  }

  override willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('lines')) {
      this.plotData.length = 0;
      for (const line of this.lines) {
        const data = line.map((coordinate) => ({x: coordinate[3], y: coordinate[2], coordinate}));
        this.plotData.push(...simplify(data, this.tolerance));
        this.plotData.push({x: line[line.length - 1][3], y: NaN, coordinate: []});
      }

      this.scaleX.domain(extent(this.plotData, (data: PlotPoint) => data.x));
      this.scaleY.domain(extent(this.plotData, (data: PlotPoint) => data.y)).nice();

      this.updateScale(this.scaleX, this.scaleY, this.offsetWidth, this.offsetHeight);
    }
    if (changedProperties.has('points')) {
      this.pointsData.length = 0;
      for (const point of this.points) {
        this.pointsData.push({x: point[3], y: point[2], coordinate: point});
      }
    }
  }

  override render() {
    const [width, height] = this.resizeController.value ?? [0, 0];

    this.scaleX.range([this.margin.left, width - this.margin.right]);
    this.scaleY.range([height - this.margin.bottom, this.margin.top]);

    this.area.y0(height - this.margin.bottom);

    this.yGrid.tickSize(-width + this.margin.left + this.margin.right);
    this.xGrid.tickSize(height - this.margin.top - this.margin.bottom);

    const xTicks = width / this.tickSize.x;
    const yTicks = height / this.tickSize.y;
    this.xAxis.ticks(xTicks);
    this.xGrid.ticks(xTicks);
    this.yAxis.ticks(yTicks);
    this.yGrid.ticks(yTicks);

    select(this.querySelector('.axis.x')).call(this.xAxis);
    select(this.querySelector('.axis.y')).call(this.yAxis);
    select(this.querySelector('.grid.x')).call(this.xGrid);
    select(this.querySelector('.grid.y')).call(this.yGrid);


    const firstYTick = this.scaleY.ticks(yTicks)[0];
    const firstCoordinate = this.plotData[0]
    return svg`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <g class="grid y" transform="translate(${this.margin.left}, 0)" />
        <g class="grid x" transform="translate(0, ${this.margin.bottom})" />
        <g class="axis x" transform="translate(0, ${height - this.margin.bottom})" />
        <g class="axis y" transform="translate(${this.margin.left}, 0)" />

        ${guard([this.lines, width, height], () => svg`
          <path class="area" d="${this.area(this.plotData)}" />
          <path class="elevation" d="${this.line(this.plotData)}" fill="none" />`
        )}

        <g style="visibility: ${this.pointer.x > 0 ? 'visible' : 'hidden'}">
          <g clip-path="polygon(0 0, ${this.pointer.x - this.margin.left} 0, ${this.pointer.x - this.margin.left} 100%, 0 100%)">
            ${guard([this.lines, width, height], () => svg`<path class="elevation highlight" d="${this.line(this.plotData)}" fill="none" />`)}
          </g>
          <line
            class="pointer-line"
            x1="${this.pointer.x}"
            y1="${this.margin.top}"
            x2="${this.pointer.x}"
            y2="${height - this.margin.bottom}"
          />
          <circle class="pointer-circle-outline" cx="${this.pointer.x}" cy="${this.pointer.y}" r="16"/>
          <circle class="pointer-circle" cx="${this.pointer.x}" cy="${this.pointer.y}" r="6"/>
        </g>

        ${this.pointsData.map((point, index) => this.pointSvg(this.scaleX(point.x), this.scaleY(point.y), index))}

        <rect
          width="${width}"
          height="${height}"
          fill="none"
          pointer-events="${this.pointerEvents ? 'all' : 'none'}"
          style="display: block; touch-action: none;"
          @pointermove="${this.pointerMove}"
          @pointerout="${this.pointerOut}"
        />
        <g 
          transform="translate(${this.margin.left},${height - this.margin.bottom})" 
          style="visibility: ${firstCoordinate && firstYTick >= firstCoordinate.y ? 'visible' : 'hidden'}">
          <line stroke="black" x2="${width - this.margin.left - this.margin.right}"></line>
        </g>
      </svg>
    `;
  }

  public tickFormat(value: number, axis: 'x' | 'y') {
    if (axis === 'y' || value < 1000) {
      return this.meterFormat!.format(value);
    } else {
      return this.kilometerFormat!.format(value / 1000);
    }
  }

  public pointSvg(x: number, y: number, index: number): TemplateResult {
    return svg`<circle class="point" cx="${x}" cy="${y}" r="10"/>`;
  }

  override firstUpdated() {
    // FIXME: because the ref element are used before render is done, we need to force an update
    this.requestUpdate();
  }

  private pointerMove(event: PointerEvent) {
    const pointerDistance = this.scaleX.invert(pointer(event)[0]);
    const index = Math.min(this.bisectDistance.left(this.plotData, pointerDistance), this.plotData.length - 1);

    if (index < 0) {
      return;
    }
    // FIXME:
    // var d0 = this.plotData[index - 1]
    // var d1 = this.plotData[index];
    // // work out which date value is closest to the mouse
    // var d = mouseDate - d0[0] > d1[0] - mouseDate ? d1 : d0;

    const data = this.plotData[index];

    if (isNaN(data.y)) {
      return;
    }

    this.pointer = {
      x: this.scaleX(data.x),
      y: this.scaleY(data.y),
    };

    this.dispatchEvent(
      new CustomEvent<OverDetails>('over', {
        detail: {
          coordinate: this.plotData[index].coordinate,
          position: this.pointer
        }
      }),
    );
  }

  private pointerOut() {
    this.pointer = {
      x: 0,
      y: 0,
    };
    this.dispatchEvent(new CustomEvent('out'));
  }

  override createRenderRoot() {
    return this;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'elevation-profile': ElevationProfile;
  }
}
