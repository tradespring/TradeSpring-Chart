package TradeSpring::Chart::View;
use strict;
use methods;

use Finance::GeniusTrader::Prices;
use Finance::GeniusTrader::Eval;

method init_message {
    my $cnt = $self->{calc}->prices->count;
    return { type      => 'tsstream.init',
             start_price => $self->{start_price},
             session   => $self->{name},
             timeframe => $self->{timeframe},
             start_date => $self->{calc}->prices->at(0)->[$DATE],
             day_high   => $self->{dhl}[0],
             day_low    => $self->{dhl}[1],
             count     => $cnt
           };
}

method subscribe_indicator($sub, $name) {
    my $i = $self->{indicators}{indicators}{$name};
    unless ($i) {
        warn "==> indicator $name not found";
        return;
    }
    $sub->subscribe($i->{mq});
    return 1;
}

method send_history($start, $end) {
    $start = 0 if $start < 0;
    return { type   => 'tsstream.prices',
             start  => int($start),
             prices => [ map { [ $_->[$DATE], map { 0+$_ } @$_[$OPEN, $HIGH, $LOW, $CLOSE, $VOLUME] ] }
                              map { $self->{calc}->prices->at($_) } ($start..$end) ],
         };
}

method send_history_indicator($name, $start, $end) {
    my $values = $self->{indicators}->get_values($name, $start, $end);
    # XXX: handle error
    return { type   => 'tsstream.ivals',
             name   => $name,
             start  => int($start),
             values => $values,
         }
}

method resolve_date($date) {
    my $calc = $self->{calc};
    return $calc->prices->date($calc->prices->find_nearest_following_date($date));
}

method DESTROY {
    warn "destory view $self->{name}";
}

1;
