#!/usr/bin/perl
use strict;
use File::Path;
my @files = <coffee/*.coffee>;

mkpath ['share/static/gen'];
for (@files) {
    my ($name) = m/.*?\/([^.]+)\.coffee/;
    print "coffee/$name.coffee -> share/static".$/;
    system("coffee -c -o share/static/gen coffee/$name.coffee");
}
