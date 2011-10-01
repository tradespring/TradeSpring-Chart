package TradeSpring::Chart::Session;
use Moose;
use methods;


has chart => (is => "rw");
has bus => (is => "rw");

has code => (is => "rw", isa => "Str");
has is_live => (is => "rw", isa => "Bool");
has length => (is => "rw", isa => "Int");
has tf => (is => "rw", isa => "ArrayRef");
has config => (is => "rw", isa => "HashRef");

has session => (is => "rw", isa => "HashRef");

__PACKAGE__->meta->make_immutable;
no Moose;
1;
