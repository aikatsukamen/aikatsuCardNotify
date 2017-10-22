'use strict';

/*
 * アイカツカードが更新されたら通知するやつ
 */


/*
 * パッケージ
 */
const rp = require('request-promise');
const cheerio = require('cheerio');
const logger = require('./logger');
const fs = require('fs');
const jsondiffpatch = require('jsondiffpatch');

/*
 * パラメータ
 */
const CONF = {
  kkt: {
    BAERERTOKEN: process.env.NODE_KKT_TOKEN // kktのトークン
  },
  path: {
    CARDLIST: './data/cardList.json' // カードリストの保存ファイル名
  },
  url: {
    DCDSTARS: 'http://www.aikatsu.com/stars/',
    CARDLIST: 'http://www.aikatsu.com/stars/cardlist/',
    HOSHITSUBAPROMO: 'http://www.aikatsu.com/stars/cardlist/dresslist.php?search=true&category=391801'
  }
};

/*
 * プログラム
 */
function init() {
  if (!CONF.kkt.BAERERTOKEN) {
    logger.system.error('KKTトークン未設定');
    process.exit(1);
  }
}

// スターズ公式に取りに行く
function getCardList() {
  const options = {
    uri: CONF.url.HOSHITSUBAPROMO,
    transform: body => { return cheerio.load(body); }
  };
  let cardList = {
    old: [],
    new: []
  };
  try {
    let old = JSON.parse(fs.readFileSync(CONF.path.CARDLIST, 'utf8'));
    cardList.old = old;
  } catch (e) {
    logger.system.warn('ファイルが読めなかった。');
  }

  rp(options)
    .then($ => {
      // そのうちモジュールに切り分けたいね

      /* カードリストを取得して比較する */
      $('.card').each(index => {
        let id = $(this).find('span').text().trim();
        id = id.replace(/\s/g, ' '); // プロモ識別のPとID間のスペースがまばらなので1文字で統一
        let name = $(this).find('img').attr('alt');
        //let imgUrl = CONF.url.DCDSTARS + $(this).find('img').attr('src').replace('../', '');
        //let url = CONF.url.CARDLIST + $(this).find('a').attr('href');
        cardList.new.push(id + ' ' + name);
      });

      // 差分抽出
      let diff = jsondiffpatch.diff(cardList.old, cardList.new);
      let diffmessage = '';
      if (diff) {
        Object.keys(diff).forEach(num => {
          if (num.match('_') === null) {
            // 増えたもの
            diffmessage += '追加：' + diff[num][0] + '\n';
          } else if (num.match(/\d/)) {
            // 減ったもの
            diffmessage += '削除：' + diff[num][0] + '\n';
          }
        });
      }
      fs.writeFile(CONF.path.CARDLIST, JSON.stringify(cardList.new, null, '  '));

      return { diff: diff, cardList: cardList, diffmessage: diffmessage };
    })
    .then(diffInfo => {
      /* 差分を投稿する */
      let katsu_content = '';

      // 投稿用メッセージ生成
      if (diffInfo.diffmessage !== '') {
        // 差分ありメッセージ
        katsu_content = '【bot】星ツバプロモに更新があったようです。\n' + diffInfo.diffmessage;
      } else {
        // 差分なしメッセージ
        katsu_content = '【bot】星ツバプロモに更新はありませんでした。';
      }
      // MASTODONの文字数制限に抑える
      katsu_content = katsu_content.substr(0, 499);

      let katsu_body = {
        'status': katsu_content,
        'in_reply_to_id': null,
        'media_ids': null,
        'sensitive': null,
        'spoiler_text': '',
        'visibility': 'public'
      };
      // リクエストの生成
      let options = {
        method: 'POST',
        uri: 'https://kirakiratter.com/api/v1/statuses',
        body: katsu_body,
        headers: {
          'Authorization': 'Bearer ' + CONF.kkt.BAERERTOKEN,
          'Content-type': 'application/json'
        },
        json: true
      };

      // 旧ファイルが取れて、更新あった時だけカツするようにした
      if (diffInfo.old.length > 0 && diffInfo.diffmessage !== '') {
        rp(options)
          .then(function (parsedBody) {
            logger.system.info(parsedBody.url);
            logger.system.debug(parsedBody);
          })
          .catch(function (err) {
            logger.system.error(err);
          });
      } else {
        logger.system.info('更新なし');
      }
    })
    .catch(function (err) {
      logger.system.error(err);
    });
}

init();
getCardList();
