const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const syncData = require('./routes/utils/sync_data')
const erpnext = require('./routes/utils/erpnext')

// Routes
const bmi = require('./routes/api/bmi')

const app = express()

// Body parser middleware
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.text({type:"text/plain"}))

// Use Routes
app.use(cors({
    origin: '*',
    credentials: true
}))
app.use('/api/bmi', bmi)

const port = process.env.PORT || 5000

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
    syncData.sync()
    erpnext.login()
    setInterval(()=>syncData.sync(), 5000) // sync with erpnext mysql every 5 seconds
    setInterval(()=>erpnext.login(), 3600000) // login to erpnext website every 1 hour
})
