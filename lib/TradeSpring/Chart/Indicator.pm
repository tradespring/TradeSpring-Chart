package TradeSpring::Chart::Indicator;
use Moose;
use Finance::GeniusTrader::Prices;
use Finance::GeniusTrader::Eval;
use Set::IntSpan;

has calc => (is => "ro");
has use_cache => (is => "ro", isa => 'Bool');
has bus => (is => "ro");
has mqprefix => (is => "ro", isa => 'Str');

has cv => (is => "ro");

has indicators => (is => "ro", isa => "HashRef", default => sub { {} });

has tsindicator_frame => (
    is => "rw",
    lazy_build => 1
);
has tsloader => (
    is => "ro",
    lazy_build => 1
);

has default_prefix => (is => "rw", isa => "Str", default => sub { "TradeSpring::I::" });

sub _build_tsloader {
    my $self = shift;
    my $config = TradeSpring::Chart->config;
    TradeSpring::IManager::Cache->new( frame => $self->tsindicator_frame,
                                       %{ $config->{cache_redis} || {}}
                                   );
}

sub _build_tsindicator_frame {
    my $self = shift;
    TradeSpring::Frame->new( calc => $self->calc );
}

use TradeSpring::IManager::Cache;
use TradeSpring::Frame;

sub BUILD {

}

sub init {
    my ($self, $spec) = @_;

    for my $name (keys %$spec) {
        $self->cv->begin;
        my $entry = $spec->{$name};

        unless (ref $entry) { # GT expression quickie
            $entry = { class => '+TradeSpring::I::GT',
                       args => { expression => $entry } };
        }

        $self->indicators->{$name} =
        { mq => $self->bus->topic({ name => $self->mqprefix."/".$name, recycle => 0}),
          $self->get_tsindicator($self->calc, $name, $entry, $self->cv,
                                 $self->use_cache),
        };
    }

    warn "===> populating 0 ".$self->calc->prices->count;

    $self->tsloader->prepare(0, $self->calc->prices->count-1, $self->use_cache);

    for (grep { $_->{ts} } values %{ $self->indicators} ) {
        $self->cv->end;
    }
}

sub populate_tsindicator2 {
    my ($self, $start, $end) = @_;
    for my $i ($start..$end) {
        $self->tsindicator_frame->i($i);
        for (@{ $self->tsloader->order }) {
            my $v = [ $_->do_calculate ];
        }
    }
}

sub indicator_pub {
    my $self = shift;
    my $calc = $self->calc;
    my $id = $self->indicators;
    sub {
        my $i = shift;

        $self->populate_tsindicator2($i, $i);

        for my $name (keys %$id) {
            my $val;
            if ($id->{$name}{ts}) {
                my $arg_spec = $id->{$name}{arg_spec} || [0];
                $val = [ @{$id->{$name}{tsind}->cache->{$i}}[@$arg_spec] ];
                $val = $val->[0] if scalar @$arg_spec == 1;
            }
            else {
                my $ix = $id->{$name}{tsind};
                $ix->i($i);
                $ix->run();
                $val = $ix->values->{$i};
            }
            $id->{$name}{mq}->publish({
                type => 'tsstream.ival',
                i => $i,
                name => $name,
                value => $val,
            });
        }
    }
}

sub get_values {
    my ($self, $name, $start, $end) = @_;
    my $ix = $self->indicators->{$name};
    my $object_name = $ix->{name} or return ;

    my $arg_spec = $ix->{arg_spec};
    $self->tsloader->get_values($ix->{tsind}, $start, $end, $self->use_cache);

    if (!$arg_spec) {
        return [ map { $ix->{tsind}->cache->{$_}->[0] } ($start..$end) ];
    }
    return [ map { my @val = @{$ix->{tsind}->cache->{$_}}[@$arg_spec]; $#val ? \@val : $val[0] } ($start..$end) ];
}

sub get_tsindicator {
    local $_;
    my ($self, $calc, $name, $spec, $cv, $use_cache) = @_;
    my ($class, $args);

    my $class_name = $spec->{class} =~ s/^\+// ? $spec->{class} : $self->default_prefix.$spec->{class};
    $class_name->require or die "failed to load $class_name: $@";
    $class = $class_name->meta;
    $args = $spec->{args} || {};

    if (!grep { $_ eq 'TradeSpring::I' } $class->linearized_isa  ) {
        die "$class_name is not subclass of TradeSpring::I";
    }
    my $object = $self->tsloader->load( $class->name, %{ $spec->{args} } );
    return (name  => $class->name,
            arg_spec => $spec->{arg_spec},
            use_cache => $use_cache,
            ts => 1,
            tsind => $object);
}

__PACKAGE__->meta->make_immutable;
no Moose;
1;
