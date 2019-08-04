const express = require("express")
const router = express.Router()
const jwt = require('jsonwebtoken')
const cachePool = require('../../config/cache_pool')
const inquiry = require('../utils/inquiry')
const payment = require('../utils/payment')
const log = require('log-to-file')
var d = new Date()
var m = d.getMonth() + 1
var y = d.getFullYear()
var fs = require('fs')
var logsDIR = __dirname.replace("/routes/api", "/logs/"+`${m}-${y}`)

!fs.existsSync(logsDIR) ? fs.mkdirSync(logsDIR) : ""

const secretOrKey = process.env.secretOrKey

const getUsernamesCache = async (username) => {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = await cachePool.getConnection()
      conn.query(`select username from usernames where username='${username}'`).then(rows => {
        if (rows[0] === undefined){
          reject({message:"Not signed on yet."})
        }else{
          resolve({username:rows[0].USERNAME})
        }
      })
    } catch (err) {
      throw err
    } finally {
      if (conn) {
        return conn.end()
      }
    }
  })
}

const signJWT = (payload) =>{
  return jwt.sign(payload, secretOrKey, {noTimestamp: true})
}

router.post("/", (req, res) => {
  // console.log(req.body)
  jwt.verify(req.body, secretOrKey, (err, decoded) => {
    if (!err) { // JWT valid
      switch(decoded.METHOD){
        case "ECHO":
          log("Request: "+JSON.stringify(decoded), logsDIR+"/echo.logs")
          const response = {
            ERR: "00",
            METHOD: "ECHO"
          }
          log("Response: "+JSON.stringify(response), logsDIR+"/echo.logs")
          res.type('text').status(200).send(signJWT(response))
          break
        case "SIGNON":
          const addUsername = async () =>{
            let conn
            try {
              conn = await cachePool.getConnection()
              var d = new Date()
              var month = parseInt(d.getMonth())+1
              var min, sec
              d.getMinutes() < 10 ? min = "0"+d.getMinutes():min = d.getMinutes()
              d.getSeconds() < 10 ? sec = "0"+d.getSeconds():sec = d.getSeconds()
              var time = d.getFullYear()+"-"+month+"-"+d.getDate()+" "+d.getHours()+":"+min+":"+sec
              conn.query(`insert into usernames values('${decoded.USERNAME}', '${time}')`).then(rows => {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/signon.logs")
                const response = {
                  METHOD:"SIGNON",
                  ERR: decoded.SIGNONINFO.substr(0, decoded.SIGNONINFO.indexOf('')) + ";00;" + decoded.SIGNONINFO.substr(decoded.SIGNONINFO.indexOf('')+1, decoded.SIGNONINFO.length)
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/signon.logs")
                res.type('text').status(200).send(signJWT(response))
              }).catch(err => {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/signon.logs")
                let response
                let status
                if (err.toString().includes('Duplicate entry')) {
                  conn.query(`update usernames set signontime ='${time}' where username='${decoded.USERNAME}'`)
                  response = {
                    METHOD:"SIGNON",
                    ERR: decoded.SIGNONINFO.substr(0, decoded.SIGNONINFO.indexOf('')) + ";00;" + decoded.SIGNONINFO.substr(decoded.SIGNONINFO.indexOf('')+1, decoded.SIGNONINFO.length)
                  }
                  status = 200
                }else{
                  response = {
                    METHOD:"SIGNON",
                    ERR: decoded.SIGNONINFO.substr(0, decoded.SIGNONINFO.indexOf('')) + ";12;" + decoded.SIGNONINFO.substr(decoded.SIGNONINFO.indexOf('')+1, decoded.SIGNONINFO.length)
                  }
                  // status=400
                  status=200
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/signon.logs")
                res.type('text').status(status).send(signJWT(response))
              })
            } catch (err) {
              throw err
            } finally {
              if (conn) {
                return conn.end()
              }
            }
          }
          if (decoded) {
            if (decoded.USERNAME !== ""){
              addUsername()
            }else{
              log("Request: "+JSON.stringify(decoded), logsDIR+"/signon.logs")
                const response = {
                  METHOD:"SIGNON",
                  ERR: decoded.SIGNONINFO.substr(0, decoded.SIGNONINFO.indexOf('')) + ";12;" + decoded.SIGNONINFO.substr(decoded.SIGNONINFO.indexOf('')+1, decoded.SIGNONINFO.length)
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/signon.logs")
                res.type('text').status(200).send(signJWT(response))// status 400
            }
          }
          break
        case "SIGNOFF":
          const delUsername = async () =>{
            let conn
            try {
              conn = await cachePool.getConnection()
              conn.query(`delete from usernames where username= '${decoded.USERNAME}'`).then(rows => {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/signoff.logs")
                const response = {
                  METHOD:"SIGNOFF",
                  ERR: decoded.SIGNOFFINFO.substr(0, decoded.SIGNOFFINFO.indexOf('')) + ";00;" + decoded.SIGNOFFINFO.substr(decoded.SIGNOFFINFO.indexOf('')+1, decoded.SIGNOFFINFO.length)
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/signoff.logs")
                res.type('text').status(200).send(signJWT(response))
              }).catch(err => {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/signoff.logs")
                const response = {
                  METHOD:"SIGNOFF",
                  ERR: decoded.SIGNOFFINFO.substr(0, decoded.SIGNOFFINFO.indexOf('')) + ";12;" + decoded.SIGNOFFINFO.substr(decoded.SIGNOFFINFO.indexOf('')+1, decoded.SIGNOFFINFO.length)
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/signoff.logs")
                res.type('text').status(200).send(signJWT(response))// status 400
              })
            } catch (err) {
              throw err
            } finally {
              if (conn) {
                return conn.end()
              }
            }
          }
          if (decoded) {
            delUsername()
          }
          break
        case "INQUIRY":
          getUsernamesCache(decoded.USERNAME).then(a=>{ // If user has been signed on
            inquiry.makeInquiry(decoded.VANO).then(data => {
              if (data.code === 200) {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/inquiry.logs")
                let response
                if (data.response.items[0].item_name === undefined) {
                  response = {
                    CCY: decoded.CCY,
                    METHOD:"INQUIRY",
                    BILL: data.response.total*100,
                    DESCRIPTION: "Tagihan "+data.response.items[0].item_code,
                    DESCRIPTION2: "",
                    ERR:"00",
                    CUSTNAME: data.response.customer_name
                  }
                }else{
                  response = {
                    CCY: decoded.CCY,
                    METHOD:"INQUIRY",
                    BILL: data.response.total*100,
                    DESCRIPTION: "Tagihan "+data.response.items[0].item_name,
                    DESCRIPTION2: "",
                    ERR:"00",
                    CUSTNAME: data.response.customer_name
                  }
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/inquiry.logs")
                res.type('text').status(200).send(signJWT(response))
              }else if (data.code === 400 || data.code === 12 || data.code === 13 || data.code === 15 || data.code === 16 || data.code === 30 || data.code === 88 || data.code === 99){
                log("Request: "+JSON.stringify(decoded), logsDIR+"/inquiry.logs")
                const response = {
                  CCY: decoded.CCY,
                  METHOD:"INQUIRY",
                  BILL: "",
                  DESCRIPTION: data.response,
                  DESCRIPTION2: "",
                  ERR:data.code,
                  CUSTNAME: ""
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/inquiry.logs")
                res.type('text').status(200).send(signJWT(response))// status 400
              }
            }).catch(err => {
              res.type('text').status(200).json(err)// status 400
            })
          }).catch(b=>{
            res.type('text').status(200).send(signJWT({DESCRIPTION:b.message,ERR:30}))// status 400
          })
          break
        case "PAYMENT":
          getUsernamesCache(decoded.USERNAME).then(a=>{ // If user has been signed on
            payment.makePayment(decoded.VANO, decoded.PAYMENT/100, decoded.REFNO, decoded.TRXDATE).then(data => {
              if (data.code === 200) {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/payment.logs")
                const response = {
                  CCY: decoded.CCY,
                  METHOD:"PAYMENT",
                  BILL: data.response.paid_amount,
                  DESCRIPTION: "Pembayaran "+decoded.VANO,
                  DESCRIPTION2: data.response.remarks,
                  ERR:"00",
                  CUSTNAME: data.response.party_name
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/payment.logs")
                res.type('text').status(200).send(signJWT(response))
              }else if (data.code === 400 || data.code === 12 || data.code === 13 || data.code === 15 || data.code === 16 || data.code === 30 || data.code === 88 || data.code === 99){
                log("Request: "+JSON.stringify(decoded), logsDIR+"/payment.logs")
                const response = {
                  CCY: decoded.CCY,
                  METHOD:"PAYMENT",
                  BILL: "",
                  DESCRIPTION: data.response,
                  DESCRIPTION2: "",
                  ERR:data.code,
                  CUSTNAME: ""
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/payment.logs")
                res.type('text').status(200).send(signJWT(response))// status 400
              }
            }).catch(err => {
              res.type('text').status(200).json(err)// status 400
            })
          }).catch(b=>{
            res.type('text').status(200).send(signJWT({DESCRIPTION:b.message,ERR:30}))// status 400
          })
          break
        case "REVERSAL":
          getUsernamesCache(decoded.USERNAME).then(a=>{ // If user has been signed on
            payment.cancelPayment(decoded.VANO, decoded.PAYMENT/100, decoded.REFNO, decoded.PYMTDATE).then(data => {
              if (data.code === 200) {
                log("Request: "+JSON.stringify(decoded), logsDIR+"/reversal.logs")
                const response = {
                  METHOD:"REVERSAL",
                  ERR:"00"
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/reversal.logs")
                res.type('text').status(200).send(signJWT(response))
              }else if (data.code === 400 || data.code === 12 || data.code === 13 || data.code === 15 || data.code === 16 || data.code === 30 || data.code === 88 || data.code === 99){
                log("Request: "+JSON.stringify(decoded), logsDIR+"/reversal.logs")
                const response = {
                  METHOD:"REVERSAL",
                  ERR:data.code
                }
                log("Response: "+JSON.stringify(response), logsDIR+"/reversal.logs")
                res.type('text').status(200).send(signJWT(response))// status 400
              }
            }).catch(err => {
              res.type('text').status(200).json(err)// status 400
            })
          }).catch(b=>{
            res.type('text').status(200).send(signJWT({DESCRIPTION:b.message,ERR:30}))// status 400
          })
          break
        default:
          break
      }
    }else{// JWT not valid
      if (err){
        log("JWT not valid, req.body: "+req.body, logsDIR+"/invalid-jwt.logs")
        res.type('text').status(200).send(signJWT({DESCRIPTION:"JWT invalid",ERR:"30"}))// status 400
      }
    }
  })
})

module.exports = router
