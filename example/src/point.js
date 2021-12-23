import { SimplePoints } from 'micro-layer'
import Dat from 'dat.gui'
export const createPointLayer = async (map) => {
  const res = await fetch('/points.json')
  const body = await res.json()
  const data = body.map((val) => {
    const item = {
      lng: val.longitude,
      lat: val.latitude,
    };
    return item;
  });
  const pointLayer = new SimplePoints(map, {
    color: "#fff",
    stroke: true,
    strokeColor: "#00D1FF",
    strokeWidth: 2,
    size: [10, 10],
    fillText:false,
    interval:[30,30]
  })
  pointLayer.setData(data)
  pointLayer.Draw()
  return pointLayer
}