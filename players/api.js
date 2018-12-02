// Name: John Costello
// Project: REST_API
// File description: This file sets up the /players routes 

'use strict';

// [START gae_node_request_example]
const express = require('express');
const bodyParser = require('body-parser')
const helper = require('../helper.js');

const router = express.Router();
router.use(bodyParser.json());

// Names of entities on Google Cloud Data store
const PLAYER = "Player";
const TEAM = "Team";

// Properties of Player entity
const PARAMETERS = ["name", "age", "height"];

// Pagination limit
const LIMIT = 5;

// Helper functions from ../helper.js
var correctPOSTParameters = helper.correctPOSTParameters;
var correctPUTParameters = helper.correctPUTParameters;
var getDocuments = helper.getDocuments; 
var getDocument = helper.getDocument;
var createDocument = helper.createDocument;
var editDocument = helper.editDocument;
var deleteDocument = helper.deleteDocument;
var getCursor = helper.getCursor;
var jwtCheck = helper.jwtCheck;
var correctHeaders = helper.correctHeaders;
var removePlayerFromTeam = helper.removePlayerFromTeam;

router.get('/', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "GET");
  if (!status) {
    var cursor = getCursor(req.query);
    getDocuments(PLAYER, LIMIT, cursor, null, complete);

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
    if (correctPOSTParameters(req.body, PARAMETERS)) {
      req.body.team = null;
      createDocument(PLAYER, req.body, complete);
    }
    else {
      res.status(403).send("Invalid parameters. Must include name, age, and height");
    }
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

router.put('/', jwtCheck ,(req, res, next) => {
  res.status(405).end();
});

router.delete('/', jwtCheck, (req, res, next) => {
  res.status(405).end();
});

router.get('/:player', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "GET");
  if (!status) { getDocument(PLAYER, req.params.player, complete); }
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
      res.status(200).json(response);
    }
  }
});


router.put('/:player', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "PUT");
  if (!status) {
    if (correctPUTParameters(req.body, PARAMETERS)) {
      getDocument(PLAYER, req.params.player, returnPlayer);
    }
    else {
      res.status(403).send("Invalid parameters. May include name, age, and height");
    }
  }
  else {
    next({"code": status})
    return;
  }

  function returnPlayer(err, entity) {
    if (err) {
      next(err);
      return;
    }
    else {
      for (var prop in req.body) {
        entity[prop] = req.body[prop];
      }       
      editDocument(PLAYER, req.params.player, entity, complete);
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


router.delete('/:player', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "POST");
  if (!status) {
    getDocument(PLAYER, req.params.player, returnPlayer);
  }
  else {
    next({"code": status})
    return;
  }

  function returnPlayer(err, player) {
    if (err) {
      next(err);
      return;
    }
    else {
      if (player.team == null) {
        deleteDocument(PLAYER, req.params.player, complete);  
      }
      else {
        getDocument(TEAM, player.team.id, returnTeam);
      }
    }
  }
  function returnTeam (err, team) {
    if (err) {
      next(err);
      return;
    }
    else {
      removePlayerFromTeam(team.id, req.params.player, removedPlayer);
    }
  }

  function removedPlayer (err, player) {
    if (err) {
      next(err);
      return;
    }  
    else {
      deleteDocument(PLAYER, req.params.player, complete);
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

module.exports = router;
