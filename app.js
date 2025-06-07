require('dotenv').config();
const express = require ("express")
const mongoose = require ("mongoose")
const path = require("path")
const cron = require("node-cron")
const nodemailer = require ("nodemailer")
const expressLayout = require ("express-ejs-layouts")
const Reminder = require('./models/reminder');
const MONGO_URL = process.env.MONGO_URL;

//Express instance
const app = express();

//middlewares
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.set("view engine",'ejs');
app.set("views",path.join(__dirname,"views"));
app.use(expressLayout);
app.set('layout','layout');

//connect db
mongoose.connect(MONGO_URL).then(()=>{console.log("Connected to mongodb...")}).catch((error)=>{console.log(`Error : connecting the mongodb ${error.message}`);
})

//Email transporter
const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }
})
//Route
//Home page 
app.get('/',(req,res)=>{
    res.render("index",{
        title:'Email Reminder App',
        currentPage:'home',
    });
});

//About page
app.get('/about',(req,res)=>{
    res.render("about",{
        title:'About - Email Reminder App',
        currentPage:'about',
    });
});
//schedule page
app.get('/schedule',(req,res)=>{
    res.render("schedule",{
        title:'Schedule-Email',
        currentPage:'schedule',
    });
});

//Actual logic for scheduling
app.post('/schedule',async(req,res)=>{
    try{
        const {email, message, datetime} = req.body;
        const reminder = new Reminder({
            email, message, scheduledTime:new Date(datetime)
        });
        await reminder.save();
        
        
        res.redirect('/schedule?success=true')
    }catch(error){
        res.redirect('/schedule?error=true')
    }
})

// getting all reminders
app.get('/reminders',async(req,res)=>{
    try {
        const reminders = await Reminder.find().sort({scheduledTime: 1});
        res.render('reminders',{
            reminders,
            title:'',
            currentPage:'reminders'
        })
    } catch (error) {
        error.message();
    }
})

// cron job to send reminders
cron.schedule("* * * * * ",async()=>{
    try {
        const now = new Date();
        const reminders =await Reminder.find({
            scheduledTime:{$lte: now},
            sent: false
        })
        for(const reminder of reminders){
            await transporter.sendMail({
                from:process.env.EMAIL_USER,
                to: reminder.email,
                text: reminder.message,
                subject:'Reminder App'
            })
            reminder.sent = true;
            await reminder.save();
        }
    } catch (error) {
        console.log("Error sending reminder: "+error);
        
    }
})
//start the server
const  PORT = process.env.PORT||5000;
app.listen(PORT,console.log( `Server is running on port ${PORT}`));