// { String groupName => Object group }
var groups = {};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.command === "register-group") {
    chrome.windows.get(request.windowId, {
      "populate": true
    }, function(win) {
      registerGroupFromWindow("test", win);
    });
    sendResponse({});
  } else if (request.command === "get-group-names") {
    var names = [];
    for (var name in groups) if (groups.hasOwnProperty(name)) {
      names.push(name);
    }
    sendResponse({ "names": names });
  } else if (request.command === "open-group") {
    openGroup(request.group);
  } else if (request.command === "get-favicons") {
    if (request.group in groups) {
      var favicons = [];
      var tabs = groups[request.group].tabs;
      for (var i=0; i<tabs.length; ++i) {
        favicons.push(tabs[i].favicon);
      }
      sendResponse({ "favicons": favicons });
    } else {
      sendResponse({ "favicons": [] });
    }
  }
});

chrome.windows.onRemoved.addListener(function(windowId) {
  var name = getGroupFromWindowId(windowId);
  if (name !== undefined) {
    groups[name].info.id = chrome.windows.WINDOW_ID_NONE;
  }
});

// tab hooks
chrome.tabs.onCreated.addListener(updateGroups);
chrome.tabs.onUpdated.addListener(updateGroups);
chrome.tabs.onMoved.addListener(updateGroups);
chrome.tabs.onDetached.addListener(updateGroups);
chrome.tabs.onAttached.addListener(updateGroups);
chrome.tabs.onReplaced.addListener(updateGroups);
chrome.tabs.onRemoved.addListener(function(tabId, info) {
  if (!info.isWindowClosing) {
    updateGroups();
  }
});


/**
 * グループの情報を更新する
 */
function updateGroups() {
  chrome.windows.getAll({ "populate": true }, function(windows) {
    for (var i=0; i<windows.length; ++i) {
      var win = windows[i];
      var name = getGroupFromWindowId(win.id);
      if (name !== undefined) {
        registerGroupFromWindow(name, win);
      }
    }
  });
}

/**
 * ウィンドウをグループとして登録する
 */
function registerGroupFromWindow(name, win) {
  var group = {};

  // window information
  var info = {};
  info.id = win.id;
  info.left = win.left;
  info.top = win.top;
  info.width = win.width;
  info.height = win.height;
  group.info = info;

  // tabs
  var list = [];
  var tabs = win.tabs;
  for (var i=0; i<tabs.length; ++i) {
    var tab = {};
    tab.url = tabs[i].url;
    tab.active = tabs[i].active;
    tab.pinned = tabs[i].pinned;
    tab.favicon = tabs[i].favIconUrl;
    list.push(tab);
  }
  group.tabs = list;

  groups[name] = group;
}

/**
 * Window ID と一致するグループが存在すればグループ名を、なければ undefined を返す
 */
function getGroupFromWindowId(id) {
  for (var k in groups) if (groups.hasOwnProperty(k)) {
    if (groups[k].info.id === id) {
      return k;
    }
  }
  return undefined;
}

/**
 * グループに対応するウィンドウを選択または生成する
 */
function openGroup(name) {
  if (name in groups) {
    var group = groups[name];
    if (group.info.id !== chrome.windows.WINDOW_ID_NONE) {
      chrome.windows.update(group.info.id, { "focused": true });
    } else {
      generateGroupWindow(group);
    }
  }
}

/**
 * グループに対応するウィンドウを作成する
 */
function generateGroupWindow(group) {
  chrome.windows.create({
    "left": group.info.left,
    "top": group.info.top,
    "width": group.info.width,
    "height": group.info.height
  }, function(win) {
    group.info.id = win.id;

    // remove newtab page tab
    chrome.tabs.query({
      "windowId": win.id
    }, function(tabs) {
      var list = [];
      for (var i=0; i<tabs.length; ++i) {
        if (tabs[i].url === "chrome://newtab/") {
          list.push(tabs[i].id);
        }
      }
      chrome.tabs.remove(list);
    })

    group.tabs.forEach(function(tab) {
      chrome.tabs.create({
        "windowId": win.id,
        "url": tab.url,
        "active": tab.active,
        "pinned": tab.pinned
      });
    });
  });
}
