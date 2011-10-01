use inc::Module::Install;

name     'TradeSpring-Chart';
all_from 'lib/TradeSpring/Chart.pm';
readme_from 'lib/TradeSpring/Chart.pm';
author   q{Chia-liang Kao <clkao@clkao.org>};
license  'perl';

build_requires 'Test::More';

requires 'Try::Tiny';
requires 'Plack';
requires 'Twiggy';
requires 'Plack::Middleware::JSConcat';
requires 'Plack::Middleware::Session';
requires 'Plack::Middleware::Expires';
requires 'Plack::Middleware::Deflater';
requires 'Plack::Middleware::Session';

requires 'Text::Xslate';
requires 'Set::IntSpan';
requires 'Web::Hippie';
requires 'Try::Tiny';
requires 'JSON';
requires 'Finance::GeniusTrader::CLI'; # XXX requires my branch

requires 'CHI';
requires 'CHI::Driver::Memcached';

requires 'Finance::TW::TAIFEX';
requires 'Cache::Memcached';
requires 'methods';

requires 'TradeSpring';
requires 'TradeSpring::Broker';

auto_include_deps;
author_tests('xt');
auto_set_repository;
install_share;

clean_files "share/static/gen/*.js";

WriteAll;

sub MY::postamble {
    return <<'MAKE_FRAG';
buildjs:
	$(PERL) utils/build.pl
MAKE_FRAG
}
