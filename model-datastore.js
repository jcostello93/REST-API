/*
Much of the code in this file was taken from one of Google's example Books API on GitHub. 
https://github.com/GoogleCloudPlatform/nodejs-getting-started/tree/8bb3d70596cb0c1851cd587d393faa76bfad8f80/2-structured-data/books
I removed some parts of the functions that I did not need or understand. 
I wrote the selectProp function to provide an interface for filtered queries. 
*/

'use strict';

const Datastore = require('@google-cloud/datastore');
const config = require('./config');

// [START config]
const ds = Datastore({
  projectId: config.get('GCLOUD_PROJECT')
});

// [END config]

// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [kind, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore (obj) {
  obj.id = obj[Datastore.KEY].id;
  return obj;
}

function toDatastore (obj, nonIndexed) {
  nonIndexed = nonIndexed || [];

  const results = [];
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1
    });
  });
  return results;
}

// Lists all books in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, books, nextPageToken)``.
// [START list]

function getPath(URL, kind) {
  return URL + '/' + kind.toLowerCase() + 's';
}

function keys_only (kind, cb) {
  var q = ds.createQuery([kind])
            .select('__key__');
  
  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
      cb(null, entities.map(fromDatastore).length);
  });
}

function list (kind, limit, cursor, user, cb) {
  var q = ds.createQuery([kind])
    .limit(limit)

  if (user) {
    q = q.filter("owner", '=', user)
  }
  if (cursor) {
    q = q.start(cursor);
  }

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      console.log(err)
      cb(err);
      return;
    }
      // taken from week3 GitHub Books API
      // if nextQuery.moreResults !== Datastore.NO_MORE_RESULTS, hasMore = nextQuery.endCursor. Else hasMore = false
      const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
      cb(null, entities.map(fromDatastore), hasMore);
  });
  
}
// [END list]

// Creates a new book or updates an existing book with new data. The provided
// data is automatically translated into Datastore format. The book will be
// queued for background processing.
// [START update]
function update (kind, id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['description'])
  };

  ds.save(
    entity,
    (err) => {
      data.id = entity.key.id;
      cb(err, err ? null : data);
    }
  );
}
// [END update]

function create (kind, data, cb) {
  update(kind, null, data, cb);
}

function read (kind, id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.get(key, (err, entity) => {
    if (!err && !entity) {
      err = {
        code: 404,
        message: 'Not found'
      };
    }
    if (err) {
      cb(err);
      return;
    }
    cb(null, fromDatastore(entity));
  });
}

function _delete (kind, id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.delete(key, cb);
}

function selectProp(kind, prop, value, limit, cursor, cb) {
  console.log(prop);
  console.log(value);
  var q = ds
  .createQuery(kind)
  .filter(prop, '=', value);

  if (limit) { q = q.limit(limit); }

  if (cursor) { q = q.start(cursor); }

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore = nextQuery.moreResults !== Datastore.NO_MORE_RESULTS ? nextQuery.endCursor : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}

// [START exports]
module.exports = {
  create,
  read,
  update,
  delete: _delete,
  list,
  selectProp,
  getPath,
  keys_only
};
// [END exports]