// Node modules.
import { dirname } from "path";
import _ from "lodash";
import fs from "fs-extra";
import fetch, { RequestInit } from "node-fetch";
import appRoot from "app-root-path";

const API_URL = "https://habxbit.com/api/applist";
const STATIC_URL =
  "https://api.anothereidos-r.net/download/addressable/Android";
const BASE_FETCH_OPTIONS = {
  headers: { "User-Agent": `ANADOS` },
};
const BUNDLES_DIR = `${appRoot}/bundles`;
const ASSETLIST_PATH = `${appRoot}/version/assetList.Android`;
const ASSET_REGEX_LIST = [
  /(utage(chr|spr|scenarios)|(weapon(icon|frame))_separate)_assets/,
  /characterimage(fs|full)/,
  /utagebg_assets_texture\/bg\/((?!bg_|fullscreen)|(bg_ssf))/
]
async function getVersion(options: RequestInit) {
  const res = await fetch(API_URL, options);

  if (res.ok) {
    // { ..., "apps": [{ ... , "version": "4.0.5.0", ... }, ...]}
    const resp = (await res.json()) as any;
    return resp.apps[0].version;
  } else {
    return "";
  }
}

async function getDiffAssetList(options: RequestInit, appVersion: string) {
  const url = `${STATIC_URL}/catalog_2.9.4.json`;
  const res = await fetch(url, options);

  // https://api.anothereidos-r.net/download/addressable/Android/utagebg_assets_texture/bg/still01_dyne.asset_eb9df16867f3d0adbc6872b7fd072945.bundle
  const listAssets = (raw: string[]) =>
    raw
      .filter((x) => ASSET_REGEX_LIST.some((r) => x.match(r)))
      .map((x) => x.replace(`${STATIC_URL}/`, ""));

  if (res.ok) {
    const { m_InternalIds: assetList } = (await res.json()) as any;
    await fs.writeFile(`${ASSETLIST_PATH}.cache`, assetList.join("\n"));

    const currentAssetList = listAssets(assetList);
    let previousAssetList = listAssets(
      (await fs.readFile(ASSETLIST_PATH, "utf-8")).split("\n")
    );

    const downloadAll = process.env.DOWNLOAD_ALL;
    console.log(`DownloadAll: ${downloadAll}`);
    if (downloadAll && downloadAll != "0") {
      previousAssetList.length = 0;
    }

    console.log(currentAssetList);
    console.log(previousAssetList);

    const differentAssetList = _.differenceBy(
      currentAssetList,
      previousAssetList,
      (x) => {
        let match = x.match(/_([0-9a-f])+\.bundle/);
        return match?.groups ? match.groups[1] : "invalid";
      }
    );

    console.log(differentAssetList);

    return differentAssetList;
  }

  return [];
}

async function downloadAsset(filePath: string) {
  const url = `${STATIC_URL}/${filePath}`;
  const res = await fetch(url);

  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(`${BUNDLES_DIR}/${filePath}`);
    if (res?.body) {
      res.body.pipe(fileStream);
      res.body.on("error", reject);
    } else {
      throw new Error("No response found.")
    }
    fileStream.on("finish", resolve);
  });
}

async function main() {
  // Step 1: get app version info.
  const appVersion = await getVersion(BASE_FETCH_OPTIONS);
  const options = {
    ...BASE_FETCH_OPTIONS,
    headers: {
      ...BASE_FETCH_OPTIONS.headers,
      "User-Agent": `ANADOS/${appVersion}`,
    },
  };

  // Store the version info.
  if (appVersion === "") {
    console.warn("Cannot get version from server");
    process.exit(0);
  }

  console.log(`Version: ${appVersion}`);

  // Step 2: get asset list and download the assets.
  const assetList = await getDiffAssetList(options, appVersion);

  let failed: string[] = [];

  let i = 0;
  for await (const asset of assetList) {
    const index = i++;
    await fs.mkdirp(`${BUNDLES_DIR}/${dirname(asset)}`);
    try {
      await downloadAsset(asset);
      console.log(`[${index} / ${assetList.length}] ${asset}`);
    } catch (e) {
      failed.push(asset);
      let filePath = `${BUNDLES_DIR}/${asset}`;
      console.warn(`[${index} / ${assetList.length}] ${asset}`);
      fs.pathExists(filePath, (_, exists) => {
        if (exists) {
          console.log("File exists. Deleting now ...");
          fs.unlinkSync(filePath);
        } else {
          console.log("File not found, so not deleting.");
        }
      });
    }
  }

  // Step 3: Retire old assetList.Android.
  await fs.remove(ASSETLIST_PATH);
  await fs.move(`${ASSETLIST_PATH}.cache`, ASSETLIST_PATH);

  console.log("Download finished");
  console.log("Failed:", failed);
}

main();
