import {
  ImageOverlay,
  Map,
  TileLayer,
  LatLng,
  Projection,
  PointExpression,
  TileLayerOptions,
} from "leaflet";
interface Option extends TileLayerOptions {
  /**瓦片图地址 */
  url: string;
  /**瓦片图可缩放最大层级 */
  maxLevel?: number;
  /**透明度 */
  opacity?: number;
}
export default class LevelTile {
  private _max = 20037508; //最大坐标
  private _url: string;
  private _maxLevel: number;
  private _map: Map | null = null;
  private _tile: TileLayer;
  private _delta: number; //最大行列数
  private _imgs: {
    [k: string]: ImageOverlay;
  } = {};
  private _subdomains: string[] | string;
  private _lnglats: LatLng[];
  private _opacity: number;
  private _delay: any = null;
  constructor({ url, maxLevel = 7, subdomains = [], opacity = 1 }: Option) {
    this._url = url;
    this._maxLevel = maxLevel;
    this._opacity = opacity;
    this._tile = new TileLayer(url, {
      subdomains: subdomains,
      opacity,
    });
    this._subdomains = subdomains;
    this._delta = (2 * this._max) / Math.pow(2, maxLevel);
    this._lnglats = [];
    for (let i = -this._max; i < this._max; i += this._delta) {
      this._lnglats.push(
        Projection.SphericalMercator.unproject({
          x: i,
          y: -i,
        } as PointExpression)
      );
    }
  }
  /**添加至地图 */
  public addTo(map: Map): this {
    if (!this._map) {
      this._map = map;
      map.on("moveend", this.zoomEnd, this);

      this.zoomEnd();
    }
    return this;
  }
  /**从地图移除 */
  public remove(): void {
    if (this._map) {
      this._map.off("moveend", this.zoomEnd, this);
      this.delImgs();
      if (this._map.hasLayer(this._tile)) {
        this._tile.remove();
      }
      this._map = null;
    }
  }
  /**
   * 当地图等级超过瓦片图最大等级时移除
   * 当地图等级没超过瓦片图最大等级时添加显示
   */
  private zoomEnd(): void {
    if (this._delay) {
      clearTimeout(this._delay);
    }
    if (this._map) {
      const zoom = this._map.getZoom();
      if (zoom > this._maxLevel) {
        //当地图等级超过瓦片图最大等级时移除
        this.addImgs(zoom);
        if (this._map.hasLayer(this._tile)) {
          this._tile.remove();
        }
      } else {
        if (!this._map.hasLayer(this._tile)) {
          //当地图等级没超过瓦片图最大等级时添加显示
          this._tile.addTo(this._map);
          this._delay = setTimeout(() => {
            this._delay = null;
            this.delImgs();
          }, 1000);
        }
      }
    }
  }
  private addImgs(zoom: number): void {
    if (zoom > this._maxLevel) {
      if (this._map) {
        const border = this._map.getBounds();
        const lt = Projection.SphericalMercator.project(border.getNorthWest());
        const rb = Projection.SphericalMercator.project(border.getSouthEast());
        const xMin = Math.floor((lt.x + this._max) / this._delta);
        const xMax = Math.floor((rb.x + this._max) / this._delta);
        const yMin = Math.floor((lt.y - this._max) / -this._delta);
        const yMax = Math.floor((rb.y - this._max) / -this._delta);
        for (let x = xMin; x <= xMax; x++) {
          for (let y = yMin; y <= yMax; y++) {
            const key = x + "-" + y;
            if (this._imgs[key]) {
              if (!this._map.hasLayer(this._imgs[key])) {
                this._imgs[key].addTo(this._map);
              }
            } else {
              let url = this._url.replace(
                "{s}",
                this._subdomains[(x + y) % this._subdomains.length]
              );
              url = url.replace("{x}", x + "");
              url = url.replace("{y}", y + "");
              url = url.replace("{z}", this._maxLevel + "");
              this._imgs[key] = new ImageOverlay(
                url,
                [
                  [this._lnglats[y].lat, this._lnglats[x].lng],
                  [this._lnglats[y + 1].lat, this._lnglats[x + 1].lng],
                ],
                {
                  opacity: this._opacity,
                }
              ).addTo(this._map);
            }
          }
        }
      }
    }
  }
  private delImgs(): void {
    if (this._map) {
      for (const key in this._imgs) {
        if (this._map.hasLayer(this._imgs[key])) {
          this._imgs[key].remove();
        }
      }
    }
  }
}
