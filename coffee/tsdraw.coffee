exports ?= this
TSDraw = exports.TSDraw ?= {}


class TSDraw.Widget
    has:
      zone:
        is: "ro"
      offset:
        is: "rw"
    constructor: (opt) ->
      @zone = opt.zone
      @offset = opt.offset || 0
    start_update: ->

class TSDraw.Text extends TSDraw.Widget
      draw: (spec) ->
        @zone.text(10 * (spec.x + @offset), spec.y, spec.text).attr
          fill: spec.c
          "font-family": spec["font-family"]
          "font-size": spec["font-size"]

      start: (cb) ->
        that = this
        view = @zone.view
        $(view).bind "end_draw", (ev, data) ->
          $(view).unbind ev
          start_x = view.loaded_offset + data.i
          start_y = data.value
          jPrompt "Text: ", "Type something", "Input text", (text) ->
            cb null,
              "font-family": "Helvetica, Arial, \"Microsoft JhengHei\""
              "font-size": 18
              shape: "text"
              text: text
              x: start_x - that.offset
              y: start_y
              c: "red"

class TSDraw.Arrow extends TSDraw.Widget
      draw: (spec) ->
        dir = spec.direction
        zone = @zone
        width = 8
        _height = 8
        x = 10 * (parseFloat(spec.x) + @offset)
        mk_path = ->
          height = Math.round(_height / zone.nr_yscale * 100) / 100
          "M" + x + " " + parseFloat(zone.ymax - spec.y) + "l" + (width / 2) + " " + (dir * height) + "l-" + (width) + " 0l" + (width / 2) + " " + (-dir * height) + "z"
        arrow = @zone.path(mk_path()).attr(
          fill: spec.c
          stroke: spec.c
        )
        $(zone).bind "scale-changed", ->
          arrow.attr("path", mk_path()).attr zone.offset_attr
          arrow.toFront()

        arrow.node.setAttribute "class", "arrow-" + (if dir > 0 then "long" else "short")
        arrow

      start: (cb) ->
        view = @zone.view
        that = this
        $(view).one "end_draw", (ev, data) ->
          x = view.loaded_offset + data.i
          y = data.value
          jPrompt "Text: ", "1 = buy, -1 = sell", "buy or sell?", (text) ->
            cb null,
              dir: parseInt(text)
              x: x - that.offset
              y: y
              c: "red"

class TSDraw.Line extends TSDraw.Widget
      draw: (spec) ->
        ymax = @zone.ymax
        @zone.path("M" + ((parseFloat(spec.start_x) + @offset) * 10) + " " + parseFloat(ymax - spec.start_y) + "L" + ((parseFloat(spec.end_x) + @offset) * 10) + " " + parseFloat(ymax - spec.end_y)).attr stroke: spec.c

      start: (cb) ->
        start_x = undefined
        start_y = undefined
        drawing_ev = undefined
        path = undefined
        that = this
        $(view).bind("start_draw", (ev, data) ->
          $(view).unbind ev
          start_x = view.loaded_offset + data.i
          start_y = data.value
          data.stopPropagation()
        ).bind("drawing", (ev, data) ->
          return  unless start_x
          drawing_ev = ev
          x = view.loaded_offset + data.i
          y = data.value
          ymax = view.zones[0].ymax
          path.remove()  if path
          path = view.zones[0].path("M" + parseFloat((start_x) * 10) + " " + parseFloat(ymax - start_y) + "L" + parseFloat(x * 10) + " " + parseFloat(ymax - y)).attr(
            stroke: "red"
            "stroke-dasharray": "-"
          )
        ).bind "end_draw", (ev, data) ->
          $(view).unbind ev
          $(view).unbind drawing_ev
          x = view.loaded_offset + data.i
          y = data.value
          cb path,
            shape: "line"
            start_x: start_x - that.offset
            start_y: start_y
            end_x: x - that.offset
            end_y: y
            c: "red"

class TSDraw.Ellipse extends TSDraw.Widget
      draw: (spec) ->
        @zone.ellipse(10 * (@offset + spec.x), spec.y, spec.rx, spec.ry).attr stroke: spec.c

      start_update: (c, spec, cb) ->
        start_x = undefined
        start_y = undefined
        drawing_ev = undefined
        circle = undefined
        that = this
        view = @zone.view
        zone = @zone
        $(c.node).mousedown (ev, data) ->
          $(view).unbind ev
          $(view).bind("drawing", (ev, data) ->
            x = view.loaded_offset + data.i
            y = data.value
            unless start_x
              drawing_ev = ev
              start_x = x
              start_y = y
              circle = zone.ellipse(start_x * 10, start_y, c.attr("rx"), c.attr("ry") / zone.offset_attr.scale[1]).attr(
                stroke: c.attr("stroke")
                "stroke-dasharray": "-"
              )
            else
              circle.translate (x - start_x) * 10, (start_y - y) * zone.offset_attr.scale[1]
              start_x = x
              start_y = y
          ).bind "end_draw", (ev, data) ->
            $(view).unbind ev
            $(view).unbind drawing_ev
            cb circle,
              shape: "ellipse"
              x: start_x - that.offset
              y: start_y
              c: c.attr("stroke")
              rx: c.attr("rx")
              ry: c.attr("ry") / zone.offset_attr.scale[1]

      start: (cb) ->
        zone = @zone
        view = zone.view
        that = this
        start_x = undefined
        start_y = undefined
        drawing_ev = undefined
        circle = undefined
        current_rx = undefined
        current_ry = undefined
        $(view).bind("start_draw", (ev, data) ->
          $(view).unbind ev
          start_x = view.loaded_offset + data.i
          start_y = data.value
          data.stopPropagation()
        ).bind("drawing", (ev, data) ->
          return  if not start_x or not start_y
          drawing_ev = ev
          x = view.loaded_offset + data.i
          y = data.value
          current_rx = Math.max(10, Math.abs(x - start_x) * 10)
          current_ry = Math.max(10, Math.abs(y - start_y))
          if circle
            circle.attr
              rx: current_rx
              ry: current_ry * zone.offset_attr.scale[1]
          else
            circle = zone.ellipse((that.offset + start_x) * 10, start_y, current_rx, current_ry).attr(
              stroke: "red"
              "stroke-dasharray": "-"
            )
        ).bind "end_draw", (ev, data) ->
          $(view).unbind ev
          $(view).unbind drawing_ev
          cb circle,
            shape: "ellipse"
            x: start_x - that.offset
            y: start_y
            c: "red"
            rx: current_rx
            ry: current_ry
