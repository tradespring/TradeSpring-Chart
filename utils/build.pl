#!/usr/bin/perl
use strict;
use File::Path;
use IPC::Cmd qw(can_run);
my @js_files = <coffee/*.coffee>;
my @css_files = <sass/*.sass>;

my $coffee_path = can_run('coffee') or die 'coffee is not installed!';
my $sass_path = can_run('sass') or die 'sass is not installed!';

mkpath ['share/static/gen'];
for (@js_files) {
    my ($name) = m/.*?\/([^.]+)\.coffee/;
    print "coffee/$name.coffee -> share/static".$/;
    system("$coffee_path -c -o share/static/gen coffee/$name.coffee");
}

for (@css_files) {
    my ($name) = m/.*?\/([^.]+)\.sass/;
    print "sass/$name.sass -> share/static".$/;
    system("$sass_path sass/$name.sass share/static/gen/$name.css");
}
