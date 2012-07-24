@TradeSpring ?= {}
exports = @TradeSpring

brokers = {}
curernt_torder = undefined

current_broker = undefined
view = undefined

class TradeSpring.OrderUI
      @init = (_view, _tradetable, _h) ->
        view = _view
        $("div#trade-header #broker-select").append($("<option/>").attr("value", "OTRTX").addClass("remote").text("O-DEMOTX")).change ->
          b = $("option:selected", this)
          $(this).trigger "blur"
          new_broker = b.val()
          return  if new_broker == current_broker
          b = brokers[current_broker]
          if b
            b.torder.unbind_events()
            delete b["torder"]
          b = brokers[new_broker]
          unless b
            alert "broker not fonud"
            return
          new_pipe = undefined
          unless b.pipe
            b.pipe = new Hippie.Pipe host: b.hphost, arg: new_broker
            b.pipe.init()
            new_pipe = 1
          b.torder = new TradeSpring.Order(b.pipe, _view, _tradetable)
          b.torder.reinit()  unless new_pipe
          unless b.quote
            $(_h).bind "message.tick", (e, d) ->
              unless b.torder
                $(this).unbind e
                return
              b.pipe.send
                type: "wsj.quote"
                price: d.prices[CLOSE]
          TradeSpring.OrderUI.bind_tick b, _h
          TradeSpring.OrderUI.torder = b.torder
          current_broker = new_broker

        current_broker = "OTRTX"
        brokers["OTRTX"] =
          pipe: _h
          quote: true
          description: "O-DEMOTX"
          disconnect: false
          torder: new TradeSpring.Order(_h, _view, _tradetable)

        TradeSpring.OrderUI.bind_tick brokers["OTRTX"], _h
        TradeSpring.OrderUI.torder = brokers["OTRTX"].torder
        TradeSpring.OrderUI.torder.reinit()

      @bind_tick = (b, hpipe) ->
        $("#trade-header span.value").text("0").removeClass("up").removeClass "down"
        $(b.torder).bind "position-changed", (e, d) ->
          $(document).trigger "position-changed", d
          b.torder.events["position-changed"] = e
          $("#current-position").attr "value", @current_position
          $("#trade-header span.current-position").text(@current_position).addClass((if @current_position > 0 then "up" else "down")).removeClass (if @current_position > 0 then "down" else "up")
          $("#trade-header span.avg-position").text Math.round(@avg_position * 10) / 10
          $("#trade-header span.realized").text(Math.round(@realized * 10) / 10 + "/" + @ntrades).addClass((if @realized > 0 then "up" else "down")).removeClass (if @realized > 0 then "down" else "up")
          that = this
          $(hpipe).bind "message.tick", (e, d) ->
            unless b.torder
              $(this).unbind e
              return
            p = (d.prices[CLOSE] - that.avg_position) * that.current_position
            $("#trade-header span.unrealized").text(Math.round(10 * p) / 10).addClass((if p > 0 then "up" else "down")).removeClass (if p > 0 then "down" else "up")

      @probe_wsj = (host, port, path) ->
        path = "wsj.json"  unless path
        $.ajax
          type: "GET"
          url: "http://" + host + ":" + port + "/" + path
          dataType: "json"
          cache: false
          async: true
          success: (data) ->
            return  unless data
            for b in data
              brokers[b.name] =
                description: b.description
                quote: b.quote
                hphost: "ws://" + host + ":" + port
                disconnect: true

              $("div#trade-header #broker-select").append $("<option/>").attr("value", b.name).addClass("local").text(b.description)

          error: (x, s, e) ->

class TradeSpring.Order
      constructor: (@pipe, @view, @tradetable) ->
          @open_positions = []
          @current_position = 0
          @avg_position = 0
          @ntrades = 0
          @realized = 0
          @idmap = {}
          @bind_events()
          @arrows = @view.r.set()
          view.candle_zone.blanket.push @arrows
      rebracket: (price, qty, others) ->
          dir = @current_position / Math.abs(@current_position)
          oca = "r" + (new Date()).getTime()
          if $("input[value=tp]", others).attr("checked")
            p = price + parseFloat($("input[name=tppoint]", others).val()) * dir
            @pipe.send
              type: "tsorder.new"
              order:
                dir: dir * -1
                type: "lmt"
                price: p
                qty: qty or Math.abs(@current_position)
                oca_group: oca
          if $("input[value=sl]", others).attr("checked")
            p = price - parseFloat($("input[name=slpoint]", others).val()) * dir
            @pipe.send
              type: "tsorder.new"
              order:
                dir: dir * -1
                type: "stp"
                price: p
                qty: qty or Math.abs(@current_position)
                oca_group: oca

      submit_order: (dir, type, price, qty, others) ->
          bracket = []
          if others
            bracket_base = (if price then price else parseFloat($("#header .current").text()))
            if $("input[value=tp]", others).attr("checked")
              bracket.push
                dir: dir * -1
                type: "lmt"
                price: bracket_base + parseFloat($("input[name=tppoint]", others).val()) * dir
                qty: qty or 1
            if $("input[value=sl]", others).attr("checked")
              bracket.push
                dir: dir * -1
                type: "stp"
                price: bracket_base - parseFloat($("input[name=slpoint]", others).val()) * dir
                qty: qty or 1
          @submit_order2 dir, type, price, qty, bracket

      submit_order2: (dir, type, price, qty, bracket) ->
          @pipe.send
            type: "tsorder.new"
            order:
              dir: dir
              type: type
              price: price
              qty: qty or 1

            bracket: bracket

      cancel_order: (order_id) ->
          @pipe.send
            type: "tsorder.cancel"
            id: order_id

      update_order: (order_id, price) ->
          $("#log").prepend "updating order " + order_id + " " + price + "<br>"
          @pipe.send
            type: "tsorder.update"
            id: order_id
            price: price

      fill_position: (order, fresh) ->
          orig_realized = @realized
          new_position = undefined
          qty = order.qty
          while qty
            if order.dir * @current_position < 0
              pos = @open_positions.shift()
              matched_qty = Math.min(qty, pos[0])
              pos[0] -= matched_qty
              qty -= matched_qty
              @current_position += matched_qty * order.dir
              @realized += (order.price - pos[1]) * pos[2] * matched_qty
              @ntrades += matched_qty
              @open_positions.unshift pos  if pos[0]
            else
              @open_positions.push [ qty, parseFloat(order.price), order.dir ]
              @current_position += qty * order.dir
              new_position = 1
              qty = 0
          @avg_position = 0
          if @current_position
            that = this
            for pos in @open_positions
              that.avg_position += pos[0] * pos[1] * pos[2]

            @avg_position /= @current_position
          $(this).trigger "position-changed",
            profit: @realized - orig_realized
            fresh: fresh
            new_position: new_position

      reinit: ->
          @tradetable.fnClearTable()
          $("span.order").remove()
          $("#log").html ""
          that = this
          @view.ready ->
            that.pipe.send type: "tsorder.backfill"

      unbind_events: ->
          $(@pipe).unbind e for e in @events

          @events = {}
          @arrows.remove()

      bind_events: ->
          hpipe = @pipe
          idmap = @idmap
          view = @view
          tradetable = @tradetable
          that = this
          @events = {}
          $(hpipe).bind("ready", (e) ->
            that.events["ready"] = e
          ).bind("message.tsstream.init", (e, d) ->
            that.events["message.tsstream.init"] = e
            that.reinit()
          ).bind("message.tsorder.error", (e, d) ->
            alert d.message
          ).bind "message.tsorder.status", (e, d) ->
            that.order_status e, d

      order_status: (e, d) ->
          that = this
          idmap = @idmap
          view = @view
          tradetable = @tradetable
          that.events["message.tsorder.status"] = e
          $("#log").prepend "order " + d.id + " " + d.status + ": " + d.price + "<br>"
          unless idmap[d.id]
            o = d.order
            label = undefined
            aid = o.attached_to
            if aid and idmap[aid]
              idmap[aid].attached = []  unless idmap[aid].attached
              idmap[aid].attached.push d.id
            label = @mk_label(o, d.id, d.status)  if d.status != "filled" and o.price
            idmap[d.id] =
              entry: tradetable.fnAddData([ o.dir, o.type, d.status, o.price, "-", d.id ])[0]
              order: o
              label: label
              line: (if label then label.line else null)
          else
            if idmap[d.id]
              handle = idmap[d.id]
              row = handle.entry
              tradetable.fnUpdate d.status, row, 2
              if handle.label
                if d.status == "new"
                  handle.label.removeClass("submitted").removeClass "pending"
                else
                  handle.label.addClass("submitted").removeClass "pending"
              o = d.order
              if o
                d.price = o.price  if o.price and o.price != idmap[d.id].order.price
                d.qty = o.qty  if o.qty and o.qty != idmap[d.id].order.qty
              if d.price
                tradetable.fnUpdate d.price, row, 3
                unless d.status == "filled"
                  idmap[d.id].order.price = d.price
                  idmap[d.id].label.css "top", view.candle_zone.val_to_y(d.price)
                  $(".price", idmap[d.id].label).text d.price
              if d.matched
                pending = idmap[d.id].order.qty - d.matched
                $(".pending-qty", idmap[d.id].label).text pending
              if d.qty
                idmap[d.id].order.qty = d.qty
                $(".qty", idmap[d.id].label).text d.qty
            else if d.order
              o = d.order
              tradetable.fnAddData [ o.dir, o.type, d.status, o.price, "-", d.id ]
          if d.status == "filled"
            unless idmap[d.id]
              order = d.order
              $("#log").prepend "filled order not found:" + d.id + " " + order.type + ": " + order.price + "<br>"
              return
            o = idmap[d.id].order
            o.price = d.price  if d.price
            that.fill_position o, d.price
            if d.price
              c = (if o.dir == 1 then "purple" else "blue")
              arrow = new TSDraw.Arrow(zone: view.zones[0]).draw(
                x: view.cnt - 1
                y: d.price
                direction: o.dir
                c: c
              )
              that.arrows.push arrow
            else
              c = (if o.dir == 1 then "purple" else "blue")
              x = view.get_i_from_date_in_view(new Date(1000 * o.fill_time)) or view.cnt - 1
              arrow = new TSDraw.Arrow(zone: view.zones[0]).draw(
                x: x
                y: o.price
                direction: o.dir
                c: c
              )
              that.arrows.push arrow
          else idmap[d.id].label.css "text-decoration", "line-through"  if d.status == "cancelled"
          if d.status == "filled" or d.status == "cancelled"
            label = idmap[d.id].label
            line = idmap[d.id].line
            line.remove()  if line
            if label
              $("span.cancel-order", label).remove()
              setTimeout (->
                label.remove()
              ), 5000
              label.addClass("filled").draggable "disable"
            idmap[d.id].status = d.status
          view.on_view_change()

      mk_label: (o, id, status) ->
          that = this
          view = @view
          idmap = @idmap
          c = (if o.dir == 1 then "purple" else "blue")
          pending_qty = o.qty - parseInt(o.matched or 0)
          label = $("<span/>").addClass("ylabel order display").css(
            position: "absolute"
            right: -120
            top: view.candle_zone.val_to_y(o.price)
            background: c
          ).html((if o.dir > 0 then "B" else "S") + "<span class=\"pending-qty\">" + pending_qty + "</span>/<span class=\"qty\">" + parseInt(o.qty) + "</span>@<span class=\"price\">" + parseInt(o.price) + "</span> " + o.type).appendTo(view.holder)
          label.css("margin-top", -label.height() / 2)
          label.addClass "submitted"  unless status == "new"
          cancel = $("<span/>").addClass("cancel-order").text("C").attr("title", "Cancel").click(->
            TradeSpring.OrderUI.torder.cancel_order id
          ).appendTo(label)
          line = $("<div>").addClass("order-line").css(
            "border-top-color": c
          ).appendTo(label)
          update_price = undefined
          start_price = undefined
          label.draggable
            axis: "y"
            helper: "original"
            cursor: "move"
            drag: (event, ui) ->
              zone = view.candle_zone
              offset = $("div.order-line", this).offset().top - view.holder.offset().top
              orig_offset_y = offset / zone.nr_yscale - zone.nr_offset
              update_price = zone.offset_to_val(orig_offset_y)
              $(".price", label).text update_price
              view.on_view_change()
              _o = idmap[id]
              if _o.attached
                _o.attached = (_id for _id in _o.attached when idmap[_id].status != "cancelled" and idmap[_id].status != "filled")
                for _id in _o.attached
                  entry = idmap[_id]
                  new_p = entry.order.price + update_price - start_price
                  $(".price", entry.label).text new_p
                  entry.label.css "top", view.candle_zone.val_to_y(new_p)

            start: (ev) ->
              view.view_lock_decrease = 1
              start_price = o.price
              label.addClass "pending"
              cancel.hide()

            stop: (ev) ->
              view.view_lock_decrease = 0
              that.update_order id, update_price
              _o = idmap[id]
              if _o.attached
                for _id in _o.attached
                  entry = idmap[_id]
                  new_p = entry.order.price + update_price - start_price
                  that.update_order _id, new_p
              cancel.show()
              true

          label.line = line
          label

