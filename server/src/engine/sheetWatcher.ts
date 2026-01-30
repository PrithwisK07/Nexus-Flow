import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
    keyFile: `D://nexus-flow//src//google-service-account.json`,
    scopes: "https://www.googleapis.com/auth/spreadsheets",
})

export const readSheet = async (spreadsheetId: string, range: string = "Sheet1!A2:Z") => {
    const client = await auth.getClient();
    const googleSheets = google.sheets({
        version: "v4",
        auth: client as any
    });

    const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    });
    return response.data.values || [];
}

export const updateCell = async (spreadsheetId: string, range: string, value: string) => {
    const client = await auth.getClient();
    const googleSheets = google.sheets({
        version: "v4",
        auth: client as any
    });

    await googleSheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: [[value]], 
        },
    });
}