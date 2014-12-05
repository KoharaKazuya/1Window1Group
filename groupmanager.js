chrome.storage.local.get( {"groups": {} }, function(result) {

// { String groupName => Object group }
var groups = result.groups;

Object.observe(groups, function(changes) {
  chrome.storage.local.set({ "groups": groups });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.command === "register-group") {
    chrome.windows.get(request.windowId, {
      "populate": true
    }, function(win) {
      registerGroupFromWindow(request.name, win);
    });
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
  } else if (request.command === "close-group") {
    var name = getGroupFromWindowId(request.windowId);
    if (name !== undefined) {
      groups[name].info.id = chrome.windows.WINDOW_ID_NONE;
      chrome.windows.remove(request.windowId);
    }
  } else if (request.command === "remove-group") {
    var name = getGroupFromWindowId(request.windowId);
    if (name !== undefined) {
      delete groups[name];
    }
  }
});

chrome.windows.onCreated.addListener(function(window) {
  chrome.windows.get(window.id, { "populate": true }, function(win) {
    bindWindowIdToGroup(win);
  });
});
chrome.windows.onRemoved.addListener(function() {
  removeEmptyGroups();
});

// tab hooks
chrome.tabs.onCreated.addListener(updateGroups);
chrome.tabs.onUpdated.addListener(updateGroups);
chrome.tabs.onMoved.addListener(updateGroups);
chrome.tabs.onDetached.addListener(updateGroups);
chrome.tabs.onAttached.addListener(updateGroups);
chrome.tabs.onReplaced.addListener(updateGroups);
chrome.tabs.onRemoved.addListener(function(tabId, info) {
  updateGroups();
  removeEmptyGroups();
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

  // remove old group
  var old = getGroupFromWindowId(win.id);
  if (old !== undefined) {
    delete groups[old];
  }

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
    if (tabs[i].url === "chrome://newtab/") continue;
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
 * ウィンドウオブジェクトを取得
 */
function getWindow(id, cbSucc, cbFail) {
  chrome.windows.getAll(function(windows) {
    for (var i=0; i<windows.length; ++i) {
      if (windows[i].id === id) {
        if (cbSucc !== undefined) return cbSucc(windows[i]);
      }
    }
    if (cbFail !== undefined) return cbFail();
  });
}

/**
 * グループに対応するウィンドウを選択または生成する
 */
function openGroup(name) {
  if (name in groups) {
    getWindow(groups[name].info.id, function(win) {
      chrome.windows.update(win.id, { "focused": true });
    }, function() {
      generateGroupWindow(groups[name]);
    });
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

/**
 * 保持しているタブが空のグループを削除する
 */
function removeEmptyGroups() {
  for (var k in groups) if (groups.hasOwnProperty(k)) {
    if (groups[k].tabs.length === 0) {
      delete groups[k];
    }
  }
}

/**
 * 既存のウィンドウとグループを対応させる
 */
function bindWindowIdToGroup(win) {
  var group = getGroupFromWindowId(win.id);
  if (group === undefined) {
    var tabUrls = [];
    for (var i=0; i<win.tabs.length; ++i) if (win.tabs[i].url !== "chrome://newtab/") tabUrls.push(win.tabs[i].url);
    for (var k in groups) if (groups.hasOwnProperty(k)) {
      var groupUrls = [];
      for (var i=0; i<groups[k].tabs.length; ++i) if (groups[k].tabs[i].url !== "chrome://newtab/") groupUrls.push(groups[k].tabs[i].url);
      if (tabUrls.length === groupUrls.length && tabUrls.sort().toString() === groupUrls.sort().toString())
        groups[k].info.id = win.id;
    }
  }
}

});
