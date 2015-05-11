var midi = require('midi'),
    input = new midi.input(),
    output = new midi.output(),

    listener = false,

    inputPortCount = input.getPortCount(),
    outputPortCount = output.getPortCount(),

    foundInputPort = false,
    foundOutputPort = false,

    i;

var transmitMessage = function(deltaTime, message) {
    if(listener) {
        listener(message);
    }
};

input.on('message', transmitMessage);

// find input port

for(i = 0; i < inputPortCount; i++) {

//    console.log(input.getPortName(i));
    if(input.getPortName(i).match(/01V96 ..:0/)) {

        console.log('[mixer_midi] Yamaha USB MIDI input ID  ' + i);

        input.openPort(i);

        foundInputPort = true;

        // enable Sysex, timing and active sensing
        input.ignoreTypes(false, false, false);

        break;
    }
}

if(!foundInputPort) {
    console.log('[mixer_midi] ERROR: No USB 01V96 device found! (input port)');
    console.log('[mixer_midi]        Attempted to match Port Name: /01V96 ..:0/');
    console.log('[mixer_midi]        Midi inputs found: ');
    for(i = 0; i < inputPortCount; i++) {
       console.log('[mixer_midi]        PORT: '.concat(i).concat(', Port Name: ').concat(input.getPortName(i)));
    }

}

// find output port

for(i = 0; i < outputPortCount; i++) {
    //console.log(output.getPortName(i));
    if(output.getPortName(i).match(/01V96 ..:0/)) {

        console.log('[mixer_midi] Yamaha USB MIDI output ID ' + i);

        output.openPort(i);

        foundOutputPort = true;

        break;
    }
}

if(!foundOutputPort) {
    console.log('[mixer_midi] ERROR: No 01V96 device found! (output port)');
    console.log('[mixer_midi]        Attempted to match Port Name:/01V96 ..:0/');
    console.log('[mixer_midi]        Midi output found: ');
    for(i = 0; i < outputPortCount; i++) {
       console.log('[mixer_midi]        PORT: '.concat(i).concat(', Port Name: ').concat(output.getPortName(i)));
    }

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

