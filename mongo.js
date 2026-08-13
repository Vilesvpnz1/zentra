const { MongoClient } = require("mongodb");

var client = null;
var db = null;
var readyPromise = null;

function getMongoUri() {
  return String(process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();
}

function getMongoDbName() {
  var fromEnv = String(process.env.MONGODB_DB || process.env.MONGO_DB || "").trim();
  if (fromEnv) return fromEnv;
  return "kobran";
}

function connectMongo() {
  if (readyPromise) return readyPromise;
  var uri = getMongoUri();
  if (!uri) {
    readyPromise = Promise.resolve(null);
    return readyPromise;
  }
  readyPromise = (async function () {
    client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 12000,
    });
    await client.connect();
    db = client.db(getMongoDbName());
    await db.command({ ping: 1 });
    console.log("Mongo connected (" + getMongoDbName() + ")");
    return db;
  })().catch(function (err) {
    console.error("Mongo connect failed:", err && err.message ? err.message : err);
    client = null;
    db = null;
    return null;
  });
  return readyPromise;
}

function getDb() {
  return db;
}

function isMongoReady() {
  return !!db;
}

async function getCollection(name) {
  if (!db) await connectMongo();
  if (!db) return null;
  return db.collection(name);
}

function createDocStore(collectionName) {
  var col = null;
  var enabled = false;

  function save(id, data) {
    if (!enabled || !col) return;
    col
      .updateOne(
        { _id: id },
        { $set: { data: data, updatedAt: Date.now() } },
        { upsert: true }
      )
      .catch(function () {});
  }

  async function bind(dbHandle, items) {
    if (!dbHandle) return false;
    col = dbHandle.collection(collectionName);
    enabled = true;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var doc = null;
      try {
        doc = await col.findOne({ _id: item.id });
      } catch (e) {
        enabled = false;
        col = null;
        return false;
      }
      var remote = doc && Object.prototype.hasOwnProperty.call(doc, "data") ? doc.data : null;
      if (item.hasRemote && item.hasRemote(remote)) {
        item.applyRemote(remote);
      } else {
        var local = item.getLocal ? item.getLocal() : null;
        if (item.hasLocal && item.hasLocal(local)) {
          await col.updateOne(
            { _id: item.id },
            { $set: { data: local, updatedAt: Date.now() } },
            { upsert: true }
          );
        }
      }
    }
    return true;
  }

  return {
    save: save,
    bind: bind,
    isEnabled: function () {
      return enabled;
    },
  };
}

module.exports = {
  connectMongo: connectMongo,
  getDb: getDb,
  isMongoReady: isMongoReady,
  getCollection: getCollection,
  getMongoUri: getMongoUri,
  createDocStore: createDocStore,
};
