
import 'leaflet/dist/leaflet.css'
import './style.css'
import * as L from 'leaflet'
import { Tile } from 'micro-layer'
import { createFeatherLayer } from './src/feather'
import { createPointLayer } from './src/point'
import { createGridLayer, createIsoLayer } from './src/gridFace'


const tile = new Tile()
const map = new L.map('map', {
  center: [30, 120],
  zoom: 5,
  layers: [tile.Geoq.Normal.PurplishBlue],
  attributionControl: false
})
const gui = new dat.GUI()
const option = {
  showFeather: true,
  showGrid: true,
  showIsoFace: true,
  showPoint: true
}

const init = async () => {
  const featherLayer = await createFeatherLayer(map, gui)
  const pointLayer = await createPointLayer(map, gui)
  const gridLayer = await createGridLayer(map, gui)
  const isoLayer = await createIsoLayer(map, gui)


  gui.add(option, 'showFeather').onChange((e) => {
    e ? featherLayer.Draw() : featherLayer.clear()
  })
  gui.add(option, 'showGrid').onChange((e) => {
    e ? gridLayer.Draw() : gridLayer.clear()
  })
  gui.add(option, 'showIsoFace').onChange((e) => {
    e ? isoLayer.Draw() : isoLayer.clear()
  })
  gui.add(option, 'showPoint').onChange((e) => {
    e ? pointLayer.Draw() : pointLayer.clear()
  })
}

init()

