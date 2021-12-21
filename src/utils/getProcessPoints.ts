/**根据点之间的间隔进行抽稀,对密集的点抽稀，保持点的均匀分布。难以处理大量数据 */
export default function getProcessPoints<T extends MLayer.LatLng>(
  points: T[],
  distance: [number, number]
): T[] {
  if (points.length < 3) return points; //小于3个点时不抽稀，因为1个或2个点无法进行抽稀
  const IndexsToReduce = ProcessReduce(points, distance); //抽稀 //保存需要点下标的数组
  const resultPoints = []; //返回的点数组
  for (let i = 0; i < points.length; i++) {
    if (IndexsToReduce.indexOf(i) < 0) {
      resultPoints.push(points[i]);
    }
  }
  return resultPoints;
}
function ProcessReduce<T extends MLayer.LatLng>(
  points: T[],
  distance: [number, number]
): number[] {
  //遍历抽稀
  const IndexsToReduce = [];
  for (let i = 0; i < points.length; i++) {
    let k = i + 1;
    if (IndexsToReduce.indexOf(i) >= 0) {
      //如果是已删除的点，跳出
      continue;
    }
    const p1 = points[i];
    while (k < points.length) {
      const p2 = points[k];
      const ToReduce = CheckPointEqualInBuffer(p1, p2, distance);
      if (ToReduce) {
        IndexsToReduce.push(k);
      }
      k++;
    }
  }
  return IndexsToReduce;
}
function CheckPointEqualInBuffer<T extends MLayer.LatLng>(
  point1: T,
  point2: T,
  distance: [number, number]
): boolean {
  return (
    Math.abs(point1.lng - point2.lng) <= distance[0] &&
    Math.abs(point1.lat - point2.lat) <= distance[1]
  );
}
