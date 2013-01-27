
document.body.addEventListener('ajax_request', function(e) {
    self.port.emit("ajax_request", document.body.getAttribute('data-ajax'));
});

self.port.on('ajax_response', function(response) {
    var customEvent = document.createEvent('Event');

    customEvent.initEvent('ajax_response', true, true);

    document.body.setAttribute('data-ajax', response);

    document.body.dispatchEvent(customEvent);
});