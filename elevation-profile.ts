import {LitElement, svg} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';
import {ResizeController} from '@lit-labs/observers/resize-controller.js';
import type {PropertyValues} from 'lit';

import {extent, bisector} from 'd3-array';
import {scaleLinear} from 'd3-scale';
import {line, area} from 'd3-shape';
import {axisBottom, axisLeft} from 'd3-axis';
import {select, pointer} from 'd3-selection';

type PlotPoint = number[];

@customElement('elevation-profile')
export class ElevationProfile extends LitElement {
  @property({type: Array}) lines: number[][] = [];
  @property({type: Object}) margin = {top: 20, right: 20, bottom: 20, left: 40};
  @property({type: Object}) tickSize = {x: 100, y: 40};

  @state() pointer = {x: 0, y: 0};
  private _resizeController = new ResizeController(this, {});

  private plotData: PlotPoint[] = [];
  private scaleX = scaleLinear();
  private scaleY = scaleLinear();

  private bisectDistance = bisector((point: PlotPoint) => point[0]);

  private line = line()
    .x((point: PlotPoint) => this.scaleX(point[0]))
    .y((point: PlotPoint) => this.scaleY(point[1]));
  private area = area()
    .x((point: PlotPoint) => this.scaleX(point[0]))
    .y1((point: PlotPoint) => this.scaleY(point[1]));
  private xAxis = axisBottom(this.scaleX).tickFormat((value: number) => this.tickFormat(value));
  private yAxis = axisLeft(this.scaleY).tickFormat((value: number) => this.tickFormat(value));
  private xGrid = axisBottom(this.scaleX).tickFormat(() => '');
  private yGrid = axisLeft(this.scaleY).tickFormat(() => '');

  private meterFormat = Intl.NumberFormat('de-CH', {
    style: 'unit',
    unit: 'meter',
  });

  private kilometerFormat = Intl.NumberFormat('de-CH', {
    style: 'unit',
    unit: 'kilometer',
  });

  override willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('lines')) {
      this.plotData = this.lines.map((coordinate) => [coordinate[3], coordinate[2]]);

      this.scaleX.domain(extent(this.plotData, (data: PlotPoint) => data[0]));
      this.scaleY.domain(extent(this.plotData, (data: PlotPoint) => data[1])).nice();
    }
  }

  // override shouldUpdate(): boolean {
  //     return this.lines.length > 0;
  // }

  override render() {
    const width = this.offsetWidth;
    const height = this.offsetHeight;

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

    return svg`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <g class="grid y" transform="translate(${this.margin.left}, 0)" />
        <g class="grid x" transform="translate(0, ${this.margin.bottom})" />
        <g class="axis x" transform="translate(0, ${height - this.margin.bottom})" />
        <g class="axis y" transform="translate(${this.margin.left}, 0)" />
        <path class="area" d="${this.area(this.plotData)}" />
        <path class="elevation" d="${this.line(this.plotData)}" fill="none" />
        <g style="visibility: ${this.pointer.x > 0 ? 'visible' : 'hidden'}">
          <path class="elevation highlight" d="${this.line(this.plotData)}" fill="none"
            clip-path="polygon(0 0, ${this.pointer.x - this.margin.left} 0, ${this.pointer.x - this.margin.left} 100%, 0 100%)"
          />
          <line
            class="pointer-line y"
            x1="${this.pointer.x}"
            y1="${this.margin.top}"
            x2="${this.pointer.x}"
            y2="${height - this.margin.bottom}"
          />
          <circle class="pointer-circle" cx="${this.pointer.x}" cy="${this.pointer.y}" />
        </g>
        <rect
          width="${width}"
          height="${height}"
          fill="none"
          pointer-events="all"
          style="display: block; touch-action: none;"
          @pointermove="${this.pointerMove}"
          @pointerout="${this.pointerOut}"
        />
      </svg>
    `;
  }

  private tickFormat(value: number) {
    if (value < 1000) {
      return this.meterFormat.format(value);
    } else {
      return this.kilometerFormat.format(value / 1000);
    }
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
    // var d0 = data[i - 1]
    // var d1 = data[i];
    // // work out which date value is closest to the mouse
    // var d = mouseDate - d0[0] > d1[0] - mouseDate ? d1 : d0;

    const data = this.plotData[index];

    this.pointer = {
      x: this.scaleX(data[0]),
      y: this.scaleY(data[1]),
    };

    this.dispatchEvent(
      new CustomEvent('over', {
        detail: {
          coordinate: this.lines[index],
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
