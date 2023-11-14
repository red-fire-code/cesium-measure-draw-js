
# 可以满足自定义绘制：线、多边形、矩形、圆;同时满足测距、测面积、三角测量的功能


# 如何使用
# 1、下载 cesium-measure-draw.js
# 2、在项目中导入 
#    import CesiumMeasures from '../cesium-measure-draw.js';
# 3、实例 
#    const measure = new CesiumMeasures(viewer)

# 1、绘制线:
        measure.drawLineMeasureGraphics({
                clampToGround: false, measure: true, style: {
                    line: {
                        width: 2,
                        material: Cesium.Color.BLUE.withAlpha(0.8)
                    },
                    point: {
                        color: Cesium.Color.RED,
                        pixelSize: 5,
                        outlineColor: Cesium.Color.GREEN,
                        outlineWidth: 3
                    }
                }, callback: (e) => {
                    console.log(e, "88888888888");
                }
          })
# 2、绘制多边形
          measure.drawAreaMeasureGraphics({
              clampToGround: false, measure: true, style: {
                  line: {
                      width: 2,
                      material: Cesium.Color.RED.withAlpha(0.8)
                  },
                  point: {
                      pixelSize: 5,
                      outlineColor: Cesium.Color.BLUE,
                      outlineWidth: 2,
                      show: true,//默认为true
                  },
                  polygon: {
                      material: Cesium.Color.GREEN.withAlpha(0.1)
                  },
                  //如果不设置centerPoint则会把测量的位置现在在最后一个点击的位置
                  centerPoint: {
                      pixelSize: 5,
                      outlineColor: Cesium.Color.RED,
                      outlineWidth: 2
                  }
              }, callback: (e) => {
                  console.log(e, "88888888888");
              }
          })
# 3、绘制矩形
          measure.drawRectangleMeasureGraphics({
              clampToGround: false, measure: true, style: {
                  line: {
                      
                      width: 2,
                      material: Cesium.Color.RED.withAlpha(0.8),
                      show: true,//默认为true
                  },
                  point: {
                      
                      pixelSize: 5,
                      outlineColor: Cesium.Color.BLUE,
                      outlineWidth: 1,
                      show: true,//默认为true
                  },
                  polygon: {
                      material: Cesium.Color.RED.withAlpha(0.1)
                  },
                  centerPoint: {
                      pixelSize: 5,
                      outlineColor: Cesium.Color.RED,
                      outlineWidth: 2,
                      show: true,//默认为true

                  }
              }, callback: (e) => {
                  console.log(e, "88888888888");
              }
          })
# 4、绘制圆形
          measure.drawCircleMeasureGraphics({
          clampToGround: false, measure: true, style: {
              line: {
                  width: 2,//部分浏览器不起作用！！！无论多宽都是1，
                  material: Cesium.Color.RED.withAlpha(0.8)
              },
              centerPoint: {
                  show: true,
                  pixelSize: 5,
                  outlineColor: Cesium.Color.YELLOW,
                  outlineWidth: 3,
                  cololr: Cesium.Color.RED

              },
              circle: {
                  material: Cesium.Color.GREEN.withAlpha(0.1),
                  outlineColor: Cesium.Color.YELLOW,
                  outlineWidth: 3,
              },

          }, callback: (e) => {
              console.log(e, "88888888888");
            }
          })
# 5、三角测量
      
          measure.drawTrianglesMeasureGraphics({
              style: {
                  line: {
                      width: 2,
                      material: Cesium.Color.BLUE.withAlpha(0.8)
                  },
                  point: {
                      pixelSize: 5,
                      outlineColor: Cesium.Color.BLUE,
                      outlineWidth: 5,
                      show: true,//默认为true

                  }
              },
              callback: () => { }
          })
# 6、 清空
          measure._drawLayer.entities.removeAll()

