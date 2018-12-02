# REST API

## Summary
This was my final project for my CS493 Cloud Aplication Development course. 

### Entities
There are three entities: Users, Teams, and Players

### Relationships
There exists a one-to-many relationship between users and teams and a one-to-many relationship between teams and players

### Storage
Google Cloud Data Store (NoSQL)

### Authentication/Authorization
JWT tokens and Auth0

### Deployment
Google App Engine

### Status Codes
200, 201, 204, 303, 400, 401, 403, 404, 405, 406, 415, and 500 codes are all supported and listed in the documentation.

### Tests
I created a Node-RED Application to test the functionality of the API. The code is stored in the Node-RED directory in the repository. To run the tests, create a Node-RED application and import the JSON code. 

# Routes


	

### POST/api/login

#### Required:

* Headers

  - Accept: application/json

* Body:

  - username (STRING)
  - password (STRING)

#### Response:

* 200: An object with the following format
* 401: Invalid grant
* 403: Invalid/missing field(s)
* 406: Invalid Accept header

#### Example Response body:
```
{
  access_token: STRING,
  id_token: STRING,
  expires_in: INT,
  token_type: STRING
}
```

#### Notes:

* The Bearer access token is required for all subsequent requests in the ** Authorization field
* The body of the request must contain the exact three fields mentioned. Otherwise it will fail and return a 403 error code.

### GET /api/users

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token
  
#### Optional: 
* Datastore query cursor 

#### Response:

* 200: An array of objects
* 401: No token
* 406: Invalid ** Accept header

#### Example Response:
```
body:

{

	name: STRING,

	location: STRING,

	year_established: INT,

	Id: STRING,

	self: STRING,

	players: ARRAY,

	owner: STRING

}

next: STRING,

count: INT
```

#### Notes:

* This request is paginated. It returns 5 results as well as a link to the next 5 objects. 
* The count field indicates the total number of entities
* Self is a full link to the object.
* Players is an array of player objects that are on the team

### POST/api/users

#### Required:

* Headers
  - Accept: application/json

* Body:
  - username (STRING)
  - password (STRING)
  - user_metadata (OBJECT)

#### Response:

* 201: The newly created DB document. It will have the three fields of the request as well as the newly generated ID, self link, and auth0 ID.
* 403: Invalid/missing field(s)
* 406: Invalid ** Accept header
* 409: Reserved username

#### Notes:

* The body of the request must contain the exact three fields mentioned. Otherwise it will fail and return a 403 error code.

### PUT /api/users

#### Response:

* 401: No token
* 405: Invalid request
* 406: Invalid Accept header

### DELETE /api/users

#### Response:

* 401: No token
* 405: Invalid request
* 406: Invalid Accept header


### GET /api/users/{user_id}

#### Required:

* Headers

  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - team_id (STRING)

#### Response:

* 200: The DB document with the matching ID.
* 401: No token
* 403: Not authorized
* 404: Not found
* 406: Invalid Accept header

### PUT /api/teams/{team_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - team_id (STRING)

#### Optional:

* Body:

  - user_metadata (OBJECT)

#### Response:

* 303:: Empty body. See Location header for link to object
* 401: No token
* 403: Not authorized
* 403: Invalid field(s)
* 404: Not found
* 406: Invalid Accept header

#### Notes:

* If the user_id is not found, it will return a 404 error.
* Only the specified field may be included in the body. Otherwise it will return a 403 error.

### DELETE /api/user/{user_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

#### Response:

* 204:: Successful delete
* 401: No token
* 406: Invalid Accept header

#### Notes:

* If a user owns any teams, the relationship will be deleted by setting the owner field in the Team entity object to null

### GET /api/teams

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

#### Optional: 
 * Datastore query cursor #### Response:

#### Response: 
* 200: An array of objects
* 401: No token
* 406: Invalid Accept header

#### Example Response:
```

body:

{

	name: STRING,

	location: STRING,

	year_established: INT,

	Id: STRING,

	self: STRING,

	players: ARRAY,

	owner: STRING

}

next: STRING,

count: INT
```

#### Notes:

* This request is paginated. It returns 5 results as well as a link to the next 5 objects.
* The count field indicates the total number of entities
* Self is a full link to the object.
* Players is an array of player objects that are on the team

### POST/api/teams

#### Required:

* Headers
  - Accept: application/json
  -Authorization: Bearer JWT access token

* Body:
  - name (STRING)
  - location (STRING)
  - year_established (INT)

#### Response:

* 201: The newly created DB document. It will have the three fields of the request as well as the newly generated ID, self link, owner field, and empty players array.
* 401: No token
* 403: Invalid/missing field(s)
* 406: Invalid ** Accept header

#### Notes:

* The body of the request must contain the exact three fields mentioned. Otherwise it will fail and return a 403 error code.


### PUT /api/teams

#### Response:

* 401: No token
* 405: Invalid request
* 406: Invalid Accept header

### DELETE /api/teams

#### Response:

* 401: No token
* 405: Invalid request
* 406: Invalid Accept header

### GET /api/teams/{team_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - team_id (STRING)

#### Response:

* 200: The DB document with the matching ID.
* 401: No token
* 403: Not authorized
* 404: Not found
* 406: Invalid Accept header


### PUT /api/teams/{team_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - team_id (STRING)
 

#### Optional:

* Body:
  - name (STRING)
  - location (STRING)
  - year_established (INT)

#### Response:

* 303: Empty body. See Location header for link to object
* 401: No token
* 403: Not authorized
* 403: Invalid field(s)
* 404: Not found
* 406: Invalid Accept header

#### Notes:

* If the team_id is not found, it will return a 404 error.
* Only the 3 specified fields may be included in the body. Otherwise it will return a 403 error.


### DELETE /api/teams/{team_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - team_id (STRING)

#### Response:

* 204:: Success
* 401: No token
* 403: Not authorized
* 404: Not found
* 406: Invalid Accept header

#### Notes:
* If the Team contains players, the team property of the Player objects is set to null

### GET /api/players

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

#### Optional:
* Datastore query cursor
 
#### Response:

* 200: An array of objects where items[i] has the following format
* 401: No token
* 406: Invalid Accept header

#### Example Response:
```

body:

{

	name: STRING,

	team: TEAM object,

	height: INT,

	age: INT,

	id: STRING,

	self: STRING

}

next: STRING,

count: INT
```

#### Notes:

* This request is paginated. It returns 5 results as well as a link to the next 5 objects.
* The count field indicates the total number of entities
* Self is a full link to the object.
* team is a Team object which a player plays for
* Height is in inches


### POST/api/players

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token
* Body:
  - height (INT),
  - age (INT),
  - name (STRING)

#### Response:

* 201: The newly created DB document. It will have the three fields of the request as well as the newly generated ID, self link, owner field, and empty team object.
* 401: No token
* 403: Invalid/missing field(s)
* 406: Invalid ** Accept header

#### Notes:
* The body of the request must contain the exact field mentioned. Otherwise it will fail and return a 403 error code.
 

### PUT /api/players

#### Response:

* 401: No token
* 405: Invalid request
* 406: Invalid Accept header

### DELETE /api/players

#### Response:
* 401: No token
* 405: Invalid request
* 406: Invalid Accept header


### GET /api/players/{player_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - player_id (STRING)

#### Response:

* 200: The DB document with the matching ID.
* 401: No token
* 404: Not found
* 406: Invalid Accept header

#### Notes:
* If the ID is not found, it will return a 404 error.

### PUT /api/players/{players_id}

#### Required:
* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - Players_id (STRING)

#### Optional:
* Body:
  - height (INT)
  - age (INT)
  - name (STRING) 

#### Response:

* 303: Empty body. See Location header for link to object
* 401: No token
* 403: Invalid field(s)
* 404: Not found
* 406: Invalid Accept header

#### Notes:

* If the player_id is not found, it will return a 404 error.
* Only the specified field may be included in the body. Otherwise it will return a 403 error.
* team may only be edited via the ### PUT /api/teams/{team_id}/players/{player_id} request

### DELETE /api/players/{player_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:

  - players_id (STRING)

#### Response:

* 204: Success
* 401: No token
* 404: Not found
* 406: Invalid Accept header

#### Notes:

* If the Player is on a Team,  it  is  removed  fromplayersthatarrayobject’s


### PUT /api/teams/{team_id}/players/{player_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

* Parameters:
  - players_id (STRING)
  - team_id (STRING)

#### Response:

* 200: The edited Player DB document with the matching ID that was just loaded on the corresponding Team
* 401: No token
* 403: Not authorized
* 403: Reserved player
* 404: Not found
* 406: Invalid Accept header

#### Notes:

* If the player_id or team_id is not found, it will return a 404 error.
* If the Player already on another team, it will return a 403 error.

### DELETE /api/teams/{team_id}/players/{player_id}

#### Required:

* Headers
  - Accept: application/json
  - Authorization: Bearer JWT access token

*  Parameters:
   - player_id (STRING)
   - team_id (STRING)

#### Response:

* 200: The edited Player DB document with the matching ID.
* 401: No token
* 403: Not authorized
* 403: No existing relationship
* 404: Not found
* 406: Invalid Accept header

#### Notes:

* If the player_id or team_id is not found, it will return a 404 error.
* If the specified Player is not at the specified Team, it will return a 403 error.
* This request sets the Player object’s  carrier  property  to  nullPlayers. Itobjectalsofrom theremoves  the
* Team object’splayers array
