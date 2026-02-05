// const PTdetectorExtensionPath = '/home/xxxx/BundlerResearch/Bundle-PTV';
// const PTdetectorExtensionId = 'mgmamlecpkakbphhnfciemcofnmdaakg';
// TODO: how to get these from docker config?
const PTVExtensionPath = '/JAW4C/JAW4C-PTV';
const PTVOriginalExtensionPath = '/JAW4C/JAW4C-PTVOriginal';
const ProxyServerPath = 'http://proxy:8002';  // localhost (when)?
const JAWPath = "/JAW4C/JAW4C-JAW"

// const PTVExtensionPath = '/home/xxxx/JAW4C/JAW4C-PTV';
// const PTVOriginalExtensionPath = '/home/xxxx/BundlerResearch/PTV';
// const ProxyServerPath = 'http://localhost:8002';
// const JAWPath = "/home/xxxx/JAW4C/JAW4C-JAW"

const PTVPuppeteerLaunchConfig = {
  headless: true, // Extensions won't work in headless mode
  args: [              
      `--disable-extensions-except=${PTVExtensionPath}`,
      `--load-extension=${PTVExtensionPath}`,
      `--proxy-server=${ProxyServerPath}`,
      `--ignore-certificate-errors`,      
      `--disk-cache-size=1`
  ]
}

const PTVOriginalLaunchConfig = {
  headless: true, // Extensions won't work in headless mode
  args: [              
      `--disable-extensions-except=${PTVOriginalExtensionPath}`,
      `--load-extension=${PTVOriginalExtensionPath}`,
      `--proxy-server=${ProxyServerPath}`,
      `--ignore-certificate-errors`,
      `--disk-cache-dir=/dev/null`, 
      `--disk-cache-size=1`
  ]
}

module.exports = {
    // PTdetectorExtensionPath, 
    // PTdetectorExtensionId, 
    PTVExtensionPath,
    PTVOriginalExtensionPath,
    ProxyServerPath,
    PTVPuppeteerLaunchConfig,
    PTVOriginalLaunchConfig,
    JAWPath
}