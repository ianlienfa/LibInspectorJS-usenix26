const fs = require('fs');
const path = require('path');

const analysisDir = path.join(__dirname, 'analysis');
const outputFile = path.join(__dirname, 'error-process.json');

const errorProcess = {};

try {
  const files = fs.readdirSync(analysisDir);
  const resultFiles = files.filter(file => file.endsWith('_results.json'));

  for (const file of resultFiles) {
    const filePath = path.join(analysisDir, file);
    const libraryName = file.replace('_results.json', '');
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      errorProcess[libraryName] = {
        lastUpdated: data.analysisTimestamp || new Date().toISOString(),
        misdetections: data.misdetectionVersions
      };

    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      errorProcess[libraryName] = {
        lastUpdated: new Date().toISOString(),
        misdetections: [],
        processingError: error.message
      };
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(errorProcess, null, 2));
  console.log(`Processed ${resultFiles.length} files. Output written to error-process.json`);

} catch (error) {
  console.error('Error processing files:', error.message);
}