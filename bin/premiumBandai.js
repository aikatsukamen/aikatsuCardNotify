/**
 * プレミアムバンダイの情報を取得する
 */
const client = require('cheerio-httpcli');
const logger = require('./logger');

/**
 * 商品情報を取りに行く
 * @param {String} targetUrl 取得対象のURL
 * @returns {String[]} リスト
 */
function getItemList(targetUrl) {
  return new Promise((resolve, reject) => {
    let list = [];

    client
      .fetch(targetUrl)
      .then(result => {
        const $ = result.$;
        $('.pbFluid-p-card-list')
          .find('.pbFluid-p-card')
          .find('.pbFluid-p-card__tooltip__detail')
          .each((index, detail) => {
            let itemName = $(detail).text(); // 商品名
            let url = $(detail).attr('href'); // 商品URL
            // 商品に必要なリンクに絞り込む
            url = url.match(/.*\//)[0];
            // 相対なので、フルパスにする
            url = targetUrl.match(/(.*)\//)[1] + url;

            list.push(`${itemName} ${url}`);
          });

        logger.system.debug(JSON.stringify(list, null, '  '));
        resolve(list);
      })
      .catch(err => {
        logger.system.error(err);
        reject();
      });
  });
}

module.exports = {
  getItemList: getItemList
};
