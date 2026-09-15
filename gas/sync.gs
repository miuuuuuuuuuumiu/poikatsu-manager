/**
 * ポイ活マネージャー 同期用 Google Apps Script
 * ------------------------------------------------
 * これをGoogleスプレッドシートの「拡張機能」→「Apps Script」に貼り付けて、
 * ウェブアプリとしてデプロイすると、PCとスマホの間でデータを同期できるようになります。
 * セットアップ手順はアプリのREADME.mdを参照してください。
 *
 * 【最初に必ずやること】
 * 下のTOKENを、他の人には推測できない自分だけの文字列に書き換えてください。
 * これが分かってしまうと他の人でもデータを読み書きできてしまいます。
 */
const TOKEN = 'ここを自分だけの合言葉に書き換えてください';

const SHEET_NAMES = {
  projects: '案件',
  tasks: '作業',
  pointSites: 'ポイントサイト',
  images: '画像',
};

function doGet(e) {
  try {
    if (e.parameter.token !== TOKEN) return errorResponse_('合言葉が一致しません');

    if (e.parameter.action === 'ping') {
      return jsonResponse_({ status: 'ok', message: '接続できました' });
    }
    if (e.parameter.action === 'getImageBlob') {
      return getImageBlob_(e.parameter.id);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const type = e.parameter.type;

    if (type === 'settings') {
      return jsonResponse_({ status: 'ok', settings: readSettings_(ss) });
    }
    if (SHEET_NAMES[type]) {
      const result = { status: 'ok' };
      result[type] = readList_(ss, type);
      return jsonResponse_(result);
    }
    return errorResponse_('不明なtypeです: ' + type);
  } catch (err) {
    return errorResponse_(String(err));
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return errorResponse_('合言葉が一致しません');

    if (body.action === 'uploadImage') {
      return uploadImageBlob_(body);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.type === 'settings') {
      writeSettings_(ss, body.settings);
      return jsonResponse_({ status: 'ok' });
    }
    if (SHEET_NAMES[body.type]) {
      const items = body[body.type] || [];
      writeList_(ss, body.type, items);
      return jsonResponse_({ status: 'ok', count: items.length });
    }
    return errorResponse_('不明なtypeです: ' + body.type);
  } catch (err) {
    return errorResponse_(String(err));
  }
}

/* ------------------------------------------------------------------
 * 案件・作業・ポイントサイト：1行 = [id, その行の内容をまとめたJSON文字列]
 * スプレッドシート上で人が編集することは想定していないシンプルな保存領域として扱う
 * ---------------------------------------------------------------- */

function getSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function readList_(ss, type) {
  const sheet = getSheet_(ss, SHEET_NAMES[type]);
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  const values = sheet.getRange(1, 1, lastRow, 2).getValues();
  const items = [];
  values.forEach(function (row) {
    if (!row[1]) return;
    try {
      items.push(JSON.parse(row[1]));
    } catch (e) {
      // 壊れた行があっても同期全体を止めないよう、その行だけ無視する
    }
  });
  return items;
}

function writeList_(ss, type, items) {
  const sheet = getSheet_(ss, SHEET_NAMES[type]);
  sheet.clearContents();
  if (items.length === 0) return;
  const rows = items.map(function (item) {
    return [item.id, JSON.stringify(item)];
  });
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
}

function readSettings_(ss) {
  const sheet = getSheet_(ss, '設定');
  const value = sheet.getRange('A1').getValue();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

function writeSettings_(ss, settings) {
  const sheet = getSheet_(ss, '設定');
  sheet.getRange('A1').setValue(JSON.stringify(settings));
}

/* ------------------------------------------------------------------
 * 証拠画像：本体（Blob）はGoogle Driveの専用フォルダに1画像=1ファイルとして保存する
 * ---------------------------------------------------------------- */

function getImagesFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('IMAGES_FOLDER_ID');
  if (savedId) {
    try {
      return DriveApp.getFolderById(savedId);
    } catch (e) {
      // フォルダが手動で削除された場合などは、下で作り直す
    }
  }
  const folder = DriveApp.createFolder('ポイ活マネージャー画像');
  props.setProperty('IMAGES_FOLDER_ID', folder.getId());
  return folder;
}

function getImageBlob_(id) {
  const folder = getImagesFolder_();
  const files = folder.getFilesByName(id);
  if (!files.hasNext()) return errorResponse_('画像が見つかりません: ' + id);
  const file = files.next();
  const blob = file.getBlob();
  return jsonResponse_({
    status: 'ok',
    base64: Utilities.base64Encode(blob.getBytes()),
    mimeType: blob.getContentType(),
  });
}

function uploadImageBlob_(body) {
  const folder = getImagesFolder_();
  // 同じIDで再アップロードされた場合に重複が残らないよう、既存ファイルは先に削除する
  const existing = folder.getFilesByName(body.id);
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }
  const bytes = Utilities.base64Decode(body.base64);
  const blob = Utilities.newBlob(bytes, body.mimeType, body.id);
  folder.createFile(blob);
  return jsonResponse_({ status: 'ok' });
}

/* ------------------------------------------------------------------ */

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(message) {
  return jsonResponse_({ status: 'error', message: message });
}
