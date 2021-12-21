/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { TileLayer, TileLayerOptions } from "leaflet";
interface Option extends TileLayerOptions {
  key?: string;
}
export default class Tiles {
  /**option 设置天地图的key和一些TileLayer 的原生配置 */
  option: Option;
  constructor(option?: Option) {
    this.option = { ...option };
  }
  /**地图链接集合 */
  get TileUrls() {
    return {
      /**天地图 需要key*/
      TianDiTu: {
        /**行政地图 */
        Normal: {
          Map: "http://t{s}.tianditu.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}",
          Annotion:
            "http://t{s}.tianditu.cn/DataServer?T=cva_w&X={x}&Y={y}&L={z}",
        },
        /**卫星图 */
        Satellite: {
          Map: "http://t{s}.tianditu.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}",
          Annotion:
            "http://t{s}.tianditu.cn/DataServer?T=cia_w&X={x}&Y={y}&L={z}",
        },
        /**地形图 */
        Terrain: {
          Map: "http://t{s}.tianditu.cn/DataServer?T=ter_w&X={x}&Y={y}&L={z}",
          Annotion:
            "http://t{s}.tianditu.cn/DataServer?T=cta_w&X={x}&Y={y}&L={z}",
        },
        Subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"],
      },
      /**高德地图 */
      GaoDe: {
        /**行政地图 */
        Normal: {
          Map: "http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
        },
        /**卫星图 */
        Satellite: {
          Map: "http://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
          Annotion:
            "http://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
        },
        Subdomains: ["1", "2", "3", "4"],
      },
      /**谷歌地图 需要代理 */
      Google: {
        /**行政地图 */
        Normal: {
          Map: "http://www.google.cn/maps/vt?lyrs=m@189&gl=cn&x={x}&y={y}&z={z}",
        },
        /**卫星图 */
        Satellite: {
          Map: "http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}",
        },
        Subdomains: [],
      },
      /**智图 */
      Geoq: {
        Normal: {
          /**彩色版 */
          Map: "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}",
          /**中国行政区划边界和标注专题图 */
          Annotion:
            "http://thematic.geoq.cn/arcgis/rest/services/ThematicMaps/administrative_division_boundaryandlabel/MapServer/tile/{z}/{y}/{x}",
          /**蓝黑版 */
          PurplishBlue:
            "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}",
          /**灰色版 */
          Gray: "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}",
          /**暖色版 */
          Warm: "http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetWarm/MapServer/tile/{z}/{y}/{x}",
          /**水系专题 */
          Water:
            "http://thematic.geoq.cn/arcgis/rest/services/ThematicMaps/WorldHydroMap/MapServer/tile/{z}/{y}/{x}",
        },
        Subdomains: [],
      },
    };
  }
  private initOption(def_option: Option) {
    const def_key = def_option.key;
    const def_subdomains = def_option.subdomains;

    const key = typeof this.option.key === "string" ? this.option.key : def_key;
    const tk = key ? "&tk=" + key : "";
    const subdomains = this.option.subdomains?.length
      ? this.option.subdomains
      : def_subdomains;
    const option: Option = {
      ...this.option,
      subdomains,
    };
    return { tk, option };
  }
  /**天地图 */
  get TianDiTu() {
    const { tk, option } = this.initOption({
      key: `f30d14863b524836165f01954ada55cb`,
      subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"],
    });
    return {
      /**行政地图 */
      Normal: {
        Map: new TileLayer(
          `http://t{s}.tianditu.gov.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}${tk}`,
          option
        ),
        Annotion: new TileLayer(
          `http://t{s}.tianditu.gov.cn/DataServer?T=cva_w&X={x}&Y={y}&L={z}${tk}`,
          option
        ),
      },
      /**卫星图 */
      Satellite: {
        Map: new TileLayer(
          `http://t{s}.tianditu.gov.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}${tk}`,
          option
        ),
        Annotion: new TileLayer(
          `http://t{s}.tianditu.gov.cn/DataServer?T=cia_w&X={x}&Y={y}&L={z}${tk}`,
          option
        ),
      },
      /**地形图 */
      Terrain: {
        Map: new TileLayer(
          `http://t{s}.tianditu.gov.cn/DataServer?T=ter_w&X={x}&Y={y}&L={z}${tk}`,
          option
        ),
        Annotion: new TileLayer(
          `http://t{s}.tianditu.gov.cn/DataServer?T=cta_w&X={x}&Y={y}&L={z}${tk}`,
          option
        ),
      },
    };
  }
  /**高德  */
  get GaoDe() {
    const { option } = this.initOption({
      key: `f30d14863b524836165f01954ada55cb`,
      subdomains: ["1", "2", "3", "4"],
    });
    return {
      /**行政地图 */
      Normal: {
        Map: new TileLayer(
          `http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`,
          option
        ),
      },
      /**卫星图 */
      Satellite: {
        Map: new TileLayer(
          `http://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`,
          option
        ),
        Annotion: new TileLayer(
          `http://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}`,
          option
        ),
      },
    };
  }
  /**谷歌 */
  get Google() {
    return {
      /**行政地图 */
      Normal: {
        Map: new TileLayer(
          `http://www.google.cn/maps/vt?lyrs=m@189&gl=cn&x={x}&y={y}&z={z}`,
          this.option
        ),
      },
      /**卫星图 */
      Satellite: {
        Map: new TileLayer(
          `http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}`,
          this.option
        ),
      },
    };
  }
  /**智图 */
  get Geoq() {
    return {
      Normal: {
        /**彩色版 */
        Map: new TileLayer(
          `http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}`,
          this.option
        ),
        /**中国行政区划边界和标注专题图 */
        Annotion: new TileLayer(
          `http://thematic.geoq.cn/arcgis/rest/services/ThematicMaps/administrative_division_boundaryandlabel/MapServer/tile/{z}/{y}/{x}`,
          this.option
        ),
        /**蓝黑版 */
        PurplishBlue: new TileLayer(
          `http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}`,
          this.option
        ),
        /**灰色版 */
        Gray: new TileLayer(
          `http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}`,
          this.option
        ),
        /**暖色版 */
        Warm: new TileLayer(
          `http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineStreetWarm/MapServer/tile/{z}/{y}/{x}`,
          this.option
        ),
        /**水系专题 */
        Water: new TileLayer(
          `http://thematic.geoq.cn/arcgis/rest/services/ThematicMaps/WorldHydroMap/MapServer/tile/{z}/{y}/{x}`,
          this.option
        ),
      },
    };
  }
  // /**OpenStreet地图 */
  // get OpenStreet() {
  //   const { option } = this.initOption({
  //     subdomains: ["a", "b", "c"],
  //   });
  //   return {
  //     Normal: {
  //       /**OpenStreet地图 */
  //       Map: new TileLayer(
  //         `https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png`,
  //         option
  //       ),
  //     },
  //   };
  // }
}
