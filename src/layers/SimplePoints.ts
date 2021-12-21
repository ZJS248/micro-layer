import { geoPath, GeoPermissibleObjects, geoTransform } from "d3-geo";
import { line as d3Line } from "d3-shape";
import { EventEmitter } from "events";
import bbox from "@turf/bbox";
import { Map as LMap, DomUtil, LeafletMouseEvent } from "leaflet";
import getGridThinData from "../utils/getGridThinData";
import getProcessPoints from "../utils/getProcessPoints";

type PointType = "rect" | "circle";
interface Option {
  /**点-宽高,默认[30,30] */
  size?: [number, number];
  /**点颜色,默认黑色 */
  color?: string | ((v?: number | string) => string);
  /**裁剪类型，精细化裁剪或模糊裁剪,默认模糊*/
  clipType?: "fine" | "fuzzy";
  /**是否描边,默认false */
  stroke?: boolean;
  /**描边宽,默认1 */
  strokeWidth?: number;
  /**描边颜色,默认黑色 */
  strokeColor?: "auto" | string;
  /**点之间的最小间距,默认[30,30] */
  interval?: [number, number];
  /**是否进行抽稀,默认true */
  thinout?: boolean | number;
  /**点的抽稀方法,0使用 getProcessPoints抽稀，1使用getGridThinData抽稀，默认0*/
  thinType?: 0 | 1;
  /**描点类型'rect' | 'circle',默认circle;点类型等待后续加入 */
  type?: PointType;
  /**是否绘制文字,文字内容取数组中value字段,默认true */
  fillText?: boolean;
  /**文字大小,默认12 */
  fontSize?: number;
  /**文字颜色,默认auto */
  fontColor?: "auto" | string;
  /**对点每个值进行格式化操作 */
  format?: (v: Point) => string;
  /**自定义点形状,需要能被context.drawImage解析,不受该点size以外其他参数的影响 */
  img?: CanvasImageSource | ((v?: number | string) => CanvasImageSource) | null;
}
interface LayerOption extends Option {
  /**是否挂载到单独的某个html元素上 */
  el?: HTMLElement | null;
  /** */
  className?: string;
  /**选择加入的地图层级,默认overlayPane */
  pane?: MLayer.Panes;
  /**裁剪,需提供geoJson类型数组 */
  clip?: MLayer.FeatureCollection | null;
  /**地图移动渲染类型 */
  moveType?: "move" | "moveend";
}

interface Point extends MLayer.LatLng {
  value?: number | string; //点的值,文字描述
  color?: string;
  size?: [number, number]; //点-宽高,默认[30,30]//
  type?: PointType; //点类型
  /**自定义点形状 */
  img?: CanvasImageSource;
}
/**点图层 */
export default class SimplePoints extends EventEmitter {
  private map: LMap;
  private canvas = document.createElement("canvas");
  private context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
  private option: Required<LayerOption>;
  private totalData: Point[] = [];
  private data: Point[] = [];
  private isClear = true;
  private gridSize = [10, 10];
  private gridData: Point[][][] = [];
  private clip = {
    //对clip内容进行缓存，提高性能
    canvas: document.createElement("canvas"),
    offset: [0, 0],
    scale: 1,
  };
  constructor(map: LMap, option?: LayerOption) {
    super();
    this.map = map;
    this.option = {
      el: null,
      className: "",
      moveType: "moveend",
      pane: "shadowPane",
      clip: null,
      size: [30, 30],
      color: "#000",
      clipType: "fuzzy",
      stroke: false,
      strokeWidth: 1,
      strokeColor: "#000",
      interval: [30, 30],
      thinout: true,
      thinType: 0,
      type: "circle",
      fillText: true,
      fontSize: 12,
      fontColor: "#000",
      format: (v: Point) => String(v.value),
      img: null,
      ...option,
    };
    this._init();
  }
  /**初始化 */
  private _init() {
    this._setZoom();
    this.map.on("click", this._mouseClick, this);
    this.map.on("mousemove", this._mouseMove, this);
    this.canvas.style.animation = `gridanim 1s infinite`;
    this.canvas.className = `leaflet-zoom-animated ${this.option.className}`;
    if (this.option.el) {
      this.option.el.appendChild(this.canvas);
    } else {
      this.map.getPanes()[this.option.pane].appendChild(this.canvas);
    }
    this.setClip(this.option.clip);
  }
  /**canvas是否显示 */
  private isCanvasActive() {
    return this.canvas.clientHeight > 0 && this.canvas.clientWidth > 0;
  }
  /**获取点对于鼠标指针响应范围 */
  private getActiveRange(e: L.Point, size: [number, number]) {
    /**根据鼠标指针大小-做10px的偏移 */
    const range = [
      e.x - size[0] / 2 - 10,
      e.x + size[0] / 2 + 10,
      e.y - size[1] / 2 - 10,
      e.y + size[1] + 5,
    ];
    if (this.option.fillText) {
      const fz = this.option.fontSize;
      range[2] = e.y - size[1] / 2 - 10 - fz;
    }
    return range;
  }
  private _mouseClick(e: LeafletMouseEvent) {
    if (!this.gridData.length || this.isClear || !this.isCanvasActive()) {
      return false;
    }
    const SIZE = this.option.size as [number, number];
    const position = e.containerPoint;
    const [i, j] = this.getGridPosition(e.latlng);
    let range = this.getActiveRange(position, SIZE);
    /**根据鼠标指针大小-size+10 */
    const index = this.gridData[i][j].findIndex((point) => {
      const pos = this.map.latLngToContainerPoint(point);
      if (point.size) {
        range = this.getActiveRange(position, point.size);
      }
      if (
        pos.x > range[0] &&
        pos.x < range[1] &&
        pos.y > range[2] &&
        pos.y < range[3]
      ) {
        return true;
      }
    });
    this.emit("click", {
      target: this.gridData[i][j][index],
      latlng: e.latlng,
      origin: e,
    });
  }
  private _mouseMove(e: LeafletMouseEvent) {
    if (!this.gridData.length || this.isClear || !this.isCanvasActive()) {
      return false;
    }
    const SIZE = this.option.size as [number, number];
    const position = e.containerPoint;
    const [i, j] = this.getGridPosition(e.latlng);
    let range = this.getActiveRange(position, SIZE);
    /**根据鼠标指针大小-size+10 */
    const index = this.gridData[i][j].findIndex((point) => {
      const pos = this.map.latLngToContainerPoint(point);
      if (point.size) {
        range = this.getActiveRange(position, point.size);
      }
      if (
        pos.x > range[0] &&
        pos.x < range[1] &&
        pos.y > range[2] &&
        pos.y < range[3]
      ) {
        return true;
      }
    });
    this.emit("mousemove", {
      target: this.gridData[i][j][index],
      latlng: e.latlng,
      origin: e,
    });
  }
  /**地图划分为100个格点存放点数组,用于点击事件和hover事件快速找点 */
  private getGridData() {
    const size = this.gridSize;
    const preData = Object.assign([], this.data) as Point[];
    const grid: Point[][][] = [];
    for (let i = 0; i < size[0]; i++) {
      grid.push([]);
      for (let j = 0; j < size[1]; j++) {
        grid[i].push([]);
      }
    }
    preData.forEach((item) => {
      const [i, j] = this.getGridPosition(item);
      grid[i][j].push(item);
    });
    this.gridData = grid;
  }
  /**获取经纬度坐标在网格中的位置 */
  private getGridPosition<T extends MLayer.LatLng>(e: T) {
    const size = this.gridSize;
    const p1 = this.map.containerPointToLatLng(this.option.interval);
    const p2 = this.map.containerPointToLatLng([0, 0]);
    const xInterval = Math.abs(p1.lng - p2.lng);
    const yInterval = Math.abs(p1.lat - p2.lat);
    const bounds = this.map.getBounds();
    const east = bounds.getEast() + xInterval;
    const west = bounds.getWest() - xInterval;
    const south = bounds.getSouth() - yInterval;
    const north = bounds.getNorth() + yInterval;
    const width = east - west;
    const height = north - south;
    const xstep = width / size[0];
    const ystep = height / size[1];
    const i = ((e.lng - west) / xstep) | 0; //取整
    const j = Math.floor((north - e.lat) / ystep); //取整
    return [i, j];
  }
  /**设置地图缩放偏移动画 */
  private _setZoom() {
    this.map.on("zoomanim", this._Transform, this);
    this.map.on(this.option.moveType, this._DrawAble, this);
    return this;
  }
  /**地图缩放偏移动画 */
  private _Transform(e: L.ZoomAnimEvent) {
    const offset = e.target._latLngBoundsToNewLayerBounds(
      e.target.getBounds(),
      e.zoom,
      e.center
    ).min;
    const scale = e.target.getZoomScale(e.zoom);
    DomUtil.setTransform(this.canvas, offset, scale);
    this.clip.scale *= scale;
  }
  /**根据option和map状态配置canvas */
  private _CanvasConfig() {
    const bounds = this.map.getBounds();
    const point = this.map.latLngToLayerPoint(bounds.getNorthWest());
    this.canvas.style.transform = `translate(${point.x}px, ${point.y}px)`;
    this.canvas.width = this.map.getSize().x;
    this.canvas.height = this.map.getSize().y;
    this.context.globalCompositeOperation = "source-over";
    this.context.font = `${this.option.fontSize}px`;
    this.context.strokeStyle = this.option.strokeColor;
    this.context.lineWidth = this.option.strokeWidth;
    this.context.save();
    return this;
  }
  /**获取颜色 */
  private getColor(value?: number | string) {
    const color = this.option.color;
    if (typeof color === "function") {
      return color(value);
    }
    return color;
  }
  /**绘制点的文字描述 */
  private _DrawText(item: Point, offset: [number, number]) {
    const context = this.context;
    const text = this.option.format(item);
    const measure = context.measureText(text);
    if (this.option.fontColor && this.option.fontColor != "auto")
      context.fillStyle = this.option.fontColor;
    if (this.option.fillText !== false) {
      context.fillText(
        text,
        offset[0] / 2 - measure.actualBoundingBoxRight / 2,
        offset[1] + this.option.fontSize
      );
    }
  }
  /**根据地图边界范围和抽稀过滤点 */
  private _FilterData(): this {
    if (this.option.thinout === false) {
      this.data = this.totalData;
      return this;
    }
    //范围过滤
    const bounds = this.map.getBounds();
    const p1 = this.map.containerPointToLatLng(this.option.interval);
    const p2 = this.map.containerPointToLatLng([0, 0]);
    const xInterval = Math.abs(p1.lng - p2.lng);
    const yInterval = Math.abs(p1.lat - p2.lat);
    const border = {
      west: bounds.getSouthWest().lng - xInterval,
      east: bounds.getNorthEast().lng + xInterval,
      south: bounds.getSouthWest().lat - yInterval,
      north: bounds.getNorthEast().lat + yInterval,
    };
    const data = this.totalData.filter((point) => {
      return (
        point.lat > border.south &&
        point.lat < border.north &&
        point.lng > border.west &&
        point.lng < border.east
      );
    });
    //抽稀
    if (
      this.map.getZoom() < (this.option?.thinout || 0) ||
      this.option.thinout === true
    ) {
      const method = this.option.thinType ? getGridThinData : getProcessPoints;
      this.data = method(data, [xInterval, yInterval]);
    }
    return this;
  }
  /**绘制所有点 */
  private _DrawPoints() {
    const points = this.data;
    points.forEach((item: Point) => {
      this._DrawPoint(item);
    });
  }
  /**地图绘制点函数 */
  private _DrawPoint(item: Point) {
    const size = (item.size || this.option.size) as [number, number];
    const context = this.context;
    context.save();
    context.beginPath();
    const position = this.map.latLngToContainerPoint(item);
    if (!this.option.img) {
      const SIZE = item.size ? item.size : size;
      context.translate(position.x - SIZE[0] / 2, position.y - SIZE[1] / 2);
      const color = item.color || this.getColor(item.value);
      const type = item.type || this.option.type;
      if (type === "rect") {
        context.fillStyle = color;
        context.fillRect(0, 0, SIZE[0], SIZE[1]);
        this.option.stroke && context.stroke();
      } else if (type === "circle") {
        context.fillStyle = color;
        context.arc(SIZE[0] / 2, SIZE[0] / 2, SIZE[0] / 2, 0, Math.PI * 2);
        context.fill();
        this.option.stroke && context.stroke();
      }
      this._DrawText(item, SIZE);
    } else {
      const img =
        typeof this.option.img === "function"
          ? this.option.img(item.value)
          : this.option.img;
      const SIZE = item.size || size;
      context.translate(position.x - SIZE[0] / 2, position.y - SIZE[1] / 2);
      context.drawImage(img, 0, 0, SIZE[0], SIZE[1]);
      this._DrawText(item, SIZE);
    }
    context.restore();
  }
  private _DrawAble() {
    if (!this.isClear) {
      this.Draw();
    }
  }
  /**设置点数据 */
  setData(data: Point[]): this {
    this.totalData = data;
    return this;
  }
  /**重设canvas的各项参数 */
  setOption(option?: Option): this {
    this.option = { ...this.option, ...option };
    this.setClip(this.option.clip);
    return this;
  }
  /**不使用Draw单独添加一个点 不建议与抽稀混用*/
  addPoint(point: Point) {
    this.context.save();
    this.context.globalCompositeOperation = `source-over`;
    this._DrawPoint(point);
    this.context.restore();
    this.totalData.push(point);
    return this;
  }
  /**不使用clear单独移除一个点 不建议与抽稀混用*/
  removePoint(point: Point) {
    const index = this.totalData.indexOf(point);
    if (index < 0) return this;
    this.context.save();
    const size = (point.size || this.option.size) as [number, number];
    const position = this.map.latLngToContainerPoint(point);
    this.context.translate(position.x - size[0] / 2, position.y - size[1] / 2);
    this.context.clearRect(0, 0, size[0], size[1]);
    const text = this.option.format(point);
    const measure = this.context.measureText(text);
    if (this.option.fillText !== false) {
      this.context.clearRect(
        size[0] / 2 - measure.actualBoundingBoxRight / 2,
        size[1] + this.option.fontSize / 2 - 1,
        measure.actualBoundingBoxRight,
        this.option.fontSize
      );
    }
    this.context.restore();
    this.totalData.splice(index, 1);
    return this;
  }
  /**绘制 */
  Draw(): void {
    this.isClear = false;
    this._CanvasConfig();
    this._FilterData();
    this.getGridData();
    this._DrawPoints();
    this.DrawClip();
  }
  /**清除 */
  clear(): this {
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isClear = true;
    return this;
  }
  /**绘制裁剪区 */
  DrawClip() {
    if (this.option.clip) {
      this.context.globalCompositeOperation = "destination-in";
      if (this.option.clipType === "fine") {
        this._setFineClip();
      } else {
        const img = this.clip.canvas;
        const scale = this.clip.scale;
        const offset = this.map.latLngToContainerPoint({
          lat: this.clip.offset[1],
          lng: this.clip.offset[0],
        });
        this.context.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          offset.x,
          offset.y,
          img.width * scale,
          img.height * scale
        );
      }
    }
  }
  /**设置裁剪范围 */
  setClip(data: MLayer.FeatureCollection | null): this {
    this.option.clip = data;
    if (this.option.clip === null || this.option.clipType === "fine") {
      return this;
    }
    const canvas = this.clip.canvas;
    const border = bbox(data);
    this.clip.offset = [border[0], border[3]];
    const northEast = this.map.latLngToContainerPoint({
      lat: border[3],
      lng: border[2],
    });
    const southWest = this.map.latLngToContainerPoint({
      lat: border[1],
      lng: border[0],
    });
    canvas.width = northEast.x - southWest.x;
    canvas.height = southWest.y - northEast.y;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.translate(-southWest.x, -northEast.y);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _self = this;
    const transfrom = geoTransform({
      point: function (x, y) {
        const point = _self.map.latLngToContainerPoint({
          lat: y,
          lng: x,
        });
        return this.stream.point(point.x, point.y);
      },
    });
    const path = geoPath(transfrom, context);
    this.option.clip.features.forEach(
      (feature: { geometry: GeoPermissibleObjects }) => {
        context.beginPath();
        path(feature.geometry);
        context.fillStyle = "#000";
        context.fill();
      }
    );
    return this;
  }
  /**精细化裁剪 */
  private _setFineClip() {
    const transformPoint = (d: number[]) =>
      this.map.latLngToContainerPoint({
        lat: d[1],
        lng: d[0],
      });
    const path = d3Line()
      .x((d) => transformPoint(d).x)
      .y((d) => transformPoint(d).y)
      .context(this.context);
    this.option.clip?.features.forEach((feature) => {
      feature.geometry.coordinates.forEach((surface) => {
        surface.forEach((points) => {
          path(points as [number, number][]);
        });
      });
      this.context.fill();
    });
  }
  /**销毁图层 */
  destroy(): this {
    this.map.off(this.option.moveType, this._DrawAble, this);
    this.map.off("zoomanim", this._Transform, this);
    this.map.off("click", this._mouseClick, this);
    this.map.off("mousemove", this._mouseMove, this);
    this.removeAllListeners();
    if (this.option.el) {
      this.option.el.removeChild(this.canvas);
    } else {
      this.map.getPanes()[this.option.pane]?.removeChild(this.canvas);
    }
    return this;
  }
}
