/**
 * マストドンへ投稿する
 */

const rp = require('request-promise');
const logger = require('./logger');

function tootMastodon(rawmessage, statusUrl, token, visibility, hashtag) {
  // MASTODONの文字数制限に抑える
  let content = rawmessage.substr(0, 499 - hashtag.length);
  content += hashtag;

  // 投稿内容
  let tootBody = {
    status: content,
    in_reply_to_id: null,
    media_ids: null,
    sensitive: null,
    spoiler_text: '',
    visibility: visibility
  };

  // リクエスト
  let options = {
    method: 'POST',
    uri: statusUrl,
    body: tootBody,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-type': 'application/json'
    },
    json: true
  };

  rp(options)
    .then(parsedBody => {
      logger.system.info(parsedBody.url);
      logger.system.debug(parsedBody);
    })
    .catch(err => {
      logger.system.error(err);
      reject();
    });
}

module.exports = {
  tootMastodon: tootMastodon
};
