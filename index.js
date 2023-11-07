const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;


// Middleware's
app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send("Serenity Haven Server is Running");
})

app.listen(port, ()=>{
    console.log(`Serenity Server is runnig on port: ${port}`);
})
