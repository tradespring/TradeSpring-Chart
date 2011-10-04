package TradeSpring::Chart;
our $VERSION = '0.30_1';
use 5.10.1;
use Moose;
use methods;
use Try::Tiny;
use AnyMQ;
use Text::Xslate;
use UNIVERSAL::require;
use Log::Log4perl;
use File::ShareDir;
use Encode qw(encode_utf8);
use TradeSpring::Chart::View;
use TradeSpring::Chart::Indicator;
use TradeSpring::Chart::Order;

use Plack::Builder;

has bus => (is => "rw");
has mtf => (is => "rw", handles => ['render']);
has sessions => (is => "rw", isa => "HashRef", default => sub { {} });

method init_logging($class: $logconf) {
    if (-e $logconf) {
        Log::Log4perl::init_and_watch($logconf, 60);
    }
    else {
        Log::Log4perl->easy_init();
    }
}

around 'render' => sub {
    my ($next, $self, @args) = @_;
    my $res = eval { $self->$next(@args) };
    warn $@ if $@;
    return $res;
};

method BUILD {
    $self->bus(AnyMQ->new);
    $self->mtf(Text::Xslate->new(
        suffix => '.tx',
        verbose => 2,
        path => [$self->template_dir],
        tag_start => '<%',
        tag_end   => '%>',
        line_start => '%',
    ));
}

method share_dir {
    Cwd::realpath(
        eval { File::ShareDir::module_dir('TradeSpring::Chart') } ||
            File::Spec->rel2abs("../../share", File::Basename::dirname($INC{"TradeSpring/Chart.pm"}))
    );
}

method template_dir {
    $self->share_dir .'/templates';
}

method static_files_app {
    map {
        $_->require;
        $_->new;
    } qw(TradeSpring::Chart::JSFiles Web::Hippie::App::JSFiles)

}

method js_files_path {
    require HTTP::Request;
    require HTTP::Message::PSGI;
    map {
        my $app = $_;
        $app->can('files')
            ? map { ($app->locate_file(
                HTTP::Request->new(GET => "/$_")->to_psgi ))[0];
                } $app->files
            : ();
    } $self->static_files_app;
}

method js_files {
    map { $_->files } qw(TradeSpring::Chart::JSFiles Web::Hippie::App::JSFiles)
}

method wrap_app($app) {
    require Plack::Middleware::Head;
    require Plack::Middleware::ConditionalGET;
    require Plack::Middleware::ContentLength;
    require Plack::Middleware::Deflater;
    require Plack::Middleware::Expires;

    if ($self->config->{jsmin} && try { require Plack::Middleware::JSConcat }) {

        $app = Plack::Middleware::JSConcat->wrap
            ($app,
             filter => $self->config->{jsmin},
             files => [$self->js_files_path]);
    }
    $app = Plack::Middleware::ContentLength->wrap($app);
    $app = builder {
        enable 'Deflater';
        enable sub { my $app = shift;
                     sub { my $env = shift;
                           use Plack::Util;
                           Plack::Util::response_cb(
                               $app->($env), sub {
                                   my $res = shift;
                                   my $h = Plack::Util::headers($res->[1]);
                                   my $type = $h->get('Content-Type') or return;
                                   return unless $res->[0] == 200;
                                   $h->set( 'Cache-Control' => 'max-age=31536000, public, no-transform' )
                                       unless $type =~ m!application/(json|x-javascript)! || $type =~ m|^text/|;
                               });
                       };
                 };
        $app;
    };
    $app = Plack::Middleware::Expires->wrap($app, content_type => qr!^(image/|audio|text/javascript)!i,
                                            expires => 'access plus 3 months');
    $app = Plack::Middleware::Head->wrap($app);
    $app = Plack::Middleware::ConditionalGET->wrap($app);
}

use Plack::App::File;
use Plack::App::Cascade;

method default_app {
    builder {
        mount '/static' => builder {
            enable sub { my $app = shift;
                         sub { my $env = shift;
                               $env->{'psgi.streaming'} = 0;
                               my $res = $app->($env);
                               # skip streamy response
                               return $res unless ref($res) eq 'ARRAY' && $res->[2];

                               my $h = Plack::Util::headers($res->[1]);;
                               $h->set( 'Cache-Control' => 'max-age=31536000, public' );
                               $res;
                           };
                     };
            Plack::App::Cascade->new(
                apps => [ map { $_->to_app } $self->static_files_app
                ]);
        };

        mount '/' => builder {
            enable 'Session',
                $self->mw_session_options;
            $self->mount_all;
        }
    }
}

method mw_session_options { () }

method mount_all {
    my $bus = $self->bus;

    mount '/_hippie' => builder {
        enable "+Web::Hippie";
        enable "+Web::Hippie::Pipe", bus => $bus;
        sub {
            my $env = shift;
            my $bus = $env->{'hippie.bus'};
            my $sub = $env->{'hippie.listener'};

            if ($env->{PATH_INFO} eq '/new_listener') {
            }
            elsif ($env->{PATH_INFO} eq '/message') {
                my $req = Plack::Request->new($env);
                my $msg = $env->{'hippie.message'};

                $self->handle_hippie_message($bus, $sub, $req, $msg);
            }
            elsif ($env->{PATH_INFO} eq '/error') {
                my $h = $env->{'hippie.listener'}
                    or return [ '400', [ 'Content-Type' => 'text/plain' ], [ "" ] ];
                if (my $sub = $env->{'hippie.listener'}) {
                    $sub->destroyed(1);
                    $self->cleanup_listener($sub);
                }
            }
            else {
                die "unknown hippie message: $env->{PATH_INFO}: ";
            }
            return [ '200', [ 'Content-Type' => 'application/hippie' ], [ "" ] ]
        }
    };
    mount '/session' => sub {
        my $env = shift;
        my ($key, $code, $tf) = $env->{PATH_INFO} =~ m|^/(.*?)/([^/]+)/(\w+)$|;
        my ($skey, $session) = $self->session_from_key($key, $code);
        unless ($session) {
            return [302, ['Location' => '/'], []];
        }
        my $req = Plack::Request->new($env);
        return [200, ['Content-Type' => 'text/html; charset=UTF-8' ],
                [ $self->render('session.tx', { req => $req, key => $skey,
                                                js_files => [ $self->js_files ],
                                                tz => $session->{tz},
                                                env => $env, code => $session->{code}, tf => $tf }) ]];
    };
    mount '/admin/pubsim' => sub {
        my $req = Plack::Request->new(shift);
        my $param = $req->parameters->mixed;

        my $entry = $self->create_sim_session($bus, $param->{date} || DateTime->now->ymd(),
                                              $param->{code} || $self->config->{default_code},
                                              $param->{speed},
                                              $param->{delay} || 10,
                                              'public',
                                          );
        return [200, ['Content-Type' => 'text/html' ], [$entry ? 'ok' : 'fail']];
    };

    mount '/' => sub {
        my $env = shift;
        my ($code, $tf) = ($self->config->{default_code}, '5min');
        my $req = Plack::Request->new($env);
        if ($req->path eq '/') {
            return sub {
                my $responder = shift;

                $self->populate_user($req->session->{login_id}, sub {
                                         my $user = shift;
                                         $responder->([200, ['Content-Type' => 'text/html; charset=UTF-8' ],
                                                       [  $self->render('home.tx',
                                                                             { user => $user,
                                                                               time => sub { time() },
                                                                               sessions => $self->sessions,
                                                                               session => $req->session,
                                                                               req => $req }) ]]);
                                     });
            }
        }
        return [404, ['Content-Type' => 'text/plain'], ['not fonud']];
    };
}

method populate_user($user_id, $cb) {
    $cb->(undef);
}

method cleanup_listener {}

method handle_hippie_message($bus, $sub, $req, $msg) {
    my $type = $msg->{type};
    $type =~ s/^(\w+)\.//;
    my ($class) = $1;
    my $method = "handle_${class}_message";
    my $func = $self->can($method);
    unless ($func) {
        warn "unknown message type: $msg->{type}";
        return;
    }
    $self->$func($type, $bus, $sub, $msg, $req);
}

method handle_tsstream_message($type, $bus, $sub, $msg, $req) {
    # request:  { type: 'tsstream.subscribe', session:    'TX/5min/live/2010-05-07' }
    # response: { type: 'tsstream.init',      start_date: '......', cnt: , live_starts:, live_ends: }
    # XXX support multiple sessions
    if ($type eq 'subscribe') {
        my $user_id = $req->session->{login_id};
        if ( my $stream = $self->new_session($msg->{session}, $bus, $sub, $user_id) ) {
            my $ready = sub {
                $sub->{tsstream} = $stream;
                $sub->append( $sub->{tsstream}->init_message )
            };
            if ($stream->{authz}) {
                $stream->{authz}->($user_id, $ready,
                                   sub {
                                       warn "==> auth fail: $user_id";
                                       $sub->append( { type => 'tsstream.error', error => 'authorization required: '.$msg->{session} } );
                                   });
            }
            else {
                $ready->();
            }
        }
        else {
            $sub->append( { type => 'tsstream.error', error => 'fail to init session: '.$msg->{session} } );
        }
    }
    elsif ($type eq 'resolve') {
        if (!$sub->{tsstream}) {
            $sub->append( { type => 'tsstream.error', error => 'no session found' } );
        }
        else {
            $sub->append( { type => 'tsstream.date',
                            date => $msg->{date},
                            i => $sub->{tsstream}->resolve_date($msg->{date}) } );
        }
    }
    elsif ($type eq 'indicators') {
        $sub->{tsstream_indicators} ||= [];
        for my $iname (@{$msg->{indicators}}) {
            if ( $sub->{tsstream}->subscribe_indicator($sub, $iname) ) {
                push @{$sub->{tsstream_indicators}}, $iname;
            }
        }
    }
    elsif ($type eq 'history') {
        if (!$sub->{tsstream}) {
            $sub->append( { type => 'tsstream.error', error => 'no session found' } );
        }
        else {
            my $send = sub {
                $sub->append( $sub->{tsstream}->send_history($msg->{start}, $msg->{end}) );
                for (@{$sub->{tsstream_indicators} || []}) {
                    $sub->append( $sub->{tsstream}->send_history_indicator($_, $msg->{start}, $msg->{end}) );
                }
            };
            if ($sub->{tsstream}{ready}->ready) {
                $send->();
            }
            else {
                my $cb = $sub->{tsstream}{ready}->cb;
                $sub->{tsstream}{ready}->cb(sub { $send->(); $cb->(@_) if $cb });
            }
        }
    }
}

method handle_tsorder_message {
    my ( $type, $bus, $sub, $msg ) = @_;

    my $broker = $sub->{tsstream}{broker};
    unless ($broker) {
        $sub->append( {
                type    => 'tsorder.error',
                message => 'no session or broker',
        } );
        warn 'no session or broker';
        return;
    }
    my $result = $sub->{tsstream}{broker_result};

    TradeSpring::Chart::Order->handle_order_messages($broker, $result, $sub, $type, $msg);
}

method init {
    $self->init_logging($self->config->{log4perl} || 'etc/log.conf');
    $self->init_live($self->bus)
        unless $ENV{SKIPLIVE};
    $self->init_history;
}

method mk_authz_cb($prefix, $date) { undef }

method get_indicators($bus, $calc, $tf, $session, $skey, $cv, $use_cache) {
    my $id = TradeSpring::Chart::Indicator->new( calc => $calc,
                                                 use_cache => $use_cache,
                                                 bus => $bus,
                                                 mqprefix => "$skey/$tf/i",
                                                 cv => $cv );
    $id->init($self->allowed_indicators($session, $tf));

    return $id;
}

method allowed_indicators($session, $tf) {
    return {
        'SMA(9)' => { class => 'SMA',
                      args => { n => 9 } },
    }
}

my $config;
use YAML::Syck qw(LoadFile);
sub config {
    return $config if $config;
    my $site_config = $ENV{TSCHART_CONFIG} || 'etc/site_chart.conf';
    my $file = -e $site_config ? $site_config : 'etc/chart.conf';
    return $config = LoadFile($file);
}


method init_history {
    my $config = $self->config->{history};
    for my $code ( keys %$config) {
        my $entry = $config->{$code};
        require TradeSpring::Chart::Session::GT;
        my $h = TradeSpring::Chart::Session::GT->new( code => $code,
                                                      chart => $self,
                                                      length => $entry->{length} || 0,
                                                      tf => $entry->{tf},
                                                      config => $entry,
                                                  );
        $self->sessions->{$code}{"history/$code"} = $h;
    }
}

method init_live ($bus, $source) {
    my $config = $self->config->{livechart};

    my $cfg = $self->config->{bus};
    my $pagmbus = $cfg->{args} && $cfg->{args}{traits}
                ? AnyMQ->new_with_traits(%{$cfg->{args}}) : AnyMQ->new;

    require TradeSpring::Chart::Session::PAGM;
    for my $code ( keys %$config) {
        my $cfg = $config->{$code};
        if ($cfg->{pagm}) {
            my $l = TradeSpring::Chart::Session::PAGM->new( pagmbus => $pagmbus, bus => $bus, code => $code,
                                                            chart => $self,
                                                            tf => $cfg->{tf},
                                                            config => $cfg);
            $l->init_ready->cb(sub {
                                   $self->sessions->{$code}{$l->session->{key}} = $l;
                               });
        }
        else {
            die "pagm not configured for live";
        }
    }
}

method mk_broker {
    require TradeSpring::Broker::Local;
    my $broker = TradeSpring::Broker::Local->new_with_traits
        (traits => ['Stop', 'Update', 'Attached', 'OCA']);
}

method new_session($session_spec, $bus, $sub, $user_id) {
    my ($key, $code, $tf) = $session_spec =~ m|^(.*?)/([^/]+)/(\w+)$|;

    my ($skey, $session) = $self->session_from_key($key, $code) or return;
    return $self->view_from_session($skey, $session, $tf, $bus, $sub, $user_id);
}

method session_from_key($key, $code) {
    if (my $code_sessions = $self->sessions->{$code}) {
        my $keycode = "$key/$code";
        return ($keycode, $code_sessions->{$keycode}->session)
            if $code_sessions->{$keycode};
    }
    warn "unknown key: $key / $code";
    return;
}

method create_sim_session($bus, $date, $code, $speed, $delay, $uniq) {
    my $h = $self->sessions->{$code}{"history/$code"} or return;
    require TradeSpring::Chart::Session::Sim;
    my $sim = eval { TradeSpring::Chart::Session::Sim->new( code => $code, tf => [],
                                                            bus => $bus,
                                                            history => $h,
                                                            chart => $self,
                                                            date => $date,
                                                            start_delay => $delay,
                                                            skip => $speed > 30 ? 15 : 0,
                                                            speedup => $speed,
                                                            $uniq ? (uniq => $uniq) : (),
                                                        ) };
    warn $@ if $@;
    return unless $sim;

    $self->sessions->{$code}{$sim->session->{key}} = $sim;

    return $sim;
}

method view_from_session($skey, $spec, $tf, $bus, $sub, $user_id) {

    die "tf '$tf' not available for $skey" unless exists $spec->{ag}{$tf};
    if ($spec->{source} && $user_id && !$spec->{brokers}{$user_id}) {
        my $broker = $self->mk_broker();
        my $l = $bus->new_listener($spec->{tick});
        $l->poll(sub { my $ts = $_[0]{timestamp};
                       $broker->on_price($_[0]{price}, undef, {timestamp => $ts}) });
        my $broker_result = $bus->topic({ name => "$skey/broker/$user_id", recycle => 0});
        $spec->{brokers}{$user_id} = [$broker, $broker_result];

    }

    $sub->subscribe($spec->{ag}{$tf}{topic});
    $sub->subscribe($spec->{brokers}{$user_id}[1]) if $user_id && $spec->{source};

    return bless { calc       => $spec->{ag}{$tf}{calc},
                   indicators => $spec->{ag}{$tf}{indicators},
                   authz      => $spec->{authz},
                   name       => $skey,
                   broker     => $user_id ? $spec->{brokers}{$user_id}[0] : undef,
                   broker_result => $user_id ? $spec->{brokers}{$user_id}[1] : undef,
                   timeframe  => $tf,
                   start_price=> $spec->{ag}{$tf}{start_price},
                   dhl        => $spec->{dhl},
                   ready      => $spec->{ready},
               }, 'TradeSpring::Chart::View';
}

__PACKAGE__->meta->make_immutable;
no Moose;
1;

=head1 NAME

TradeSpring::Chart - raphaeljs-based charting for TradeSpring

=head1 SYNOPSIS

  # please see https://github.com/tradespring/TradeSpring-Chart/wiki for more information

  # to use:
  # install the TradeSpring branch of Finance::GeniusTrader from
  # http://github.com/TradeSpring/Finance-Geniustrader
  # install TradeSpring and TradeSpring::Broker from http://github.com/TradeSpring

  # cpanm --installdeps . && make buildjs
  # setup your gt database and configure etc/site_chart.conf (see etc/chart.conf for example)

  % plackup -Ilib -p 3997
  # visit http://localhost:3997/

=head1 AUTHOR

Chia-liang Kao, C<< <clkao at clkao.org> >>

=head1 BUGS

=head1 SUPPORT

You can find documentation for this module with the perldoc command.

    perldoc TradeSpring::Chart

=head1 ACKNOWLEDGEMENTS


=head1 COPYRIGHT & LICENSE

Copyright 2009-2011 Chia-liang Kao.

This program is free software; you can redistribute it and/or modify it
under the terms of either: the GNU General Public License as published
by the Free Software Foundation; or the Artistic License.

See http://dev.perl.org/licenses/ for more information.


=cut
