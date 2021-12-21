/**
 * 以存放格点的方式抽稀数组,适合大量数据的抽稀,不够均匀
 * @param points 要抽稀的点数组
 * @param interval [number,number]每个点之间的最小间隔(单位:经度/纬度)
 */
export default function getGridThinData<T extends MLayer.LatLng>(
  points: T[],
  [lonStep, latStep] = [0.01, 0.01]
): T[] {
  if (points.length <= 3) return points;
  let Xmax = -Infinity;
  let Xmin = Infinity;
  let Ymax = -Infinity;
  let Ymin = Infinity;
  for (let n = 0; n < points.length; n++) {
    const p = points[n];
    Xmax = Math.max(p.lng, Xmax);
    Xmin = Math.min(p.lng, Xmin);
    Ymax = Math.max(p.lat, Ymax);
    Ymin = Math.min(p.lat, Ymin);
  }
  const group = [] as T[][];
  for (let j = Ymax; j > Ymin; j -= latStep) {
    for (let i = Xmin; i < Xmax; i += lonStep) {
      group.push([]);
    }
  }
  const width = Math.ceil((Xmax - Xmin) / lonStep); //取整
  let empty = group.length;
  for (let k = 0; k < points.length; k++) {
    const point = points[k];
    const i = ((point.lng - Xmin) / lonStep) | 0; //取整
    const j = Math.floor((Ymax - point.lat) / latStep); //取整
    const arr = group[i + j * width];
    if (arr && arr.length === 0) {
      //每个网格中只存放一个点
      arr.push(point);
      empty--;
      if (empty === 0) break;
    }
  }
  return group.flat();
}
