var midi = require('midi'),
    input = new midi.input(),
    output = new midi.output(),

    foundPort = false,
    listener = false,

    inputPortCount = input.getPortCount(),
    outputPortCount = output.getPortCount(),

    foundInputPort = false,
    foundOutputPort = false,

    i;


// find input port

for(i = 0; i < inputPortCount; i++) {
    if(input.getPortName(i).indexOf('Yamaha 01V96') !== -1) {

        console.log('[mixer_midi] MIDI input port ' + i);

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
    if(output.getPortName(i).indexOf('Yamaha 01V96') !== -1) {

        console.log('[mixer_midi] MIDI output port ' + i);

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
