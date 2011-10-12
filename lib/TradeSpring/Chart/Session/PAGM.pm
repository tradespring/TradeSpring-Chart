package TradeSpring::Chart::Session::PAGM;
use Moose;
use methods;

extends 'TradeSpring::Chart::Session';
has pagmbus => (is => "rw");
has init_ready => (is => "rw");

use List::Util qw(max min);
use Finance::GeniusTrader::Prices;
use Finance::GeniusTrader::Calculator;
use Try::Tiny;
use DateTime;

method skey_prefix { 'live' };

method BUILD {
    my @tf = @{ $self->tf };

    my $code = $self->code;
    my $pagmbus = $self->pagmbus;
    my $bus = $self->bus;

    my $pagm = $pagmbus->topic({name => 'pagmctrl.'.$self->config->{pagm}});
    my $myself = $pagmbus->topic("pagmclient-$code-$$");
    my $client = $pagmbus->new_listener($myself);
    my $ready = AE::cv;
    $self->is_live(1);
    $self->init_ready(AE::cv);

    $client->on_error(sub {
                          Carp::cluck;
                          warn "==> FATAL $code: ".join(',',@_);
                      });

    my $tick_channel;
    my $ag_channel;
    my $live;
    my $handler = sub {
        my $msg = shift;
        no warnings 'uninitialized';
        if ($msg->{type} eq 'pagm.session') {
            for (@tf) {
                $ready->begin;
                $pagm->publish({type => 'pagm.history', code => $code,
                                timeframe => $_, count => 600,
                                reply => $myself->name});
            }
            my $session = $msg->{session};
            $session =~ s|/.*$||;
            my $starting = DateTime->from_epoch( epoch => $msg->{session_start} );
            my $skey = "live/$session/$code";
            $live = {
                ag => {},
                tz => $msg->{timezone},
                code => $code,
                authz => $self->chart->mk_authz_cb("chart-", $starting),
                starting => $starting->epoch,
                key => $skey,
                source => {},
                ready => $ready,
                tick  => $bus->topic({ name => "$skey/tick", recycle => 0}),
                dhl   => [undef, undef],
                is_live => 1,
            };
            $self->session($live);
            $self->init_ready->send(1);
#            $pagmbus->topic({ name => $msg->{tick_channel}, recycle => 0}),
#                tick  => $bus->topic({ name => $msg->{tick_channel}, recycle => 0}),

            $ag_channel = $msg->{ag_channel};
            $client->subscribe($myself->bus->topic($msg->{tick_channel}));
        }
        elsif ($msg->{type} eq 'history') {
            my $tf = $msg->{timeframe};
            my $prices = $msg->{prices};
#            $logger->info("loaded ".(scalar @{$prices})." items for $code/$tf from pagm: $prices->[0][5] - $prices->[-1][5]");
            warn "loaded ".(scalar @{$prices})." items for $code/$tf from pagm: $prices->[0][5] - $prices->[-1][5]";
            my $p = Finance::GeniusTrader::Prices->new;
            $p->{prices} = $prices;
            our $PERIOD_TICK = 1;
            $p->set_timeframe($tf =~ m/ticks/ ? $PERIOD_TICK : Finance::GeniusTrader::DateTime::name_to_timeframe($tf) );
            my $calc = Finance::GeniusTrader::Calculator->new($p);

            $client->subscribe($myself->bus->topic($ag_channel));

            my $id = $self->chart->get_indicators($bus, $calc, $tf, $live, $live->{key}, $ready);
            my $indicator_pub = $id->indicator_pub;
            my $ptopic = $pagmbus->topic({ name => $ag_channel.$tf, recycle => 0});
            my $topic = $bus->topic({ name => "$live->{key}/$tf", recycle => 0});
            my $bar_client = $pagmbus->new_listener($ptopic);
            my $current_prices = [];
            $bar_client->poll(sub {
                              my $msg = shift;
                              my $prices = $msg->{data};
                              $calc->prices->add_prices($prices);
                              $indicator_pub->($calc->prices->count-1);
                              @$current_prices = ();
                              $topic->publish({
                                  type => "bar",
                                  prices => [$prices->[$DATE], @{$prices}[0..4]],
                                  i => $calc->prices->count-1,
                              });
                          });

            # warn "==> loaded $code / $tf: ".$calc->prices->count;
            my $start_price = $p->count ? $p->at($p->count-1)->[$CLOSE] : '-';
            $live->{ag}{$tf} = { calc => $calc,
                                 current_prices => $current_prices,
                                 calc_offset => 0,
                                 # XXX: look for real start_price (last close)
                                 start_price => $start_price,
                                 indicators => $id,
                                 topic => $topic,
                             };
            $ready->end;
        }
        elsif ($msg->{price}) { # tick
            my $price = $msg->{price};
            for my $tf (keys %{$live->{ag}}) {
                try {
                    my $cp = $live->{ag}{$tf}{current_prices};
                    if (@$cp) {
                        $cp->[1] = max($cp->[1], $price);
                        $cp->[2] = min($cp->[2], $price);
                        $cp->[3] = $price;
                    }
                    else {
                        @$cp = ($price, $price, $price, $price, $msg->{cumvol});
                    }
                    my $ag_topic = $live->{ag}{$tf}{topic};
                    my $p = $live->{ag}{$tf}{calc}->prices;
                    $ag_topic->publish({
                        type => "tick",
                        price => $price,
                        prices => ['', @{$cp}[0..3], $msg->{cumvol} - $cp->[4]],
                        datetime => $msg->{date}.' '.$msg->{time},
                        i => $p->count,
                    });
                    $live->{tick}->publish($msg);
                } catch {
                    die "error publishing tick for $tf: $_";
                }
            }

            if (!$live->{dhl}[0] || $price > $live->{dhl}[0]) {
                $live->{dhl}[0] = $price;
            }
            if (!$live->{dhl}[1] || $price < $live->{dhl}[1]) {
                $live->{dhl}[1] = $price;
            }

        }
        else {
#            $logger->error("unhandled message: ".Dumper($msg)); use Data::Dumper;
        }
        return 1;

    };
    $client->poll($handler);
    $pagm->publish({ type => 'pagm.session', code => $code, reply => $myself->name });
}

method as_session {
    $self->session;
}

__PACKAGE__->meta->make_immutable;
no Moose;
1;
