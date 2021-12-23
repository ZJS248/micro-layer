import { WindFeatherLayer2D } from 'micro-layer'
export const createFeatherLayer = async (map, gui) => {
  const res = await fetch('/wind.json')
  const body = await res.json()
  const param = body[0].header
  const data = body[0].data.map((u, index) => {
    const item = {
      u: u,
      v: body[1].data[index],
      lng: param.lo1 + param.dx * ((index + 1) % param.nx),
      lat: param.la2 + param.dy * Math.floor((index + 1) / param.ny),
    };

    return { ...item };
  });


  const option = {
    color: '#ff00ff',
    xSize: 30,
    ySize: 30,
    xInterval: 30,
    yInterval: 30,
    thinout: true,
  }
  const featherLayer = new WindFeatherLayer2D(map, { color: '#ff00ff' })
  featherLayer.setData(data.filter(val => val.u > 0 && val.v > 0))
  featherLayer.Draw()


  const featherGui = gui.addFolder('feather')

  featherGui.add(option, 'xSize').max(200).min(10).step(10).onChange(() => {
    featherLayer.setOption({ size: [option.xSize, option.ySize] })
    featherLayer.Draw()
  })
  featherGui.add(option, 'ySize').max(200).min(10).step(10).onChange(() => {
    featherLayer.setOption({ size: [option.xSize, option.ySize] })
    featherLayer.Draw()
  })
  featherGui.add(option, 'xInterval').max(200).min(10).step(10).onChange(() => {
    featherLayer.setOption({ interval: [option.xInterval, option.yInterval] })
    featherLayer.Draw()
  })
  featherGui.add(option, 'yInterval').max(200).min(10).step(10).onChange(() => {
    featherLayer.setOption({ interval: [option.xInterval, option.yInterval] })
    featherLayer.Draw()
  })
  featherGui.addColor(option, 'color').onChange(() => {
    featherLayer.setOption(option)
    featherLayer.Draw()
  })


  return featherLayer
}