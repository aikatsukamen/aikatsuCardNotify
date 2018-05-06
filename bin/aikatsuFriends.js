/**
 * アイカツフレンズのカードを取得する
 */
const rp = require('request-promise');
const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * 公式に取りに行く
 * @param {String} targetUrl 取得対象弾のURL
 * @returns {String[]} カードリスト
 */
function getCardList(targetUrl) {
  return new Promise((resolve, reject) => {
    let cardList = [];
    const options = {
      uri: targetUrl,
      transform: body => {
        return cheerio.load(body);
      }
    };
    rp(options)
      .then($ => {
        // カードリストを取得する
        $('#lists > .data').each((index, cardDetail) => {
          let id = $(cardDetail)
            .find('.cardNum')
            .text()
            .trim();
          let name = $(cardDetail)
            .find('.cardName')
            .text()
            .trim();
          cardList.push(id + ' ' + name);
        });

        resolve(cardList);
      })
      .catch(err => {
        logger.system.error(err);
        reject();
      });
  });
}

module.exports = {
  getCardList: getCardList
};
