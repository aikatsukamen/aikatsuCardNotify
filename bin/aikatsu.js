/**
 * アイカツの情報を取得する
 */
const rp = require('request-promise');
const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * ニュースを公式に取りに行く
 * @param {String} targetUrl 取得対象のURL
 * @returns {String[]} ニュースリスト
 */
function getNewsList(targetUrl) {
  return new Promise((resolve, reject) => {
    let newsList = [];
    const options = {
      uri: targetUrl,
      transform: body => {
        return cheerio.load(body);
      }
    };
    rp(options)
      .then($ => {
        // カードリストを取得する
        $('.ai_topics-inner > dl').each((index, newsDetail) => {
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
          // 旧カツのURLは相対なので、フルパスにする
          url = targetUrl.match(/.*\//)[0] + url;

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
  getNewsList: getNewsList
};
