$BUNDLES_DIR = "bundles"
$ARTIFACTS_DIR = "artifacts"
$ARTIFACTS_RIPPER_DIR = "ripper-output"
$ASSET_RIPPER_VERSION = "0.3.4.0"
$BUNDLE_COUNT = 0

New-Item -Path . -Name ${BUNDLES_DIR} -ItemType directory -Force
$env:DOWNLOAD_ALL = "0"
npm run download:bundles
$BUNDLE_COUNT = (Get-ChildItem ${BUNDLES_DIR} | Measure-Object).Count
Write-Output "BUNDLE_COUNT: ${BUNDLE_COUNT}"

python extract.py ${BUNDLES_DIR} ${ARTIFACTS_DIR}

cmd /c "curl.exe -L https://github.com/AssetRipper/AssetRipper/releases/download/${ASSET_RIPPER_VERSION}/AssetRipper_win_x64.zip > AssetRipper.zip"
Expand-Archive -Path AssetRipper.zip -DestinationPath AssetRipper -Force
.\AssetRipper\AssetRipper.exe ${BUNDLES_DIR} -o ${ARTIFACTS_RIPPER_DIR} -q
(Get-ChildItem -r ${ARTIFACTS_RIPPER_DIR}).FullName
Remove-Item ${BUNDLES_DIR} -r -force

npm run remove:duplicated-assets -- ${ARTIFACTS_DIR}

python preprocess.py

Remove-Item Env:\DOWNLOAD_ALL