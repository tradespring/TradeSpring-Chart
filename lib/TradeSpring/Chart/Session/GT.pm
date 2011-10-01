package TradeSpring::Chart::Session::GT;
use Moose;
use methods;

extends 'TradeSpring::Chart::Session';

use MooseX::ClassAttribute;
use Finance::GeniusTrader::Eval;
use Finance::GeniusTrader::Calculator;
use Finance::GeniusTrader::Conf;
use Finance::GeniusTrader::Tools qw(:conf :timeframe);

method skey_prefix { 'history' };

class_has db => (is => "rw", isa => "Finance::GeniusTrader::DB",
                 default => sub { Finance::GeniusTrader::Conf::load();
                                  create_db_object() });
method BUILD {
    my @tf = @{ $self->tf };

    my $ready = AE::cv;
    my $history = {
        ag => {},
        key => "history/".$self->code,
        ready => $ready,
        code => $self->code,
    };

    $ready->begin;

    my $skey = $self->skey_prefix.'/'.$self->code;
    my $bus = AnyMQ->new; # XXX: dummy
    my $length = $self->length;
    for my $tf (@tf) {
        my $calc = $self->calc($self->code, $tf) or die;
        my $first = 0;
        $calc = Storable::dclone($calc);
        if ($length) {
            ($calc, my $first) = $self->splice_calc($calc, $length);
        }
        my $topic = $bus->topic({ name => "$skey/$tf", recycle => 0});
        my $id = $self->chart->get_indicators($bus, $calc, $tf, $history, $skey, $ready, $self->config->{cache});
        $history->{ag}{$tf} = { calc => $calc,
                                calc_offset => $first,
                                indicators => $id,
                                topic => $topic };
    }

    $ready->end;
    $self->session($history);
}


my %calc;

method calc($code, $tf) {
    my $timeframe = Finance::GeniusTrader::DateTime::name_to_timeframe($tf);
    eval {
        $calc{$code}{$tf} ||= (find_calculator($self->db, $code, $timeframe, 1))[0];
    };
}

method reset_calc {
    %calc = ();
}

method splice_calc($calc, $allowed, $date) {
    $calc = Storable::dclone($calc);
    my $first = $date ? $calc->prices->date($calc->prices->find_nearest_following_date($date)) - $allowed
                      : $calc->prices->count - $allowed;
    @{$calc->prices->{'prices'}} = splice(@{$calc->prices->{'prices'}}, $first, $allowed);
    my $ind = $calc->indicators;
    for my $name (keys %{$ind->{values}}) {
        if (@{$ind->{values}{$name}} > $allowed) {
            @{$ind->{values}{$name}} = splice(@{$ind->{values}{$name}}, $first, $allowed);
        }
        else {
            delete $ind->{values}{$name};
        }
    }
    return ($calc, $first);
}

__PACKAGE__->meta->make_immutable;
no Moose;
1;
