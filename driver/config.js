// const PTdetectorExtensionPath = '/home/ian/BundlerResearch/Bundle-PTV';
// const PTdetectorExtensionId = 'mgmamlecpkakbphhnfciemcofnmdaakg';
const PTVExtensionPath = '/home/ian/BundlerResearch/Bundle-PTV';
const PTVOriginalExtensionPath = '/home/ian/BundlerResearch/PTV';
const ProxyServerPath = 'http://localhost:8002';
const JAWPath = "/home/ian/BundlerResearch/CVE-JAW"

const PTVPuppeteerLaunchConfig = {
  headless: true, // Extensions won't work in headless mode
  args: [              
      `--disable-extensions-except=${PTVExtensionPath}`,
      `--load-extension=${PTVExtensionPath}`,
      `--proxy-server=${ProxyServerPath}`,
      `--ignore-certificate-errors`,
      `--disk-cache-dir=/dev/null`, 
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