const express = require('express');
const dotenv = require('dotenv');
const exphbs = require('express-handlebars');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const emailjs = require('@emailjs/nodejs');
dotenv.config();
const { PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID } = process.env;

const dailyQuota = 6; //max form submissions per day
const day = 1000 * 60 * 60 * 24; //24 hours
let contactFormCount = 0;
let errMsg = '';

const contactFormRenewal = setInterval(()=>{
    contactFormCount = 0;
}, 60000);

emailjs.init({
    publicKey: PUBLIC_KEY
});

const limitFormSubmissions = rateLimit({
    max: 2, // 2 requests per 24 hours
    windowMs: 24 * 60 * (60000), //24 hour limit
    message: 'Too many form submissions from this IP, please try again tomorrow',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const app = express();

app.engine('.hbs', exphbs.engine({ 
    extname: '.hbs',  
    layoutsDir: `${__dirname}/views/layouts`, 
    partialsDir: `${__dirname}/views/partials`,
    defaultLayout: 'main',
    helpers: { 
        navLink: function(url, options){
            return '<a' + ((url == app.locals.activeRoute) ? ' class="nav-link active current-page" aria-current-page ' : ' class="nav-link" ') 
            + 'href="' + url + '">' + options.fn(this) + '</a>';
        },
        error: function(){ return errMsg }
    }
}));

app.set('view engine', '.hbs');
app.use(express.static(`${__dirname}/public`));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next){
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
    next();
});

app.get('/',(req, res)=>{
    res.redirect('/home');
});

app.get('/home',(req, res)=>{
    res.render('home');
});

app.get('/media',(req, res)=>{
    res.render('media');
});

app.get('/contact',(req, res)=>{
    res.render('contact');
});

app.post('/contact', limitFormSubmissions, (req, res)=>{

    if(contactFormCount >= dailyQuota){
        errMsg = 'Submissions reached daily limit! Please wait up to 24 hours or send an email to: example@test.com';
        res.send('error');
    } else { 
        const templateParams = req.body;
        emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams).then(
            (response) => {
            console.log('SUCCESS!', response.status, response.text);
            },
            (err) => {
            console.log('FAILED...', err);
            },
        );
        contactFormCount++;
        res.send('success');
    }
});

app.get('/error',(req, res)=>{
    res.render('error');
});

app.get('/thanks',(req, res)=>{
    res.render('thanks');
});

app.listen(3000, console.log('SERVER RUNNING'));
