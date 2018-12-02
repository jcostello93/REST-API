// Name: John Costello
// Project: REST_API
// File description: This file sets up the /teams routes 

'use strict';

// [START gae_node_request_example]
const express = require('express');
const bodyParser = require('body-parser')
const helper = require('../helper.js');
const request = require('request');

const router = express.Router();
router.use(bodyParser.json());

// Names of entities in the Google Cloud Data Store
const PLAYER = "Player";
const TEAM = "Team";

// Properties of the Teams entity
const PARAMETERS = ["name", "location", "year_established"];

// Pagination limit
const LIMIT = 5;

// Helper functions from ..helper.js
var correctPOSTParameters = helper.correctPOSTParameters;
var correctPUTParameters = helper.correctPUTParameters;
var getDocuments = helper.getDocuments; 
var getDocument = helper.getDocument;
var createDocument = helper.createDocument;
var editDocument = helper.editDocument;
var deleteDocument = helper.deleteDocument;
var selectWhere = helper.selectWhere;
var getCursor = helper.getCursor;
var getPath = helper.getPathHelper;
var URL = helper.URL;
var jwtCheck = helper.jwtCheck;
var correctHeaders = helper.correctHeaders;
var getUserInfo = helper.getUserInfo;
var removePlayerFromTeam = helper.removePlayerFromTeam;


router.get('/', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "GET");
  if (!status) {
    var cursor = getCursor(req.query);
    getDocuments(TEAM, LIMIT, cursor, null, complete);

    function complete(err, response) {
      if (err) {
        next(err);
        return;
      }
      else {
        res.status(200).json(response);        
      }
    }
  }
  else {
    next({"code": status})
    return;
  }
  
});

router.post('/', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "POST");
  if (!status) {
    getUserInfo(req.headers.authorization.split(' ')[1], function (err, userInfo) {
      if (correctPOSTParameters(req.body, PARAMETERS)) {
        if (userInfo != "Unauthorized") {
          req.body.owner = userInfo.name;
          req.body.players = [];
          createDocument(TEAM, req.body, complete);
        }
        else {
          res.status(403).send("Unathorized");
        }
      }
      else {
        res.status(403).send("Invalid parameters. Must include name, location, year_established");
      }
    });
  } 
  else {
    next({"code": status})
    return;
  }

  function complete(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      res.status(201).json(response);
    }
  }  
});

router.put('/', jwtCheck, (req, res, next) => {
  res.status(405).end();
});

router.delete('/', jwtCheck, (req, res, next) => {
  res.status(405).end();
});

router.get('/:team', jwtCheck, (req, res, next) => {
  var userInfo; 
  var status = correctHeaders(req, "GET");
  if (!status) {
    getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
      userInfo = response; 
      if (userInfo != "Unauthorized") {
        getDocument(TEAM, req.params.team, complete);
      }
      else {
        res.status(403).send("Non-owner");
      }
    });
  } 
  else {
    next({"code": status})
    return;
  }

  function complete(err, team) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (userInfo.name == team.owner) {
        res.status(200).json(team);
      }
      else {
        res.status(403).send("Non-owner");
      }
    }
  }
});

router.put('/:team', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "PUT");
  var userInfo;

  if (!status) {
    getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
      userInfo = response;
      if (correctPUTParameters(req.body, PARAMETERS)) {
        getDocument(TEAM, req.params.team, returnTeam);
      }
      else {
        res.status(403).send("Invalid parameters. May include name, location, year_established");
      }
    });
  }
  else {
    next({"code": status})
    return;
  }

  function returnTeam(err, team) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (team.owner == userInfo.name) {
        for (var prop in req.body) {
          team[prop] = req.body[prop];
        }       
        editDocument(TEAM, req.params.team, team, complete);
      }
      else {
        res.status(403).send("Non-owner");
      }
    }
  }

  function complete(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      // BUG
      res.location(response.self)
      res.status(303).send("See Other");
    }
  }
  
});


router.delete('/:team', jwtCheck, (req, res, next) => {
  var playerCount = 0; 
  var deletedPlayers = 0; 
  var status = correctHeaders(req, "DELETE");
  var userInfo; 
  if (!status) {
    getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
      userInfo = response; 
      getDocument(TEAM, req.params.team, returnTeam);
    });
  } 
  else {
    next({"code": status})
    return;
  }
  function returnTeam(err, team) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (team.owner == userInfo.name) {
        playerCount = team.players.length;
        if (playerCount == 0) {
          deleteDocument(TEAM, req.params.team, complete);
        }
        else {
          for (var i = 0; i < playerCount; i++) {
            (function (i) {
              removePlayerFromTeam(req.params.team, team.players[i].id, removedPlayer);
            })(i);
          }
        }
      }
      else {
        res.status(403).send("Non-owner");
      }
      
    }
  }

  function removedPlayer(err, player) {
    if (err) {
      next(err);
      return;
    }
    else {
      deletedPlayers = deletedPlayers + 1; 
      if (deletedPlayers >= playerCount) {
        deleteDocument(TEAM, req.params.team, complete);
      }
    }
  } 
  
  function complete(err) {
    if (err) {
      next(err);
      return;
    }    
    res.status(204).send('No content');
  }
});


router.put('/:team/players/:player', jwtCheck, (req, res, next) => {
  var team, player; 
  var status = correctHeaders(req, "GET");
  var userInfo;

  if (!status) {
      getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
      userInfo = response;
      getDocument(PLAYER, req.params.player, returnPlayer);
    });
  }
  else {
    next({"code": status})
    return;
  }
  

  function returnPlayer(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (response) {
        if (response.team == null) {
          player = response; 
          getDocument(TEAM, req.params.team, returnTeam);
        }
        else {
          res.status(403).send("Reserved player");
        }
      }
      else {
        res.status(404).send("Not found");
      }
     }
  }

  function returnTeam(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (response.owner == userInfo.name) {
        var obj = {
          "id": player.id,
          "self": getPath(URL, PLAYER) + '/' + player.id 
        }
        response.players.push(obj);
        team = response;
        editDocument(TEAM, req.params.team, team, updatePlayer);
      }
      else {
        res.status(403).send("Non-owner");
      }
    }
  }

  function updatePlayer (err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      player.team = {
        "id": team.id,
        "name": team.name,
        "self": getPath(URL, TEAM) + '/' + team.id
      }
      editDocument(PLAYER, req.params.player, player, complete);
    }
  }

  function complete(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      res.json(response);
    }
  }
});

router.delete('/:team/players/:player', jwtCheck, (req, res, next) => { 
  var userInfo; 
  var status = correctHeaders(req, "GET");
  if (!status) {
    getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
      userInfo = response; 
      getDocument(TEAM, req.params.team, returnTeam);
    });
  } 
  else {
    next({"code": status})
    return;
  }

  function returnTeam(err, team) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (userInfo.name == team.owner) {
        removePlayerFromTeam(req.params.team, req.params.player, complete);
      }
      else {
        res.status(403).send("Non-owner");
      }
    }
  }

  function complete(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      res.status(204).json(response);
    }
  }
});

router.get('/:team/players/', jwtCheck, (req, res, next) => { 
  var status = correctHeaders(req, "GET");
  var cursor = getCursor(req.query);
  var userInfo;
  if (!status) {
    getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
      if (err) {
        next(err);
        return;
      }
      else {
        userInfo = response; 
        getDocument(TEAM, req.params.team, returnTeam);      
      }
    });
  } 
  else {
    next({"code": status})
    return;
  }

  function returnTeam(err, team) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (userInfo.name == team.owner) {
        selectWhere(PLAYER, "team.id", parseInt(req.params.team), LIMIT, cursor, complete);  
      }
      else {
        res.status(403).send("Non-owner");
      }      
    }
  }

  function complete(err, response) {
    if (err) {
      next(err);
      return;
    }
    else {
      res.json(response);
    }
  }
});

module.exports = router;
