'use strict';

/**
 * アイカツが更新されたら通知するやつ
 */

const rp = require('request-promise');
const fs = require('fs');
const jsondiffpatch = require('jsondiffpatch');
const CONFIG = require('config');
const logger = require('./logger');
const mastodon = require('./mastodon');
const aikatsu = require('./aikatsu');
const stars = require('./aikatsuStars');
const friends = require('./aikatsuFriends');
const onparade = require('./aikatsuOnparade');
const pBandai = require('./premiumBandai');
const youtube = require('./youtube');

/**
 * 起動時処理
 */
function init() {
  CONFIG.kkt.BAERERTOKEN = process.env.NODE_KKT_TOKEN || CONFIG.kkt.BAERERTOKEN;
  if (!CONFIG.kkt.BAERERTOKEN) {
    logger.system.fatal('KKTトークン未設定');
    console.log('KKTトークン未設定');
    logger.shutdown(1);
  }
  if (!CONFIG.targetList || CONFIG.targetList.length === 0) {
    logger.system.fatal('ターゲット未指定');
    console.log('ターゲット未指定');
    logger.shutdown(2);
  }
  CONFIG.youtube.apiKey = process.env.NODE_GOOGLE_API_TOKEN || CONFIG.youtube.apiKey;
}

const retryOption = {
  count: 0,
  limit: 3,
  interval: 1000
};

/**
 * 関数のリトライ。失敗時はExceptionが飛ぶ
 * @param {Function} fn
 * @param {{count: number, limit: number, interval: number}} option
 * @param  {...any} args
 */
const retry = (fn, option, ...args) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await fn(...args);
      resolve(data);
    } catch (error) {
      if (option.count >= option.limit) {
        reject(error);
      } else {
        setTimeout(async () => resolve(await retry(fn, { ...option, count: option.count + 1 }, ...args)), option.interval);
      }
    }
  });
};

/**
 * 指定されたURLから得られるリストを取得して差分があればカツする
 * @param {String} targetUrl 取得対象のURL
 * @param {String} aikatsuVer アイカツバージョン stars friends friendsNews
 * @param {String} fileName リストを保存するJSONファイル名
 * @param {String} labelName 表示名
 */
async function getList(targetUrl, aikatsuVer, fileName, labelName, preMessage) {
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
      case 'aikatsuNews':
        newList = await retry(aikatsu.getNewsList, retryOption, targetUrl);
        break;
      case 'stars':
        diffmessage = `${targetUrl}\n`;
        newList = await retry(stars.getCardList, retryOption, targetUrl);
        break;
      case 'starsNews':
        newList = await retry(stars.getNewsList, retryOption, targetUrl);
        break;
      case 'friends':
        diffmessage = `${targetUrl}\n`;
        newList = await retry(friends.getCardList, retryOption, targetUrl);
        break;
      case 'friendsNews':
        newList = await retry(friends.getNewsList, retryOption, targetUrl);
        break;
      case 'onparade':
        diffmessage = `${targetUrl}\n`;
        newList = await retry(onparade.getCardList, retryOption, targetUrl);
        break;
      case 'onparadeNews':
        newList = await retry(onparade.getNewsList, retryOption, targetUrl);
        break;

      case 'pBandai':
        newList = await retry(pBandai.getItemList, retryOption, targetUrl);
        break;
      case 'youtubeActivity':
        diffmessage = preMessage;
        newList = await retry(youtube.getActivityList, retryOption, targetUrl + '&key=' + CONFIG.youtube.apiKey);
        break;
      case 'youtubePlaylistItems':
        diffmessage = preMessage;
        newList = await retry(youtube.getPlaylistItemsList, retryOption, targetUrl + '&key=' + CONFIG.youtube.apiKey);
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
        Object.keys(diff).forEach(num => {
          if (num.match('_') === null) {
            // 増えたもの
            diffmessage += diff[num][0] + '\n';
            flag.isListUpdated = true;
          } else if (num.match(/\d/)) {
            // 減ったものは通知しなくていいか
            logger.system.info('削除:' + diff[num][0]);
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
      retry(mastodon.tootMastodon, retryOption, katsu_content, CONFIG.kkt.url, CONFIG.kkt.BAERERTOKEN, CONFIG.kkt.VISIBILITY, CONFIG.kkt.hashtag);
    } else {
      logger.system.info(`更新なし：${labelName}`);
    }
  } catch (e) {
    logger.system.error(JSON.stringify(e, null, '  '));
  }
}

// トークン設定
init();

//
for (let target of CONFIG.targetList) {
  getList(target.url, target.aikatsuVer, target.fileName, target.labelName, target.preMessage);
}
