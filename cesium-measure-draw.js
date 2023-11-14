import * as Cesium from 'cesium'
if (typeof Cesium !== 'undefined')
  /**
    
    * @author zhangti
    * @param viewer  {object} 三维对象
    * @param options {object} 初始化参数
    * @constructor
    */
  var CesiumMeasures = (function (Cesium) {
    console.log(Cesium, 'Cesium')
    /**
     * 绘制对象
     * @param viewer
     * @param options
     * @constructor
     */
    function _(viewer, options = {}) {
      if (viewer && viewer instanceof Cesium.Viewer) {
        this._drawLayer = new Cesium.CustomDataSource('measureLayer')

        viewer && viewer.dataSources.add(this._drawLayer)

        this._basePath = options.basePath || ''

        this._viewer = viewer
      }
    }
    _.prototype = {
      /***
       * 坐标转换 84转笛卡尔
       *
       * @param {Object} {lng,lat,alt} 地理坐标
       *
       * @return {Object} Cartesian3 三维位置坐标
       */
      transformWGS84ToCartesian: function (position, alt) {
        if (this._viewer) {
          return position
            ? Cesium.Cartesian3.fromDegrees(
              position.lng || position.lon,
              position.lat,
              (position.alt = alt || position.alt),
              Cesium.Ellipsoid.WGS84
            )
            : Cesium.Cartesian3.ZERO
        }
      },
      /***
       * 坐标数组转换 笛卡尔转84
       *
       * @param {Array} WSG84Arr {lng,lat,alt} 地理坐标数组
       * @param {Number} alt 拔高
       * @return {Array} Cartesian3 三维位置坐标数组
       */
      transformWGS84ArrayToCartesianArray: function (WSG84Arr, alt) {
        if (this._viewer && WSG84Arr) {
          var $this = this
          return WSG84Arr
            ? WSG84Arr.map(function (item) {
              return $this.transformWGS84ToCartesian(item, alt)
            })
            : []
        }
      },
      /***
       * 坐标转换 笛卡尔转84
       *
       * @param {Object} Cartesian3 三维位置坐标
       *
       * @return {Object} {lng,lat,alt} 地理坐标
       */
      transformCartesianToWGS84: function (cartesian) {
        if (this._viewer && cartesian) {
          var ellipsoid = Cesium.Ellipsoid.WGS84
          var cartographic = ellipsoid.cartesianToCartographic(cartesian)
          return {
            lng: Cesium.Math.toDegrees(cartographic.longitude),
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            alt: cartographic.height
          }
        }
      },
      /***
       * 坐标数组转换 笛卡尔转86
       *
       * @param {Array} cartesianArr 三维位置坐标数组
       *
       * @return {Array} {lng,lat,alt} 地理坐标数组
       */
      transformCartesianArrayToWGS84Array: function (cartesianArr) {
        if (this._viewer) {
          var $this = this
          return cartesianArr
            ? cartesianArr.map(function (item) {
              return $this.transformCartesianToWGS84(item)
            })
            : []
        }
      },
      /**
       * 84坐标转弧度坐标
       * @param {Object} position wgs84
       * @return {Object} Cartographic 弧度坐标
       *
       */
      transformWGS84ToCartographic: function (position) {
        return position
          ? Cesium.Cartographic.fromDegrees(position.lng || position.lon, position.lat, position.alt)
          : Cesium.Cartographic.ZERO
      },
      /**
       * 拾取位置点
       *
       * @param {Object} px 屏幕坐标
       *
       * @return {Object} Cartesian3 三维坐标
       */
      getCatesian3FromPX: function (px) {
        if (this._viewer && px) {
          var picks = this._viewer.scene.drillPick(px)
          var cartesian = null
          var isOn3dtiles = false,
            isOnTerrain = false
          // drillPick
          for (let i in picks) {
            let pick = picks[i]

            if (
              (pick && pick.primitive instanceof Cesium.Cesium3DTileFeature) ||
              (pick && pick.primitive instanceof Cesium.Cesium3DTileset) ||
              (pick && pick.primitive instanceof Cesium.Model)
            ) {
              //模型上拾取
              isOn3dtiles = true
            }
            // 3dtilset
            if (isOn3dtiles) {
              this._viewer.scene.pick(px) // pick
              cartesian = this._viewer.scene.pickPosition(px)
              if (cartesian) {
                let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
                if (cartographic.height < 0) cartographic.height = 0
                let lon = Cesium.Math.toDegrees(cartographic.longitude),
                  lat = Cesium.Math.toDegrees(cartographic.latitude),
                  height = cartographic.height
                cartesian = this.transformWGS84ToCartesian({ lng: lon, lat: lat, alt: height })
              }
            }
          }
          // 地形
          let boolTerrain = this._viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider
          // Terrain
          if (!isOn3dtiles && !boolTerrain) {
            var ray = this._viewer.scene.camera.getPickRay(px)
            if (!ray) return null
            cartesian = this._viewer.scene.globe.pick(ray, this._viewer.scene)
            isOnTerrain = true
          }
          // 地球
          if (!isOn3dtiles && !isOnTerrain && boolTerrain) {
            cartesian = this._viewer.scene.camera.pickEllipsoid(px, this._viewer.scene.globe.ellipsoid)
          }
          if (cartesian) {
            let position = this.transformCartesianToWGS84(cartesian)
            if (position.alt < 0) {
              cartesian = this.transformWGS84ToCartesian(position, 0.1)
            }
            return cartesian
          }
          return false
        }
      },
      /**
       * 获取84坐标的距离
       * @param {*} positions
       */
      getPositionDistance: function (positions) {
        let distance = 0
        for (let i = 0; i < positions.length - 1; i++) {
          let point1cartographic = this.transformWGS84ToCartographic(positions[i])
          let point2cartographic = this.transformWGS84ToCartographic(positions[i + 1])
          let geodesic = new Cesium.EllipsoidGeodesic()
          geodesic.setEndPoints(point1cartographic, point2cartographic)
          let s = geodesic.surfaceDistance
          s = Math.sqrt(Math.pow(s, 2) + Math.pow(point2cartographic.height - point1cartographic.height, 2))
          distance = distance + s
        }
        return distance.toFixed(3)
      },
      /**
       * 计算一组坐标组成多边形的面积
       * @param {*} positions
       */
      getPositionsArea: function (positions) {
        let result = 0
        if (positions) {
          let h = 0
          let ellipsoid = Cesium.Ellipsoid.WGS84
          positions.push(positions[0])
          for (let i = 1; i < positions.length; i++) {
            let oel = ellipsoid.cartographicToCartesian(this.transformWGS84ToCartographic(positions[i - 1]))
            let el = ellipsoid.cartographicToCartesian(this.transformWGS84ToCartographic(positions[i]))
            h += oel.x * el.y - el.x * oel.y
          }
          result = Math.abs(h).toFixed(2)
        }
        return result
      },
      /**
       * 计算一组坐标的中心点
       * @param {*} cartesianPositions
       */
      computePolygonCenter: function (cartesianPositions) {
        if (!Cesium.defined(cartesianPositions) || cartesianPositions.length === 0) {
          return undefined; // 无效输入
        }
        console.log(cartesianPositions, "cartesianPositions");
        let lonArr = []
        let latArr = []
        cartesianPositions.map((item) => {
          lonArr.push(item.x)
          latArr.push(item.y)
        })
        let maxLon = Math.max.apply(Math, lonArr);
        let minLon = Math.min.apply(Math, lonArr);
        let maxLat = Math.max.apply(Math, latArr);
        let minLat = Math.min.apply(Math, latArr);
        let lonCenter = ((maxLon - minLon) / 2) + minLon;
        let latCenter = ((maxLat - minLat) / 2) + minLat;
        console.log(lonCenter, latCenter, "latCenter");
        // 计算所有顶点的平均坐标
        let center = new Cesium.Cartesian3();
        for (const position of cartesianPositions) {
          Cesium.Cartesian3.add(center, position, center);
        }
        Cesium.Cartesian3.divideByScalar(center, cartesianPositions.length, center);
        center.x = lonCenter
        center.y = latCenter
        return center;
      },

      /**
       * 测距
       * @param {*} options
       */
      drawLineMeasureGraphics: function (options = {}) {

        const { clampToGround, measure, style } = options
        if (this._viewer && options) {
          var positions = [],
            _lineEntity = new Cesium.Entity(),
            $this = this,
            lineObj,
            distance = 0,
            labelEntityOne,
            _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
          // left
          _handlers.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.position)
            if (cartesian && cartesian.x) {
              if (positions.length == 0) {
                positions.push(cartesian.clone())
              }
              // 添加量测信息点
              if (style?.point) {
                _addInfoPoint(cartesian)

              }
              positions.push(cartesian)
            }
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

          _handlers.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.endPosition)

            //鼠标提示信息
            if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)
            var _labelEntityOne = new Cesium.Entity()
            _labelEntityOne.position = cartesian
            _labelEntityOne.label = {
              text: positions.length > 0 ? '右击结束绘制' : '单击打开始绘制',
              show: true,
              showBackground: true,
              font: '14px monospace',
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(-20, -80) //left top
            }
            labelEntityOne = $this._drawLayer.entities.add(_labelEntityOne)

            if (positions.length >= 2) {
              if (cartesian && cartesian.x) {
                positions.pop()
                positions.push(cartesian)
              }
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
          // right
          _handlers.setInputAction(function (movement) {
            _handlers.destroy()
            if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)
            _handlers = null

            let cartesian = $this.getCatesian3FromPX(movement.position)
            _addInfoPoint(cartesian)

            if (typeof options.callback === 'function') {
              options.callback({
                points: $this.transformCartesianArrayToWGS84Array(positions),
                entity: lineObj,
                measure: Number(distance)
              })

              // options.callback($this.transformCartesianArrayToWGS84Array(positions), lineObj)
            }
          }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

          _lineEntity.polyline = {
            width: style?.line?.width || 1,
            material: style?.line?.material || Cesium.Color.BLUE.withAlpha(0.8),
            clampToGround: clampToGround || false
          }
          _lineEntity.polyline.positions = new Cesium.CallbackProperty(function () {
            return positions
          }, false)

          lineObj = this._drawLayer.entities.add(_lineEntity)

          //添加坐标点
          function _addInfoPoint(position) {
            var _labelEntity = new Cesium.Entity()
            _labelEntity.position = position
            _labelEntity.point = {
              pixelSize: style?.point?.pixelSize || 10,
              outlineColor: style?.point?.outlineColor || Cesium.Color.BLUE,
              outlineWidth: style?.point?.outlineWidth || 0,
              color: style?.point?.color || Cesium.Color.WHITE,
              show: JSON.stringify(style?.point?.show) == 'false' ? false : true

            }
            if (measure) {
              distance = $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(positions))

              _labelEntity.label = {
                text:
                  (distance / 1000).toFixed(4) +
                  '公里',
                show: true,
                showBackground: true,
                font: '14px monospace',
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(-20, -80) //left top
              }
            }

            $this._drawLayer.entities.add(_labelEntity)
          }
        }
      },
      /**
       * 测面积
       * @param {*} options
       */
      drawAreaMeasureGraphics: function (options = {}) {
        const { clampToGround, measure, style } = options

        if (this._viewer && options) {
          var positions = [],
            polygon = new Cesium.PolygonHierarchy(),
            _polygonEntity = new Cesium.Entity(),
            $this = this,
            polyObj = null,
            area = 0,
            _label = '',
            labelEntityOne,

            _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
          // left
          _handler.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.position)
            if (style?.point) {
              addInfoPoint(cartesian)

            }

            if (cartesian && cartesian.x) {
              if (positions.length == 0) {
                polygon.positions.push(cartesian.clone())
                positions.push(cartesian.clone())
              }
              positions.push(cartesian.clone())
              polygon.positions.push(cartesian.clone())

              if (!polyObj) create()
            }

          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
          // mouse
          _handler.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.endPosition)
            // var cartesian = $this._viewer.scene.camera.pickEllipsoid(movement.endPosition, $this._viewer.scene.globe.ellipsoid);

            //鼠标提示信息
            if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)
            var _labelEntityOne = new Cesium.Entity()
            _labelEntityOne.position = cartesian
            _labelEntityOne.label = {
              text: positions.length > 0 ? '右击结束绘制' : '单击打开始绘制',
              show: true,
              showBackground: true,
              font: '14px monospace',
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(-20, -80) //left top
            }
            labelEntityOne = $this._drawLayer.entities.add(_labelEntityOne)
            if (positions.length >= 2) {
              if (cartesian && cartesian.x) {
                positions.pop()
                positions.push(cartesian)
                polygon.positions.pop()
                polygon.positions.push(cartesian)
              }
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

          // right
          _handler.setInputAction(function (movement) {
            // var cartesian = $this.getCatesian3FromPX(movement.endPosition)


            if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)

            _handler.destroy()

            positions.push(positions[0])
            let lastPoint = positions[positions.length - 2]
            if (style?.centerPoint && measure) {
              let center = $this.computePolygonCenter(positions)

              // 添加信息点
              if (center) _addInfoPoint(center)
              if (style?.point) {
                addInfoPoint(lastPoint)

              }
            } else {
              addInfoPoint(lastPoint)
            }


            if (typeof options.callback === 'function') {
              options.callback({
                points: $this.transformCartesianArrayToWGS84Array(positions),
                entity: polyObj,
                measure: Number(area)
              })
              // options.callback($this.transformCartesianArrayToWGS84Array(positions), polyObj)
            }


          }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

          function create() {
            if (style?.line) {
              _polygonEntity.polyline = {
                width: style?.line?.width || 3,
                material: style?.line?.material || Cesium.Color.BLUE.withAlpha(0.8),
                clampToGround: clampToGround || false
              }

              _polygonEntity.polyline.positions = new Cesium.CallbackProperty(function () {
                return positions
              }, false)

            }



            _polygonEntity.polygon = {
              hierarchy: new Cesium.CallbackProperty(function () {
                return polygon
              }, false),

              material: style?.polygon?.material || Cesium.Color.WHITE.withAlpha(0.1),
              clampToGround: options.clampToGround || false
            }

            polyObj = $this._drawLayer.entities.add(_polygonEntity)
          }
          //添加坐标点
          function _addInfoPoint(position) {
            var _labelEntity = new Cesium.Entity()
            _labelEntity.position = position
            _labelEntity.point = {
              pixelSize: style?.centerPoint?.pixelSize || style?.point?.pixelSize || 10,
              outlineColor: style?.centerPoint?.outlineColor || style?.point?.outlineColor || Cesium.Color.BLUE,
              outlineWidth: style?.centerPoint?.outlineWidth || style?.point?.outlineWidth || 0,
              color: style?.centerPoint?.color || style?.point?.color || Cesium.Color.WHITE
            }
            if (measure) {
              area = $this.getPositionsArea($this.transformCartesianArrayToWGS84Array(positions))
              // 获取原始位置
              var originalPosition = _labelEntity.position.getValue(Cesium.JulianDate.now());
              // 向上偏移 100 米
              var newHeight = 10; // 向上偏移 100 米
              var newPosition = new Cesium.Cartesian3(originalPosition.x, originalPosition.y, originalPosition.z + newHeight);
              // 更新 entity 的位置属性
              _labelEntity.position.setValue(newPosition);
              _labelEntity.label = {
                text:
                  (area / 1000000.0).toFixed(4) +
                  '平方公里',

                show: true,
                showBackground: true,
                font: '14px monospace',
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(-55, -10) //left top
              }
            }

            $this._drawLayer.entities.add(_labelEntity)
          }
          function addInfoPoint(position) {
            var _labelEntity = new Cesium.Entity()
            _labelEntity.position = position
            _labelEntity.point = {
              pixelSize: style?.point?.pixelSize || 10,
              outlineColor: style?.point?.outlineColor || Cesium.Color.BLUE,
              outlineWidth: style?.point?.outlineWidth || 0,
              color: style?.point?.color || Cesium.Color.WHITE
            }
            $this._drawLayer.entities.add(_labelEntity)
          }
        }
      },
      /**
       * 画三角量测
       * @param {*} options
       */
      drawTrianglesMeasureGraphics: function (options = {}) {
        const { style } = options
        let lineStyle = style.line || {
          width: 3,
          material: Cesium.Color.BLUE.withAlpha(0.5)
        }
        if (this._viewer && options) {
          var _trianglesEntity = new Cesium.Entity(),
            _tempLineEntity = new Cesium.Entity(),
            _tempLineEntity2 = new Cesium.Entity(),
            _positions = [],
            _tempPoints = [],
            _tempPoints2 = [],
            $this = this,
            _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
          // 高度
          function _getHeading(startPosition, endPosition) {
            if (!startPosition && !endPosition) return 0
            if (Cesium.Cartesian3.equals(startPosition, endPosition)) return 0
            let cartographic = Cesium.Cartographic.fromCartesian(startPosition)
            let cartographic2 = Cesium.Cartographic.fromCartesian(endPosition)
            return (cartographic2.height - cartographic.height).toFixed(2)
          }
          // 偏移点
          function _computesHorizontalLine(positions) {
            let cartographic = Cesium.Cartographic.fromCartesian(positions[0])
            let cartographic2 = Cesium.Cartographic.fromCartesian(positions[1])
            return Cesium.Cartesian3.fromDegrees(
              Cesium.Math.toDegrees(cartographic.longitude),
              Cesium.Math.toDegrees(cartographic.latitude),
              cartographic2.height
            )
          }
          // left
          _handler.setInputAction(function (movement) {
            var position = $this.getCatesian3FromPX(movement.position)
            if (!position && !position.z) return false
            if (_positions.length == 0) {
              _positions.push(position.clone())
              _positions.push(position.clone())
              _tempPoints.push(position.clone())
              _tempPoints.push(position.clone())
            } else {
              _handler.destroy()
              if (typeof options.callback === 'function') {
                options.callback({ e: _trianglesEntity, e2: _tempLineEntity, e3: _tempLineEntity2 })
              }
            }
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
          // mouse
          _handler.setInputAction(function (movement) {
            var position = $this.getCatesian3FromPX(movement.endPosition)
            if (position && _positions.length > 0) {
              //直线
              _positions.pop()
              _positions.push(position.clone())
              let horizontalPosition = _computesHorizontalLine(_positions)
              //高度
              _tempPoints.pop()
              _tempPoints.push(horizontalPosition.clone())
              //水平线
              _tempPoints2.pop(), _tempPoints2.pop()
              _tempPoints2.push(position.clone())
              _tempPoints2.push(horizontalPosition.clone())
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

          // create entity

          //直线
          _trianglesEntity.polyline = {
            positions: new Cesium.CallbackProperty(function () {
              return _positions
            }, false),
            ...lineStyle
          }
          _trianglesEntity.position = new Cesium.CallbackProperty(function () {
            return _positions[0]
          }, false)
          _trianglesEntity.point = {
            pixelSize: style?.point?.pixelSize || 5,
            outlineColor: style?.point?.outlineColor || Cesium.Color.BLUE,
            outlineWidth: style?.point?.outlineWidth || 5
          }
          _trianglesEntity.label = {
            text: new Cesium.CallbackProperty(function () {
              return '直线:' + $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(_positions)) + '米'
            }, false),
            show: true,
            showBackground: true,
            font: '14px monospace',
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(50, -100) //left top
          }
          //高度
          _tempLineEntity.polyline = {
            positions: new Cesium.CallbackProperty(function () {
              return _tempPoints
            }, false),
            ...lineStyle
          }
          _tempLineEntity.position = new Cesium.CallbackProperty(function () {
            return _tempPoints2[1]
          }, false)
          _tempLineEntity.point = {
            pixelSize: style?.point?.pixelSize || 5,
            outlineColor: style?.point?.outlineColor || Cesium.Color.BLUE,
            outlineWidth: style?.point?.outlineWidth || 5
          }
          _tempLineEntity.label = {
            text: new Cesium.CallbackProperty(function () {
              return '高度:' + _getHeading(_tempPoints[0], _tempPoints[1]) + '米'
            }, false),
            show: true,
            showBackground: true,
            font: '14px monospace',
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(-20, 100) //left top
          }
          //水平
          _tempLineEntity2.polyline = {
            positions: new Cesium.CallbackProperty(function () {
              return _tempPoints2
            }, false),
            ...lineStyle
          }
          _tempLineEntity2.position = new Cesium.CallbackProperty(function () {
            return _positions[1]
          }, false)

          _tempLineEntity2.point = {
            pixelSize: style?.point?.pixelSize || 5,
            outlineColor: style?.point?.outlineColor || Cesium.Color.BLUE,
            outlineWidth: style?.point?.outlineWidth || 5
          }
          _tempLineEntity2.label = {
            text: new Cesium.CallbackProperty(function () {
              return (
                '水平距离:' + $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(_tempPoints2)) + '米'
              )
            }, false),
            show: true,
            showBackground: true,
            font: '14px monospace',
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(-150, -20) //left top
          }
          this._drawLayer.entities.add(_tempLineEntity2)
          this._drawLayer.entities.add(_tempLineEntity)
          this._drawLayer.entities.add(_trianglesEntity)
        }
      },
      /**
       * 传入两个点位返回矩形4个点的坐标
       */
      computeRectanglePos: function (lTop, rBottom) {
        let positions = []
        var leftTop = this.transformCartesianToWGS84(lTop);
        var rightBottom = this.transformCartesianToWGS84(rBottom);
        var rightTop = {
          "lng": rightBottom.lng,
          "lat": leftTop.lat
        };
        let rightTop2 = Cesium.Cartesian3.fromDegrees(rightTop.lng, rightTop.lat)
        // 计算左下角的坐标
        var leftBottom = {
          "lng": leftTop.lng,
          "lat": rightBottom.lat
        };
        let leftBottom2 = Cesium.Cartesian3.fromDegrees(leftBottom.lng, leftBottom.lat)
        positions.push(rightTop2.clone(), rBottom.clone(), leftBottom2.clone(), lTop.clone())
        return positions
      },
      /**
       * 绘制矩形
       */
      drawRectangleMeasureGraphics: function (options = {}) {
        const { clampToGround, measure, style } = options

        if (this._viewer && options) {
          var positions = [],
            polyObj = null,
            rectangle = new Cesium.PolygonHierarchy(),
            _polygonEntity = new Cesium.Entity(),
            $this = this,
            labelEntityOne,
            area = 0,
            _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
          // left
          _handler.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.position)
            addInfoPoint(cartesian)

            if (cartesian && cartesian.x) {
              if (positions.length == 0) {
                rectangle.positions.push(cartesian.clone())
                positions.push(cartesian.clone())

              } else {
                let otherPos = $this.computeRectanglePos(positions[0], cartesian)
                console.log(otherPos, "");
                positions.push(...otherPos)
                if (positions.length > 1) {
                  positions.splice(-4)
                  rectangle.positions.splice(-4)
                }
                positions.map((pos) => {
                  rectangle.positions.push(pos)
                })
                //清除鼠标事件
                if (_handler) _handler.destroy()
                //清除提示
                if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)
                if (typeof options.callback === 'function') {
                  options.callback({
                    points: $this.transformCartesianArrayToWGS84Array(positions),
                    entity: polyObj,
                    measure: Number(area)
                  })
                  // options.callback($this.transformCartesianArrayToWGS84Array(positions), polyObj)
                }
                //如果measure==true就计算面积
                if (measure == true) {
                  if (style.centerPoint) {
                    const center = $this.computePolygonCenter(positions)
                    if (center) _addInfoPoint(center)
                  } else {
                    _addInfoPoint(cartesian)
                  }

                }



              }

              if (!polyObj) create()
            }


          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
          _handler.setInputAction(function (movement) {

            var cartesian = $this.getCatesian3FromPX(movement.endPosition)
            //鼠标提示信息
            if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)
            var _labelEntityOne = new Cesium.Entity()
            _labelEntityOne.position = cartesian
            _labelEntityOne.label = {
              text: '点击两个点后自动完成绘制',
              show: true,
              showBackground: true,
              font: '14px monospace',
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(-20, -80) //left top
            }
            labelEntityOne = $this._drawLayer.entities.add(_labelEntityOne)
            if (positions.length > 1) {
              positions.splice(-4)
              rectangle.positions.splice(-4)
            }
            let otherPos = $this.computeRectanglePos(positions[0], cartesian)
            positions.push(...otherPos)
            positions.map((pos) => {
              rectangle.positions.push(pos)
            })


          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

          function create() {

            _polygonEntity.polyline = {
              width: style?.line?.width || 3,
              material: style?.line?.material || Cesium.Color.BLUE.withAlpha(0.8),
              clampToGround: clampToGround || false,
              show: JSON.stringify(style?.line?.show) == 'false' ? false : true
            }

            _polygonEntity.polyline.positions = new Cesium.CallbackProperty(function () {
              return positions
            }, false)



            _polygonEntity.polygon = {
              hierarchy: new Cesium.CallbackProperty(function () {
                return rectangle
              }, false),

              material: style?.polygon?.material || Cesium.Color.WHITE.withAlpha(0.1),
              clampToGround: clampToGround || false
            }

            polyObj = $this._drawLayer.entities.add(_polygonEntity)
          }
          //鼠标打点
          function addInfoPoint(position) {
            var _labelEntity = new Cesium.Entity()
            _labelEntity.position = position
            _labelEntity.point = {
              pixelSize: style?.point?.pixelSize || 10,
              outlineColor: style?.point?.outlineColor || Cesium.Color.BLUE,
              outlineWidth: style?.point?.outlineWidth || 0,
              color: style?.point?.cololr || Cesium.Color.WHEAT,
              show: JSON.stringify(style?.point?.show) == 'false' ? false : true

            }
            $this._drawLayer.entities.add(_labelEntity)
          }
          //添加坐标点
          function _addInfoPoint(position) {
            var _labelEntity = new Cesium.Entity()
            _labelEntity.position = position
            _labelEntity.point = {
              pixelSize: style?.centerPoint?.pixelSize || 10,
              outlineColor: style?.centerPoint?.outlineColor || Cesium.Color.BLUE,
              outlineWidth: style?.centerPoint?.outlineWidth || 0,
              color: style?.centerPoint?.cololr || Cesium.Color.WHEAT,
              show: JSON.stringify(style?.centerPoint?.show) == 'false' ? false : true
            }
            if (measure) {
              area = $this.getPositionsArea($this.transformCartesianArrayToWGS84Array(positions))
              _labelEntity.label = {
                text:
                  (area / 1000000.0).toFixed(4) +
                  '平方公里',
                show: true,
                showBackground: true,
                font: '14px monospace',
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(-55, -10) //left top
              }
            }

            $this._drawLayer.entities.add(_labelEntity)
          }
        }
      },
      /**
       * 绘制圆形
       */
      drawCircleMeasureGraphics: function (options = {}) {
        const { clampToGround, measure, style } = options

        if (this._viewer && options) {
          var positions = [],
            polyObj = null,
            _labelEntity,
            _polygonEntity = new Cesium.Entity(),
            center,
            radius = 500,
            $this = this,
            labelEntityOne,
            _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
          if (!polyObj) create()
          _handler.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.position)

            if (cartesian && cartesian.x) {
              if (positions.length == 0) {
                _labelEntity = addInfoPoint(cartesian)
                _polygonEntity.position = new Cesium.CallbackProperty(function () {
                  // 在这个回调函数中动态计算圆形的位置（中心点）
                  return cartesian;
                }, false);
                if (!center) center = cartesian

                positions.push(cartesian)
              } else {
                radius = Number($this.getPositionDistance($this.transformCartesianArrayToWGS84Array([center, cartesian])))
                //清除鼠标事件
                if (_handler) _handler.destroy()
                //清除提示
                if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)
                if (typeof options.callback === 'function') {
                  options.callback(
                    {
                      center: $this.transformCartesianArrayToWGS84Array([center]),
                      radius: radius
                    }
                    , polyObj)
                }
              }

            }



          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

          _handler.setInputAction(function (movement) {
            var cartesian = $this.getCatesian3FromPX(movement.endPosition)

            //鼠标提示信息
            if (labelEntityOne) $this._drawLayer.entities.remove(labelEntityOne)

            radius = Number($this.getPositionDistance($this.transformCartesianArrayToWGS84Array([center, cartesian])))
            // 计算圆形的面积

            if (measure) {
              if (!_labelEntity) {
                _labelEntity = addInfoPoint(center)
              }
              var circleArea = Math.PI * Math.pow(radius, 2);
              _labelEntity.label = {
                text:
                  (circleArea / 1000000.0).toFixed(4) +
                  '平方公里',

                show: true,
                showBackground: true,
                font: '14px monospace',
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(-55, -10) //left top
              }
            }
            var _labelEntityOne = new Cesium.Entity()
            _labelEntityOne.position = cartesian
            _labelEntityOne.label = {
              text: positions.length > 0 ? '再次单机后结束绘制' : '单击打开始绘制',
              show: true,
              showBackground: true,
              font: '14px monospace',
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(-20, -80) //left top
            }
            labelEntityOne = $this._drawLayer.entities.add(_labelEntityOne)

          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        }
        function create() {

          _polygonEntity.ellipse = {
            semiMinorAxis: new Cesium.CallbackProperty(function () {

              // 在这个回调函数中动态计算圆形的半径
              return radius
            }, true),
            semiMajorAxis: new Cesium.CallbackProperty(function () {
              // 在这个回调函数中动态计算圆形的半径
              return radius
            }, true),
            height: 0,//
            material: style?.circle?.material || Cesium.Color.RED.withAlpha(0.5),
            outline: true, // 显示边框
            outlineColor: style?.circle?.outlineColor || Cesium.Color.GREEN, // 边框颜色
            zIndex: 5,
            clampToGround: options.clampToGround || false
          }

          polyObj = $this._drawLayer.entities.add(_polygonEntity)
        }
        function addInfoPoint(position) {
          var _labelEntity = new Cesium.Entity()
          _labelEntity.position = position

          _labelEntity.point = {
            pixelSize: style?.centerPoint?.pixelSize || 10,
            outlineColor: style?.centerPoint?.outlineColor || Cesium.Color.BLUE,
            outlineWidth: style?.centerPoint?.outlineWidth || 0,
            color: style?.centerPoint?.cololr || Cesium.Color.WHEAT,
            zIndex: 10,
            show: JSON.stringify(style?.centerPoint?.show) == 'false' ? false : true


          }
          // 获取原始位置
          var originalPosition = _labelEntity.position.getValue(Cesium.JulianDate.now());
          // 向上偏移 100 米
          var newHeight = 10; // 向上偏移 100 米
          var newPosition = new Cesium.Cartesian3(originalPosition.x, originalPosition.y, originalPosition.z + newHeight);
          // 更新 entity 的位置属性
          _labelEntity.position.setValue(newPosition);
          $this._drawLayer.entities.add(_labelEntity)
          return _labelEntity
        }
      },
    }
    return _
  })(Cesium)
export default CesiumMeasures
