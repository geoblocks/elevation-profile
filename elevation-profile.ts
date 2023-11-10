import {LitElement, svg} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';
import {ResizeController} from '@lit-labs/observers/resize-controller.js';
import {createRef, ref} from 'lit/directives/ref.js';

import {
  extent,
  scaleLinear,
  line,
  area,
  axisBottom,
  axisLeft,
  select,
  pointer,
  bisector,
} from 'd3';

@customElement('elevation-profile')
export class ElevationProfile extends LitElement {
  @property({type: Array}) lines = [];
  @state() pointer = {x: 0, y: 0};
  @property({type: Object}) margin = {top: 20, right: 20, bottom: 20, left: 40};
  private resizeController = new ResizeController(this, {});

  private plotData;
  private scaleX = scaleLinear();
  private scaleY = scaleLinear();

  private bisectDistance = bisector((data) => data[0]).left;

  private line = line()
    .x((point) => this.scaleX(point[0]))
    .y((point) => this.scaleY(point[1]));
  private area = area()
    .x((point) => this.scaleX(point[0]))
    .y1((point) => this.scaleY(point[1]));
  // FIXME: switch between km and m
  private xAxis = axisBottom(this.scaleX)
    .tickFormat((i) => i + ' m');
  private yAxis = axisLeft(this.scaleY);
  private yGrid = axisLeft(this.scaleY).tickFormat(() => '');

  private xRef = createRef();
  private yRef = createRef();
  private yGridRef = createRef();

  willUpdate(changedProperties) {
    if (changedProperties.has('lines')) {
      this.plotData = this.lines.map((coordinate) => [coordinate[3], coordinate[2]]);

      this.scaleX.domain(extent(this.plotData, (data) => data[0]));
      this.scaleY.domain(extent(this.plotData, (data) => data[1])).nice();
    }
  }

  render() {
    const width = this.offsetWidth;
    const height = this.offsetHeight;

    this.scaleX.range([this.margin.left, width - this.margin.right]);
    this.scaleY.range([height - this.margin.bottom, this.margin.top]);

    this.area.y0(height - this.margin.bottom);

    this.yGrid.tickSize(-width + this.margin.left + this.margin.right);

    select(this.xRef.value).call(this.xAxis);
    select(this.yRef.value).call(this.yAxis);
    select(this.yGridRef.value).call(this.yGrid);

    return svg`
      <svg width="${width}" height="${height}">
        <g class="grid y" ${ref(this.yGridRef)} transform="translate(${this.margin.left}, 0)" />
        <g class="axis x" ${ref(this.xRef)} transform="translate(0, ${height - this.margin.bottom})" />
        <g class="axis y" ${ref(this.yRef)} transform="translate(${this.margin.left}, 0)" />
        <path class="area" d="${this.area(this.plotData)}" />
        <path class="elevation" d="${this.line(this.plotData)}" fill="none" />
        <g style="visibility: ${this.pointer.x > 0 ? 'visible' : 'hidden'}">
          <path class="elevation highlight" d="${this.line(this.plotData)}" fill="none"
            clip-path="polygon(0 0, ${this.pointer.x - 40} 0, ${this.pointer.x - 40} 100%, 0 100%)"
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
          @pointermove="${this.pointerMove}"
          @pointerout="${this.pointerOut}"
        />
      </svg>
    `;
  }

  private pointerMove(event: PointerEvent) {
    const pointerDistance = this.scaleX.invert(pointer(event)[0]);
    const index = Math.min(this.bisectDistance(this.plotData, pointerDistance), this.plotData.length - 1);
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

  createRenderRoot() {
    return this;
  }
}
