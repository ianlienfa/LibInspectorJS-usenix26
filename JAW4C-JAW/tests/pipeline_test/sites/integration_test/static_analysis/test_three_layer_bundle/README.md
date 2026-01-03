# Three Layer Nested Dependencies Test

## Purpose
Tests library detection through three layers of module dependencies where libraries are only imported at the deepest layer.

## Dependency Structure

```
index.js (entry)
    └── layer1.js (Top Layer)
        └── layer2.js (Middle Layer)
            └── layer3.js (Deepest Layer)
                ├── jQuery 3.4.0
                └── Lodash 4.17.21
```

## Layer Details

### Layer 3 (Deepest) - `layer3.js`
- **Direct library usage**: Imports jQuery and Lodash
- **Functions**:
  - `createElement(tagName, text)` - jQuery element creation
  - `findElements(selector)` - jQuery selector
  - `getFirstThree(array)` - Lodash array operation
  - `cloneData(obj)` - Lodash object cloning

### Layer 2 (Middle) - `layer2.js`
- **Wraps layer3 functions**: No direct library imports
- **Functions**:
  - `makeHeader(text)` - Wraps `createElement`
  - `getAllParagraphs()` - Wraps `findElements`
  - `getTopThree(items)` - Wraps `getFirstThree`
  - `safeCopy(data)` - Wraps `cloneData` with additional logic

### Layer 1 (Top) - `layer1.js`
- **Uses layer2 wrappers**: No direct library imports
- **Function**:
  - `initApp()` - Application logic using all layer2 functions

## Expected Detection Results

Both jQuery 3.4.0 and Lodash 4.17.21 should be detected using PTV method on lifted bundles.

See `ans.json` for expected results.

## Build

```bash
npm install
npm run build
```

## Test Configuration

- **Mode**: Production
- **Bundler**: Webpack 5
- **Code Splitting**: Enabled (vendors bundle separate)
- **Output**: `dist/` directory
