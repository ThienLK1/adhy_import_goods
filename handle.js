var fs = require('fs');
// var path = require('path');
// var stringify = require('csv-stringify');
// var _ = require('lodash');
// const price = 10;
const readXlsxFile = require('read-excel-file/node')
const { writeToPath } = require('@fast-csv/format');

const price_schema = {
    'sku': {
        prop: 'sku',
        type: String,
    },
    'price': {
        prop: 'price',
        type: Number,
    }
}
const schema = {
    'STT': {
        // JSON object property name.
        prop: 'stt',
        type: Number
    },
    'Đã nhập': {
        prop: 'inserted',
        type: Boolean,
    },
    'Sản phẩm': {
        prop: 'product',
        type: String,
    },
    'Cách tân?': {
        prop: 'isNewStyle',
        type: Boolean,
    },
    'Đơn vị': {
        prop: 'unit',
        type: String,
    },
    'SIZE': {
        // Nested object path: `row.course`
        prop: 'size',
        // Nested object schema:
        type: {
            'S': {
                prop: 'S',
                type: Number
            },
            'M': {
                prop: 'M',
                type: Number
            },
            'L': {
                prop: 'L',
                type: Number
            },
            'XL': {
                prop: 'XL',
                type: Number
            },
            '2XL': {
                prop: '2XL',
                type: Number
            },
            '3XL': {
                prop: '3XL',
                type: Number
            },
            '4XL': {
                prop: '4XL',
                type: Number
            },
            '5XL': {
                prop: '5XL',
                type: Number
            },
            'Cỡ khác': {
                prop: 'other',
                type: Number
            }
        }
    }
}

const options = { headers: true, quoteColumns: true };
let columns = ['SKU', 'Quantity', 'Price'];
// const now = new Date().getUTCDate();
// current timestamp in milliseconds
let ts = Date.now();

let date_ob = new Date(ts);
let date = date_ob.getDate();
let month = date_ob.getMonth() + 1;
let year = date_ob.getFullYear();

// prints date & time in YYYY-MM-DD format
const now = year + "-" + month + "-" + date;
console.log(now)
const pathSKUPrice = `${__dirname}/in/sku_price.xlsx`;
const pathIn = `${__dirname}/in/${now}.xlsx`;
const pathOut = `${__dirname}/out/${now}.csv`;
let productMap = new Map();

const count = (sku, amount) => {
    if (!productMap[sku]) {
        productMap[sku] = amount;
    } else {
        productMap[sku] = productMap[sku] + amount;
    }
}
const rs = async () => {
    // data.push(columns);
    let priceMap = new Map();

    await readXlsxFile(pathSKUPrice, { schema: price_schema }).then(({ rows, errors }) => {
        console.log(errors);
        for (const row of rows) {
            if (row.sku) {
                priceMap[row.sku] = row.price;
            }
        }
    });
    // console.log('priceMap', priceMap);

    readXlsxFile(pathIn, { schema }).then(({ rows, errors }) => {
        console.log(errors);
        let transformed = [];
        for (const row of rows) {

            console.log(row);
            if (row.product && row.size) {
                transformed.push(row)
            } else if (row.size) {
                let newRow = JSON.parse(JSON.stringify(transformed[transformed.length - 1]));
                newRow.unit = row.unit;
                newRow.size = row.size;
                transformed.push(newRow);
            }
        }
        console.log(transformed);
        for (const row of transformed) {
            switch (row.unit) {
                case "Bộ":
                    if (!row.isNewStyle) {
                        for (let key of Object.keys(row.size)) {
                            let sku = `A_${row.product}_${key}`;
                            // console.log('print', sku, row.size[key], priceMap[sku])
                            count(sku, row.size[key]);
                            let sku2 = `Q_${row.product}_${key}`;
                            count(sku2, row.size[key]);
                        }
                    } else {
                        for (let key of Object.keys(row.size)) {
                            let sku = `B_${row.product}_${key}`;
                            count(sku, row.size[key]);
                        }

                    }
                    break;
                case "Áo":
                    for (let key of Object.keys(row.size)) {
                        let sku = `A_${row.product}_${key}`;
                        count(sku, row.size[key]);
                    }
                    break;
                default:
                // code block
            }
        }
    }).then(() => {

        let data = [columns];
        for (let key of Object.keys(productMap)) {
            data.push([key, productMap[key], priceMap[key]])
        }
        console.log('data', data);
        writeToPath(pathOut, data, options)
            .on('error', err => console.error(err))
            .on('finish', () => console.log('Done writing.'));
    })
};
rs();