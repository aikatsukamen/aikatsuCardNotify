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
        transform: function(body) {
            return cheerio.load(body);
        }
    };
    let cardList = {
        old: [],
        new: []
    };
    if (fs.existsSync(CONF.path.CARDLIST)) {
        cardList.old = JSON.parse(fs.readFileSync(CONF.path.CARDLIST, 'utf8'));
    }

    rp(options)
        .then(function($) {
            // そのうちモジュールに切り分けたいね

            /* カードリストを取得して比較する */
            $('.card').each(function(index) {
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
                Object.keys(diff).forEach(function(num) {
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

            return diffmessage;
        })
        .then(function(diffmessage) {
            /* 投稿する */

            let katsu_content = '';

            // 投稿用メッセージ生成
            if (diffmessage !== '') {
                // 差分ありメッセージ
                katsu_content = '【bot】星ツバプロモに更新があったようです。\n' + diffmessage;
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
            // Baererトークン
            let token = CONF.kkt.BAERERTOKEN;
            // リクエストの生成
            let options = {
                method: 'POST',
                uri: 'https://kirakiratter.com/api/v1/statuses',
                body: katsu_body,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-type': 'application/json'
                },
                json: true // Automatically stringifies the body to JSON
            };
            rp(options)
                .then(function(parsedBody) {
                    logger.system.info(parsedBody.url);
                    logger.system.debug(parsedBody);
                })
                .catch(function(err) {
                    logger.system.error(err);
                });
        })
        .catch(function(err) {
            logger.system.error(err);
        });
}

init();
getCardList();