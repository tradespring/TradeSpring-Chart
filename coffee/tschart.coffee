exports ?= this
TradeSpring = exports.TradeSpring ?= {}

exports.OPEN = 1
exports.HIGH = 2
exports.LOW = 3
exports.CLOSE = 4

class TradeSpring.Chart
      constructor: (opt)->
        for name, val of opt
          @[name] = val
        @tz ||= 'Asia/Taipei'
        @zones = []
        @current_zoom = 10
        @canvas_width = @x + 10 * @items_to_load
        @chart_view = $("<div>").css(
          cursor: "crosshair"
          overflow: "hidden"
          "-webkit-animation-timing-function": "ease-in"
          "-webkit-transform-origin-x": "100%"
          "-webkit-transform-origin-y": "0px"
          "-webkit-transition-delay": "0.5s"
          "-webkit-transition-duration": "3s"
          position: "relative"
          width: @width
          height: @height
        ).appendTo(@holder)
        vcursor = undefined
        @canvas = $("<div/>").appendTo(@chart_view).css(
          width: @canvas_width
          height: @height
          left: @nb_items() * 10 - @canvas_width
          cursor: "inherit"
          position: "relative"
        )
        update_cursor = (e) =>
          e = e.originalEvent.changedTouches[0]  if e.originalEvent.changedTouches
          offX = e.pageX - @canvas.offset().left
          item = Math.floor(offX / @current_zoom - 0.5)
          jQuery.each @zones, ->
            @hi_callback item

          vcursor.css "left", e.clientX - @x

        @chart_view.mousemove update_cursor
        @chart_view.bind "touchend", update_cursor
        @chart_view.bind "touchstart", update_cursor
        vcursor = $("<div/>").appendTo(@chart_view).addClass("vcursor").css("height", @height)
        default_zone_canvas = $("<div/>").appendTo(@canvas).addClass("zone").css(
          width: @canvas_width
          height: @height
          top: 0
          left: 0
          position: "absolute"
        )
        @r = Raphael(default_zone_canvas.get(0), @canvas_width, @height)
        @callbacks = []
        @offset = @cnt - @nb_items()
        @loaded_nb_items = @items_to_load
        @loaded_offset = @cnt - @items_to_load
        @price_label = $("<span/>").addClass("ylabel").addClass("cursor").css(
          position: "absolute"
          left: 5 + @x + @width
        ).appendTo(@holder)
        @price_label_high = $("<span/>").addClass("ylabel").addClass("high").css(
          position: "absolute"
          left: 5 + @x + @width
        ).appendTo(@holder)
        @price_label_low = $("<span/>").addClass("ylabel").addClass("low").css(
          position: "absolute"
          left: 5 + @x + @width
        ).appendTo(@holder)
        @canvas.transform origin: [ 0, 0 ]
        @init_width()
        $(this).bind "candle-ready", =>
          @candle_ready = true

      init_width: ->
        @holder.css "width", @width
        @chart_view.css "width", @width
        @canvas.css "left", @nb_items() * @current_zoom - @canvas_width * @current_zoom / 10
        @offset = @loaded_offset + @loaded_nb_items - @nb_items()
        @price_label.css "left", 5 + @x + @width
        @price_label_high.css "left", 5 + @x + @width
        @price_label_low.css "left", 5 + @x + @width
        $("span.ylabel", @holder).css "left", 5 + @x + @width
        @set_draggable()

      ready: (cb) ->
        if @candle_ready
          cb()
        else
          $(this).bind "candle-ready", ->
            cb()

      on_view_change: ->
        zone = @candle_zone
        start = @offset - @loaded_offset
        return  unless zone.data_set
        d = zone.data_set.slice(start, start + @nb_items() + 1)
        p = $("span.ylabel.display").map(->
          parseFloat($(this).text()) or parseFloat($(".price", this).text())
        ).get()
        max = Math.max.apply(this, p.concat($.map(d, (data) ->
          data[HIGH]
        )))
        min = Math.min.apply(this, p.concat($.map(d, (data) ->
          data[LOW]
        )))
        if @view_max and @view_min and Math.abs(@view_max) != Infinity and Math.abs(@view_min) != Infinity
          delta = @view_max - @view_min
          if max > @view_max - delta * 0.05 or max < @view_max - delta * 0.1 or min < @view_min + delta * 0.05 or min > @view_min + delta * 0.1

          else
            return
          return  if @view_lock_decrease and max - min < delta
        max += (max - min) * 0.1
        min -= (max - min) * 0.1
        @view_max = max
        @view_min = min

        offset = zone.nr_offset = max - zone.ymax
        scale = zone.nr_yscale = zone.height / (max - min)
        zone.canvas.transform
          scaleY: scale
          translateY: (max - zone.ymax) + "px"

        $("path.curve", zone.r.canvas).attr "stroke-width", (2 / scale) + "px"
        $(this).trigger "scale-changed"
        zone.render_ylabels()  if zone.ylabels

      set_draggable: ->
        left = @current_zoom * (Math.min(0, @nb_items() - @loaded_nb_items))
        c = [ left, 0, 50, 0 ]
        view_change_timer = undefined
        canvas = @canvas
        change = =>
          left = $(canvas).offset().left
          @scroll.x = left
          @offset = @loaded_offset + Math.max(0, Math.round((-left) / view.current_zoom))
          @on_view_change()

        if @scroll
          @scroll.refresh()
          return

        last_zoom = undefined
        zooming = undefined
        that = this
        @scroll = new iScroll(@chart_view.get(0),
          vScroll: false
          zoomMin: 1
          zoomMax: 1
          zoom: true
          bounce: false
          momentum: false
          x: left
          useTransform: false
          onRefresh: ->
            @scrollerW = Math.round(@scroller.offsetWidth * that.current_zoom / 10)
            @maxScrollX = @wrapperW - @scrollerW
            @x = $(canvas).offset().left

          onZoomStart: (x, e) =>
            last_zoom = @current_zoom
            zooming = true

          onZoom: (e) =>
            @zoomed = false
            scale = Math.round(1 / @touchesDistStart * @touchesDist * last_zoom)
            scale = Math.min(scale, 20)
            scale = Math.max(scale, 1)
            center_item = Math.floor((@originX / last_zoom + 0.5))
            unless scale == @current_zoom
              orig = @current_zoom
              @current_zoom = scale
              @zoom orig, center_item, (if scale - @current_zoom > 0 then 1 else -1)
            false

          onTouchEnd: (x, e) ->
            zooming = false  if zooming

          onScrollStart: ->
            view_change_timer = window.setInterval(->
              change.apply canvas
            , 500)

          onScrollEnd: ->
            window.clearInterval view_change_timer
            change.apply canvas
        )
        @scroll.options.zoom = true

      set_undraggable: ->
        @canvas.draggable disabled: true

      nb_items: ->
        Math.floor @width / @current_zoom

      new_zone: (args) ->
        zone = new TradeSpring.Chart.Zone(
          r: @r
          x: 10
          y: args.y
          width: @canvas_width
          height: args.height
          view: this
        )
        @zones.push zone
        unless @candle_zone
          @candle_zone = zone
          hcursor = undefined
          zone.canvas_holder = $("<div/>").appendTo(@canvas).addClass("zoneroot")
          @ready =>
            update_cursor = (e) =>
              e = e.originalEvent.touches[0]  if e.originalEvent.touches
              return true if !e
              scaled_y = e.pageY - zone.canvas_holder.offset().top
              offY = scaled_y / zone.nr_yscale - zone.nr_offset
              hcursor.css "top", scaled_y
              y = @candle_zone.offset_to_val(offY)
              @price_label.text(y).css top: scaled_y
              true

            zone.canvas_holder.mousemove update_cursor
            zone.canvas_holder.bind "touchstart", update_cursor
            zone.canvas_holder.bind "touchend", update_cursor

          zone.canvas = $("<div/>").appendTo(zone.canvas_holder).addClass("zone").css(
            width: @canvas_width
            height: @height
            top: 0
            left: 0
            "-webkit-transform-origin-y": "0px"
            position: "absolute"
          )
          zone.r = Raphael(zone.canvas.get(0), @canvas_width, args.height)
          hcursor = $("<div/>").appendTo(zone.canvas_holder).addClass("hcursor")
          zone.new_resize = 1
        else @volume_zone = zone  unless @volume_zone
        zone

      on_new_event: (e) ->
        oldbar = undefined
        oldvol = undefined
        $(this).trigger "bar", e  if e.type == "bar"
        if e.type == "tick" or e.type == "bar"
          if e.i <= @cnt - 1
            oldbar = @tmpbar
            oldvol = @volbar
          if e.i > @cnt - 1
            @add_column e.i - @loaded_offset
            @canvas_width += 10
            ++@cnt
            @r.setSize @canvas_width
            jQuery.each @zones, ->
              @r.setSize @view.canvas_width  if @new_resize

            @canvas.css "width", @canvas_width
            @canvas.css left: parseInt(@canvas.css("left")) - @current_zoom
            @offset++
            @loaded_nb_items++
            @blanket.toFront()  if @blanket
            @set_draggable()
          zone = @candle_zone
          zone.data_set[e.i - @loaded_offset] = e.prices
          @on_view_change()  if e.prices[HIGH] > @view_max or e.prices[LOW] < @view_min

          if e.type == "bar"
            e.prices[6] = new timezoneJS.Date(e.prices[0])
            e.prices[6].setTimezone @tz
          [@tmpbar, cb] = zone.render_candle_item(e.i * 10, e.prices)
          @tmpbar.toBack()
          zone._callbacks[0][e.i - @loaded_offset] = cb
          if oldbar
            oldbar.remove()
            zone.candle_blanket.pop()
          zone.candle_blanket.push @tmpbar
          if oldvol
            new_y = (@volume_zone.ymax - e.prices[5] + @volume_zone.offset_attr.translation[1]) * @volume_zone.offset_attr.scale[1]
            new_height = (e.prices[5]) * @volume_zone.offset_attr.scale[1]
            $(oldvol.node).attr({y: new_y, height: new_height, fill: (if e.prices[CLOSE] > e.prices[OPEN] then "red" else "green")})
          else
            vol = @volume_zone.render_bar_item(e.i * 10, e.prices[5], (if e.prices[CLOSE] > e.prices[OPEN] then "red" else "green"), "Vol", 0)
            @volbar = vol[0]
            @volbar.toBack()
            @volume_zone.candle_blanket.push @volbar
          @volume_zone._callbacks[0][e.i - @loaded_offset] = ->
            "Vol: " + e.prices[5]

      get_i_from_date_in_view: (date) ->
        ds = @zones[0].data_set
        return  unless ds
        length = ds.length
        j = 1

        while j <= length - 1
          return @cnt - j  if ds[length - j - 1][6] and ds[length - j - 1][6] < date
          ++j
        null

      seek_to_date: (date) ->
        jQuery.post "/d/" + @code + "/" + @tf + "/resolvedate", date: date, ((response, status) =>
          @seek_to response[0]
        ), "json"

      seek_to: (i, cb) ->
        offset = Math.min(i, @cnt - @nb_items())
        @loaded_offset = Math.max(offset - 10, 0)
        jQuery.each @zones, =>
          @blanket.translate (offset - @offset) * -10, 0

        @offset = offset
        @load ->
          @blanket.toFront()
          cb()

      scroll_right: ->
        return  if @offset + @nb_items() >= @cnt
        if @offset + @nb_items() > @loaded_offset + @loaded_nb_items
          @loaded_offset += @items_to_load / 2
          @loaded_offset = @cnt - @items_to_load  if @loaded_offset > @cnt - @items_to_load
          @load()
          @blanket.toFront()
        @offset++
        @canvas.css left: parseInt(@canvas.css("left")) - @current_zoom

      scroll_left: ->
        return  if @offset == 0
        if @offset < @loaded_offset + 10
          @loaded_offset -= @items_to_load / 2
          @loaded_offset = 0  if @loaded_offset < 0
          @load()
          @blanket.toFront()
        @offset--
        @canvas.css left: parseInt(@canvas.css("left")) + @current_zoom

      zoomin: (offset) ->
        return  if @current_zoom == 20
        @zoom @current_zoom++, offset, 1

      zoomout: (offset) ->
        return  if @current_zoom == 1
        return  if @loaded_nb_items * @current_zoom < @width
        @zoom @current_zoom--, offset, -1

      zoom: (orig_zoom, center_item, zoomdir) ->
        center_item = @loaded_nb_items  unless center_item
        @offset += zoomdir * Math.floor((center_item - (@offset - @loaded_offset))) / @current_zoom
        @offset = Math.min(@offset, @loaded_offset + @loaded_nb_items - @nb_items())
        @offset = Math.max(@offset, @loaded_offset)
        left = Math.max(@nb_items(), @loaded_offset + @loaded_nb_items - @offset) * @current_zoom - @canvas_width * @current_zoom / 10
        left = Math.min(0, left)
        @canvas.transform(scaleX: @current_zoom / 10).css "left", left
        s = @scroll
        s.refresh()
        @on_view_change()

      add_column: (i) ->
        return

      init_columns: ->
        @blanket.remove()  if @blanket
        @blanket = @r.set()

      load: (cb) ->
        req = 0
        @init_columns()
        jQuery.each @zones, =>
          ++req
          @load =>
            unless --req
              @blanket.toFront()
              cb()

class TradeSpring.Chart.Zone
      constructor: (opt)->
        for name, val of opt
          @[name] = val
        @_callbacks = []
        @_loaders = []
        @container = @r.rect(@x, @y, @width * 2, @height).attr(stroke: "black")
        @label = $("<div/>").addClass("infobox").css(
          top: @y + 10
          left: 10
        ).hide().appendTo(@view.holder)
        @blanket = @r.set()
        @candle_blanket = @r.set()
        @ymax = 0
        @blanket.push @candle_blanket
      hi_callback: (i) ->
        text = jQuery.map(@_callbacks, (x) ->
          (if x[i] then x[i]() else "")
        ).join("\n") + " "
        @label.text(text).show()

      ho_callback: (i) ->
        @label.hide()

      add_loader: (uri, param, render) ->
        @_loaders.push (cb) =>
          param.start = @view.loaded_offset
          param.end = @view.loaded_offset + @view.items_to_load - 1
          jQuery.post uri, param, ((response, status) ->
            render.apply @, [ response, param.start ]
            cb()  if cb
          ), "json"

      reset: ->
        oldblanket = @blanket
        @candle_blanket = @r.set()
        @blanket = @r.set()
        @blanket.push @candle_blanket
        @ymax = 0
        @resample = 1
        @_callbacks = []
        if @ylabels
          $("span.ylabel.yaxis").remove()
          @ylabels = null
        ->
          oldblanket.hide()
          oldblanket.remove()

      load: (cb) ->
        oldblanket = @candle_blanket
        @candle_blanket = @r.set()
        @blanket.push @candle_blanket
        @resample = 1
        @_callbacks = []
        req = @_loaders.length
        jQuery.each @_loaders, ->
          this ->
            oldblanket.hide()
            oldblanket.remove()
            cb()

      path: (spec) ->
        @r.path(spec).attr @offset_attr

      rect: (x, y, w, h) ->
        @r.rect(x, @ymax - y, w, h).attr @offset_attr

      circle: (x, y, r) ->
        @r.circle(x, @ymax - y, r).attr @offset_attr

      ellipse: (x, y, rx, ry) ->
        @r.ellipse(x, @ymax - y, rx, ry).attr @offset_attr

      text: (x, y, text) ->
        off_ = @offset_attr
        @r.text(x, (@ymax - y) * off_.scale[1], text).attr translation: off_.translation

      offset_to_val: (offset_y) ->
        Math.floor @ymax - (offset_y - @y) / @offset_attr.scale[1]

      resize: (data_high, data_low, high_pad, low_pad) ->
        data_max = undefined
        data_min = undefined
        data_max = Math.max.apply(this, data_high)  if data_high
        data_min = Math.min.apply(this, data_low)  if data_low
        unless @ymax
          @resample = 0
          @ymax = data_max + (high_pad or 0)
          @ymin = (if not data_min? then @ymax - 70 else data_min) - (low_pad or 0)
          yscale = @height / (@ymax - @ymin)
          if @new_resize
            @r.setSize null, @ymax - @ymin  if @ymax - @ymin > @r.height
            yscale = 1
          @offset_attr =
            translation: [ @x - (@view.loaded_offset * 10), @y / yscale ]
            scale: [ 1, yscale, 1, 1 ]

          @render_ylabels()  if @ylabels
        else
          new_max = Math.max(data_max, @ymax)
          new_min = (if data_min then Math.min(data_min, @ymin) else @ymin)
          if @resample
            new_max = data_max + (high_pad or 0)
            new_min = min = (if not data_min? then new_max - 70 else data_min) - (low_pad or 0)
          unless new_max - new_min == @ymax - @ymin
            oldmax = @ymax
            oldscale = @offset_attr.scale[1]
            @ymax = (if @resample then new_max else Math.max(data_max + (high_pad or 0), @ymax))
            @ymin = (if @resample then new_min else (if data_min then Math.min(data_min - (low_pad or 0), @ymin) else @ymin))
            @resample = 0
            if @new_resize
              @r.setSize null, @ymax - @ymin  if @ymax - @ymin > @r.height
              @blanket.translate 0, (@ymax - oldmax)
              @view.view_max = null
              @view.on_view_change()
              return
            yscale = @height / (@ymax - @ymin)
            @offset_attr =
              translation: [ @x - (@view.loaded_offset * 10), @y / yscale ]
              scale: [ 1, yscale, 1, 1 ]

            @blanket.attr scale: [ 1, yscale, 1, 1 ]
            @blanket.translate 0, (@ymax - oldmax) * yscale + @y * (1 - yscale / oldscale)
            @render_ylabels()  if @ylabels

      render_curve: (data_set, start_idx, color, n, fast) ->
        dx = 10
        color = "blue"  unless color
        @resize data_set, data_set  unless fast
        if @ymin < 0
          p = @r.path().moveTo(dx * start_idx, @ymax).lineTo(dx * (start_idx + @view.items_to_load), @ymax).attr(@offset_attr).attr(
            stroke: "black"
            opacity: 0.5
          )
          @candle_blanket.push p
        p = @r.path().beginMulti()
        pstart = 1
        name = n
        callback = []
        @_callbacks.push callback
        for i of data_set
          data = data_set[i]
          x = dx * (parseInt(i) + start_idx)
          y = @ymax - data
          if not data? or data == false
            pstart = 1
          else if pstart
            pstart = 0
            p = p.moveTo(x, y)
          else
            p = p.lineTo(x, y)
          if name
            ((data, bar, i) ->
              callback.push ->
                name + ": " + data
            ) data
        p.andUpdate().attr(@offset_attr).attr stroke: color
        @candle_blanket.push p
        p

      render_bar: (data_set, start_idx, color, n, high_pad, low_pad, fast) ->
        default_color = "red"
        name = n or "unknown"
        @resize data_set, data_set, high_pad or 20, low_pad or 0  unless fast
        dx = 10
        if @ymin < 0
          p = @r.path().moveTo(dx * start_idx, @ymax).lineTo(dx * (start_idx + @view.items_to_load), @ymax).attr(@offset_attr).attr(
            stroke: "black"
            opacity: 1
          )
          @candle_blanket.push p
        callback = []
        @_callbacks.push callback
        for i of data_set
          data = data_set[i]
          x = dx * (parseInt(i) + start_idx)
          c = if color instanceof Array then color[i] else color || default_color
          [bar, cb] = @render_bar_item(x, data, c, n, 1)
          @candle_blanket.push bar
          callback.push cb

      render_bar_item: (x, data, c, name, fast) ->
        width = 6
        @resize [ data ], null, 200, 0  unless fast
        bar = (if data >= 0 then @rect(x - width / 2, data, width + 1, data).attr(
          fill: c
          stroke: "none"
        ) else @rect(x - width / 2, 0, width + 1, 0 - data).attr(
          fill: c
          stroke: "none"
        ))
        [ bar, (if not name? then null else ->
          name + ": " + data
        ) ]

      render_candle_item: (x, data, fast) ->
        @resize [ data[HIGH] ], [ data[LOW] ], 5, 5  unless fast
        width = 6
        c = (if data[CLOSE] > data[OPEN] then "red" else "green")
        bs = Math.abs(data[CLOSE] - data[OPEN])
        bar = @r.path().beginMulti().moveTo(x, @ymax - data[HIGH]).relatively().lineTo(0, data[HIGH] - data[LOW]).absolutely().moveTo(x - width / 2, @ymax - Math.max(data[OPEN], data[CLOSE])).relatively().lineTo(width, 0)
        bar = bar.lineTo(0, bs).lineTo(-width, 0).lineTo(0, -bs)  if bs
        bar = bar.andClose().andUpdate().attr(
          "stroke-width": 1
          stroke: (if bs then c else "lightgreen")
          fill: c
        ).attr(@offset_attr)
        bar.node.setAttribute "class", (if data[CLOSE] > data[OPEN] then "candleup" else "candledown")
        if /13:45:00/.test(data[0])
          daybreak = @r.path().moveTo(x + 5, 0).relatively().lineTo(0, @height).attr(
            translation: [ @offset_attr.translation[0], 0 ]
            stroke: "gray"
            "stroke-width": 1
            opacity: 0.6
          )
          @blanket.push daybreak
        callback = ->
          [ data[0], "Open: " + data[OPEN], "High: " + data[HIGH], "Low: " + data[LOW], "Close: " + data[CLOSE] ].join "\n"

        [ bar, callback ]

      render_candle: (data_set, start_idx) ->
        @resize jQuery.map(data_set, (data) ->
          data[HIGH]
        ), jQuery.map(data_set, (data) ->
          data[LOW]
        ), 5, 5
        dx = 10
        callback = []
        @_callbacks.push callback
        @data_set = data_set
        for i of data_set
          data = data_set[i]
          data[6] = new timezoneJS.Date(data[0])
          data[6].setTimezone @view.tz
          x = dx * (parseInt(i) + start_idx)
          [bar, cb] = @render_candle_item(x, data, 1)
          @candle_blanket.push bar
          callback.push cb
        @view.on_view_change()
        $(@view).trigger "candle-ready"

      val_to_y: (val) ->
        return 0  unless @offset_attr
        y = (@ymax - val) * @offset_attr.scale[1]
        (if @new_resize and @nr_yscale then (y + @nr_offset) * @nr_yscale else y)

      render_ylabels: ->
        unless @ylabels
          step = (if @ymax - @ymin > 500 then 200 else 50)
          start = Math.round(@ymin / step)
          end = Math.round(@ymax / step) + 2
          i = start

          while i < end
            $("<span/>").addClass("ylabel").addClass("yaxis").text(i * step).css(
              position: "absolute"
              left: 5 + @x + @view.width
            ).appendTo @view.holder
            ++i
        that = this
        $("span.ylabel").each ->
          return  if $(this).hasClass("cursor")
          val = parseFloat($(this).text()) or parseFloat($(".price", this).text())
          unless val?

          else
            y = that.val_to_y(val)
            if y < 0 or y > that.height
              $(this).hide()
            else
              $(this).css("top", y).show()

        @ylabels = $("span.ylabel")
