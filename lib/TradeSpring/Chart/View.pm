package TradeSpring::Chart::View;
use strict;

use Finance::GeniusTrader::Prices;
use Finance::GeniusTrader::Eval;

sub init_message {
    my $self = shift;
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

sub subscribe_indicator {
    my ($self, $sub, $name) = @_;
    my $i = $self->{indicators}{indicators}{$name};
    unless ($i) {
        warn "==> indicator $name not found";
        return;
    }
    $sub->subscribe($i->{mq});
    return 1;
}

sub send_history {
    my ($self, $start, $end) = @_;
    $start = 0 if $start < 0;
    return { type   => 'tsstream.prices',
             start  => int($start),
             prices => [ map { [ $_->[$DATE], map { 0+$_ } @$_[$OPEN, $HIGH, $LOW, $CLOSE, $VOLUME] ] }
                              map { $self->{calc}->prices->at($_) } ($start..$end) ],
         };
}

sub send_history_indicator {
    my ($self, $name, $start, $end) = @_;

    my $values = $self->{indicators}->get_values($name, $start, $end);
    # XXX: handle error
    return { type   => 'tsstream.ivals',
             name   => $name,
             start  => int($start),
             values => $values,
         }
}

sub resolve_date {
    my ($self, $date) = @_;
    my $calc = $self->{calc};
    return $calc->prices->date($calc->prices->find_nearest_following_date($date));
}

sub DESTROY {
    my $self = shift;
    warn "destory view $self->{name}";
}

1;
