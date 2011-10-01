#!perl -T

use Test::More tests => 1;

BEGIN {
    use_ok( 'TradeSpring::Chart' );
}

diag( "Testing TradeSpring::Chart $TradeSpring::Chart::VERSION, Perl $], $^X" );
