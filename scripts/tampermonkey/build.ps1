param(
    [string]$SourceDir = (Join-Path $PSScriptRoot "..\..\src"),
    [string]$OutputDir = (Join-Path $PSScriptRoot "dist"),
    [string]$Version = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$srcDir = (Resolve-Path -LiteralPath $SourceDir).Path
$manifestPath = Join-Path $srcDir "manifest.json"
$scriptVersion = $Version

if (-not $scriptVersion) {
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "manifest.json not found in SourceDir: $srcDir"
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $scriptVersion = $manifest.version
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

function Convert-ToFileUri {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $resolved = (Resolve-Path -LiteralPath $Path).Path
    return ([Uri]$resolved).AbsoluteUri
}

function Build-UserScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [Parameter(Mandatory = $true)]
        [string[]]$Matches,
        [Parameter(Mandatory = $true)]
        [string[]]$Requires,
        [Parameter(Mandatory = $true)]
        [string]$OutputFile
    )

    $header = @(
        "// ==UserScript=="
        "// @name         $Name"
        "// @namespace    https://tampermonkey.net/"
        "// @version      $scriptVersion"
        "// @description  $Description"
        "// @author       DocsAutofill"
    )

    foreach ($match in $Matches) {
        $header += "// @match        $match"
    }

    foreach ($requirePath in $Requires) {
        $absolutePath = Join-Path $srcDir $requirePath
        $header += "// @require      $(Convert-ToFileUri -Path $absolutePath)"
    }

    $header += @(
        "// @run-at       document-idle"
        "// @grant        none"
        "// ==/UserScript=="
        ""
        "// Entrypoint is intentionally empty: all logic is loaded via @require."
    )

    Set-Content -LiteralPath $OutputFile -Value ($header -join "`r`n") -Encoding UTF8
}

Build-UserScript `
    -Name "DocsAutofill (Beer)" `
    -Description "Autofill documents for beer.crpt.ru" `
    -Matches @("https://beer.crpt.ru/requests/connect-tap/create*") `
    -Requires @(
        "config.js",
        "libs/xlsx.full.min.js",
        "utils/notifications.js",
        "utils/react.js",
        "utils/clipboard.js",
        "utils/buttons.js",
        "utils/init_message.js",
        "pages/beer.js"
    ) `
    -OutputFile (Join-Path $OutputDir "docsautofill-beer.user.js")

Build-UserScript `
    -Name "DocsAutofill (Milk)" `
    -Description "Autofill documents for milk.crpt.ru" `
    -Matches @("https://milk.crpt.ru/*") `
    -Requires @(
        "config.js",
        "utils/notifications.js",
        "utils/react.js",
        "utils/clipboard.js",
        "utils/buttons.js",
        "utils/init_message.js",
        "pages/cheese.js"
    ) `
    -OutputFile (Join-Path $OutputDir "docsautofill-milk.user.js")

Write-Host "Generated:"
Write-Host " - $(Join-Path $OutputDir 'docsautofill-beer.user.js')"
Write-Host " - $(Join-Path $OutputDir 'docsautofill-milk.user.js')"
