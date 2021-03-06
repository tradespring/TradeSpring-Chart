use inc::Module::Install;

name     'TradeSpring-Chart';
all_from 'lib/TradeSpring/Chart.pm';
readme_from 'lib/TradeSpring/Chart.pm';
author   q{Chia-liang Kao <clkao@clkao.org>};
license  'perl';

build_requires 'Test::More';
build_requires 'Class::Load';
build_requires 'Redis::hiredis';
build_requires 'Graph';
build_requires 'Number::Extreme';

requires 'Try::Tiny';
requires 'Plack';
requires 'Twiggy';
requires 'Plack::Middleware::JSConcat';
requires 'Plack::Middleware::Session';
requires 'Plack::Middleware::Expires';
requires 'Plack::Middleware::Deflater';

requires 'Text::Xslate';
requires 'Set::IntSpan';
requires 'Web::Hippie';
requires 'Try::Tiny';
requires 'JSON';
requires 'Finance::GeniusTrader::CLI'; # XXX requires my branch

requires 'Finance::TW::TAIFEX';
requires 'Finance::FITF';
requires 'methods';

requires 'TradeSpring';
requires 'TradeSpring::Broker';

extra_tests;
auto_set_repository;
install_share;

clean_files "share/static/gen/*.js";
clean_files "share/static/gen/*.sass";

WriteAll;

sub MY::postamble {
    return <<'MAKE_FRAG';
all:: build_css_and_jss

build_css_and_jss:
	$(PERL) utils/build.pl

MAKE_FRAG
}
