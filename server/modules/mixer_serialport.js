// connect to Raspberry Pi serial port
var SerialPort = require('serialport'),
    fs = require('fs');

var listener = false,
    portOpened = false,
    serialPort = false;

if(fs.existsSync('/dev/ttyAMA0')) {
    serialPort = new SerialPort('/dev/ttyAMA0', {
        baudRate: 38400
    });

    serialPort.on('open', function() {

        console.log('[mixer_serialport] Serial port opened');

        portOpened = true;

        var message = [];

        // collect parameter changes and emit to controller
        serialPort.on('data', function(data) {
            var obj = data.toJSON(),
                startPosition,
                endPosition;

            while(true) {
                if(!obj.length) {
                    return;
                }

                startPosition = obj.indexOf(240);
                endPosition = obj.indexOf(247);

                // 240 ...
                if(startPosition === 0) {
                    // 240 ... 247 ... --> send
                    if(endPosition !== -1) {
                        message = obj.slice(0, endPosition+1);
                        obj = obj.slice(endPosition+1);

                        transmitMessage(message);
                        message = [];
                    }
                    // 240 ... |
                    else {
                        message = obj;
                        return;
                    }
                }
                // ... ; message already started, concatenate
                else if(message.length) {
                    // ... 247 | -> send
                    if(endPosition != -1) {
                        message = message.concat(obj.slice(0, endPosition+1));
                        obj = obj.slice(endPosition+1);

                        transmitMessage(message);
                        message = [];
                    }
                    // ... |
                    else {
                        message = message.concat(obj);
                        return;
                    }
                }
                // ... 240; skip unknown message part
                else if(startPosition > 0) {
                    obj = obj.slice(startPosition+1);
                }
                // ... ; message not started, skip
                else {
                    return;
                }

            }

        });

    });
}
else {
    console.log('[mixer_serialport] ERROR: /dev/ttyAMA0 does not exist! Aborting...');
}



var transmitMessage = function(message) {
    if(listener) {
        listener(message);
    }
};



module.exports = {

    setListener: function(l) {
        listener = l;
    },

    send: function(message) {
        if(portOpened) {
            serialPort.write(message);
        }
    }

};
