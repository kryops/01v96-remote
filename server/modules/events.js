var util = require('util'),
    firedEvents = [],
    listeners = [];

/**
 * Determines if all events of a given set have already been fired
 * @param {array | string} events necessary events, in string form separated by blanks
 * @returns {boolean}
 */
var is = function(events) {
    var i;

    if(!util.isArray(events)) {
        events = events.split(' ');
    }

    i = events.length;

    while(i--) {
        if(firedEvents.indexOf(events[i]) === -1) {
            return false;
        }
    }

    return true;
};

/**
 * create event listener
 * @param {array | string} events set of events that have to be fired before the listener is executed
 *          in string form separated by blanks
 * @param {function} listener
 */
var on = function(events, listener) {

    if(!util.isArray(events)) {
        events = events.split(' ');
    }

    // execute listener immediately when event were already fired
    if(is(events)) {
        listener();
    }
    // add listener to queue
    else {
        listeners.push([
            events,
            listener
        ]);
    }

};

/**
 * fire event and immediately execute all attached listeners
 * @param {string} event
 */
var fire = function(event) {
    var i = listeners.length;

    console.log('[events] Fired: ' + event);

    // add to fired events list
    if(firedEvents.indexOf(event) === -1) {
        firedEvents.push(event);
    }

    // execute listeners when all needed events are present
    while(i--) {
        if(is(listeners[i][0])) {
            listeners[i][1]();
            listeners.splice(i,1);
        }
    }
};


module.exports = {
    is: is,
    on: on,
    fire: fire
};
