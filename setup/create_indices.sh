#!/bin/bash

# Create the 'users' index
curl -X PUT "http://localhost:9200/users" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "email": { "type": "keyword" },
      "localId": { "type": "keyword" },
      "accessToken": { "type": "text" },
      "refreshToken": { "type": "text" },
      "fetchedEmails": { "type": "boolean" },
      "lastSyncTime": { "type": "date" }
    }
  }
}
'

# Create the 'email_messages' index
curl -X PUT "http://localhost:9200/email_messages" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "userId": { "type": "keyword" },
      "messageId": { "type": "keyword" },
      "subject": { "type": "text" },
      "body": { "type": "text" },
      "receivedDate": { "type": "date" }
    }
  }
}
'
