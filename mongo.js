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

module.exports = {
  connectMongo: connectMongo,
  getDb: getDb,
  isMongoReady: isMongoReady,
  getCollection: getCollection,
  getMongoUri: getMongoUri,
};
