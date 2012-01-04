package TradeSpring::Chart::JSFiles;
use strict;
use TradeSpring::Chart;

use parent 'Plack::App::File';

my $root = TradeSpring::Chart->share_dir;
sub root {
    "$root/static";
}

sub files {
    qw(jquery-1.7.1.js iscroll.js jquery.transform.js jquery.mousewheel.js jquery.alerts.js
       timezone.js
       raphael.js plugins/raphael.path.methods.js
       plugins/raphael.primitives.js
       jquery.cookie.js jquery.hotkeys.js
       jquery.dataTables.js jquery.ui.js
       jquery.contextMenu.js
       gen/tschart.js gen/tsdraw.js
       gen/tsorder.js gen/tschart-ui.js gen/tschart-widget.js );
}

1;
