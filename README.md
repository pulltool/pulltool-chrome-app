# Pull Tool

A Chrome app for downloading, extracting, and patching archives from a fixed profile.

## Writing a pull profile

There's no heavy documentation for the YAML profile format right now, but here's an example profile that will download the development branch of Pull Tool, rename it, and turn the icons and title bar blue (so it can be distinguished from the production version):

```yaml
sources:
- url: https://codeload.github.com/pulltool/pulltool-chrome-app/zip/development
  type: zip
  slice:
  - from: pulltool-chrome-app-development
patch:
  files:
    manifest.json:
    - json:
        set:
          name: "Pull Tool DEVEL"
    images/pulltool-icon-16px.png:
    - png:
        setHue: 240
    images/pulltool-icon-48px.png:
    - png:
        setHue: 240
    images/pulltool-icon-128px.png:
    - png:
        setHue: 240
    background.js:
    - text:
      - replace: '#dd5500'
        with: '#6666ff'
```
