var listener = false;

var transmitMessage = function(message) {
    if(listener) {
        listener(message);
    }
};


// send random fader values for channel 1
setInterval(function() {
    transmitMessage([240,67,16,62,13,1,28,0,0,0,0,Math.round(Math.random()),Math.round(Math.random()*127),247]);
}, 100);

// send random meter levels
setInterval(function() {
	var message = [240,67,16,62,13,33,0,0,0],
		i;
	
	for(i=0; i<=31; i++) {
		message.push(Math.round(Math.random()*32),0);
	}
	
	message.push(247);

    transmitMessage(message);
}, 50);



module.exports = {

    setListener: function(l) {
        listener = l;
    },

    send: function(message) {
        // do nothing
    }

};
