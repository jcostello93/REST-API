const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const request = require('request');
const utf8 = require('utf8');

// Names of entities in the Google Cloud Data Store 
const PLAYER = "Player";
const TEAM = "Team";
const USER = "User";

// Base URL of API
const URL = process.env.URL;

// Set Auth0 info in environment 
const AUTH0_URL = process.env.AUTH0_URL;
const AUDIENCE = process.env.AUDIENCE;
const JWKS_URI = process.env.JWKS_URL;
const ISSUER = process.env.ISSUER;

// getModel() was taken from Google's example Books API on GitHub
// https://github.com/GoogleCloudPlatform/nodejs-getting-started/tree/8bb3d70596cb0c1851cd587d393faa76bfad8f80/2-structured-data/books

function getModel () {
    return require(`./model-${require('./config').get('DATA_BACKEND')}`);
  }

function getPathHelper(URL, kind) {
  return getModel().getPath(URL, kind);
}

function getUserInfo(access_token, cb) {
  var options = { method: 'POST',
  url: AUTH0_URL,
  headers: { 'content-type': 'application/json',
            'Authorization': 'Bearer ' + access_token
  },
  json: true };
  request(options, (error, response, body) => {
      if (error){
          cb(error, null)
      } else {
          if (!body.statusCode) {
            cb(null, body);
          }
          else {
            cb(body, null);
          }         
      }
  });
}

function correctHeaders(req, type) {
  if (type == "POST" || type == "PUT") {
    if(req.get('content-type') !== 'application/json'){
        return(415);
    }
  }

  if(req.get('accept') !== 'application/json'){
      return(406);
  }

  return 0;
}

var jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: JWKS_URI
    }),
      audience: AUDIENCE,
      issuer: ISSUER,
      algorithms: ['RS256']
    }
  );

function convertToHTML(entity) {
  str = '<ul>'
  for (var key in entity){
    str += '<li>' + key + ": " + entity[key] + '</li>'
  }

  str += '</ul>'

  return str
}

function mapSelfLinks(kind, entities) {
  for (var i = 0; i < entities.length; i++) {
    entities[i].self = getModel().getPath(URL, kind) + '/' + entities[i].id;
  }
}

function getCursor(query) {
    if(Object.keys(query).includes("cursor")){
      return query.cursor;
    }
    return false;
}

function getDocument(kind, id, cb) {
    getModel().read(kind, id, (err, entity) => {
      if (err) {
        console.log(err);
        cb(err, null);
      } 
      else {      
        entity.self = getModel().getPath(URL, kind) + '/' + id;
        cb(null, entity);
      }
    });
}

function correctPUTParameters(body, parameters) {
    for (var key in body) {
      if (!parameters.includes(key)) {
        return false; 
      } 
    }  
    return true;
  }
  
  function correctPOSTParameters(body, parameters) {
    if (Object.keys(body).length != parameters.length) {
      return false;
    }
    return correctPUTParameters(body, parameters);
  }

  function getEntityCount(kind, cb) {
    getModel().keys_only(kind, (err, count) => { 
      if (err) {
        cb(err, null);
      }
      else {
        cb(null, count);
      }
    });
  }

  function getDocuments(kind, limit, cursor, user, cb) {
    getModel().list(kind, limit, cursor, user, (err, entities, nextCursor) => {
        if (err) {
          cb(err, null);
        }
        else {
          if (entities) {
          mapSelfLinks(kind, entities);
          }
          var nextLink = null;
          if (nextCursor) {
            nextLink = getModel().getPath(URL, kind) + "?cursor=" + nextCursor;
          }
          getEntityCount(kind, function (err, count) {
            if (err) {
              cb (err, null);
            }
            else {
              var obj = {
                items: entities,
                next: nextLink,
                count: count
              }          
              cb(null, obj);
            }
          });
        }
    });
  }

  function createDocument(kind, data, cb){
    getModel().create(kind, data, (err, entity) => {
      if (err) {
        console.log(err);
        cb(err, null)
      }
      entity.self = getModel().getPath(URL, kind) + '/' + entity.id;
      cb(null, entity)
    });
  }

function editDocument(kind, id, data, cb) {
    getModel().update(kind, id, data, (err, entity) => {
        if (err) {
          cb(err, null);
        }
        entity.self = getModel().getPath(URL, kind) + '/' + id;
        cb(null, entity);
    });
}

function deleteDocument(kind, id, cb) {
  getModel().delete(kind, id, (err) => {
    if (err) {
      cb(err)
    }
    cb(null)
  });
}

function selectWhere(kind, prop, val, limit, cursor, cb) {
  var other_kind;
  if (kind == PLAYER) { other_kind = TEAM; }
  else { other_kind = USER }

  getModel().selectProp(kind, prop, val, limit, cursor, (err, entities, nextCursor) => {
    if (err) {      
      cb(err, null)
    }
    console.log(entities);
    if (entities) {
      mapSelfLinks(kind, entities);
    }
    else {
      entites = []
    }
    var nextLink = null;
    if (nextCursor) {
      nextLink = getPathHelper(URL, other_kind) + '/' + val + '/' + kind.toLowerCase() + 's' + "?cursor=" + nextCursor;
    }
    var obj = {
      items: entities,
      next: nextLink
    }
    console.log("calling back from selectWhere")
    cb(null, obj)
  });
}

function isAtSea(kind, prop, id, cb) {
  selectWhere(kind, prop, id, complete);

  function complete(err, response) {
    if (err) {      
      cb(err, null)
    }
    cb(null, response.items.length == 0)
  }  
}
  
function removePlayerFromTeam(team, player, cb) {
  var playerEntity; 

  getDocument(PLAYER, player, returnPlayer);

  function returnPlayer (err, response) {
    if (err) {
      cb(err, null);
    }
    else {
      if (response.team) {
        if (response.team.id == team) {
          response.team = null;
          playerEntity = response;
          editDocument(PLAYER, player, playerEntity, playerCallback)
        }
        else {
          cb({"code": 403}, null);
        }
      }
      else {
        cb({"code": 403, "response": "Non-existing relationship"}, null);
      }
    }
  }

  function playerCallback(err, response) {
    if (err) {
      cb(err, null)
    }
    else {
      getDocument(TEAM, team, returnTeam);
    }
  }

  function returnTeam (err, response) {
    if (err) {
      cb(err, null)
    }
    else {
      var found = false; 
      for (var i = 0; i < response.players.length; i++) {
        if (response.players[i].id == player) {
          found = true;
          response.players.splice(i, 1);
          break;
        }
      }
      if (found) { editDocument(TEAM, team, response, complete); }
      else {
        cb({"code": 403, "response": "Non-existing relationship"}, null);
      }
    }
  }

  function complete(err, response) {
    if (err) {
      cb(err, null);
    }
    else {
      cb(null, playerEntity);
    }
  } 

}


module.exports = {
      correctPUTParameters,
      correctPOSTParameters,
      getDocuments,
      getDocument,
      createDocument,
      editDocument,
      deleteDocument,
      selectWhere,
      getCursor,
      getPathHelper,
      URL,
      convertToHTML,
      jwtCheck,
      correctHeaders,
      getUserInfo,
      removePlayerFromTeam
  }
