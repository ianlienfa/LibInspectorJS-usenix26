const $ = require('jquery');

// jQuery 3.4.0 is vulnerable to CVE-2020-7656
console.log('jQuery version:', $.fn.jquery);
