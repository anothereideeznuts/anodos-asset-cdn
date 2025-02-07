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
(Get-ChildItem -Recurse ${ARTIFACTS_RIPPER_DIR}).FullName

npm run remove:duplicated-assets -- ${ARTIFACTS_DIR}
python preprocess.py

Move-Item ${ARTIFACTS_DIR}\* . -Force

New-Item Book -ItemType directory -Force
New-Item Texture2D -ItemType directory -Force
New-Item VideoClip -ItemType directory -Force

Move-Item MonoBehaviour\* Book -Include *.book.json,*.chapter.json -Force
Get-ChildItem ${ARTIFACTS_RIPPER_DIR}\ExportedProject\Assets\UAnados\Resources_moved\Texture\Sprite\* -Include *.mp4 -Recurse | Move-Item -Destination VideoClip -Force
Move-Item ${ARTIFACTS_RIPPER_DIR}\ExportedProject\Assets\Texture2D\*.png .\Texture2D -Force

Remove-Item Env:\DOWNLOAD_ALL
Remove-Item AssetRipper.zip -Force
Remove-Item ${BUNDLES_DIR} -Recurse -Force
Remove-Item ${ARTIFACTS_DIR} -Recurse -Force
Remove-Item ${ARTIFACTS_RIPPER_DIR} -Recurse -Force
Remove-Item TextAsset -Recurse -Force