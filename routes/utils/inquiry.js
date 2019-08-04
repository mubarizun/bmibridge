const cachePool = require('../../config/cache_pool')
const pool = require('../../config/pool')
const erpnext = require('../utils/erpnext')
const log = require('log-to-file')
var d = new Date()
var m = d.getMonth() + 1
var y = d.getFullYear()
var fs = require('fs')
var logsDIR = __dirname.replace("/routes/api", "/logs/"+`${m}-${y}`)

!fs.existsSync(logsDIR) ? fs.mkdirSync(logsDIR) : ""

function getDate(date) {
  let year = date.getFullYear()
  let month = date.getMonth()+1
  let dt = date.getDate()

  if (dt < 10) {
    dt = '0' + dt
  }
  if (month < 10) {
    month = '0' + month
  }
  return year+'-' + month + '-'+dt
}

async function makeInquiry(bmivano) {
  let conn
  
  let response = {}
  let updateQuery = {}
  try {
    return new Promise(async (resolve, reject) => {
      conn = await cachePool.getConnection()
      getSalesOrderStatus(bmivano).then(async cache => {
        cache = cache[0]
        if (typeof cache !== "undefined"){
          if (cache.sales_order_status === "Planned" || cache.sales_order_status === "Reversed") {
            getSalesOrderInfo(bmivano).then(async so => {              
              const fullDate = getDate(new Date(so.delivery_date))
              so.items[0].sales_order = so.name
              let items = []
              so.items.forEach(item => {
                item.income_account = "199999 - Pembukaan sementara - DTT"
                items.push(item)
              })
              erpnext.newSalesInvoice(
                so.customer,
                so.company,
                fullDate,
                items,
                so.sales_partner,
                so.virtual_account,
                so.project
              ).then(async res => {
                if (res.code == 200) {
                  response = res.response.data
                  updateQuery = await conn.query("update cache set sales_order_status = 'Inquired', invoice = '" + response.name + "' where bmivano='" + bmivano + "'")
                  conn.end()
                  resolve({response, updateQuery, code:200})
                }else{
                  conn.end()
                  log({bmivano,error:res.error.toString()}, logsDIR+"/inquiry.logs")
                  console.log(res.error)
                  resolve({response:"Sales Order: "+res.error.message, code:res.code})
                }
              })
            })
          }else if (cache.sales_order_status === "Inquired" || cache.sales_order_status === "ExtendedInquiry") {
            const salesInvoice = await conn.query("select invoice from cache where bmivano='"+bmivano+"'")
            conn.end()
            getSalesInvoiceInfo(salesInvoice[0].invoice).then(async si => {
              conn.end()
              resolve({response: {
                total: si.outstanding_amount,
                customer_name: si.customer,
                items: si.items
              }, code:200})
            })
          }
          // else if (cache.sales_order_status === "Paid") {
          //   updateQuery = await conn.query("update cache set sales_order_status = 'ExtendedInquiry' where bmivano='" + bmivano + "'")
          //   let sales_invoice_rows = await conn.query(`select invoice from cache where bmivano=${bmivano}`)
          //   let sales_invoices = []
          //   sales_invoice_rows.forEach(row=>{
          //     sales_invoices.push(row)
          //   })

          //   getSalesInvoiceInfo(sales_invoices[0].invoice).then(async si => {
          //     conn.end()
          //     resolve({response: {
          //       total: si.outstanding_amount,
          //       customer_name: si.customer_name,
          //       items: si.items
          //     }, updateQuery, code:200})
          //   })
          // }
          else if (cache.sales_order_status === "Paid") {
            conn.end()
            resolve({response: "No planned data for this virtual account", code:88})
          }else {
            conn.end()
            resolve({response: "No planned data for this virtual account", code:15})
          }
        }else{
          conn.end()
          resolve({response: "Virtual account not found", code:15})
        }
      })
    })
  } catch (err) {
    console.log("makeInquiry", err)
  }
}

const getSalesOrderInfo = async (bmivano) => {
  let conn
  let info = []
  let items = []
  try {
    conn = await pool.getConnection()
    const rows = await conn.query("select name, customer, docstatus, total, virtual_account, sales_partner, delivery_date, company, project from `tabSales Order` where virtual_account ='"+bmivano+"'")
    
    rows.forEach(row => {
      info.push(row)
    })
    const itemsRow = await conn.query("select item_code, qty from `tabSales Order Item` where parent='"+info[0].name+"'")
    itemsRow.forEach(item => {
      items.push(item)
    })
    info[0]["items"] = items
  } catch (err) {
    console.log(err)
  } finally {
    if (conn) {
      conn.end()
      return info[0]
    }
  }
}

const getSalesInvoiceInfo = async (sales_invoice) => {
  let conn
  let info = []
  let items = []
  try {
    conn = await pool.getConnection()
    const rows = await conn.query("select name, customer, docstatus, total, virtual_account, sales_partner, company, project, outstanding_amount from `tabSales Invoice` where name ='"+sales_invoice+"'")
    
    rows.forEach(row => {
      info.push(row)
    })
    const itemsRow = await conn.query("select item_code, qty from `tabSales Invoice Item` where parent='"+info[0].name+"'")
    itemsRow.forEach(item => {
      items.push(item)
    })
    info[0]["items"] = items
  } catch (err) {
    console.log(err)
  } finally {
    if (conn) {
      conn.end()
      return info[0]
    }
  }
}

async function getSalesOrderStatus(bmivano) {
  // console.log("getSalesOrderStatus: ", bmivano)
  let conn
  let message
  try {
    conn = await cachePool.getConnection()
    message = await conn.query("select sales_order_status, sales_order from cache where bmivano='" + bmivano + "'")
  } catch (err) {
    console.log(err)
  } finally {
    if (conn) {
      conn.end()
      return message
    }
  }
}

module.exports = {
  makeInquiry,
  getSalesOrderStatus,
  getSalesOrderInfo,
  getSalesInvoiceInfo,
  getDate
}
