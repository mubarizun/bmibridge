const pool = require('../../config/pool')
const cachePool = require('../../config/cache_pool')

function sync() {
  salesOrderInfo = []
  vaCache = []
  similarData = []
  nonSimilarData = []
  allVA = []

  getSalesOrderInfo().then(info => {
    salesOrderInfo = info
    getCache().then(cache => {
      vaCache = cache
      // console.log("sales order", salesOrderInfo)
      // console.log("cache", vaCache)
      salesOrderInfo.forEach(info => {
        allVA.push(info.virtual_account)
        if (vaCache.length === 0) {
          nonSimilarData.push(info.virtual_account)
        }
        vaCache.forEach(cache => {
          if (cache.bmivano === info.virtual_account) {
            similarData.push(cache.bmivano)
            // TODO: cek entitas, update info disini 
          }else {
            let similar = false
            nonSimilarData.forEach(d => {
              if (d === info.virtual_account) {
                similar = true
              }
            })
            if (!similar) nonSimilarData.push(info.virtual_account)
          }
        })
      })

      nonSimilarData = nonSimilarData.filter( ( el ) => !similarData.includes( el ) )

      async function insertNewCache() {
        let conn
        try {
          conn = await cachePool.getConnection()
          // const rows = await conn.query("select name, customer, docstatus, total, virtual_account from `tabSales Order` where virtual_account is not null")
          nonSimilarData.forEach(async data => {
            // insert new data to cache
            console.log('Inserting new data from tabSales Order to cache')
            itemToAdd = salesOrderInfo[salesOrderInfo.findIndex(x => x.virtual_account===data)]
            console.log('Item to add: ', itemToAdd.name, itemToAdd.virtual_account)
            let status = "Planned"
            let message = await conn.query("insert into cache (bmivano, sales_order, customer_name, payment_amount, sales_order_status) values('" + itemToAdd.virtual_account + "','" + itemToAdd.name + "','" + itemToAdd.customer + "','" + itemToAdd.total + "','" + status + "')")
          }) 
        } catch (err) {
          console.log(err)
        } finally {
          if (conn) {
            return conn.end()
          }
        }
      }

      // async function deleteUsernames() {
      //   let conn
      //   try {
      //     conn = await cachePool.getConnection()
      //     users = await conn.query("select username, signontime from usernames")
      //     users.forEach(user=>{
      //       let date = new Date(user.signontime)
      //       if (Math.floor((Date.now()-date)/1000) > 3600) {
      //         conn.query(`delete from usernames where username = '${user.username}'`).then(rows=>{
      //           console.log(user.username+" deleted.")
      //         })
      //       }
      //     })
      //   }catch (err) {
      //     console.log(err)
      //   } finally {
      //     if (conn) {
      //       return conn.end()
      //     }
      //   }
      // }

      async function deleteVA() {
        let conn
        try {
          conn = await cachePool.getConnection()
          virtual_accounts = await conn.query("select bmivano from cache")
          // console.log("all va", allVA)
          // console.log("va", virtual_accounts)
          virtual_accounts.forEach(va => {
            if (!allVA.includes(va.bmivano)) {
              conn.query(`delete from cache where bmivano = '${va.bmivano}'`).then(rows => {
                console.log(`${va.bmivano} has been deleted.`)
              })
            }
          })
        } catch (err) {
          console.log(err)
        } finally {
          if (conn) {
            return conn.end()
          }
        }
      }

      insertNewCache()
      // deleteUsernames()
      deleteVA()

    })
  })
}

async function getSalesOrderInfo() {
  let conn
  let info = []
  try {
    conn = await pool.getConnection()
    const rows = await conn.query("select name, customer, docstatus, total, virtual_account, sales_partner, company from `tabSales Order` where virtual_account is not null")
    
    rows.forEach(row => {
      // console.log(row.name, row.customer, row.docstatus, row.total, row.virtual_account)
      // info.push({"sales_order": row.name, "customer_name": row.customer, "sales_order_status": row.docstatus, "payment_amount": row.total, "bmivano": row.virtual_account})
      info.push(row)
    })
  } catch (err) {
    console.log(err)
  } finally {
    if (conn) {
      conn.end()
      return info
    }
  }
}
 
async function getCache() {
  let conn
  let cache = []
  try {
    conn = await cachePool.getConnection()
    const rows = await conn.query("select bmivano, sales_order, customer_name, payment_amount, sales_order_status from cache")

    rows.forEach(row => {
      // console.log("getCache", row.bmivano, row.sales_order, row.customer_name, row.payment_amount, row.sales_order_status)
      cache.push(row)
    })
  } catch (err) {
    console.log(err)
  } finally {
    if (conn) {
      conn.end()
      return cache
    }
  }
}

module.exports = {
  sync,
  getSalesOrderInfo,
  getCache
}
