import { GridLayer, IsoLayer } from 'micro-layer'
export const createGridLayer = async (map, gui) => {
  const res = await fetch(`/temperature.json`)
  const data = await res.json()
  const option = {
    opacity: 1,
    color: '#fff',
    showRect: false,
    xInterval: 50,
    yInterval: 50,
  }
  const gridLayer = new GridLayer(map, option)
  gridLayer.setData(data.data, {
    size: [data.lonsize, data.latsize],
    border: {
      east: data.endlon,
      west: data.startlon,
      north: data.startlat,
      south: data.endlat
    },
    lonStep: (data.endlon - data.startlon) / data.lonsize, //step>0
    latStep: (data.startlat - data.endlat) / data.latsize
  })
  gridLayer.Draw()


  const gridGui = gui.addFolder('gridLayer')

  gridGui.add(option, 'opacity').max(1).min(0).step(0.1).onChange(() => {
    gridLayer.setOption(option)
    gridLayer.Draw()
  })
  gridGui.add(option, 'xInterval').max(200).min(10).step(10).onChange(() => {
    gridLayer.setOption(option)
    gridLayer.Draw()
  })
  gridGui.add(option, 'yInterval').max(200).min(10).step(10).onChange(() => {
    gridLayer.setOption(option)
    gridLayer.Draw()
  })
  gridGui.add(option, 'showRect').onChange(() => {
    gridLayer.setOption(option)
    gridLayer.Draw()
  })
  gridGui.addColor(option, 'color').onChange(() => {
    gridLayer.setOption(option)
    gridLayer.Draw()
  })



  return gridLayer
}
export const createIsoLayer = async (map, gui) => {
  const res = await fetch(`/temperature.json`)
  const data = await res.json()
  const option = {
    stroke: true,
    lineWidth: 2,
    strokeOpacity: 0.4,
    dash: false,
    fill: true,
    fillOpacity: 0.01,
    smooth: true,
    lineType: 'curve',
    clipState: false
  }
  const isoLayer = new IsoLayer(map, option)
  isoLayer.setData(data.data, {
    size: [data.lonsize, data.latsize],
    border: {
      east: data.endlon,
      west: data.startlon,
      north: data.startlat,
      south: data.endlat
    },
    lonStep: (data.endlon - data.startlon) / data.lonsize, //step>0
    latStep: (data.startlat - data.endlat) / data.latsize,
    color: data.legendColor,
    value: data.legendValue
  })
  isoLayer.Draw()

  const isoGui = gui.addFolder('isoLayer')

  isoGui.add(option, 'fillOpacity').step(0.01).max(1).min(0).onChange(() => {
    isoLayer.setOption(option)
    isoLayer.Draw()
  })
  isoGui.add(option, 'dash').onChange(() => {
    isoLayer.setOption(option)
    isoLayer.Draw()
  })
  isoGui.add(option, 'lineType', ["curve", "straight", "rect"]).onChange(() => {
    isoLayer.setOption(option)
    isoLayer.Draw()
  })
  isoGui.add(option, 'clipState').onChange(async (e) => {
    if (e) {
      const data = await clipRange()
      isoLayer.setClip(data)
    } else {
      isoLayer.setClip(null)
    }
    isoLayer.Draw()
  })



  return isoLayer
}

const clipRange = async () => {
  const res = await fetch('/cn.json')
  const data = await res.json();
  return data
}