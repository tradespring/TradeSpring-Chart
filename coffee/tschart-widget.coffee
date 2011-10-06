exports ?= this
TradeSpring = exports.TradeSpring ?= {}

class TradeSpring.Widget
  constructor: (@zone) ->
  init: (d) ->
    @render_item v, d.start + parseInt(i) for i, v of d.values

  val: (d) ->
    @render_item d.value, d.i

class TradeSpring.Widget.Curve extends TradeSpring.Widget
  constructor: (@zone, @color = 'orange', @name, @fast) ->
  render_item: (val, i) ->
    unless val?
      @curve = null
    else if @curve
      off_ = @zone.offset_attr
      @curve.lineTo i * 10 + off_.translation[0], (@zone.ymax - val + off_.translation[1]) * off_.scale[1]
    else
      @curve = @zone.render_curve([ val ], i, @color, @name, @fast)
  init: (d) ->
    @curve = @zone.render_curve(d.values, d.start, @color, @name, @fast)
    @curve.node.setAttribute "class", "curve"

class TradeSpring.Widget.Bar extends TradeSpring.Widget
  constructor: (@zone, @color = 'red', @name, @fast) ->
  render_item: (val, i) ->
    i = parseInt(i)
    unless val?
      @bar = null
    else if @bar
      idx = 0
      [bar, cb] = @zone.render_bar_item(10 * i, val, @color, @name, 1)
      @zone.candle_blanket.push bar
      @zone._callbacks[idx][i - @zone.view.loaded_offset] = cb
    else
      @bar = 1
      @zone.render_bar [ val ], i, null, @name, 0, 0, @fast
  init: (d) ->
    @bar = 1
    @zone.render_bar d.values, d.start, @color, @name, 0, 0, @fast

class TradeSpring.Widget.CandleBody extends TradeSpring.Widget
  constructor: (@zone, @color = 'red') ->
  render_item: (val, i) ->
    data = @zone.data_set[i - @zone.view.loaded_offset]
    val = parseInt(val)
    c = @get_color(val)
    width = 3
    x = i * 10
    bs = Math.abs(data[CLOSE] - data[OPEN])
    bar = @zone.r.path().beginMulti().moveTo(x, @zone.ymax - Math.max(data[OPEN], data[CLOSE])).relatively().lineTo(0, (if bs then bs else 0.5)).andUpdate().attr(
      "stroke-width": width
      stroke: c
    ).attr(@zone.offset_attr)
    @zone.blanket.push bar
  get_color: (val) ->
    (if val > 0 then "red" else (if val < 0 then "green" else "yellow"))



class TradeSpring.Widget.CandleBackgroundBase extends TradeSpring.Widget
  constructor: (@zone) ->
    @data = {}
  render_item: (val, i) ->
    @data[i - @zone.view.loaded_offset] = val
  get: (i) ->
    @data[i - @zone.view.loaded_offset]

wrapper = (klass, args) ->
  c = new klass
  klass.apply(c, args)
  init: (d) ->
    c.init(d)
  val: (d) ->
    c.val(d)
  self: c

window.mk_curve = (args...) -> wrapper(TradeSpring.Widget.Curve, args)
window.mk_bar   = (args...) -> wrapper(TradeSpring.Widget.Bar, args)
window.mk_candle_body = (args...) -> wrapper(TradeSpring.Widget.CandleBody, args)
window.mk_candle_background_base = (args...) -> wrapper(TradeSpring.Widget.CandleBackgroundBase, args)

window.mk_debug = (zone) ->
  init: (d) ->
    console.log "init", d.values

  val: (d) ->
    console.log "val", d.values

window.mk_rect = (zone, color, name, attr) ->
  last_start = undefined
  rx = undefined
  lx = undefined
  us = zone.r.set()
  ob = zone.blanket
  ob.push us
  render_item = (rect, i) ->
    if rx and last_start == i - rect[2]
      us.pop()
      rx.remove()
      lx.remove()
    rx = zone.rect(10 * (i - rect[2]) - 5, rect[0], rect[2] * 10 + 10, rect[0] - rect[1]).attr(
      "stroke-width": 2
      stroke: color
    )
    lx = zone.r.path().moveTo(10 * (i - rect[2]) - 10, zone.ymax - (parseInt(rect[0]) + parseInt(rect[1])) / 2).relatively().lineTo(rect[2] * 10 + 20, 0).attr(
      "stroke-width": 1
      stroke: "gray"
    ).attr(zone.offset_attr)
    if attr
      rx.attr attr
      lx.attr attr
    us.push rx
    us.push lx
    last_start = i - rect[2]
  init: (d) ->
    jQuery(d.values).each (idx) ->
      render_item this, d.start + idx  if this? and this[0]?

  val: (d) ->
    render_item d.value, d.i  if d.value? and d.value[0]?

window.mk_ellipse = (zone, color, name) ->
  last_start = undefined
  rx = undefined
  lx = undefined
  us = zone.r.set()
  zone.blanket.push us
  render_item = (spec, i) ->
    if rx and last_start == i - spec[2]
      us.pop()
      rx.remove()
      lx.remove()
    h = parseFloat(spec[0])
    l = parseFloat(spec[1])
    rx = zone.ellipse(10 * (i - spec[2] / 2), (h + l) / 2, (spec[2] / 2) * 10, (h - l) / 2).attr(
      "stroke-width": 2
      stroke: color
    )
    lx = zone.rect(10 * (i - spec[2]) - 10, (parseInt(spec[0]) + parseInt(spec[1])) / 2, spec[2] * 10 + 20, 0.5).attr(
      "stroke-width": 1
      stroke: "gray"
      fill: "gray"
    )
    us.push rx
    us.push lx
    last_start = i - spec[2]
  init: (d) ->
    jQuery(d.values).each (idx) ->
      render_item this, d.start + idx  if this? and this[0]?

  val: (d) ->
    render_item d.value, d.i  if d.value? and d.value[0]?

window.mk_band = (zone, color, name, boundry_only, slow, annotate, annotate_cb) ->
  last_up = undefined
  last_down = undefined
  _area = undefined
  _curve_up = undefined
  _curve_down = undefined
  label = undefined
  render_item = (up, down, i) ->
    last_up = null  unless up?
    last_down = null  unless down?
    return  if not up? or not down?
    if up == down
      up += 0.5
      down -= 0.5
    ymax = zone.ymax
    xstart = i - if last_up and last_down then 1 else 0.5
    a = zone.path([ [ "M", xstart * 10, ymax - last_up ], [ "L", (i) * 10, ymax - up ], [ "L", (i) * 10, ymax - down ], [ "L", xstart * 10, ymax - last_down ], [ "z" ] ]).attr(
      "stroke-width": "0.0"
      fill: color
      stroke: "none"
      "fill-opacity": 0.5
    ).toBack()
    zone.blanket.push a
    if annotate
      text = Math.round(down) + " - " + Math.round(up)
      if label and last_up
        label.attr "text", text
      else
        label = zone.text(i * 10, up - 5, text).attr(
          "font-size": 16
          "text-anchor": "left"
        ).toBack()
        label.translate -$(label.node).width() / 2
        zone.blanket.push label
        annotate_cb()  if annotate_cb
    last_up = up
    last_down = down
  init: (d) ->
    if slow
      jQuery(d.values).each (idx) ->
        render_item this[0], this[1], d.start + idx

      return
    _curve_up = zone.render_curve($.map(d.values, (val) ->
      (if not val? or not val[0]? then false else (if val[0] == val[1] then val[0] + 0.5 else val[0]))
    ), d.start, "black", null, true).attr(
      "stroke-width": "0.0"
      stroke: "none"
    )
    _curve_down = zone.render_curve($.map(d.values, (val) ->
      (if not val? or not val[1]? then false else (if val[0] == val[1] then val[1] - 0.5 else val[1]))
    ), d.start, "black", null, true).attr(
      "stroke-width": "0.0"
      stroke: "none"
    )
    area = $.extend(true, [], _curve_up.attr("path")).concat($.extend(true, [], _curve_down.attr("path")).reverse())
    area.push [ "z" ]
    _area = zone.r.path(area).attr(
      scale: _curve_up.attrs.scale
      translation: _curve_up.attrs.translation
    ).attr(
      path: area
      "stroke-width": "none"
      fill: color
      stroke: "none"
      "fill-opacity": 0.5
    ).toBack()
    zone.blanket.push _area
    last_up = d.values[d.values.length - 1][0]
    last_down = d.values[d.values.length - 1][1]

  val: (d) ->
    if d.value?
      render_item d.value[0], d.value[1], d.i
    else
      last_up = null
      last_down = null

window.mk_colorheat = (zone, mul) ->
  get_color = (val) ->
    if val > 1
      "red"
    else if val > 0
      "yellow"
    else if val == 0
      "white"
    else if val >= -1
      "gray"
    else
      "black"

  init: (d) ->
    cols = jQuery(d.values).map(->
      get_color this
    ).get()
    vals = jQuery(d.values).map(->
      mul
    ).get()
    zone.render_bar vals, d.start, cols, null, 1, 1

  val: (d) ->
    item = zone.render_bar_item(10 * d.i, mul, get_color(d.value), null, 1)
    zone.blanket.push item[0]

window.mk_ann_arrow = (zone, mul) ->
  get_color = (val) ->
    if val > 1
      "red"
    else if val > 0
      "yellow"
    else if val == 0
      "white"
    else if val >= -1
      "gray"
    else
      "black"

  init: (d) ->
    cols = jQuery(d.values).map(->
      get_color this
    ).get()
    vals = jQuery(d.values).map(->
      mul
    ).get()
    zone.render_bar vals, d.start, cols, null, 1, 1

  val: (d) ->
    item = zone.render_bar_item(10 * d.i, mul, get_color(d.value), null, 1)
    zone.blanket.push item[0]

window.mk_sr = (zone, color) ->
  pset = zone.r.set()
  eset = zone.r.set()
  zone.blanket.push pset
  zone.blanket.push eset
  last_dir = undefined
  last_price = undefined
  last_entry = undefined
  my_length = undefined
  px = undefined
  ex = undefined
  get_color = (val) ->
    color[Math.abs(val) - 1]
  render_item = (val, i) ->
    dir = val[0]
    price = val[1]
    length = val[2]
    entry_price = val[3]
    unless dir
      last_dir = 0
      last_price = null
      last_entry = null
      my_length = 0
      return
    c = get_color(dir)
    x = i * 10
    if last_price and last_price != price
      my_length = 1
    else
      my_length++
    if px and my_length > 2
      pset.pop()
      px.remove()
    if ex and my_length > 1
      eset.pop()
      ex.remove()
    if !last_price
      my_length = length
    step = zone.r.path().beginMulti().moveTo(x + 5, zone.ymax - price).relatively().lineTo(-5 + (my_length - 1) * -10, 0)
    if entry_price
      entry = zone.r.path().beginMulti().moveTo(x + 5, zone.ymax - entry_price).relatively().lineTo((my_length) * -10, 0).andUpdate().attr(
        "stroke-opacity": 0.5
        "stroke-width": 1
        stroke: c
        "stroke-dasharray": "--"
      ).attr(zone.offset_attr)
      entry.node.setAttribute "class", "curve"
      ex = entry
      eset.push ex
      last_entry = entry_price
    else
      ex = null
    if my_length == 1
      if dir * last_dir > 0
        lp = last_price
        ll = 0
        step.absolutely().lineTo(x, zone.ymax - lp).relatively().lineTo(-5, 0).lineTo -10 * ll, 0
    else

    step.andUpdate().attr(
      "stroke-opacity": 0.5
      "stroke-width": 2
      stroke: c
    ).attr zone.offset_attr
    step.node.setAttribute "class", "curve"
    px = step
    pset.push px
    last_price = price
    last_dir = dir

  init: (d) ->
    $(d.values).each (idx) ->
      render_item this, d.start + idx  if this?

  val: (d) ->
    render_item d.value, d.i

window.mk_candle_background = (zone, color, base) ->
  render_item = (val, i) ->
    val = parseFloat(val)
    c = get_color(val)
    x = i * 10
    height = base.self.get(i) - val
    bar = zone.r.path().beginMulti().moveTo(x, zone.ymax - val).relatively().lineTo(0, -height).andUpdate().attr(
      opacity: 0.6
      "stroke-width": 10
      stroke: (if height > 0 then "green" else "red")
    ).attr(zone.offset_attr).toBack()
    zone.blanket.push bar
  get_color = (val) ->
    (if val > 0 then "red" else (if val < 0 then "green" else "yellow"))

  init: (d) ->
    $(d.values).each (idx) ->
      render_item this, d.start + idx  if this?

  val: (d) ->
    render_item d.value, d.i
