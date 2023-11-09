var fs = require('fs');
let googleApi = require('./googleApi.js');
let common = require('./common.js');
// let createMetadata = require('./googleApi.js');
var axios = require('axios');
// const moment = require('moment/moment.js');
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')

const scheduler = new ToadScheduler()

require('dotenv').config();

const MD_LASTEST_ID = 8;
const MD_TIME_ID = 9;
const MD_LASTEST_KEY = 'LastestId';
const MD_TIME_KEY = 'LastestTime';
// const SHEET_NAME = 'Demo';
const SPREAD_SHEET_ID = '1kO0LKRjzR7usYh7GHUWbRSAX_AVSu-_IG3uUeLX9zDE';
const SHEET_ID = 664754172;
// let todaySheetId = '';


const initData = async () => {
    console.log('init data')
    const today = common.getToday();
    const rsCopy = await googleApi.sheetCopyTo(SPREAD_SHEET_ID, SHEET_ID, SPREAD_SHEET_ID);
    console.log(rsCopy);
    const newSheetId = rsCopy.sheetId;
    await googleApi.renameSheet(SPREAD_SHEET_ID, newSheetId, today);
    await googleApi.updateMetadata(SPREAD_SHEET_ID, SHEET_ID, MD_LASTEST_ID, MD_LASTEST_KEY, "2");
    var todayUnix = Math.floor(new Date(today).getTime() / 1000);
    await googleApi.updateMetadata(SPREAD_SHEET_ID, SHEET_ID, MD_TIME_ID, MD_TIME_KEY, todayUnix.toString());
    return newSheetId;
}


const rs = async () => {
    console.log('start')
    const today = common.getToday();
    var todayUnix = Math.floor(new Date(today).getTime() / 1000);
    var now = Math.floor(new Date().getTime() / 1000);
    const headers = {
        'Content-Type': 'application/json',
        'Token': process.env.TOKEN
    }
    const API = 'https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/search';
    // const data = {
    //     "shop_id": 0,
    //     "status": [
    //         "ready_to_pick",
    //         "picking",
    //         "money_collect_picking"
    //     ],
    //     // "status": [
    //     //     "picked",
    //     //     "sorting",
    //     //     "storing",
    //     //     "transporting",
    //     //     "delivering",
    //     //     "delivery_fail",
    //     //     "money_collect_delivering"
    //     // ],
    //     "payment_type_id": [
    //         1,
    //         2,
    //         4,
    //         5
    //     ],
    //     "from_time": fromTime,
    //     // "to_time": 1699117200,
    //     "offset": 0,
    //     "limit": 100,
    //     "from_cod_amount": 0,
    //     "to_cod_amount": 0,
    //     "ignore_shop_id": false,
    //     "shop_ids": null,
    //     "is_search_exactly": false,
    //     "is_print": null,
    //     "is_cod_failed_collected": null,
    //     "is_document_pod": null,
    //     "source": "5sao"
    // }
    const data = {
        "shop_id": 0,
        "status": [
            "ready_to_pick",
            "picking"
        ],
        "payment_type_id": [],
        "from_time": todayUnix,
        // "to_time": 1699290000,
        "offset": 0,
        "limit": 100,
        "option_value": "",
        "from_cod_amount": 0,
        "to_cod_amount": 1000000000,
        "ignore_shop_id": true,
        "shop_ids": [],
        "is_search_exactly": true,
        "is_print": null,
        "is_cod_failed_collected": null,
        "is_document_pod": null,
        "source": "5sao"
    }

    const rsCheck = await googleApi.checkSheet(today);
    let todaySheetId = 0;
    if (rsCheck.status != 200) {
        todaySheetId = await initData();
    } else {
        todaySheetId = rsCheck.data.sheetId;
    }

    const mdLastestId = await googleApi.getMetadata(SPREAD_SHEET_ID, MD_LASTEST_ID);
    let lastestId = Number(mdLastestId.metadataValue);
    console.log('lastestId', lastestId)
    const mdLastestTime = await googleApi.getMetadata(SPREAD_SHEET_ID, MD_TIME_ID);
    let lastestTime = Number(mdLastestTime.metadataValue);

    axios.post(API, data, {
        headers: headers
    }).then(async (response) => {
        const orders = response.data.data.data;
        const search = ', ';
        const replacer = new RegExp(search, 'g')
        const data = [];
        // for (const [key, value] of orders) {
        for (let i = 0; i < orders.length; i++) {
            const createdDateUnix = Math.floor(new Date(orders[i].created_date).getTime() / 1000);
            if (lastestTime <= createdDateUnix) {
                let index = lastestId - 1 + i;
                const o = orders[i];
                let d = [];
                d.push(index);
                d.push(o.order_code);
                d.push(o.to_name);
                d.push(o.cod_amount);
                d.push(o.content.replace(replacer, '\n'));
                // d.push('FALSE');
                // d.push('Đã lên đơn');
                data.push(d);
            }
        }
        console.log('data', data);
        const range = `${today}!A${lastestId}`;
        googleApi.writeData(SPREAD_SHEET_ID, range, data);
        lastestId = lastestId + data.length;
        await googleApi.updateMetadata(SPREAD_SHEET_ID, SHEET_ID, MD_LASTEST_ID, MD_LASTEST_KEY, lastestId.toString());
        console.log('lastestId after', lastestId)
        await googleApi.updateMetadata(SPREAD_SHEET_ID, SHEET_ID, MD_TIME_ID, MD_TIME_KEY, now.toString());
        console.log('lastestTime', now)
    })
};

// const task = new Task('simple task', async () => {
//     try {
//         await rs();
//         return true;
//     }
//     catch (err) {
//         return false;

//     }
// })
// const job = new SimpleIntervalJob({ seconds: 30, }, task)

// scheduler.addSimpleIntervalJob(job);
rs();
// when stopping your app
// scheduler.stop()
// googleApi.checkSheet('Demo2')
// googleApi.writeData([
//     ['XXXXXsxzczxcss', 'Malexczxc', '240000', 'jsnvinidni'],
//     ['yyyyyyyyyyyy', 'Malexczxc', '240000', 'jsnvinidni'],
//     ['qqqqqqqqqqqq', 'Malexczxc', '240000', 'jsnvinidni'],
//     // Potential next row
// ])
// googleApi.createMetadata(SPREAD_SHEET_ID,SHEET_ID,9,MD_TIME_KEY,"0")
// googleApi.updateMetadata(8,METADATA_KEY,"2")
// googleApi.getMetadata(1)