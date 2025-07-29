const SHEET_URL = "https://docs.google.com/spreadsheets/d/10vhycpyIw60hMVZgDqmAFqiO1hQluDDAG6fvJ1bh6sI/edit?gid=0#gid=0";
const FOLDER_ID = "1R-gAb4MYrNLJHz8bA0MUKHFoiZNmTPdtQ9yUMyUMGjK8v1zdJcdgHvrqa1oJWd768S1KD7c4";
const ADMIN_EMAIL = "info.ajtechsolutions@gmail.com";

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        
        // Save to spreadsheet
        const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getSheets()[0];
        sheet.appendRow([
            new Date(),
            data.fullName,
            data.email,
            data.phone,
            data.applyingFor,
            data.motivation,
            data.resumeLink
        ]);

        // Send email notification
        sendEmailNotification(data);

        return ContentService.createTextOutput(
            JSON.stringify({ status: "success" })
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({ status: "error", message: error.toString() })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

function sendEmailNotification(data) {
    const subject = `New Application: ${data.fullName} for ${data.applyingFor}`;
    const htmlBody = `
        <h2>New Job Application Received</h2>
        <p><strong>Name:</strong> ${data.fullName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
        <p><strong>Position:</strong> ${data.applyingFor}</p>
        <p><strong>Motivation:</strong><br>${data.motivation}</p>
        <p><strong>Resume:</strong> <a href="${data.resumeLink}">View Resume</a></p>
    `;

    MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
        replyTo: data.email
    });
}
