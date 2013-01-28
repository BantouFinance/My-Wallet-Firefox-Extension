// The main module of the blockchain Add-on.

// Modules needed are `require`d, similar to CommonJS modules.
// In this case, creating a Widget that opens a new tab needs both the
// `widget` and the `tabs` modules.
var Widget = require("widget").Widget;
var tabs = require('tabs');
var data = require("self").data;
var {Cc, Ci} = require("chrome");
var mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
var console = {log : function(message){}};
var Request = require("request").Request;
var isDebug = false;

function addToolbarButton() {
    var document = mediator.getMostRecentWindow("navigator:browser").document;
    var navBar = document.getElementById("nav-bar");
    if (!navBar) {
        return;
    }

    var blockchaintoolbutton = document.getElementById('blockchaintoolbutton');

    if (blockchaintoolbutton)
        blockchaintoolbutton.parentNode.removeChild(blockchaintoolbutton);

    var btn = document.createElement("toolbarbutton");

    btn.setAttribute('type', 'button');
    btn.setAttribute('class', 'toolbarbutton-1');
    btn.setAttribute('image', data.url('favicon.ico')); // path is relative to data folder
    btn.setAttribute('orient', 'horizontal');
    btn.setAttribute('label', 'My App');
    btn.setAttribute('id', 'blockchaintoolbutton');

    btn.addEventListener('click', function() {
        try {
            tabs.open({
                url : data.url("wallet.html"),
                onReady : function(tab) {
                    var worker = tab.attach({
                        contentScriptFile: data.url("bridge.js")
                    });

                    worker.port.on('ajax_request', function(_request) {
                        try {
                            worker.postMessage(_request);

                            console.log('Received ajax_request ' + _request);

                            var obj = JSON.parse(_request);

                            var Request = require("request").Request;

                            if (obj.url.indexOf('https://') != 0 && obj.url.indexOf('http://') != 0) {
                                obj.url = data.url(obj.url);
                            }

                            console.log('URL ' + obj.url);

                            // Be a good consumer and check for rate limiting before doing more.
                            var request = Request({
                                url: obj.url,
                                content : obj.data,
                                onComplete: function (response) {
                                    console.log('Response ' + response);

                                    obj.response = response.text;
                                    obj.status = response.status;

                                    worker.port.emit("ajax_response", JSON.stringify(obj));
                                },
                                onError : function(response) {
                                    console.log('On Error');

                                    obj.response = response.text;
                                    obj.status = response.status;

                                    worker.port.emit("ajax_response", JSON.stringify(obj));
                                }
                            });

                            if (obj.type == 'GET') {
                                request.get();
                            } else if (obj.type == 'POST') {
                                request.post();
                            }
                        } catch (e) {
                            console.log(e.message);
                        }
                    });
                }
            });
        } catch (e) {
            console.log(e);
        }

    }, false)
    navBar.appendChild(btn);
}

exports.main = function() {

    if (isDebug) {
        var logContentScript = "self.port.on('log_message', function(message) {" +
            "var newcontent = document.createElement('div');" +
            "newcontent.innerHTML = message;" +
            "document.body.appendChild(newcontent);" +
            "})";

        tabs.open({
            url : data.url("debug.html"),
            onReady : function(tab) {
                worker = tab.attach({
                    contentScript: logContentScript
                });

                console.log = function(message) {
                    worker.port.emit("log_message", message);
                }
            }
        });
    }

    var windows = require("windows").browserWindows;

    windows.on('open', function(window) {
        addToolbarButton();
    });

    addToolbarButton();

};
