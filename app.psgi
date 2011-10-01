#!/usr/bin/perl
package main;
use strict;
use warnings;

use Plack::Request;
use Plack::Session::Store::Cache;
use TradeSpring::Chart;

my $chart = TradeSpring::Chart->new;

sub js_files { $chart->js_files }

my $app = $chart->default_app;

$app = $chart->wrap_app($app);

$chart->init;
return $app;
