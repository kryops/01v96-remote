console.log('\n\n=== 01v96 Remote server by Michael Strobel ===\n\n');

// global application object and base configuration

var app = {
    config: {
        staticPort: 1337,
        webSocketPort: 1338
    },

    clientConfig: {
        names: {},
        groups: []
    },

    events: require('./server/modules/events'),

    controllers: {}
};


// load controllers

require('fs').readdirSync(__dirname + '/server/controllers').forEach(function(file) {
    var controller;

    if(file.match(/\.js$/) !== null) {
        controller = file.replace(/\.js$/, '');
        app.controllers[controller] = require('./server/controllers/' + controller)(app);
    }
});


// fire ready event
app.events.fire('ready');
