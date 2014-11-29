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

  var ul = document.querySelector('.group-list');
  chrome.runtime.sendMessage({
    "command": "get-group-names"
  }, function(response) {
    response.names.forEach(function(name) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.innerText = name;
      a.href = "#";
      a.addEventListener("click", function(event) {
        chrome.runtime.sendMessage({
          "command": "open-group",
          "group": name
        });
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
  });
});
