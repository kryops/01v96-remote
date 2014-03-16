var http = require('http'),
    static = require('node-static'),

    app;


var init = function() {
    var fileServer = new static.Server(
        __dirname + '/../../client',
        {
            cache: 0
        }
    );

    http.createServer(function (request, response) {

        request.addListener('end', function () {
            fileServer.serve(request, response);
        }).resume();

    }).listen(app.config.staticPort);

    console.log('[static] Web server started at port ' + app.config.staticPort);
};



module.exports = function(globalApp) {
    app = globalApp;
    app.events.on('ready', init);
};