/**
 * アイカツスターズのカードを取得する
 */
const client = require('cheerio-httpcli');
const logger = require('./logger');

/**
 * 公式に取りに行く
 * @param {String} targetUrl 取得対象弾のURL
 * @returns {String[]} カードリスト
 */
function getCardList(targetUrl) {
  return new Promise((resolve, reject) => {
    let cardList = [];

    client
      .fetch(targetUrl)
      .then(result => {
        const $ = result.$;
        // カードリストを取得する
        $('.card').each((index, card) => {
          let id = $(card)
            .find('span')
            .text()
            .trim();
          id = id.replace(/\s/g, ' '); // プロモ識別のPとID間のスペースがまばらなので1文字で統一
          let name = $(card)
            .find('img')
            .attr('alt');
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

/**
 * ニュースを公式に取りに行く
 * @param {String} targetUrl 取得対象のURL
 * @returns {String[]} ニュースリスト
 */
function getNewsList(targetUrl) {
  return new Promise((resolve, reject) => {
    let newsList = [];

    client
      .fetch(targetUrl)
      .then(result => {
        const $ = result.$;
        // カードリストを取得する
        $('.topicsCol-box > dl').each((index, newsDetail) => {
          $(newsDetail)
            .find('dt > span')
            .empty();
          let date = $(newsDetail)
            .find('dt')
            .text();
          let message = $(newsDetail)
            .find('dd')
            .text();
          let url = $(newsDetail)
            .find('dd > a')
            .attr('href');

          newsList.push(`${date} ${message} ${url}`);
        });

        logger.system.debug(JSON.stringify(newsList, null, '  '));
        resolve(newsList);
      })
      .catch(err => {
        logger.system.error(err);
        reject();
      });
  });
}

module.exports = {
  getCardList: getCardList,
  getNewsList: getNewsList
};
