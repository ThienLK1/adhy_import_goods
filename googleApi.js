const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SPREAD_SHEET_ID = '1kO0LKRjzR7usYh7GHUWbRSAX_AVSu-_IG3uUeLX9zDE';
let sheets = null;

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

const writeData = async (spreadsheetId, range, values) => {
    if (!sheets) {
        sheets = await getSheet();
    }
    const resource = {
        values,
    };
    sheets.spreadsheets.values.append(
        {
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: resource,
        },
        (err, result) => {
            if (err) {
                // Handle error
                console.log(err);
            } else {
                console.log(
                    '%d cells updated on range: %s',
                    result.data.updates.updatedCells,
                    result.data.updates.updatedRange
                );
            }
        }
    );
}

const createMetadata = async (spreadsheetId, sheetId, id, key, value) => {
    if (!sheets) {
        sheets = await getSheet();
    }
    await sheets.spreadsheets.batchUpdate(
        {
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        createDeveloperMetadata: {
                            developerMetadata: {
                                location: {
                                    sheetId
                                },
                                metadataId: id,
                                metadataKey: key,
                                metadataValue: value,
                                visibility: "DOCUMENT"
                            }
                        }
                    }
                ]
            }
        },
        (err, result) => {
            if (err) {
                // Handle error
                console.log(err);
            } else {
                console.log(
                    result.data
                );
            }
        }
    );
    return true;
}

const updateMetadata = async (spreadsheetId, sheetId, id, key, value) => {
    console.log('updateMetadata', sheetId, id, key, value)
    if (!sheets) {
        sheets = await getSheet();
    }
    rs = await sheets.spreadsheets.batchUpdate(
        {
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        updateDeveloperMetadata: {
                            dataFilters: [
                                {
                                    developerMetadataLookup: {
                                        metadataId: id
                                    }
                                }
                            ],
                            developerMetadata: {
                                location: {
                                    sheetId
                                },
                                metadataId: id,
                                metadataKey: key,
                                metadataValue: value,
                                visibility: "DOCUMENT"
                            },
                            fields: "metadataValue"
                        }
                    }
                ]
            }
        }
    )
    console.log('updateMetadata', sheetId, id, key, value,'ok');
    return rs;
}

const renameSheet = async (spreadsheetId, sheetId, title) => {
    console.log('renameSheet to ', title);
    if (!sheets) {
        sheets = await getSheet();
    }
    sheets.spreadsheets.batchUpdate(
        {
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                title,
                                sheetId
                            },
                            fields: "title"
                        }
                    }
                ]
            }
        },
        (err, result) => {
            if (err) {
                // Handle error
                console.log(err);
            } else {
                console.log(
                    result.data
                );
            }
        }
    )
}

const getMetadata = async (spreadsheetId,metadataId) => {
    console.log('getMetadata');
    if (!sheets) {
        sheets = await getSheet();
    }
    console.log('getMetadata get');
    const rs = await sheets.spreadsheets.developerMetadata.get(
        {
            spreadsheetId,
            metadataId
        }
    )
    return rs.data;
}

const checkSheet = async (ranges) => {
    console.log('checkSheet');
    if (!sheets) {
        sheets = await getSheet();
    }
    try {
        const rs = await sheets.spreadsheets.get({
            spreadsheetId: SPREAD_SHEET_ID,
            ranges
        })
        console.log('rs get', rs.status);
        return {
            status: rs.status,
            data: rs.data
        };
    } catch (err) {
        // console.log('errrrrrrrrrrr', err);
        return {
            status: err.code,
            data: ''
        };
    }
}

const sheetCopyTo = async (spreadsheetId, sheetId, destinationSpreadsheetId) => {
    if (!sheets) {
        sheets = await getSheet();
    }
    try {
        const rs = await sheets.spreadsheets.sheets.copyTo({
            spreadsheetId,
            sheetId,
            requestBody: {
                destinationSpreadsheetId
            }
        })
        return rs.data;
    } catch (err) {
        console.log('sheetCopyTo errr', err);
        return err.code;
    }
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        range: 'Class Data!A2:E',
    });
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return;
    }
    console.log('Name, Major:');
    rows.forEach((row) => {
        // Print columns A and E, which correspond to indices 0 and 4.
        console.log(`${row[0]}, ${row[4]}`);
    });
}
async function getSheet() {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
}
module.exports = {
    writeData,
    createMetadata,
    updateMetadata,
    getMetadata,
    renameSheet,
    sheetCopyTo,
    checkSheet
};