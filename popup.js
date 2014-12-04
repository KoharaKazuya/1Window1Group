document.addEventListener("DOMContentLoaded", function(event) {

  var buttonToRegisterGroup = document.querySelector('.register-group');
  buttonToRegisterGroup.addEventListener('click', function(event) {
    var input = buttonToRegisterGroup.querySelector('input');
    if (event.target === input) return false;
    var name = input.value;
    if (name.substr(-1) === " ") return false;
    if (name !== undefined && name !== "") {
      chrome.windows.getCurrent(function(win) {
        chrome.runtime.sendMessage({
          "command": "register-group",
          "name": name,
          "windowId": win.id
        });
      });
      window.close();
    } else {
      input.focus();
    }
  });

  var groupNameInput = buttonToRegisterGroup.querySelector('input');
  groupNameInput.addEventListener('keypress', function(event) {
    if (event.keyCode === 13) {
      buttonToRegisterGroup.click();
    }
  });

  var buttonToCloseGroup = document.querySelector('.close-group');
  buttonToCloseGroup.addEventListener('click', function(event) {
    chrome.windows.getCurrent(function(win) {
      chrome.runtime.sendMessage({
        "command": "close-group",
        "windowId": win.id
      });
      window.close();
    });
  });

  var list = document.querySelector('.group-list');
  chrome.runtime.sendMessage({
    "command": "get-group-names"
  }, function(response) {
    response.names.sort().forEach(function(name) {

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
