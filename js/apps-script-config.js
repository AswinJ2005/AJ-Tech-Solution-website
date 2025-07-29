// --- CONFIGURATION ---
const SHEET_URL = "https://docs.google.com/spreadsheets/d/10vhycpyIw60hMVZgDqmAFqiO1hQluDDAG6fvJ1bh6sI/edit?gid=0#gid=0"; 
const FOLDER_ID = "1R-gAb4MYrNLJHz8bA0MUKHFoiZNmTPdtQ9yUMyUMGjK8v1zdJcdgHvrqa1oJWd768S1KD7c4"; 
const ADMIN_EMAIL = "info.ajtechsolutions@gmail.com";

// External Services Configuration
const CONFIG = {
    cloudinary: {
        cloudName: 'ajtechsolutions',  // Your cloud name
        uploadPreset: 'career_resumes', // Create this preset in Cloudinary
        folder: 'resumes'
    },
    googleAppsScript: {
        // Replace with your deployed Google Apps Script URL
        url: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
    }
};

// Validation helpers
const validateConfig = () => {
    if (!CONFIG.cloudinary.cloudName || !CONFIG.cloudinary.uploadPreset) {
        console.error('Cloudinary configuration is incomplete');
        return false;
    }
    if (!CONFIG.googleAppsScript.url.includes('script.google.com')) {
        console.error('Invalid Google Apps Script URL');
        return false;
    }
    return true;
};

// This function handles the incoming data from your website
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const file = Utilities.newBlob(Utilities.base64Decode(data.fileData), data.mimeType, data.fileName);
    
    // 1. SAVE THE RESUME TO GOOGLE DRIVE
    const driveFolder = DriveApp.getFolderById(FOLDER_ID);
    const savedFile = driveFolder.createFile(file);
    const resumeLink = savedFile.getUrl();
    
    // 2. SAVE THE APPLICANT DATA TO GOOGLE SHEETS
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getSheets()[0];
    sheet.appendRow([
      new Date(),
      data.fullName,
      data.email,
      data.phone,
      data.applyingFor,
      data.motivation,
      resumeLink 
    ]);
    
    // --- 3. FINAL, IMPROVED EMAIL NOTIFICATION ---
    const subject = `New Application: ${data.fullName} for ${data.applyingFor}`;
    
    const htmlBody = `
      <h2>New Job Application Received</h2>
      <p>A new candidate has applied. The full details have also been saved to your Google Sheet.</p>
      <hr>
      <h3>Applicant Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${data.fullName}</li>
        <li><strong>Email:</strong> ${data.email}</li>
        <li><strong>Phone:</strong> ${data.phone || 'Not provided'}</li>
        <li><strong>Applying for:</strong> ${data.applyingFor}</li>
      </ul>
      <h3>Motivation:</h3>
      <p>${data.motivation.replace(/\n/g, '<br>')}</p>
      <br>
      <p style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center;">
        <a href="${resumeLink}" style="color: #ffffff; background-color: #007BFF; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Uploaded Resume in Google Drive</a>
      </p>
    `;
    
    MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
        replyTo: data.email // This makes the "Reply" button work correctly.
    });

    // Return a success message back to your website's JavaScript
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Application submitted successfully." }))
      .setMeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return an error message if something fails
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Export configuration
if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec';