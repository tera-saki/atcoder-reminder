const path = require('path')
const fs = require('fs')

const { google } = require('googleapis')

function createClient() {
    const credentials = require('../credentials/credentials.json')
    const token = require('../credentials/token.json')

    const { client_secret, client_id, redirect_uris } = credentials.installed
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    auth.setCredentials(token)
    return google.calendar({ version: 'v3', auth })
}

module.exports = {
    createClient
}