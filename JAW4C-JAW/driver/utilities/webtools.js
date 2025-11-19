const { URL } = require('url');

function parseUrl(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.host === '240.240.240.240'){
    // handle archive urls, just take the target part with encoding
    target = parsedUrl.search.split('target=')[1];
    return decodeURIComponent(target);
  }
  return url;
}

function urlToDirectoryName(url) {    
    try {
      // Parse the URL
      let dirName = ""
      const parsedUrl = new URL(url);
      if(parsedUrl.host === '240.240.240.240'){
        // handle archive urls, just take the target part with encoding
        dirName = parsedUrl.search.split('target=')[1];
      }
      else 
      {        
        // Get the hostname (domain)
        dirName = parsedUrl.hostname;
        
        // Add the pathname (without the leading slash)
        if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
          dirName += parsedUrl.pathname;
        }
        
        // Replace invalid file system characters
        // Different OSes have different restrictions, so we'll be conservative
        dirName = dirName
          .replace(/^https?:\/\//, '') // Remove protocol
          .replace(/[\/\\:*?"<>|]/g, '_') // Replace invalid chars with underscore
          .replace(/\s+/g, '_') // Replace spaces with underscore
          .replace(/\.+/g, '.') // Replace multiple dots with single dot
          .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
          .replace(/^[._]+|[._]+$/g, ''); // Remove leading/trailing dots and underscore             
        
        // add back the port and protocol
        dirName = `${parsedUrl.protocol.replace(':', '')}_${dirName}_${parsedUrl.port}`;    
      }
      
      // Trim to reasonable length if needed
      if (dirName.length > 100) {
        dirName = dirName.substring(0, 100);
        // Add hash to avoid collisions with similar directory names
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
        dirName = `${dirName}_${hash}`;
      }   
      return dirName || 'default_directory';

    } catch (error) {
      // Fall back to a simple sanitization for invalid URLs
      return url
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .substring(0, 100) || 'default_directory';
    }
  }
  

module.exports = {
    parseUrl,
    urlToDirectoryName
};