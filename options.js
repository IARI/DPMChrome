/**
 * Created by jjarecki on 06.07.16.
 */

// Saves options to chrome.storage
function save_options() {
    var dpmUrl = document.getElementById('dpmurl').value;
    chrome.storage.sync.set({
        dpmUrl: dpmUrl
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

function restore_options() {
    // Use default value color = 'red' and dpmUrl = true.
    chrome.storage.sync.get({
        dpmUrl: "dpm.yourhost.org"
    }, function (items) {
        document.getElementById('dpmurl').value = items.dpmUrl;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);