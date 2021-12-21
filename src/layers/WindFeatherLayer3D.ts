import { EventEmitter } from "events";
import { Map as LMap, DomUtil, Point, Marker, Projection } from "leaflet";
import * as three from "three";
interface Option {
  /**风向标颜色,默认黑色 */
  color?: string;
  /**风向标之间的最小间距,抽稀相关,默认[30,30] */
  interval?: [number, number];
  /**风向标大小-宽高,默认[30,30] ,修改后需重新setData*/
  size?: [number, number];
}
interface LayerOption extends Option {
  /**是否挂载到单独的某个html元素上 */
  el?: HTMLElement;
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
export default class WindFeatherLayer3D extends EventEmitter {
  private map: LMap;
  private renderer = new three.WebGL1Renderer({ alpha: true });
  private scene = new three.Scene();
  private points?: three.Points;
  private data: (UVItem & SDItem)[] = [];
  private windFeathers: Record<string, HTMLCanvasElement> = {};
  private camera!: three.OrthographicCamera;
  private option: LayerOption;
  private leftTop: L.LatLng;
  private marker: L.Marker;
  bindKeyEvent: (e: KeyboardEvent) => void;
  constructor(map: LMap, option?: LayerOption) {
    super();
    this.map = map;
    // this.renderer.setClearColor(0x000000, 0);
    this.setPosition();
    this.option = {
      size: [30, 30],
      interval: [50, 50],
      className: "",
      ...option,
    };
    this._init();
    this.bindKeyEvent = this.KeyEvent.bind(this);
    window.addEventListener("keydown", this.bindKeyEvent);
    this.leftTop = map.getBounds().getNorthWest().clone();
    this.marker = new Marker(this.leftTop);
    this.marker.addTo(map);
  }
  private setPosition() {
    const bounds = this.map.getBounds();
    const point = this.map.latLngToContainerPoint(bounds.getNorthWest());
    this.renderer.domElement.style.transform = `translate(${point.x}px, ${point.y}px)`;
    const leftBottom = this.map.latLngToContainerPoint(bounds.getSouthWest());
    const rightTop = this.map.latLngToContainerPoint(bounds.getNorthEast());
    this.camera = new three.OrthographicCamera(
      leftBottom.x,
      rightTop.x,
      rightTop.y,
      leftBottom.y,
      5,
      25
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(new three.Vector3(0, 0, 0));
    this.renderer.render(this.scene, this.camera);
  }
  private KeyEvent(e: KeyboardEvent) {
    if (this.points) {
      switch (e.key.toLocaleLowerCase()) {
        case "w": {
          this.points.position.y--;
          break;
        }
        case "s": {
          this.points.position.y++;
          break;
        }
        case "a": {
          this.points.position.x--;
          break;
        }
        case "d": {
          this.points.position.x++;
          break;
        }
        case "c": {
          this.points.scale.x *= 2;
          this.points.scale.y *= 2;
          break;
        }
        case "z": {
          this.points.scale.x *= 0.5;
          this.points.scale.y *= 0.5;
          break;
        }
        case "q": {
          console.log(this.points);
          break;
        }
        case "m": {
          console.log(this.map);
          break;
        }
        case "l": {
          console.log(this.leftTop);
          break;
        }
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
  /**初始化 */
  private _init() {
    const size = this.map.getSize();
    this.renderer.setSize(size.x, size.y);
    const grid = new three.GridHelper(500, 500, 0xffffff, 0x555555);

    this.scene.add(grid);
    this._setZoom();
    const element = this.renderer.domElement;
    element.classList.add(`leaflet-zoom-animated`);
    if (this.option.el) {
      this.option.el.appendChild(element);
    } else {
      this.map
        .getPanes()
        [this.option.pane || "shadowPane"].appendChild(element);
    }
  }
  /**设置地图缩放偏移动画 */
  private _setZoom() {
    this.map.on("zoomanim", this.setPosition, this);
    this.map.on("move", this.setPosition, this);
    return this;
  }
  private _moveAnimate(e: L.LeafletEvent) {
    console.log(e);
    const center = e.target.getCenter();
    console.log(center, this.map.getCenter());
  }
  /**地图平移动画 */
  private _zoomAnimate(e: L.ZoomAnimEvent) {
    const points = this.points!;
    const zoom = this.map.getZoomScale(e.zoom);
    const offset = e.target._latLngBoundsToNewLayerBounds(
      e.target.getBounds(),
      e.zoom,
      e.center
    ).min;
    console.log(e);
    console.log(e.target.latLngToContainerPoint(this.leftTop));
    console.log(e.sourceTarget.latLngToContainerPoint(this.leftTop));
    console.log(this.map.latLngToContainerPoint(this.leftTop));
    // setTimeout(() => {
    //   const layerP = e.target.latLngToContainerPoint(this.leftTop);
    //   points.scale.x *= zoom;
    //   points.scale.y *= zoom;
    //   // points.position.x = layerP.x;
    //   // points.position.y = layerP.y;
    //   this.renderer.render(this.scene, this.camera);
    // }, 1000);
    DomUtil.setTransform(this.renderer.domElement, offset, zoom);
  }
  /**设置风向标数据 */
  setData(data: UVItem[] | SDItem[]): this {
    this.data = this._dataFormat(data);
    return this;
  }
  /**对风向标格点数据操作,计算各项属性 */
  private _dataFormat(data: UVItem[] | SDItem[]) {
    return (data as (UVItem | SDItem)[]).map((item: UVItem | SDItem) => {
      const velocityAbs = isFinite(item.s)
        ? item.s
        : Math.sqrt(Math.pow(item.u, 2) + Math.pow(item.v, 2));
      const velocityDir = isFinite(item.d)
        ? item.d
        : Math.atan2(item.u / velocityAbs, item.v / velocityAbs);
      const velocityDirToDegrees = (velocityDir * 180) / Math.PI + 180;
      const U = isFinite(item.u) ? item.u : Math.sin((item.d / 180) * Math.PI);
      const V = isFinite(item.v) ? item.v : Math.cos((item.d / 180) * Math.PI);
      return {
        ...item,
        u: U,
        v: V,
        s: velocityAbs,
        d: velocityDir,
        degree: velocityDirToDegrees,
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
    this.scene.children = [];
    this._initFeather();
    this.renderer.render(this.scene, this.camera);
  }
  /**绘制风向标 */
  private _initFeather() {
    const positions: number[] = [];
    const colors: number[] = [];
    const geometry = new three.BufferGeometry();
    const uvs: number[] = [];
    this.data.forEach((item) => {
      const position = this.map.latLngToContainerPoint(item);
      positions.push(position.x, position.y, 0);
      const color = new three.Color("red");
      colors.push(color.r, color.g, color.b);
      uvs.push(item.u, item.v, 0);
    });
    const size = 8;

    // const height = this.renderer.domElement.height;
    // const width = this.renderer.domElement.width;
    // for (let i = size / 2; i < width - size / 2; i++) {
    //   positions.push(i, size / 2, 0);
    //   positions.push(i, height - size / 2, 0);
    // }
    // for (let i = size / 2; i < height - size / 2; i++) {
    //   positions.push(size / 2, i, 0);
    //   positions.push(width - size / 2, i, 0);
    // }
    geometry.setAttribute(
      "position",
      new three.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("uv", new three.Float32BufferAttribute(uvs, 3));
    const material = new three.PointsMaterial({
      color: "black",
      size: size,
    });
    this.points = new three.Points(geometry, material);
    this.scene.add(this.points);
  }
  /**清除 */
  clear(): this {
    this.scene.children = [];
    return this;
  }
  /**销毁图层 */
  destroy(): this {
    this.map.off("zoomanim", this._zoomAnimate, this);
    this.map.on("move", this._moveAnimate, this);
    this.removeAllListeners();
    window.removeEventListener("keydown", this.bindKeyEvent);
    const element = this.renderer.domElement;
    if (this.option.el) {
      this.option.el.removeChild(element);
    } else {
      this.map
        .getPanes()
        [this.option.pane || "shadowPane"]?.removeChild(element);
    }
    return this;
  }
}
