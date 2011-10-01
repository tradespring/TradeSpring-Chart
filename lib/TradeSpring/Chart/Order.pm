package TradeSpring::Chart::Order;
use strict;

sub order_cb {
    my ($class, $idref, $broker, $result, $sub) = @_;

    return (
        on_summary => sub {
            my ($matched, $cancelled) = @_;
            my $o = $broker->get_order($$idref);

            if ($matched) {
                $result->publish( {
                    type   => 'tsorder.status',
                    id     => $$idref,
                    status =>  'filled',
                    order  => $o->{order},
                } );
            }
            else {
                $result->publish( {
                    type   => 'tsorder.status',
                    id     => $$idref,
                    status =>  'cancelled',
                } );
            }
        },
        on_match => sub {
            my ($price, $qty) = @_;
            return unless $qty;
            my $o = $broker->get_order($$idref);
            if ($o->{matched} != $o->{order}{qty}) {
                $result->publish( {
                    type   => 'tsorder.status',
                    id     => $$idref,
                    status => 'new',
                    matched => $o->{matched},
                } );
            }
        },
        on_error => sub {
            my ($status, $error) = @_;
            $sub->append({
                type   => 'tsorder.error',
                id     => $$idref,
                status => $status,
                error  => $error,
            });
        },
    );
}

sub handle_order_messages {
    my ($class, $broker, $result, $sub, $type, $msg) = @_;
    if ( $type eq 'new' ) {
        my $id; $id = $broker->register_order(
            $msg->{order},
            $class->order_cb(\$id, $broker, $result, $sub),
            on_ready => sub {
                my ($id, $status) = @_;
#                warn "ready: $id / $status";
                my $o = $broker->get_order($id);
                unless ($o) {
                    warn "????? obscure $id ready ";
                    return;
                }

                $result->publish( {
                    type   => 'tsorder.status',
                    status => $status,
                    order  => $o->{order},
                    id     => $id,
                } );
                use Hash::Util::FieldHash qw(id);

                my $bracket = delete $msg->{bracket} || [];
#                warn Dumper($bracket);
                use Data::Dumper;
                for (@$bracket) {
                    my $o = { %$_,
                              attached_to => $id,
                              oca_group => $id.'.'.id($msg->{order}) };
#                    warn 'bracket: '.Dumper($o);use Data::Dumper;
                    my $bid; $bid = $broker->register_order
                        ( $o,
                          $class->order_cb(\$bid, $broker, $result, $sub),
                          on_ready => sub {
#                              warn "==> oca ready: $bid....  ".join(',',@_);
                              my ($id, $status) = @_;
                              my $o = $broker->get_order($id);
                              unless ($o) {
                                  warn "????? obscure $id ready ";
                                  return;
                              }
#                              warn Dumper($broker->get_order($id));use Data::Dumper;
                              $result->publish( {
                                  type   => 'tsorder.status',
                                  status => $status,
                                  order  => $o->{order},
                                  id     => $id,
                              } );
                          }
                      );
                }

            }
        );
    }
    if ( $type eq 'cancel' ) {
        my $id = $msg->{id};
        $broker->cancel_order( $id,
            sub {
                my $status = shift;
                $result->publish( {
                        type   => 'tsorder.status',
                        id     => $id,
                        status => $status,
                } );
            } );
    }
    if ( $type eq 'backfill' ) {
        $broker->get_orders(
            sub {
                my ($status, $id, $order) = @_;
                $sub->append( {
                        type   => 'tsorder.status',
                        id     => $id,
                        status => $status,
                        order  => $order,
                } );
            } );
    }
    if ( $type eq 'update' ) {
        my $id = $msg->{id};
        my $price = $msg->{price};
        $broker->update_order( $id, $price, undef,
            sub {
                my $status = shift;
                # XXX: awaits for on_ready update
                if ($status eq 'updated') {
#                    warn "==> update callback called for $id";
#                    $result->publish( {
#                        type   => 'tsorder.status',
#                        id     => $id,
#                        status => 'updated',
#                        price  => $price,
#                    } );
                }
                else {
                    warn "update order: $id/  $price: $status";
                }
            } );
    }

}

__PACKAGE__;
