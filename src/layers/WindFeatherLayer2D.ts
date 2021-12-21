import { EventEmitter } from "events";
import { Map as LMap, DomUtil, LeafletMouseEvent } from "leaflet";
import { point as TPoint } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { getWindLevel, getFeatherCanvas } from "../utils/MarkSvg";
import getGridThinData from "../utils/getGridThinData";
import getProcessPoints from "../utils/getProcessPoints";
interface Option {
  /**风向标颜色,默认黑色 */
  color?: string;
  /**风向标之间的最小间距,抽稀相关,默认[30,30] */
  interval?: [number, number];
  /**风向标大小-宽高,默认[30,30] ,修改后需重新setData*/
  size?: [number, number];
  /**是否进行抽稀,默认true,为数字时表示地图层级小于该数字时才抽稀 ,修改后需重新setData*/
  thinout?: boolean | number;
  /**点的抽稀方法,0使用 getProcessPoints抽稀，1使用getGridThinData抽稀，默认0*/
  thinType?: 0 | 1;
}
interface LayerOption extends Option {
  /**是否挂载到单独的某个html元素上 */
  el?: HTMLElement | null;
  className?: string;
  /**选择加入的地图层级，默认overlayPane */
  pane?: MLayer.Panes;
  /**裁剪，需提供geoJson类型数组 */
  clip?: MLayer.FeatureCollection | null;
  /**色斑图跟随地图移动类型,默认moveend更节省性能*/
  moveType?: "move" | "moveend";
}
interface SDItem extends MLayer.LatLng {
  s: number;
  d: number;
  size?: [number, number]; //风向标大小-宽高
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
interface UVItem extends MLayer.LatLng {
  u: number;
  v: number;
  /**风向标大小-宽高 */
  size?: [number, number];
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
/**风向标图层 */
export default class WindFeatherLayer2D extends EventEmitter {
  private map: LMap;
  private canvas: HTMLCanvasElement;
  private option: Required<LayerOption>;
  /**保存setData里的所有数据 */
  private totalData: UVItem[] | SDItem[] = [];
  private data: (UVItem & SDItem)[] = [];
  private windFeathers: Record<string, HTMLCanvasElement> = {};
  private isClear = true; //是否进行绘制
  private delay = false;
  private gridSize = [10, 10];
  private gridData: (UVItem & SDItem)[][][] = [];
  constructor(map: LMap, option?: LayerOption) {
    super();
    this.map = map;
    this.option = {
      el: null,
      size: [30, 30],
      interval: [50, 50],
      thinout: true,
      thinType: 0,
      className: "",
      pane: "shadowPane",
      clip: null,
      moveType: "moveend",
      color: "#000",
      ...option,
    };
    this.canvas = document.createElement("canvas");
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
    // if (this.option.fillText) {
    //   const fz = this.option.fontSize || 12;
    //   range[2] = e.y - size[1] / 2 - 10 - fz;
    // }
    return range;
  }
  private _mouseClick(e: LeafletMouseEvent) {
    if (!this.gridData.length || this.isClear || !this.isCanvasActive()) {
      return false;
    }
    const SIZE = this.option.size;
    const position = e.containerPoint;
    const [i, j] = this.getGridPosition(e.latlng);
    let range = this.getActiveRange(position, SIZE);
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
    const SIZE = this.option.size;
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
    const preData = Object.assign([], this.data) as (UVItem & SDItem)[];
    const grid: (UVItem & SDItem)[][][] = [];
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
  }
  /**根据option和map状态配置canvas */
  private _CanvasConfig() {
    const bounds = this.map.getBounds();
    const point = this.map.latLngToLayerPoint(bounds.getNorthWest());
    this.canvas.style.transform = `translate(${point.x}px, ${point.y}px)`;
    this.canvas.width = this.map.getSize().x;
    this.canvas.height = this.map.getSize().y;
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.globalCompositeOperation = "source-over";
    context.save();
    return context;
  }

  private _DrawAble() {
    if (!this.isClear && !this.delay) {
      this.delay = true;
      setTimeout(() => {
        this.Draw();
        this.delay = false;
      }, 10);
    }
  }
  /**设置风向标数据 */
  setData(data: UVItem[] | SDItem[]): this {
    if (!this.option.thinout) {
      this.totalData = this._dataFormat(data);
      this.setClip(this.option.clip); //对data裁剪
    } else this.totalData = data;
    return this;
  }
  /**设置裁剪范围 */
  setClip(data: MLayer.FeatureCollection | null = null): this {
    this.option.clip = data;
    if (this.option.clip === null) {
      return this;
    }
    this.data = this.data.filter((item) => {
      const point = TPoint([item.lng, item.lat]);
      if (this.option.clip) {
        return this.option.clip.features.some((feature) => {
          booleanPointInPolygon(point, feature);
        });
      }
      return true;
    });
    return this;
  }
  /**对风向标格点数据操作,计算各项属性 */
  private _dataFormat(data: UVItem[] | SDItem[]) {
    return (data as (UVItem | SDItem)[]).map((item: UVItem | SDItem) => {
      const size = item.size || this.option.size;
      const velocityAbs = isFinite(item.s)
        ? item.s
        : Math.sqrt(Math.pow(item.u, 2) + Math.pow(item.v, 2));
      const velocityDir = isFinite(item.d)
        ? item.d
        : Math.atan2(item.u / velocityAbs, item.v / velocityAbs);
      const velocityDirToDegrees = (velocityDir * 180) / Math.PI + 180;
      const U = isFinite(item.u)
        ? item.u
        : Math.sin((item.d / 180) * Math.PI) * velocityAbs;
      const V = isFinite(item.v)
        ? item.v
        : Math.cos((item.d / 180) * Math.PI) * velocityAbs;
      const diagonal = Math.sqrt(size[1] ** 2 + size[0] ** 2); //对角线长
      const dX = Math.cos((Math.PI * 3) / 4 - velocityDir) * diagonal; //对角顶点X偏移
      const dY = -Math.sin((Math.PI * 3) / 4 - velocityDir) * diagonal; //对角顶点Y偏移
      const _offset = [size[0] / 2 - dX / 2, size[1] / 2 - dY / 2]; //计算旋转之后的中心点偏移
      return {
        ...item,
        u: U,
        v: V,
        s: velocityAbs,
        d: velocityDir,
        degree: velocityDirToDegrees,
        _offset,
      };
    });
  }
  /**重设canvas的各项参数 */
  setOption(option?: Option): this {
    this.option = { ...this.option, ...option };
    return this;
  }
  /**绘制 */
  Draw(): void {
    this.isClear = false;
    const context = this._CanvasConfig();
    this._FilterData();
    this.getGridData();
    this._DrawFeather(context);
  }
  /**过滤节点 */
  private _FilterData(): this {
    if (this.option.thinout === false) return this;
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
    const data = (this.totalData as MLayer.LatLng[]).filter((point) => {
      return (
        point.lat > border.south &&
        point.lat < border.north &&
        point.lng > border.west &&
        point.lng < border.east
      );
    });
    //抽稀
    if (
      this.map.getZoom() < this.option.thinout ||
      this.option.thinout === true
    ) {
      const method = this.option.thinType ? getGridThinData : getProcessPoints;
      const thinData: UVItem[] | SDItem[] = method(data as UVItem[], [
        xInterval,
        yInterval,
      ]);
      this.setClip(this.option.clip); //裁剪
      this.data = this._dataFormat(thinData); //格式化
    }
    return this;
  }
  /**绘制风向标 */
  private _DrawFeather(context: CanvasRenderingContext2D) {
    context.beginPath();
    this.data.forEach((item) => {
      context.save();
      const position = this.map.latLngToContainerPoint(item);
      context.translate(
        position.x + item._offset[0],
        position.y + item._offset[1]
      );
      context.rotate(item.d + Math.PI);
      const level = getWindLevel(item.s);
      const color = item.color || this.option.color;
      const size = item.size || this.option.size;
      const featherId = `${level}-${color}-${size.toString()}`;
      if (!this.windFeathers[featherId]) {
        this.windFeathers[featherId] = getFeatherCanvas(level, {
          size,
          color,
        });
      }
      const feather = this.windFeathers[featherId];
      context.drawImage(feather, 0, 0, feather.width, feather.height);
      context.restore();
    });
  }
  /**清除 */
  clear(): this {
    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isClear = true;
    return this;
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
