import {LitElement, svg} from 'lit';
import {customElement, state, property} from 'lit/decorators.js';
import {ResizeController} from '@lit-labs/observers/resize-controller.js';
import {guard} from 'lit/directives/guard.js';
import {ifDefined} from 'lit/directives/if-defined.js';
import type {PropertyValues, TemplateResult} from 'lit';

import {extent, bisector} from 'd3-array';
import {scaleLinear} from 'd3-scale';
import {line, area} from 'd3-shape';
import {axisBottom, axisLeft} from 'd3-axis';
import {select, pointer} from 'd3-selection';

// FIXME: use simplify to reduce number of points based on tolerance
import simplify from './simplify.js';

type PlotPoint = {
  x: number;
  y: number;
  coordinate: number[];
};

export type SegmentData = Array<[number, number, string | null]>;

export type OverDetails = {
  coordinate: number[];
  position: {x: number; y: number};
  segments?: {
    line: string | null;
    xAxis: string | null;
  };
};

@customElement('elevation-profile')
export default class ElevationProfile extends LitElement {
  @property({type: Number}) tolerance = 1;
  @property({type: String}) locale = navigator.language;
  @property({type: Array}) lines: number[][][] = [];
  @property({type: Array}) points: number[][] = [];
  @property() updateScale = (x: scaleLinear, y: scaleLinear, width: number, height: number): void => {};
  @property({type: Object}) margin = {top: 20, right: 20, bottom: 20, left: 20};
  @property({type: Object}) tickSize = {x: 100, y: 40};
  @property({type: Boolean}) pointerEvents = true;
  @property({type: Array}) lineSegments?: SegmentData;
  @property({type: Array}) xAxisSegments?: SegmentData;
  private yAxisObserver: ResizeObserver | null = null;

  @state() pointer = {x: 0, y: 0};
  private resizeController = new ResizeController(this, {
    callback: () => [this.offsetWidth, this.offsetHeight],
  });

  private plotData: PlotPoint[] = [];
  private pointsData: PlotPoint[] = [];
  private lineSegmentsData: SegmentData = [];
  private xAxisSegmentsData: SegmentData = [];
  private gapPositions: number[] = [];
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
       this.gapPositions.length = 0;
       this.lines.forEach((line, index) => {
         const data = line.map((coordinate) => ({x: coordinate[3], y: coordinate[2], coordinate}));
         this.plotData.push(...data);
         if (index < this.lines.length - 1) {
           // insert a gap between lines
           this.gapPositions.push(this.plotData.length);
           this.plotData.push({x: line[line.length - 1][3], y: NaN, coordinate: []});
         }
       });

      this.scaleX.domain(extent(this.plotData, (data: PlotPoint) => data.x));
      this.scaleY.domain(extent(this.plotData, (data: PlotPoint) => data.y));

      this.updateScale(this.scaleX, this.scaleY, this.offsetWidth, this.offsetHeight);
    }
    if (changedProperties.has('points')) {
      this.pointsData.length = 0;
      for (const point of this.points) {
        this.pointsData.push({x: point[3], y: point[2], coordinate: point});
      }
    }
     if (changedProperties.has('lineSegments')) {
       this.lineSegmentsData = fillUnspecified(this.lineSegments || [], this.plotData.length, this.gapPositions);
     }
     if (changedProperties.has('xAxisSegments')) {
       this.xAxisSegmentsData = fillUnspecified(this.xAxisSegments || [], this.plotData.length, this.gapPositions);
     }
  }

  override render() {
    // FIXME: better handling of null this.resizeController.value
    const [width, height] = this.resizeController.value ?? [this.margin.left + this.margin.right, this.margin.top + this.margin.bottom];
    const ml = (this.querySelector('.axis.y')?.getBoundingClientRect().width || 0) + this.margin.left

    this.scaleX.range([ml, width - this.margin.right]);
    this.scaleY.range([height - this.margin.bottom, this.margin.top]);

    this.area.y0(height - this.margin.bottom);

    this.yGrid.tickSize(-width + ml + this.margin.right);
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

    const offset = this.yGrid.offset();

    return svg`
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <g class="grid y" transform="translate(${ml}, 0)" />
        <g class="grid x" transform="translate(0, ${this.margin.bottom})" />
        <g class="axis x" transform="translate(0, ${height - this.margin.bottom})" />
        <g class="axis y" transform="translate(${ml}, 0)" />

        ${guard([this.lines, width, height, ml], () => svg`
          <path class="area" d="${this.area(this.plotData)}" />
          ${this.renderLineSegments('elevation')}`
        )}

        <g style="visibility: ${this.pointer.x > 0 ? 'visible' : 'hidden'}">
          <g clip-path="polygon(0 0, ${this.pointer.x - ml} 0, ${this.pointer.x - ml} 100%, 0 100%)">
            ${guard([this.lines, width, height, ml], () => this.renderLineSegments('elevation highlight'))}
          </g>
          <line
            class="pointer-line x"
            x1="${this.pointer.x}"
            y1="${this.margin.top}"
            x2="${this.pointer.x}"
            y2="${height - this.margin.bottom}"
          />
          <line
            class="pointer-line y"
            x1="${ml}"
            y1="${this.pointer.y}"
            x2="${width - this.margin.right}"
            y2="${this.pointer.y}"
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
          transform="translate(${ml},${height - this.margin.bottom + offset})"
          class="axis"
          style="visibility: ${this.lines.length ? 'visible' : 'hidden'}">
          <line x2="${width - ml - this.margin.right}"></line>
        </g>
        <g transform="translate(0,${height - this.margin.bottom + offset})">
          ${this.renderTrailBands()}
        </g>
      </svg>
    `;
  }

  private renderLineSegments(className: string) {
    // If no line segments are defined, render the entire line as a single path
    if (this.lineSegmentsData.length === 0 && this.plotData.length >= 2) {
      return svg`<path class="${className}" d="${this.line(this.plotData)}" fill="none" />`;
    }
    
    return this.lineSegmentsData.map(([start, end, value]) => {
      const segmentData = this.plotData.slice(start, end + 1);
      console.assert(segmentData.length >= 2);
      return svg`<path class="${className}" data-value="${ifDefined(value)}" d="${this.line(segmentData)}" fill="none" />`;
    });
  }

   private renderTrailBands() {
     return this.xAxisSegmentsData.map(([start, end, value]) => {
       const x1 = this.scaleX(this.plotData[start].x);
       const x2 = this.scaleX(this.plotData[end].x);
       console.assert(this.plotData[start].x < this.plotData[end].x);
       const bandWidth = x2 - x1;
       return svg`<rect class="trail-band" data-value="${ifDefined(value)}" x="${x1}" width="${bandWidth}" />`;
     });
   }

  public tickFormat(value: number, axis: 'x' | 'y') {
    if (axis === 'y' || value < 1000) {
      return this.meterFormat!.format(value);
    } else {
      return this.kilometerFormat!.format(value / 1000);
    }
  }

  public tickValues(values: number[], axis: 'x' | 'y') {
    if (values.length === 0 || (axis !== 'x' && axis !== 'y')) {
      return;
    }
    axis === 'x' ? this.xAxis.tickValues(values) : this.yAxis.tickValues(values);
  }

  public pointSvg(x: number, y: number, index: number): TemplateResult {
    return svg`<circle class="point" cx="${x}" cy="${y}" r="10"/>`;
  }

  override firstUpdated() {
    const axisY = this.querySelector('.axis.y');
    if (axisY) {
      this.yAxisObserver = new ResizeObserver(() => {
        this.requestUpdate()
      })
      this.yAxisObserver.observe(axisY);
    }
    // FIXME: because the ref element are used before render is done, we need to force an update
    this.requestUpdate();
  }

  override disconnectedCallback() {
    if (this.yAxisObserver) {
      this.yAxisObserver.disconnect();
    }
    super.disconnectedCallback();
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

    const segments: OverDetails['segments'] = {
      line: getSegmentValueAtIndex(this.lineSegmentsData, index),
      xAxis: getSegmentValueAtIndex(this.xAxisSegmentsData, index),
    };

    this.dispatchEvent(
      new CustomEvent<OverDetails>('over', {
        detail: {
          coordinate: this.plotData[index].coordinate,
          position: this.pointer,
          ...(Object.keys(segments).length > 0 && { segments })
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

function fillUnspecified(segment: SegmentData, length: number, gapPositions: number[] = []): SegmentData {
  // Create a set of gap positions for quick lookup
  const gapSet = new Set(gapPositions);

  const filledSegments: SegmentData = [];
  let currentIndex = 0;

  for (const [start, end, value] of segment) {
    // Fill gap from currentIndex to start, skipping gap positions
    if (start > currentIndex) {
      let fillStart = currentIndex;

      // Skip leading gaps
      while (fillStart < start && gapSet.has(fillStart)) {
        fillStart++;
      }

      if (fillStart < start) {
        // Find end position before start, avoiding gaps
        let fillEnd = start - 1;
        while (fillEnd >= fillStart && gapSet.has(fillEnd)) {
          fillEnd--;
        }

        if (fillEnd >= fillStart) {
          filledSegments.push([fillStart, fillEnd, null]);
        }
      }
    }

    // Add the segment, skipping if it points to a gap
    if (!gapSet.has(start) && !gapSet.has(end)) {
      filledSegments.push([start, end, value]);
    }

    currentIndex = end + 1;
  }

  // Fill remaining range from currentIndex to length, skipping gaps
  if (currentIndex < length) {
    let fillStart = currentIndex;

    // Skip leading gaps
    while (fillStart < length && gapSet.has(fillStart)) {
      fillStart++;
    }

    if (fillStart < length) {
      // Find last valid index
      let fillEnd = length - 1;
      while (fillEnd >= fillStart && gapSet.has(fillEnd)) {
        fillEnd--;
      }

      if (fillEnd >= fillStart) {
        filledSegments.push([fillStart, fillEnd, null]);
      }
    }
  }

  return filledSegments;
}

function getSegmentValueAtIndex(segments: SegmentData, index: number): string | null {
  for (const [start, end, value] of segments) {
    if (index >= start && index < end) {
      return value;
    }
  }
  // we must never be here because of fillUnspecified
  return null;
}

declare global {
  interface HTMLElementTagNameMap {
    'elevation-profile': ElevationProfile;
  }
}
