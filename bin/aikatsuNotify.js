'use strict';

/**
 * アイカツが更新されたら通知するやつ
 */

/**
 * パッケージ
 */
const rp = require('request-promise');
const fs = require('fs');
const jsondiffpatch = require('jsondiffpatch');
const CONFIG = require('config');
const logger = require('./logger');
const mastodon = require('./mastodon');
const stars = require('./aikatsuStars');
const friends = require('./aikatsuFriends');

/**
 * 起動時処理
 */
function init() {
  CONFIG.kkt.BAERERTOKEN = process.env.NODE_KKT_TOKEN || CONFIG.kkt.BAERERTOKEN;
  if (!CONFIG.kkt.BAERERTOKEN) {
    logger.system.fatal('KKTトークン未設定');
    process.exit();
  }
  if (!CONFIG.targetList || CONFIG.targetList.length === 0) {
    logger.system.fatal('ターゲット未指定');
    process.exit();
  }
}

/**
 * 指定されたURLから得られるリストを取得して差分があればカツする
 * @param {String} targetUrl 取得対象のURL
 * @param {String} aikatsuVer アイカツバージョン stars friends friendsNews
 * @param {String} fileName リストを保存するJSONファイル名
 * @param {String} labelName 表示名
 */
async function getList(targetUrl, aikatsuVer, fileName, labelName) {
  logger.system.info(`取得開始：${labelName}`);
  let flag = {
    isFileLoaded: false,
    isListUpdated: false
  };

  let oldList = [];
  let newList = [];
  let diffmessage = '';

  // 取得済みのリストを読み込む
  try {
    oldList = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    flag.isFileLoaded = true;
  } catch (e) {
    logger.system.warn(`ファイルが読めなかった。[File]${fileName}`);
  }

  try {
    // 指定されたバージョンに応じたリストを読み込む
    switch (aikatsuVer) {
      case 'stars':
        diffmessage = `${targetUrl}\n`;
        newList = await stars.getCardList(targetUrl);
        break;
      case 'friends':
        diffmessage = `${targetUrl}\n`;
        newList = await friends.getCardList(targetUrl);
        break;
      case 'friendsNews':
        newList = await friends.getNewsList(targetUrl);
        break;
      default:
        logger.system.warn('未定義のバージョン指定');
        return;
    }
    // 取得したリストの書き込み
    fs.writeFile(fileName, JSON.stringify(newList, null, '  '), err => {
      if (err) {
        logger.system.error('ファイル書き込み時にエラー');
        throw err;
      }
    });

    // 差分抽出
    if (flag.isFileLoaded) {
      let diff = jsondiffpatch.diff(oldList, newList);
      if (diff) {
        flag.isListUpdated = true;
        Object.keys(diff).forEach(num => {
          if (num.match('_') === null) {
            // 増えたもの
            diffmessage += diff[num][0] + '\n';
          } else if (num.match(/\d/)) {
            // 減ったもの
            // diffmessage += '削除：' + diff[num][0] + '\n';
          }
        });
      }
      logger.system.debug('差分情報:' + diffmessage);
    }

    // 差分を投稿する
    // 旧ファイルが取れて、更新あった時だけカツする
    if (flag.isFileLoaded && flag.isListUpdated) {
      logger.system.info(`更新あり：${labelName}`);
      let katsu_content = `${labelName}に更新あり。\n${diffmessage}`;
      mastodon.tootMastodon(katsu_content, CONFIG.kkt.url, CONFIG.kkt.BAERERTOKEN, CONFIG.kkt.VISIBILITY);
    } else {
      logger.system.info(`更新なし：${labelName}`);
    }
  } catch (e) {
    logger.system.error(e);
  }
}

init();

for (let target of CONFIG.targetList) {
  getList(target.url, target.aikatsuVer, target.fileName, target.labelName);
}
