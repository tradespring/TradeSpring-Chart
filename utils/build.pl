#!/usr/bin/perl
use strict;
use File::Path;
use IPC::Cmd qw(can_run);
my @files = <coffee/*.coffee>;

my $coffee_path = can_run('coffee') or die 'coffee is not installed!';

mkpath ['share/static/gen'];
for (@files) {
    my ($name) = m/.*?\/([^.]+)\.coffee/;
    print "coffee/$name.coffee -> share/static".$/;
    system("$coffee_path -c -o share/static/gen coffee/$name.coffee");
}
