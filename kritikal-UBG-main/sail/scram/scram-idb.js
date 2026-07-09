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

  function openReady(retried) {
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
            openReady(true).then(resolve).catch(reject);
          };
          del.onerror = function () {
            resolve();
          };
        } else {
          resolve();
        }
      };
      req.onerror = function () {
        var err = req.error;
        if (!retried && err && err.name === "VersionError") {
          var wipe = indexedDB.deleteDatabase(dbName);
          wipe.onsuccess = function () {
            openReady(true).then(resolve).catch(reject);
          };
          wipe.onblocked = function () {
            reject(err);
          };
          wipe.onerror = function () {
            reject(err);
          };
          return;
        }
        reject(err);
      };
    });
  }

  global.__scramjetIdbReady = openReady();
})(typeof self !== "undefined" ? self : window);
