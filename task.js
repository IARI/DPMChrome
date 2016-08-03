/**
 * Created by jjarecki on 07.07.16.
 */


// Called when the user clicks on the browser action.
// chrome.browserAction.onClicked.addListener(function(tab) {
//     // Send a message to the active tab
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//         var activeTab = tabs[0];
//         chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
//     });
// });

// chrome.alarms.create("DPM", {delayInMinutes: 0.1, periodInMinutes: 0.1});
//
// chrome.alarms.onAlarm.addListener(function (alarm) {
//     console.log("Got an alarm!", alarm);
// });

var requestFailureCount = 0;  // used for exponential backoff
var requestTimeout = 1000 * 5;  // 5 seconds

var clickhandler = {};

if (window.Notification) {
    var interval = 0; // The display interval, in minutes.

    chrome.notifications.onClicked.addListener(function (n) {
        if (n in clickhandler) clickhandler[n](n);
    });

    setInterval(function () {
        interval++;
        startRequest();
    }, 10000);
}

function startRequest() {
    var url = "/api/f3mobil/search";
    var formData = new FormData();
    formData.append("query", ":open :leader");
    getJSON(url,
        formData,
        function (data) {
            //notify(JSON.stringify(data));
            handleOpenPatches(data);
        }, function (e) {
            showerror(e)
        });
}

function notify(message, clicked, icon) {
    icon = icon ? icon : "Haskell.png";
    var opt = {
        type: "basic",
        title: "DPM notification",
        requireInteraction: true,
        message: message,
        iconUrl: icon
    };
    //new Notification("DPM notification", opt);
    chrome.notifications.create(undefined, opt, function (notificationId) {
        if (clicked) clickhandler[notificationId] = clicked;
    });
}


function showerror(message) {
    notify(message, "HaskellRed.png");
}

function handleOpenPatches(response) {
    chrome.storage.sync.get("results", function (items) {
        var old_results = "results" in items ? items.results : [];
        var merged = {}, old, len, oldPatch;
        var testStatus, oldTestStatus;
        old_results.forEach(function (patch) {
            merged[patch.id] = patch
        });
        response.results.forEach(function (bundle) {
            function clicked() {
                getDpmUrl(function (dpm) {
                    chrome.tabs.create({url: dpm + '#/f3mobil/group/' + bundle.id});
                });
            }

            if (!(bundle.id in merged)) {
                notify("new Patch: " + bundle.name, clicked);
                return;
            }
            old = merged[bundle.id];
            len = bundle.patches.length;
            bundle.patches.forEach(function (patch, i) {
                if (!(i in old.patches)) {
                    notify("added Patch to bundle " + bundle.name + ":  " + patch.meta.name, clicked);
                    return;
                }
                testStatus = patch.tags["test-status"];
                oldTestStatus = old.patches[i].tags["test-status"];
                if (testStatus != oldTestStatus) {
                    notify('Patch test status "' + testStatus + '" for patch ' +
                        patch.meta.name, clicked, testStatus == "success" ? "Up.png" : undefined);
                }
            });
        });
        chrome.storage.sync.set({"results": response.results}, function () {
            //notify("polling complete.")
        });
    });
}

function getDpmUrl(callback) {
    chrome.storage.sync.get("dpmUrl", function (items) {
        callback(items.dpmUrl);
    });
}

function getJSON(url, formdata, onSuccess, onError) {
    var xhr = new XMLHttpRequest();

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();  // synchronously calls onreadystatechange
    }, requestTimeout);

    function handleSuccess(jsonObj) {
        requestFailureCount = 0;
        window.clearTimeout(abortTimerId);
        if (onSuccess)
            onSuccess(jsonObj);
    }

    function handleError(e) {
        ++requestFailureCount;
        window.clearTimeout(abortTimerId);
        if (onError)
            onError(e);
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState != 4)
                return;

            if (xhr.responseText) {
                var jsonDoc = xhr.responseText;

                if (jsonDoc != undefined && jsonDoc.trim().length > 0) {
                    try {
                        jsonObj = JSON.parse(jsonDoc);
                    } catch (e) {
                        handleError(e);
                        handleError(jsonDoc);
                        //console.log(jsonDoc);
                        return;
                    }

                    if (jsonObj) {
                        handleSuccess(jsonObj);
                        return;
                    }
                }
            }

            handleError("No response Text.");
        };

        xhr.onerror = function (error) {
            handleError(error);
        };


        // if (settings.get('apiKey')) {
        //     var apiKeyHash = Base64.encode(settings.get('apiKey') + ':random');
        //     xhr.setRequestHeader('Authorization', "Basic " + apiKeyHash);
        // } else if (settings.get('userLogin') && settings.get('userPassword')) {
        //     var loginPasswordHash = Base64.encode(settings.get('userLogin') + ':' + settings.get('userPassword'));
        //     xhr.setRequestHeader('Authorization', "Basic " + loginPasswordHash);
        // }

        getDpmUrl(function (dpmUrl) {
            xhr.open("POST", dpmUrl + url, true);
            xhr.setRequestHeader('Accept', "application/json");
            xhr.send(formdata);
        });

    } catch (e) {
        console.error('Exception: ' + e);
        handleError(e);
    }
}