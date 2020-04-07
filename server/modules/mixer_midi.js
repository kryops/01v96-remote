var midi = require('midi'),
    input = new midi.input(),
    output = new midi.output(),

    listener = false,

    inputPortCount = input.getPortCount(),
    outputPortCount = output.getPortCount(),

    foundInputPort = false,
    foundOutputPort = false,

    i;

var matchPortName = function(name) {
    return (name.toLowerCase().indexOf('01v96') !== -1 || name.match(/01V96 ..:0/i));
};

var transmitMessage = function(deltaTime, message) {
    if(listener) {
        listener(message);
    }
};

input.on('message', transmitMessage);

// find input port

for(i = 0; i < inputPortCount; i++) {
    if(matchPortName(input.getPortName(i))) {

        console.log('[mixer_midi] MIDI input port ' + i + ' / ' + input.getPortName(i));

        input.openPort(i);

        foundInputPort = true;

        // enable Sysex, timing and active sensing
        input.ignoreTypes(false, false, false);

        break;
    }
}

if(!foundInputPort) {
    console.log('[mixer_midi] ERROR: No 01v96 device found! (input port)');
}


// find output port

for(i = 0; i < outputPortCount; i++) {
    if(matchPortName(output.getPortName(i))) {

        console.log('[mixer_midi] MIDI output port ' + i + ' / ' + output.getPortName(i));

        output.openPort(i);

        foundOutputPort = true;

        break;
    }
}

if(!foundOutputPort) {
    console.log('[mixer_midi] ERROR: No 01v96 device found! (output port)');
}


module.exports = {
    
    setListener: function(l) {
        listener = l;
    },
    
    send: function(message) {
        if(foundOutputPort) {
            output.sendMessage(message);
        }
    }
    
};
