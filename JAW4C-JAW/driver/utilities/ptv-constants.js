const PTdetectorExtensionPath = '~/cmu/Cylab-JSBundle/PTdetector';
const PTdetectorExtensionId = 'mgmamlecpkakbphhnfciemcofnmdaakg';
const PTVExtensionPath = '~/cmu/Cylab-JSBundle/Bundle-PTV';
const PTVOriginalExtensionPath = '~/cmu/Cylab-JSBundle/PTV';
const ProxyServerPath = '127.0.0.1:8002';
const JAWPath = "/Users/ian/cmu/Cylab-JSBundle/JAW"

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
    PTdetectorExtensionPath, 
    PTdetectorExtensionId, 
    PTVExtensionPath,
    PTVOriginalExtensionPath,
    ProxyServerPath,
    PTVPuppeteerLaunchConfig,
    PTVOriginalLaunchConfig,
    JAWPath
}