export as namespace MLayer;
export interface FeatureCollection {
  features: {
    geometry: {
      coordinates: [number, number][][][];
      type: "MultiPolygon";
      [key: string]: any;
    };
    properties: Record<string, any>;
    type: "Feature";
    [key: string]: any;
  }[];
  type: "FeatureCollection";
  [key: string]: any;
}
export interface Border {
  east: number;
  west: number;
  north: number;
  south: number;
}
export interface LatLng {
  lat: number;
  lng: number;
  [key: string]: any;
}
export type Panes =
  | "mapPane"
  | "markerPane"
  | "overlayPane"
  | "popupPane"
  | "shadowPane"
  | "tilePane"
  | "tooltipPane";
