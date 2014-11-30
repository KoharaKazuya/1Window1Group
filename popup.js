document.addEventListener("DOMContentLoaded", function(event) {

  var buttonToRegisterGroup = document.querySelector('.register-group');
  buttonToRegisterGroup.addEventListener('click', function(event) {
    chrome.windows.getCurrent(function(win) {
      chrome.runtime.sendMessage({
        "command": "register-group",
        "windowId": win.id
      });
    });
  });

  var list = document.querySelector('.group-list');
  chrome.runtime.sendMessage({
    "command": "get-group-names"
  }, function(response) {
    response.names.forEach(function(name) {

      var a = document.createElement("div");
      a.className = "group"
      a.addEventListener("click", function(event) {
        chrome.runtime.sendMessage({
          "command": "open-group",
          "group": name
        });
      });
      list.appendChild(a);

      var h = document.createElement("h2");
      h.innerText = name;
      a.appendChild(h);

      chrome.runtime.sendMessage({
        "command": "get-favicons",
        "group": name
      }, function(response) {
        response.favicons.forEach(function(favicon) {
          var img = document.createElement("img");
          img.src = favicon;
          img.className = "favicon";
          a.appendChild(img);
        });
      });

    });
  });
});
