function doGet(e) {
  const url = e.parameter.url;
  if (!url) {
    return ContentService.createTextOutput("Missing URL").setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
    });

    return ContentService
      .createTextOutput(response.getContentText())
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(`{"error": "${error.message}"}`)
      .setMimeType(ContentService.MimeType.JSON);
  }
}
