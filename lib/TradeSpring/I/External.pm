package TradeSpring::I::External;
use 5.10.1;
use Moose;
extends 'TradeSpring::I';
use Method::Signatures::Simple;
use invoker;

has tf => (is => "ro", isa => "Str");
has session => (is => "ro", isa => "HashRef", weak_ref => 1);

has spec => (is => "ro", isa => "HashRef");

has name => (is => "ro", isa => "Str");

has ref_i => (is => "rw", handles => [qw(names)]);
has ixi => (is => "rw", isa => "Int", default => sub { 0 });

method BUILD {
    my $i = $self->session->{ag}{$self->tf}{indicators} or die $self->tf.' not init yet?';
    my $spec = $self->spec;
    $self->ref_i($i->tsloader->load( $spec->{class},
                                     %{ $spec->{args} || {} } ));
}

method do_calculate {
    my $ix = $self->ref_i;
    if ($self->i < $self->calc->prices->count-1) {
        while ($self->{ixi} < $ix->calc->prices->count - 2 &&
                   $ix->date($self->{ixi}+1) lt $self->date) {
            ++$self->{ixi};
        }
        return @{$ix->cache->{$self->{ixi}}};
    }
#    warn "==> ".$self->i.' ... '.$ix->i;
#    my $arg_spec = $id->{$name}{arg_spec} || [0];
    return @{$ix->cache->{$ix->i}};
}

__PACKAGE__->meta->make_immutable;

1;
