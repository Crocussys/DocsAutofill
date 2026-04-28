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

or:

```bash
bash scripts/tampermonkey/build.sh
```

Output directory:

`scripts/tampermonkey/dist`

You can also point build to any copied source directory:

```powershell
.\scripts\tampermonkey\build.ps1 -SourceDir "C:\Path\DocsAutofill" -OutputDir "C:\Path\DocsAutofill\tampers"
```

```bash
bash scripts/tampermonkey/build.sh --source-dir "/path/DocsAutofill" --output-dir "/path/DocsAutofill/tampers"
```

## Install Flow

`scripts/install.bat` and `scripts/install.sh` now do all steps automatically:

1. Copy `src/*` into the target DocsAutofill folder.
2. Create `tampers` inside that target folder.
3. Build `docsautofill-*.user.js` in `tampers` with `@require` paths pointing to the installed files.

## Install into Tampermonkey

1. Open `chrome://extensions`.
2. Enable `Allow access to file URLs` for Tampermonkey.
3. Open Tampermonkey Dashboard and select `Utilities -> Import from file`.
4. Import both files from the target `tampers` folder created by install.

## Notes

- Re-run install (or build with `--source-dir`) after any changes in `src/`.
- If target path changes, rebuild userscripts because `file:///` paths are absolute.
