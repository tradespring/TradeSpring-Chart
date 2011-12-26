package TradeSpring::Chart::Session::Sim;
use Moose;
use methods;
use 5.10.1;
use Finance::GeniusTrader::Prices;
use Finance::TW::TAIFEX;
use DateTime::Format::Strptime;

extends 'TradeSpring::Chart::Session';

has history => (is => "ro");
has date => (is => "rw", isa => "Str");
has uniq => (
    is => "ro",
    isa => "Str",
    lazy_build => 1
);

method _build_uniq { rand() }

has start_delay => (is => "rw");
has skip => (is => "rw");
has speedup => (is => "rw");
has starting => (is => "rw");

method skey_prefix { 'history' };

method BUILD {
    my $history = $self->history;
    my @tf = @{ $self->tf };
    @tf = @{ $history->tf } unless @tf;

    my $date = $self->date;
    my $code = $self->code;
    my $skey = "sim/$date!".$self->uniq."/".$code;
    my $start_delay = $self->start_delay;
    my $skip = $self->skip;

    $start_delay ||= 5 unless $self->starting;
    $skip = 15 unless defined $skip;
    my $config = $self->chart->config->{history}{$code} or die 'code not found';

    my ($y, $m, $d) = split('-', $date);

    my $db_path = $config->{sim}{fitf_path};
    $db_path =~ s/\%c/$code/g;

    $db_path = DateTime::Format::Strptime->new(
        pattern         => $db_path,
        time_zone       => 'floating',
        on_error        => 'croak',
    )->format_datetime( DateTime->new( year => $y, month => $m, day => $d,
                                       time_zone => 'floating' ) );

    my $taifex = Finance::TW::TAIFEX->new({ year => $y,
                                            month => $m,
                                            day => $d });
    $taifex->is_trading_day
        or die "==> $date is not trading day";

    use Finance::FITF;
    my $data = Finance::FITF->new_from_file($db_path);

    my $ready = AE::cv;
    my $sim = { ag => {},
                tz => $data->header->{time_zone},
                code => $self->code,
                source => {},
                key => $skey,
                starting => $self->starting || AnyEvent->now + $start_delay,
                speedup  => $self->speedup,
                tick  => $self->bus->topic({ name => "$skey/tick", recycle => 0}),
                dhl   => [undef, undef],
                ready => $ready,
                is_live => 1,
            };

    $ready->begin;
    for my $tf (@tf) {
        $sim->{ag}{$tf} = $self->init_simcalc_tf($sim, $data, $history->session->{ag}{$tf}{calc}, $tf, $skey, $ready);
    }

    $ready->end;
    $self->session($sim);
    $self->is_live(1);
}

my $smap = {
    '1min'    => [1,   0],
    '2min'    => [2,   0],
    '2min1'   => [2,   1],
    '5min'    => [5,   0],
    '10min'   => [10,  0],
    '10min5'  => [10,  5],
    '15min'   => [15,  0],
    '30min'   => [30,  0],
    '30min15' => [30, 15],
    'hour'    => [60,  0],
    'hour45'  => [60, 15],
    '2hour'   => [120, 0],
    'day'     => [0],
};

method init_simcalc_tf($sim, $data, $calc, $tf, $skey, $ready) {
    ($calc) = $self->history->splice_calc($calc, 60 * 10, $self->date);

    my $topic = $self->bus->topic({ name => "$skey/$tf", recycle => 0 });
    my $id = $self->chart->get_indicators($self->bus, $calc, $tf, $sim, $skey, $ready);

    my @bars;
    my $cb = sub {
        my $ts = shift;
        my $bar = shift;
        push @bars, [$ts, $bar];
    };
    my ($min, $offset) = @{$smap->{$tf}};

    if ($min) {
        my $session_start = DateTime->from_epoch( epoch => $data->header->{start}[0]);
        $offset += ($session_start->minute % $min) unless $tf eq 'day';
        $offset %= $min;
    }
    else {
        $min = ($data->header->{end}[0] - $data->header->{start}[0]) / 60
    }
    $data->run_bars_as( $min * 60, ($offset || 0) * 60 , $cb);

    my $next;
    my $start_at = $data->header->{start}[0];

    my $start;
    my $check; $check = AnyEvent->timer
        ( interval => 5, cb => sub {
              if ($ready->ready) {
                  undef $check;
                  my $w; $w = AnyEvent->timer(
                      'after' => $sim->{starting} - AnyEvent->now,
                      cb => sub { undef $w; $start->(); });
              }
          });


    $start = sub {
        state $cp;
        state $curr_bar;
        state @ticks;
        if (@ticks) {
            my $cnt = 0;
            my $end = $start_at + (AnyEvent->now - $sim->{starting}) * $sim->{speedup};
            my $last_price;
            while (@ticks && $ticks[0][0] <= $end) {
                my ($ts, $price, $vol) = @{ shift @ticks };
                $cp ||= [$price, $price, $price, $price, 0, $data->format_timestamp($curr_bar->[0])];
                $cp->[1] = $price if $price > $cp->[1];
                $cp->[2] = $price if $price < $cp->[2];
                $cp->[3] = $price;
                $cp->[4] += $vol;

                if ($last_price && $price == $last_price ) {
                    next;
                }

                $last_price = $price;
                my $dt = $data->format_timestamp($ts);
                $sim->{tick}->publish({ price => $price,
                                        volume => $vol,
                                        timestamp => $ts,
                                    })
                    if $sim;
                $topic->publish({
                    type => "tick",
                    price => $price,
                    prices => [$cp->[$DATE], @{$cp}[0..4]],
                    datetime => $dt,
                    i => $calc->prices->count,
                });
                if (!$sim->{dhl}[0] || $price > $sim->{dhl}[0]) {
                    $sim->{dhl}[0] = $price;
                }
                if (!$sim->{dhl}[1] || $price < $sim->{dhl}[1]) {
                    $sim->{dhl}[1] = $price;
                }
            }
        }
        else {
            if ($curr_bar) {
                my ($ts, $bar) = @$curr_bar;

                my $prices = [@{$bar}{qw(open high low close volume)},
                              $data->format_timestamp($ts)];

                my $i = $calc->prices->count;
                $calc->prices->add_prices([@$prices]);
                $topic->publish({
                    type => "bar",
                    prices => [$prices->[$DATE], @{$prices}[0..4]],
                    i => $calc->prices->count-1,
                });
                $id->indicator_pub->($i);
            }

            if ($curr_bar = shift @bars) {
                my ($ts, $bar) = @$curr_bar;
                $data->run_ticks($bar->{index}, $bar->{index} + $bar->{ticks} - 1,
                                 sub {
                                     push @ticks, [@_];
                                 });
                undef $cp;
            }
            else {
                undef $next; undef $start;
                $topic->publish({ type => "tsstream.sessionend" });
                return;
            }
        }
        $next = AnyEvent->timer( after => 0.2, cb => $start );
    };

    return { calc => $calc,
             indicators => $id,
             topic => $topic,
             start_price => $calc->prices->at($calc->prices->count-1)->[$CLOSE],
         };


}

__PACKAGE__->meta->make_immutable;
no Moose;
1;
