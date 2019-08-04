const axios = require('axios')

globalsid = ""

const login = async () => {
    try {
      return await axios.post('https://semudahsenyum.com/api/method/login', {
        usr: process.env.USR,
        pwd: process.env.PWD
      }).then(response => {
        let sid = response.headers["set-cookie"].toString()
        sid = sid.substring(sid.indexOf('sid=') + 4)
        sid = sid.substring(0, 56)
        globalsid = sid
        return sid
      }).catch(error => {
        console.log(error)
      })
    } catch (error) {
      console.log(error)
    }
}

const newSalesInvoice = async (
    customer,
    company,
    due_date,
    items,
    sales_partner,
    virtual_account,
    project
) => {
    if (sales_partner !== null && project !== null) {
        sendData = {docstatus:1,customer:`${customer}`, company:`${company}`, due_date:`${due_date}`, items:items, sales_partner:`${sales_partner}`, virtual_account:`${virtual_account}`, project:`${project}`}
    }else if (sales_partner !== null && project === null) {
        sendData = {docstatus:1,customer:`${customer}`, company:`${company}`, due_date:`${due_date}`, items:items, sales_partner:`${sales_partner}`, virtual_account:`${virtual_account}`}
    }else if (sales_partner === null && project !== null) {
        sendData = {docstatus:1,customer:`${customer}`, company:`${company}`, due_date:`${due_date}`, items:items, virtual_account:`${virtual_account}`, project:`${project}`}
    }else if (sales_partner === null && project === null) {
        sendData = {docstatus:1,customer:`${customer}`, company:`${company}`, due_date:`${due_date}`, items:items, virtual_account:`${virtual_account}`}
    }

    try {
        return await axios.post('https://semudahsenyum.com/api/resource/Sales%20Invoice', {
            sid: globalsid,
            data: JSON.stringify(sendData)
        }).then(response => {
            return {response:response.data,code:200}
        }).catch(error => {
            return {error, code:12}
        })
    } catch (error) {      
      return {error, code:12}
    }
}

const newPayment = async (
    customer,
    company,
    references,
    ref_no,
    project,
    total,
    dateNow
) => {
    if (project !== null) {
        sendData = {docstatus:1, 
            payment_type:'Receive', 
            company:`${company}`, 
            party_type: 'Customer', 
            party: `${customer}`, 
            paid_to:'111125 - BMI - VA - DTT',
            paid_amount:total, 
            reference_no:`${ref_no}`, 
            reference_date:`${dateNow}`,
            posting_date:`${dateNow}`,
            project: `${project}`,
            received_amount:total,
            references:references
        }
    }else{
        sendData = {docstatus:1, 
            payment_type:'Receive', 
            company:`${company}`, 
            party_type: 'Customer', 
            party: `${customer}`, 
            paid_to:'111125 - BMI - VA - DTT',
            paid_amount:total, 
            reference_no:`${ref_no}`, 
            reference_date:`${dateNow}`,
            posting_date:`${dateNow}`,
            received_amount:total,
            references:references
        }
    }

    try {
        return await axios.post('https://semudahsenyum.com/api/resource/Payment%20Entry', {
            sid: globalsid,
            data: JSON.stringify(sendData)
        }).then(response => {
            return {response:response.data,code:200}
        }).catch(error => {
            console.log(error)
            return {error, code:12}
        })
    } catch (error) {
      console.log(error)
      return {error, code:12}
    }
}

const cancelPayment = async (
    paymentEntry
) => {
    sendData = {docstatus:2}
    try {
        return await axios.put('https://semudahsenyum.com/api/resource/Payment%20Entry/'+paymentEntry, {
            sid: globalsid,
            data: JSON.stringify(sendData)
        }).then(response => {
            return {response:response.data,code:200}
        }).catch(error => {
            console.log(error)
            return {error, code:12}
        })
    } catch (error) {
      console.log(error)
      return {error, code:12}
    }
}

const cancelSalesInvoice = async (
    salesInvoiceNo
) => {
    sendData = {docstatus:2}
    try {
        return await axios.put('https://semudahsenyum.com/api/resource/Sales%20Invoice/'+salesInvoiceNo, {
            sid: globalsid,
            data: JSON.stringify(sendData)
        }).then(response => {
            return {response:response.data,code:200}
        }).catch(error => {
            console.log(error)
            return {error, code:12}
        })
    } catch (error) {
      console.log(error)
      return {error, code:12}
    }
}

module.exports = {
    login,
    newSalesInvoice,
    newPayment,
    cancelPayment,
    cancelSalesInvoice
}