// Name: John Costello
// Project: REST_API
// File description: This file sets up the /users routes 

'use strict';

// [START gae_node_request_example]
const express = require('express');
const bodyParser = require('body-parser')
const helper = require('../helper.js');
const request = require('request');

const router = express.Router();
router.use(bodyParser.json());

// Properties of User entity
const PARAMETERS = ["username", "password", "user_metadata"];

// Pagination limit
const LIMIT = 5;

// Names of entities in Google Cloud Data Store
const TEAM = "Team";
const USER = "User";

// Helper functions from ../helper.js
var correctPOSTParameters = helper.correctPOSTParameters;
var correctPUTParameters = helper.correctPUTParameters;
var getDocuments = helper.getDocuments; 
var getDocument = helper.getDocument;
var createDocument = helper.createDocument;
var editDocument = helper.editDocument;
var deleteDocument = helper.deleteDocument;
var selectWhere = helper.selectWhere;
var getCursor = helper.getCursor;
var jwtCheck = helper.jwtCheck;
var correctHeaders = helper.correctHeaders;
var getUserInfo = helper.getUserInfo;

// Set Auth0 info in environment
const CLIENT_ID = process.env.CLIENT_ID;
const AUDIENCE = process.env.AUDIENCE;
const AUTH0_URL = process.env.AUTH0_URL

router.get('/', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "GET");
  if (!status) {
    var cursor = getCursor(req.query);
    getDocuments(USER, LIMIT, cursor, null, complete);

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

router.post('/', (req, res, next) => {
  var status = correctHeaders(req, "POST");
  if (!status) {
      if (correctPOSTParameters(req.body, PARAMETERS)) {
        var access_token;
        var body = {"client_id": CLIENT_ID,"audience":AUDIENCE,"grant_type":"client_credentials"}

        var options = { method: 'POST',
        url: 'https://jc-osu493.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body) };


        request(options, function (error, response, body) {
          if (error) throw new Error(error); 

          body = JSON.parse(body);
          access_token = body.access_token;

          const username = req.body.username;
          const password = req.body.password;
          var user_metadata = req.body.user_metadata;
          var options = { method: 'POST',
          url: AUTH0_URL,
          headers: { 'content-type': 'application/json',
                    'Authorization': 'Bearer ' + access_token
          },
          body:  {
              "connection": "Username-Password-Authentication",
              "email": username, 
              "password": password,
              "user_metadata": user_metadata, 
              "email_verified": false, 
              "verify_email": false, 
              "app_metadata": {}
            },
          json: true };
          request(options, (error, response, body) => {
              if (error){
                  next(error);
                  return;
              } else {
                  if (!body.statusCode) {
                    createDocument(USER, {"name": username, "auth0": body.user_id, "user_metadata": user_metadata}, complete)
                }
                else {
                  res.status(body.statusCode).send(body);
                }         
            }
        });
      });
    }
    else {
      res.status(403).send("Invalid parameters. Body must contain username, password, and user_metadata");
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

router.get('/:user', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "GET");
  var userInfo;
  if (!status) {     
      getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
        userInfo = response; 
        getDocument(USER, req.params.user, complete);
      });
  }
  else {
    next({"code": status})
    return;
  }

  function complete(err, userDB) {
    if (err) {
      next(err);
      return;
    }
    if (userInfo.name == userDB.name) {
      res.status(200).json(userDB);
    }
    else {
      res.status(403).send("Non-owner");
    }
  }
});


router.put('/:user', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "PUT");
  var userInfo;
  if (!status) {
      if (correctPUTParameters(req.body, ["user_metadata"])) {
        getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
          userInfo = response;
          getDocument(USER, req.params.user, function (err, user) {  
            if (userInfo.name == user.name){     
              var access_token;
              var body = {"client_id": CLIENT_ID,"audience":AUDIENCE,"grant_type":"client_credentials"};

              var options = { method: 'POST',
              url: AUTH0_URL,
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body)};


              request(options, function (error, response, body) {
                if (error) throw new Error(error); 

                body = JSON.parse(body);
                access_token = body.access_token;
              
                var user_metadata = req.body.user_metadata;
                var options = { method: 'PATCH',
                url: AUTH0_URL + '/' + user.auth0,
                headers: { 'content-type': 'application/json',
                          'Authorization': 'Bearer ' + access_token
                },
                body:
                    {
                    "user_metadata": user_metadata, 
                    },
                json: true };
                request(options, (error, response, body) => {
                    console.log(body);
                    if (error){
                        next(error);
                        return;
                    } else {
                        if (!body.statusCode) {
                          getDocument(USER, req.params.user, function (err, user) {
                            if (err) {
                              next(err);
                              return
                            }
                            else {
                              user.user_metadata = user_metadata;
                              editDocument(USER, req.params.user, user, complete);
                            }
                          });                      
                        }
                        else {
                          res.status(body.statusCode).send(body);
                        }         
                    }
              });
            });
          }
          else {
            res.status(403).send("You cannot edit another user's account");
          }
        });
      });
    }    
    else {
      res.status(403).send("Invalid parameters. Body may include user_metadata");
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
    res.status(200).json(response);        
  }
}
});

router.delete('/:user', jwtCheck, (req, res, next) => {
  var status = correctHeaders(req, "GET");
  var numTeams = 0;
  var teamCount = 0;
  var userInfo;
  if (!status) {
      getUserInfo(req.headers.authorization.split(' ')[1], function (err, response) {
        userInfo = response;
        getDocument(USER, req.params.user, function (err, user) {  
          if (err) {
            next(err);
            return;
          }
          if (userInfo.name == user.name){     
            var access_token;
            var body = {"client_id": CLIENT_ID,"audience":AUDIENCE,"grant_type":"client_credentials"};

            var options = { method: 'POST',
            url: AUTH0_URL,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body) };

            request(options, function (error, response, body) {
              if (error) throw new Error(error); 

              body = JSON.parse(body);
              access_token = body.access_token;
          
              var options = { method: 'DELETE',
              url: AUTH0_URL + '/' + user.auth0,
              headers: { 'content-type': 'application/json',
                        'Authorization': 'Bearer ' + access_token
              },
              json: true };
              request(options, (error, response, body) => {
                  if (error){
                      next(error);
                      return;
                  } else {
                      if (response.statusCode == 204) {
                        selectWhere(TEAM, "owner", userInfo.name, null, null, returnTeams);                                      
                      }
                      else {
                        res.status(response.statusCode).send(response.statusMessage);
                      }         
                  }
              });
            });
          }
          else {
            res.status(403).send("You cannot delete another user's account");
          }
        });
      });
  }
  else {
    next({"code": status})
    return;
  }

function returnTeams(err, obj) {
  if (err) {
    next(err);
    return;
  }
  else {
    var teams = obj.items;
    numTeams = teams.length;
    if (numTeams == 0) {
      complete(null);
    }
    else {
      for (var i = 0; i < teams.length; i++) {
        teams[i].owner = null;
        editDocument(TEAM, teams[i].id, teams[i], complete);
      }
    }
  }
}

function complete(err) {
  teamCount = teamCount + 1;
  if (err) {
    next(err);
    return;
  }
  else {
    if (teamCount >= numTeams) {
      deleteDocument(USER, req.params.user, function (err) {
        if (err) {
          next(err);
          return;
        }
        else {
          res.status(204).end(); 
        }
      })
    }       
  }
}
});

router.put('/', (req, res, next) => {
  res.status(405).end();
});

router.delete('/', (req, res, next) => {
  res.status(405).end();
});

router.delete('/:user', jwtCheck, (req, res, next) => {
  res.status(405).end();
});

module.exports = router;
