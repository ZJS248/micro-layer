# 使用
    npm i micro-layer
# 引入
	import {GridLayer,Tile,getGridThinData...} from 'micro-layer'
    或
    import GridLayer from 'micro-layer/dist/layers/GridLayer'
## 色斑图 IsoLayer
	const isoLayer = new IsoLayer(map,option)
    isoLayer.setData(...)
    isoLayer.Draw()
    ...
	
	
###初始化时可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| el  | 是否挂载到单独的某个html元素上  |   | HTMLElement  |
| className  | 类名  |   | string  |
| pane  | 选择加入的地图层级，默认overlayPane  |   | 参考leaflet  |
| clip  | 裁剪，需提供geoJson类型数组  | clip |  FeatureCollection,null  |
| moveType  | 色斑图跟随地图移动类型  |moveend   | move,moveend  |
### setOption可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| opacity  | 透明度  | 0.5  | number  |
| stroke  | 是否描边(等值线)  | true  | boolean  |
| lineWidth  | 描边线宽  | 2  | number  |
| strokeOpacity |  描边透明度，会覆盖默认透明度 |   | number  |
| dash  | 描边时绘制虚线间隔数组  | false  | boolean  |
| fill  | 是否填充(色斑图)  |  true | boolean  |
| fillOpacity  | 填充透明度，会覆盖默认透明度  |   | boolean  |
| lineType  | 线段类型,可选曲线curve或直线straight默认曲线,rect可绘制雷达图 |curve   | curve,straight,rect  |
| clipType  | 裁剪类型，精细化裁剪或模糊裁剪  | fuzzy  |  fine，fuzzy |
| smooth  | 设置是否在生成等值线时使用线性插值,重新设置setData后生效  | true  | boolean  |
###方法
|  名称 | 描述    | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| setOption  | 重设canvas的各项参数  | Option  |
| setData  | 设置图层数据  | data: Array<number>,property: {  value: number[];color: string[]; lonStep: number;latStep: number; size: [number, number]; border: Border;}  |
| Draw  | 绘制  |   |
| setClip  | 设置/重设裁剪范围  |  FeatureCollection , null  |
| clear  | 清空绘制内容  |    |
| destroy  | 销毁图层  |   |
| on  | 监听点击事件  | type:click,callback:function  |




## 格点图层 GridLayer
	const gridLayer = new GridLayer(map,option)
    gridLayer.setData(...)
    gridLayer.Draw()
    ...



###初始化时可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| el  | 是否挂载到单独的某个html元素上  |   | HTMLElement  |
| className  | 类名  |   | string  |
| pane  | 选择加入的地图层级，默认overlayPane  |   | 参考leaflet  |
| clip  | 裁剪，需提供geoJson类型数组  | clip |  FeatureCollection,null  |
| moveType  | 色斑图跟随地图移动类型  |moveend   | move,moveend  |
### setOption可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| opacity  | 透明度  | 0.5  | number  |
| lineWidth  | 格点值描边宽，大概没什么用  | 2  | number  |
| color  | 格点字体颜色,设为auto并有图例时会随着图例变化  | black  | string  |
| xInterval |  格点字体间的最小间距，与格点的抽稀相关(单位:像素) | 50  | number  |
| yInterval  | 格点字体间的最小间距，与格点的抽稀相关(单位:像素)  |  50   | number  |
| format  | 格点数据格式化 |  Math.floor | (value: number) => string  |
| font  | 格点字体格式 | 10px sans-serif  | string  |
| showRect  | 是否展示格点方块 | false  | boolean  |
| rectColor  | 格点方块颜色 | black  | string  |
| rectOpacity  | 格点方块透明度  | 0.2  |  number |
###方法
|  名称 | 描述    | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| setOption  | 重设canvas的各项参数  | Option  |
| setData  | 设置图层数据  | data: Array<number>,property: {  value: number[];color: string[]; lonStep: number;latStep: number; size: [number, number]; border: Border;}  |
| Draw  | 绘制  |   |
| setClip  | 设置/重设裁剪范围  |  FeatureCollection , null  |
| clear  | 清空绘制内容  |    |
| destroy  | 销毁图层  |   |
| on  | 监听点击事件  | type:click,callback:function  |


## 2d风向标图层 WindFeatherLayer2D
	const featherLayer = new featherLayer(map,option)
    featherLayer.setData(...)
    featherLayer.Draw()
    ...



###初始化时可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| el  | 是否挂载到单独的某个html元素上  |   | HTMLElement  |
| className  | 类名  |   | string  |
| pane  | 选择加入的地图层级，默认overlayPane  |   | 参考leaflet  |
| clip  | 裁剪，需提供geoJson类型数组  | clip |  FeatureCollection,null  |
| moveType  | 色斑图跟随地图移动类型  |moveend   | move,moveend  |
### setOption可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| color  | 风向标颜色 | black  | string  |
| interval |  风向标之间的最小间距，与格点的抽稀相关(单位:像素) | [30,30]  | [number, number]  |
| size  | 风向标大小-宽高(单位:像素),修改后需重新setData  |  [30,30]   | number  |
| thinout  | 是否进行抽稀,默认true,为数字时表示地图层级小于该数字时才抽稀 ,修改后需重新setData |  true |
| thinType  | 点的抽稀方法,0使用 getProcessPoints抽稀，1使用getGridThinData抽稀 |  0 |0,1  |
###方法
|  名称 | 描述    | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| setOption  | 重设canvas的各项参数  | Option  |
| setData  | 设置图层数据  | data: {  s: number; d: number;size?: [number, number]; color?: string;}[] ,data: {  u: number; v: number;size?: [number, number]; color?: string;}[] |
| Draw  | 绘制  |   |
| setClip  | 设置/重设裁剪范围  |  FeatureCollection , null  |
| clear  | 清空绘制内容  |    |
| destroy  | 销毁图层  |   |
| on  | 监听点击事件  | type:click,callback:function  |

## 瓦片图层集合 Tile
包含天地图，谷歌地图，高德地图，智图的瓦片图


## 点图层 SimplePoints
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| el  | 是否挂载到单独的某个html元素上  |   | HTMLElement  |
| className  | 类名  |   | string  |
| pane  | 选择加入的地图层级，默认overlayPane  |   | 参考leaflet  |
| clip  | 裁剪，需提供geoJson类型数组  | clip |  FeatureCollection,null  |
| moveType  | 图层跟随地图移动类型  |moveend   | move,moveend  |
### setOption可配置项
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| size  |点-宽高  |  [30,30]   | [number,number]  |
| color  | 点颜色 | black  | string  |
| clipType |  裁剪类型，精细化裁剪或模糊裁剪,默认模糊 | fuzzy  | "fine" , "fuzzy"  |
| stroke  |是否描边  |  false   | boolean  |
| strokeWidth  |描边宽  |  1   | number  |
| strokeColor  |描边颜色  |  black   | string  |
| interval  |点之间的最小间距  |  [30,30]   | [number,number]  |
| thinout  | 是否进行抽稀,为数字时表示地图层级小于该数字时才抽稀 |  true |boolean,number
| thinType  | 点的抽稀方法,0使用 getProcessPoints抽稀，1使用getGridThinData抽稀 |  0 |0,1  |
| type  | 描点类型'rect' , 'circle' |  circle |"rect" , "circle"  |
| fillText  | 是否绘制文字,文字内容取数组中value字段 |  true |boolean |
| fontSize  | 文字大小 | 12 |number  |
| fontColor  | 文字颜色 |auto |string  |
| format  | 对点每个值进行格式化操作 |  |(v:number)=>string  |
| img  | 自定义点形状,需要能被context.drawImage解析,不受该点size以外其他参数的影响 |  |CanvasImageSource | ((v?: number | string) => CanvasImageSource)  |
### 方法
|  名称 | 描述  | 值类型  |  |
| ------------ | ------------ | ------------ | ------------ |
| setOption  | 重设canvas的各项参数  | Option  |
| setData  | 设置图层数据  | data: {  s: number; d: number;size?: [number, number]; color?: string;}[] ,data: {  u: number; v: number;size?: [number, number]; color?: string;}[] |
| Draw  | 绘制  |   |
| setClip  | 设置/重设裁剪范围  |  FeatureCollection , null  |
| clear  | 清空绘制内容  |    |
| destroy  | 销毁图层  |   |
| on  | 监听点击事件  | type:click,callback:function  |

### 方法
参考其他
Point值类型
`    {
    	lat: number;
       	lng: number;
      	value?: number; //点的值,与color中的颜色对应
      	color?: string;
      	size?: number[]; //点-宽高,默认[30,30]//
      	type?: PointType; //点类型
    }`

### 方法
|  名称 | 描述  | 值类型  |   |
| ------------ | ------------ | ------------ | ------------ |
| setOption  | 重设canvas的各项参数  | Option  |
| setData  | 设置图层数据  | Point[]   |
| Draw  | 绘制  |  |
| addPoint  | 不使用Draw单独添加一个点 不建议与抽稀混用  | Point  |
| removePoint  | 不使用clear单独移除一个点  | Point |
| setClip  | 设置/重设裁剪范围  |  FeatureCollection , null  |
| DrawClip  | 绘制裁剪区  |   |
| clear  | 清空绘制内容  |    |
| destroy  | 销毁图层  |   |
| on  | 监听点击事件  | type:click,callback:function  |

## 瓦片图层 LevelTile
|  名称 | 描述  | 默认值  | 值类型  |
| ------------ | ------------ | ------------ | ------------ |
| url  | 瓦片图地址  |   | string  |
| maxLevel  | 瓦片图可缩放最大层级  |  7 | number  |
| opacity  | 透明度  |  1 | number  |
| 其他  | leaflet默认瓦片层配置  |   |   ||

 ## 抽稀方法1 getGridThinData
/**
 * 以存放格点的方式抽稀数组,适合大量数据的抽稀
 * @param points <T extends LatLng>要抽稀的点数组
 * @param interval [number,number]每个点之间的最小间隔(单位:经度/纬度)
*/

## 抽稀方法2 getProcessPoints
/**
 * 根据点之间的间隔进行抽稀,对密集的点抽稀，保持点的均匀分布。
 * @param points <T extends LatLng>要抽稀的点数组
 * @param interval [number,number]每个点之间的最小间隔(单位:经度/纬度)
*/ 
