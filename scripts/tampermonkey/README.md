# DocsAutofill for Tampermonkey

## Overview

The project is packaged for Tampermonkey with module loading via `@require`.
The build generates two userscripts:

- `docsautofill-beer.user.js` for `https://beer.crpt.ru/requests/connect-tap/create*`
- `docsautofill-milk.user.js` for `https://milk.crpt.ru/*`

Each script references local files from `src/*` using `file:///...` URLs.

## Build

Run from repository root:

```powershell
.\scripts\tampermonkey\build.ps1
```

or:

```bat
scripts\tampermonkey\build.bat
```

Output directory:

`scripts/tampermonkey/dist`

## Install into Tampermonkey

1. Open `chrome://extensions`.
2. Enable `Allow access to file URLs` for Tampermonkey.
3. Open Tampermonkey Dashboard and select `Utilities -> Import from file`.
4. Import both files from `scripts/tampermonkey/dist`.

## Notes

- Re-run the build after any changes in `src/`.
- Re-run the build if the repository path changes, because `file:///` paths are absolute.
