# Aegis Web Browser

Open-source publication preparation for Aegis Web 5.8.5.1 (Electron-based browser).

## Current status

The public [5.8.5.1 release](https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/tag/5.8.5.1) distributes Windows and macOS binaries. The recovered application source is being reviewed before publication. **Do not assume these binaries have been independently verified against the published code.**

See [SOURCE-STATUS.md](SOURCE-STATUS.md) for the exact verification scope and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Build instructions (once source is added)

Requires Node.js and npm. The recovered package declares Electron 44.9.3 and electron-builder 26.16.1.

```bash
npm install
npm start
npm run build
```

The build commands are sourced from the recovered `package.json`, but a complete successful build has not yet been established. The Windows build requires Windows for the intended target.

## License

The recovered package metadata says `MIT`; the project owner must confirm rights and add the license text before this repository can be presented as fully MIT-licensed. Third-party components retain their own licenses.

## Support

https://buymeacoffee.com/aegisweb
