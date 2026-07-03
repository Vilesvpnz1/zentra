(function (global) {
  var stores = ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"];
  var dbName = "$scramjet";
  var dbVer = 2;

  function ensureStores(db) {
    for (var i = 0; i < stores.length; i++) {
      if (!db.objectStoreNames.contains(stores[i])) {
        db.createObjectStore(stores[i]);
      }
    }
  }

  function openReady() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(dbName, dbVer);
      req.onupgradeneeded = function () {
        ensureStores(req.result);
      };
      req.onsuccess = function () {
        var db = req.result;
        var missing = false;
        for (var i = 0; i < stores.length; i++) {
          if (!db.objectStoreNames.contains(stores[i])) missing = true;
        }
        db.close();
        if (missing) {
          var del = indexedDB.deleteDatabase(dbName);
          del.onsuccess = function () {
            var retry = indexedDB.open(dbName, dbVer);
            retry.onupgradeneeded = function () {
              ensureStores(retry.result);
            };
            retry.onsuccess = function () {
              retry.result.close();
              resolve();
            };
            retry.onerror = function () {
              reject(retry.error);
            };
          };
          del.onerror = function () {
            resolve();
          };
        } else {
          resolve();
        }
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  global.__scramjetIdbReady = openReady();
})(typeof self !== "undefined" ? self : window);
