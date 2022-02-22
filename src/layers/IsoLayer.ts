import { Map as LMap, DomUtil } from "leaflet";
import { contours, ContourMultiPolygon } from "d3-contour";
import { geoPath, geoTransform } from "d3-geo";
import { curveStep, curveBasis, line as d3Line } from "d3-shape";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import bbox from "@turf/bbox";
import { EventEmitter } from "events";
/**可配置项 */
interface Option {
  /**透明度,默认0.5*/
  opacity?: number;
  /**是否描边(等值线)，默认true */
  stroke?: boolean;
  /**描边线宽，默认2 */
  lineWidth?: number;
  /**描边透明度，会覆盖默认透明度 */
  strokeOpacity?: number;
  /**描边时绘制虚线间隔数组,默认不使用虚线 */
  dash?: boolean | number[];
  /**是否填充(色斑图)，默认true */
  fill?: boolean;
  /**填充透明度，会覆盖默认透明度 */
  fillOpacity?: number;
  /**线段类型,可选曲线curve或直线straight默认曲线,rect在绘制雷达图时很有用 */
  lineType?: "curve" | "straight" | "rect";
  /**裁剪类型，精细化裁剪或模糊裁剪，默认模糊 */
  clipType?: "fine" | "fuzzy";
  /**设置是否在生成等值线时使用线性插值,重新设置setData后生效,默认true */
  smooth?: boolean;
}
interface LayerOption extends Option {
  /**是否挂载到单独的某个html元素上 */
  el?: HTMLElement;
  /**类名 */
  className?: string;
  /**选择加入的地图层级，默认overlayPane */
  pane?: MLayer.Panes;
  /**裁剪，需提供geoJson类型数组 */
  clip?: MLayer.FeatureCollection | null;
  /**色斑图跟随地图移动类型,默认moveend更节省性能*/
  moveType?: "move" | "moveend";
}

interface DataProperty {
  value: number[];
  color: string[];
  lonStep: number;
  latStep: number;
  size: [number, number];
  border: MLayer.Border;
}
/**等值面图层  */
export default class IsoLayer extends EventEmitter {
  private map: LMap;
  private option: LayerOption;
  private canvas: HTMLCanvasElement;
  private geoData?: ContourMultiPolygon[];
  private dataProperty?: DataProperty;
  private data: number[] = [];
  private isClear = true; //是否进行绘制
  private clip = {
    //对clip内容进行缓存，提高性能
    canvas: document.createElement("canvas"),
    offset: [0, 0],
    scale: 1,
  };
  constructor(map: LMap, option?: LayerOption) {
    super();
    this.map = map;
    this.canvas = document.createElement("canvas");
    this.option = option || {};
    this._init();
  }
  private _init() {
    this._setZoom();
    this.map.on("click", this._mouseClick, this);
    this.canvas.className = `leaflet-zoom-animated ${this.option.className || ""
      }`;
    if (this.option.el) {
      this.option.el.appendChild(this.canvas);
    } else {
      this.map
        .getPanes()
      [this.option.pane || "overlayPane"].appendChild(this.canvas);
    }
    this.option.clip && this.setClip(this.option.clip);
  }
  private _setZoom() {
    this.map.on("zoomanim", this._transform, this);
    this.map.on(this.option.moveType || "moveend", this._DrawAble, this);
    return this;
  }
  private _DrawAble() {
    if (!this.isClear) {
      this.Draw();
    }
  }
  private _transform(e: L.ZoomAnimEvent) {
    const offset = e.target._latLngBoundsToNewLayerBounds(
      e.target.getBounds(),
      e.zoom,
      e.center
    ).min;
    const scale = e.target.getZoomScale(e.zoom);
    DomUtil.setTransform(this.canvas, offset, scale);
    this.clip.scale *= scale;
  }
  private _mouseClick(e: L.LeafletMouseEvent) {
    if (!this.dataProperty || !this.data) return false;
    /**判断是否落在裁剪区域内 */
    if (this.option.clip) {
      let inClip = false;
      const clip = this.option.clip;
      for (let i = 0; i < clip.features.length; i++) {
        if (
          booleanPointInPolygon([e.latlng.lng, e.latlng.lat], clip.features[i])
        ) {
          inClip = true;
          break;
        }
      }
      if (inClip === false)
        return this.emit("click", { value: null, latlng: e.latlng, origin: e });
    }
    /**判断点击坐标在格点中的位置 */
    const property = this.dataProperty;
    const north = property.border.north;
    const west = property.border.west;
    const i = Math.round((north - e.latlng.lat) / this.dataProperty.latStep);
    const j = Math.round((e.latlng.lng - west) / this.dataProperty.lonStep);
    const index = i * this.dataProperty.size[0] + j;
    if (index >= 0 && index < this.data.length) {
      const value = this.data[i * this.dataProperty.size[0] + j];
      return this.emit("click", { value, latlng: e.latlng, origin: e });
    }
    return this.emit("click", { value: null, latlng: e.latlng, origin: e });
  }
  private _CanvasConfig() {
    const bounds = this.map.getBounds();
    const point = this.map.latLngToLayerPoint(bounds.getNorthWest());
    this.canvas.style.transform = `translate(${point.x}px, ${point.y}px)`;
    this.canvas.width = this.map.getSize().x;
    this.canvas.height = this.map.getSize().y;

    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.globalAlpha = this.option.opacity || 0.5;
    context.lineWidth = this.option.lineWidth || 2;
    context.globalCompositeOperation = "source-over";
    if (this.option.dash) {
      if (this.option.dash === true) {
        context.setLineDash([20, 20]);
      } else {
        context.setLineDash(this.option.dash);
      }
    }
    return context;
  }
  /**重设canvas的各项参数 */
  setOption(option?: Option): this {
    this.option = { ...this.option, ...option };
    return this;
  }
  /**设置等值面数据 */
  setData(data: Array<number>, property: DataProperty): this {
    this.data = data;
    this.dataProperty = property;
    const smooth = this.option.smooth === undefined ? true : false;
    this.geoData = contours()
      .thresholds(property.value)
      .smooth(smooth)
      .size([property.size[0], property.size[1]])(data)
      .map((polygon) => {
        polygon.coordinates = polygon.coordinates.map((surface) => {
          return surface.map((points) => {
            return points.map((point) => {
              const latlng = [
                property.border.north +
                property.latStep / 2 -
                point[1] * property.latStep,
                property.border.west -
                property.lonStep / 2 +
                point[0] * property.lonStep,
              ];
              return latlng;
            });
          });
        });
        return polygon;
      });
    return this;
  }
  /**绘制 */
  Draw(): void | false {
    if (!this.data || !this.data.length) return false;
    this.isClear = false;
    const context = this._CanvasConfig();
    this._DrawPolygon(context);
    if (this.option.clip) {
      context.globalCompositeOperation = "destination-in";
      if (this.option.clipType === "fine") {
        this._setFineClip(context);
      } else {
        const img = this.clip.canvas;
        const scale = this.clip.scale;
        const offset = this.map.latLngToContainerPoint({
          lat: this.clip.offset[1],
          lng: this.clip.offset[0],
        });
        context.drawImage(
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
  /**清空绘制内容 */
  clear(): this {
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isClear = true;
    return this;
  }
  /**设置/重设裁剪范围 */
  setClip(data: MLayer.FeatureCollection | null): this {
    this.option.clip = data;
    const canvas = this.clip.canvas;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (this.option.clip === null || this.option.clipType === "fine") {
      return this;
    }
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
    this.option.clip.features.forEach((feature) => {
      context.beginPath();
      path(feature.geometry);
      context.fillStyle = "#000";
      context.fill();
    });
    return this;
  }
  /**精细化裁剪 */
  private _setFineClip(context: CanvasRenderingContext2D) {
    const transformPoint = (d: number[]) =>
      this.map.latLngToContainerPoint({
        lat: d[1],
        lng: d[0],
      });
    const path = d3Line()
      .x((d) => transformPoint(d).x)
      .y((d) => transformPoint(d).y)
      .context(context);
    if (this.option.lineType !== "straight") {
      path.curve(curveBasis);
    }
    this.option.clip?.features.forEach((feature) => {
      feature.geometry.coordinates.forEach((surface) => {
        surface.forEach((points) => {
          path(points as [number, number][]);
        });
      });
      context.fill();
    });
  }
  /**
   * 绘制等值面
   */
  private _DrawPolygon(context: CanvasRenderingContext2D) {
    const property = this.dataProperty as DataProperty;
    const color = property.color;
    const transformPoint = (d: number[]) => {
      const point = this.map.latLngToContainerPoint({
        lat: d[0],
        lng: d[1],
      });
      return point;
    };

    const path = d3Line()
      .x((d) => transformPoint(d).x)
      .y((d) => transformPoint(d).y)
      .context(context);
    if (this.option.lineType === "rect") {
      path.curve(curveStep);
    } else if (this.option.lineType !== "straight") {
      path.curve(curveBasis);
    }
    (this.geoData as ContourMultiPolygon[]).forEach((polygon, index) => {
      context.beginPath();
      polygon.coordinates.forEach((surface) => {
        surface.forEach((points) => {
          path(points as [number, number][]);
        });
        context.closePath();
      });
      this._DrawContext(context, color[index]);
    });
  }
  // private _DrawGridRect() {}
  /**根据配置参数进行绘制 */
  private _DrawContext(context: CanvasRenderingContext2D, color: string) {
    if (this.option.fill !== false) {
      context.save();
      if (this.option.fillOpacity) {
        context.globalAlpha = this.option.fillOpacity;
      }
      context.fillStyle = color;
      context.fill();
      context.restore();
    }
    if (this.option.stroke !== false) {
      context.save();
      if (this.option.strokeOpacity) {
        context.globalAlpha = this.option.strokeOpacity;
      }
      context.strokeStyle = color;
      context.stroke();
      context.restore();
    }
  }
  /**销毁图层 */
  destroy(): this {
    this.map.off(this.option.moveType || "moveend", this._DrawAble, this);
    this.map.off("zoomanim", this._transform, this);
    this.map.off("click", this._mouseClick, this);
    if (this.option.el) {
      this.option.el.removeChild(this.canvas);
    } else {
      this.map
        .getPanes()
      [this.option.pane || "overlayPane"]?.removeChild(this.canvas);
    }
    return this;
  }
}
