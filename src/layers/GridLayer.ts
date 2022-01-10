import { Map as LMap, DomUtil, LeafletMouseEvent } from "leaflet";
import { geoPath, GeoPermissibleObjects, geoTransform } from "d3-geo";
import { line as d3Line } from "d3-shape";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import bbox from "@turf/bbox";
import { EventEmitter } from "events";
/**可配置项 */
interface Option {
  /**透明度，默认1 */
  opacity?: number;
  /**格点值描边宽，默认2，大概没什么用 */
  lineWidth?: number;
  /**格点字体颜色，默认黑色,设为auto并有图例时会随着图例变化 */
  color?: "auto" | string;
  /**裁剪类型，精细化裁剪或模糊裁剪,默认模糊*/
  clipType?: "fine" | "fuzzy";
  /**格点字体间的最小间距，与格点的抽稀相关，默认50(单位像素) */
  xInterval?: number;
  /**格点字体间的最小间距，与格点的抽稀相关，默认50(单位像素) */
  yInterval?: number;
  /**格点字体格式 默认 '10px sans-serif'*/
  font?: string
  /**格点数据格式化，默认Math.floor */
  format?: (value: number) => string;
  /**是否展示格点方块（用来怼产品的），合理解释了为什么点击事件显示的值和色斑图对不上 */
  showRect?: boolean;
  /**格点方块颜色，默认黑色 */
  rectColor?: string;
  /**格点方块透明度，默认0.2 */
  rectOpacity?: number;
}
interface LayerOption extends Option {
  /**是否挂载到单独的某个html元素上 */
  el?: HTMLElement | null;
  /**类名*/
  className?: string;
  /**选择加入的地图层级，默认overlayPane */
  pane?: MLayer.Panes;
  /**裁剪，需提供geoJson类型数组 */
  clip?: MLayer.FeatureCollection | null;
  /**色斑图跟随地图移动类型,默认moveend更节省性能*/
  moveType?: "move" | "moveend";
}

interface DataProperty {
  value?: number[];
  color?: string[];
  lonStep: number;
  latStep: number;
  size: [number, number];
  border: MLayer.Border;
}
/**格点图层 */
export default class GridLayer extends EventEmitter {
  private map: LMap;
  private option: Required<LayerOption>;
  private canvas: HTMLCanvasElement;
  private data: number[] = [];
  private dataProperty?: DataProperty;
  private isClear = true;
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
    this.option = {
      el: null,
      className: '',
      pane: "shadowPane",
      clip: null,
      moveType: 'moveend',
      opacity: 1,
      lineWidth: 2,
      clipType: 'fuzzy',
      xInterval: 50,
      yInterval: 50,
      color: '#000',
      font: '10px sans-serif',
      format: (v: number) => (v | 0).toString(),
      showRect: false,
      rectColor: '#000',
      rectOpacity: 0.2,
      ...option
    };
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
      [this.option.pane].appendChild(this.canvas);
    }
    this.option.clip && this.setClip(this.option.clip);
  }
  private _setZoom() {
    this.map.on("zoomanim", this._Transform, this);
    this.map.on(this.option.moveType, this._DrawAble, this);
    return this;
  }
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
  private _mouseClick(e: LeafletMouseEvent) {
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
    context.font = this.option.font;
    context.lineWidth = this.option.lineWidth;
    context.globalAlpha = this.option.opacity;
    context.globalCompositeOperation = "source-over";
    context.fillStyle = this.option.color;
    context.save();
    return context;
  }
  private _DrawAble() {
    if (!this.isClear) {
      this.Draw();
    }
  }
  /**设置等值面数据 */
  setData(data: Array<number>, property: DataProperty): this {
    this.dataProperty = property;
    this.data = data;
    return this;
  }
  /**重设canvas的各项参数 */
  setOption(option?: Option): this {
    this.option = { ...this.option, ...option };
    if (this.option.clip && option?.clipType === "fuzzy") {
      this.setClip(this.option.clip);
    }
    return this;
  }
  /**绘制 */
  Draw(): void {
    if (!this.data || !this.data.length) return;
    this.isClear = false;
    const context = this._CanvasConfig();
    this._DrawGrid(context);
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
  clear(): this {
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isClear = true;
    return this;
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
   * 绘制格点值
   */
  private _DrawGrid(context: CanvasRenderingContext2D) {
    const data = this.data as number[];
    const property = this.dataProperty as DataProperty;
    const origin = this.map.containerPointToLatLng([0, 0]);
    const target = this.map.containerPointToLatLng([
      this.option.xInterval,
      this.option.yInterval,
    ]);
    const latStep =
      Math.ceil(Math.abs(target.lat - origin.lat) / property.latStep) *
      property.latStep;
    const lonStep =
      Math.ceil(Math.abs(target.lng - origin.lng) / property.lonStep) *
      property.lonStep;
    const mapBounds = this.map.getBounds();
    const bounds = {
      east: Math.min(mapBounds.getNorthEast().lng, property.border.east),
      north: Math.min(
        property.border.north,
        property.border.north -
        Math.floor(
          (property.border.north - mapBounds.getNorthEast().lat) / latStep
        ) *
        latStep
      ),
      west: Math.max(
        Math.floor(
          (mapBounds.getSouthWest().lng - property.border.west) / lonStep
        ) *
        lonStep +
        property.border.west,
        property.border.west
      ),
      south: Math.max(mapBounds.getSouthWest().lat, property.border.south),
    };
    /**格式化格点值函数 */
    const { format, getColor } = this.calGridValue();
    for (let i = bounds.north; i > bounds.south; i -= latStep) {
      for (let j = bounds.west; j < bounds.east; j += lonStep) {
        const position = this.map.latLngToContainerPoint({ lat: i, lng: j });
        const index =
          Math.round((property.border.north - i) / property.latStep) *
          property.size[0] +
          Math.round((j - property.border.west) / property.lonStep); //使用经纬度坐标系计算
        const value = data[index];
        if (value !== undefined) {
          context.fillStyle = getColor(value);
          const word = format(value);
          context.fillText(word, position.x, position.y);
          /**画出格点网格线 */
          if (this.option.showRect) {
            const next = this.map.latLngToContainerPoint({
              lat: i - latStep,
              lng: j + lonStep,
            });
            context.save();
            context.fillStyle = this.option.rectColor
            context.globalAlpha = this.option.rectOpacity || 0.2;
            context.fillRect(
              position.x - (Math.abs(position.x - next.x) - 1) / 2,
              position.y - (Math.abs(position.y - next.y) - 1) / 2,
              Math.abs(position.x - next.x),
              Math.abs(position.y - next.y)
            );
            context.restore();
          }
        }
      }
    }
  }
  /**计算格点值属性 */
  private calGridValue() {
    const property = this.dataProperty as DataProperty;
    const format = this.option.format;
    let getColor = (_v: number) => this.option.color;
    if (this.option.color === "auto" && property?.value && property.color) {
      const colorList = property.color;
      const valueList = property.value;
      getColor = (value: number) =>
        colorList[valueList.findIndex((val) => val > value) - 1];
    }
    return { format, getColor };
  }
  /**销毁图层 */
  destroy(): this {
    this.map.off(this.option.moveType, this._DrawAble, this);
    this.map.off("zoomanim", this._Transform, this);
    this.map.off("click", this._mouseClick, this);
    this.removeAllListeners();
    if (this.option.el) {
      this.option.el.removeChild(this.canvas);
    } else {
      this.map
        .getPanes()
      [this.option.pane || "shadowPane"]?.removeChild(this.canvas);
    }
    return this;
  }
}
