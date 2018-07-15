/**
 * Youtubeの動画一覧を取得する
 */
const rp = require('request-promise');
const logger = require('./logger');

/**
 * API Activity
 * @param {String} targetUrl 取得対象のURL
 * @returns {String[]} 動画リスト
 */
function getActivityList(targetUrl) {
  return new Promise((resolve, reject) => {
    let list = [];

    let options = {
      method: 'GET',
      uri: targetUrl,
      json: true
    };
    rp(options)
      .then(parsedBody => {
        logger.system.debug(JSON.stringify(parsedBody, null, '  '));

        for (let item of parsedBody.items) {
          list.push(item.snippet.title);
        }

        resolve(list);
      })
      .catch(err => {
        logger.system.error(err);
        resolve(list);
      });
  });
}

/**
 * API PlaylistItems
 * @param {String} targetUrl 取得対象のURL
 * @returns {String[]} 動画リスト
 */
function getPlaylistItemsList(targetUrl) {
  return new Promise((resolve, reject) => {
    let list = [];

    let options = {
      method: 'GET',
      uri: targetUrl,
      json: true
    };
    rp(options)
      .then(parsedBody => {
        logger.system.debug(JSON.stringify(parsedBody, null, '  '));

        for (let item of parsedBody.items) {
          list.push(item.snippet.title);
        }

        resolve(list);
      })
      .catch(err => {
        logger.system.error(err);
        resolve(list);
      });
  });
}

module.exports = {
  getActivityList,
  getPlaylistItemsList
};
