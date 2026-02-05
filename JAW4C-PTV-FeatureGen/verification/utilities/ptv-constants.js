const PTdetectorExtensionPath = '~/yyyy/zzzz-JSBundle/PTdetector';
const PTdetectorExtensionId = 'mgmamlecpkakbphhnfciemcofnmdaakg';
const PTVExtensionPath = '~/yyyy/zzzz-JSBundle/Bundle-PTV';
const PTVOriginalExtensionPath = '~/yyyy/zzzz-JSBundle/PTV';
const ProxyServerPath = '127.0.0.1:8002';
const JAWPath = "/Users/xxxx/yyyy/zzzz-JSBundle/JAW"

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