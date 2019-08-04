const cachePool = require('../../config/cache_pool')
const pool = require('../../config/pool')
const erpnext = require('../utils/erpnext')
const inquiryModule = require('./inquiry')
const log = require('log-to-file')
var d = new Date()
var m = d.getMonth() + 1
var y = d.getFullYear()
var fs = require('fs')
var logsDIR = __dirname.replace("/routes/api", "/logs/"+`${m}-${y}`)

!fs.existsSync(logsDIR) ? fs.mkdirSync(logsDIR) : ""

async function makePayment(bmivano, payment, refNo, paymentDate) {
    // console.log("makePayment:",bmivano)
    let conn
    let response = {}
    let updateQuery = {}
    try {
      return new Promise(async (resolve, reject) => {
        conn = await cachePool.getConnection()
        inquiryModule.getSalesOrderStatus(bmivano).then(async cache => {
          cache = cache[0]
          if (typeof cache !== "undefined"){
            if (cache.sales_order_status === "Inquired" || cache.sales_order_status === "ExtendedInquiry") {
              const salesInvoice = await conn.query("select invoice from cache where bmivano='"+bmivano+"'")

              inquiryModule.getSalesInvoiceInfo(salesInvoice[0].invoice).then(async si => {
                if (si.outstanding_amount < payment){
                  resolve({response:"Jumlah pembayaran melebihi jumlah tagihan",code:13})
                }else{
                  const fullDate = inquiryModule.getDate(new Date())
                  inquiryModule.getSalesOrderInfo(bmivano).then(async so=>{
                    const references = [{
                        reference_doctype: 'Sales Order',
                        reference_name: so.name,
                        idx: 1,
                        due_date:inquiryModule.getDate(new Date(so.delivery_date)),
                        total_amount:so.total,
                        outstanding_amount:si.outstanding_amount,
                        allocated_amount:0
                      },{
                        reference_doctype: 'Sales Invoice',
                        reference_name: salesInvoice[0].invoice,
                        idx: 1,
                        due_date:inquiryModule.getDate(new Date(so.delivery_date)),
                        total_amount:si.total,
                        outstanding_amount:si.outstanding_amount,
                        allocated_amount:payment
                      }]

                    erpnext.newPayment(
                      si.customer,
                      si.company,
                      references,
                      bmivano+refNo+paymentDate,
                      si.project,
                      payment,
                      fullDate
                    ).then(async res => {
                      if (res.code == 200) {
                        response = res.response.data
                        if (si.outstanding_amount-payment === 0){
                          updateQuery = await conn.query(`update cache set sales_order_status = 'Paid', payment = '${response.name}' where bmivano='${bmivano}'`)
                        }else{
                          updateQuery = await conn.query(`update cache set sales_order_status = 'ExtendedInquiry', payment = '${response.name}' where bmivano='${bmivano}'`)
                        }
                        conn.end()
                        resolve({response, updateQuery, code:200})
                      }else{
                        conn.end()
                        log({bmivano,error:res.error}, logsDIR+"/payment.logs")
                        resolve({response:res.error.message, code:12})
                      }
                    })
                  })
                }
              })
            }else if (cache.sales_order_status === "Paid"){
              conn.end()
              // resolve({response: "No inquired data for this virtual account", code:88})
              resolve({response: "No inquired data for this virtual account", code:15})
            }else {
              conn.end()
              resolve({response: "No inquired data for this virtual account", code:15})
            }
          }else {
            conn.end()
            resolve({response: "No inquired data for this virtual account", code:15})
          }
        })
      })
    } catch (err) {
      console.log("makePayment", err)
    }
}

async function cancelPayment(bmivano, payment, refNo, paymentDate) {
  let conn
  let updateQuery = {}
  try {
    return new Promise(async (resolve, reject) => {
      if (bmivano == null || refNo == null || payment == null) {
        resolve({code:30})
      }
      conn = await cachePool.getConnection()
      conn2 = await pool.getConnection()

      inquiryModule.getSalesOrderStatus(bmivano).then(async cache => {
        cache = cache[0]
        console.log(bmivano+refNo+paymentDate)
        if (typeof cache !== "undefined"){
          if (cache.sales_order_status === "Inquired") { //Haven't paid yet
            resolve({response:"Bill not yet paid", code:30})
          }else if (cache.sales_order_status === "Paid" || cache.sales_order_status === "ExtendedInquiry") { // Has been paid for once or more
            const paymentEntries = await conn2.query("select name, docstatus, paid_amount from `tabPayment Entry`"+`where reference_no ='${bmivano+refNo+paymentDate}' and docstatus=1 and paid_amount='${payment}'`)
            await conn.query("update cache set sales_order_status = 'ExtendedInquiry'"+ `where bmivano='${bmivano}'`)
            conn2.end()
            conn.end()
            let i = 0
            paymentEntries.forEach(entry => i++)
            if (i>0) {
              erpnext.cancelPayment(paymentEntries[0].name).then(async paymentRes=>{
                if (paymentRes.code == 200){
                  resolve({code:200})
                }else{
                  conn.end()
                  log({bmivano,error:paymentRes.error}, logsDIR+"/payment.logs")
                  resolve({response:paymentRes.error, code:paymentRes.code})
                }
              })
            }else{
              resolve({code:15})
            }
          }else if (cache.sales_order_status === "Reversed") {
            conn.end()
            resolve({response:null, code:200})
          }else {
            conn.end()
            resolve({response: "No data for this virtual account", code:15})
          }
        }else {
          conn.end()
          resolve({response: "No data for this virtual account", code:15})
        }
      })
    })
  } catch (err) {
    console.log("makeInquiry", err)
  }
}

module.exports = {
  makePayment,
  cancelPayment
}
