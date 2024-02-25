const express = require('express');
const dotenv = require('dotenv');
const exphbs = require('express-handlebars');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const emailjs = require('@emailjs/nodejs');
dotenv.config();
const { PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID } = process.env;
//const fs = require('fs');
const { CYCLIC_BUCKET_NAME } = process.env;
const fs = require('@cyclic.sh/s3fs/promises')(CYCLIC_BUCKET_NAME);

const jwt = require('jsonwebtoken');
const { KEY, JWTSECRET, JWTEXPIRY } = process.env;


const dailyQuota = 6; //max form submissions per day
const day = 1000 * 60 * 60 * 24; //24 hours
let contactFormCount = 0;
let errMsg = '';

const contactFormRenewal = setInterval(()=>{
    contactFormCount = 0;
}, day);

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

function readStock(){
    return new Promise(function(resolve, reject){
        fs.readFile('./data/stock.json', 'utf-8', (err, jsonString) => {
            if(err){
                reject(err);
            } else {
                try {
                    const data = JSON.parse(jsonString);
                    resolve(data);
                    console.log(data);
                } catch(err) {
                    reject(err);
                }          
            }
        });
    });
};

function updateStock(form){
    return new Promise(function(resolve, reject){
        const result = Object.entries(form).map(([key, value]) => ({ ['stock']: value }));
        fs.writeFile('./data/stock.json', JSON.stringify({data:result}, null, 2), err => {
            if(err) {
                console.log(err);
            } else {
                console.log('File successfully written!');
            }
        });
    });
};

function readContent() {
    return new Promise(function(resolve, reject){
        fs.readFile('./data/content.json', 'utf-8', (err, jsonString) => {
            if(err){
                reject(err);
            } else {
                try {
                    const data = JSON.parse(jsonString);
                    resolve(data);
                } catch(err) {
                    reject(err);
                }          
            }
        });
    });
};

/* function mergeSelectedProperties(source, target, keysToMerge) {
    keysToMerge.forEach(key => {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    });
} */

async function checkAuth(token) {
    const tokenStr = String(token);
    try {
        const decodedToken = await jwt.verify(token, JWTSECRET);
        console.log('WHO IS THE USER', decodedToken.user);
        if(decodedToken.user === 'owner'){
            console.log('In the true');
            return true;
        } else {
            console.log('In the false');
            return false;
        }  
    } catch(error){
        throw error
    }
};

function merge(target, source){
    return new Promise((resolve,reject)=>{
        try {
            let result = [];
            source.data.forEach((source, i) => {
                result.push(Object.assign(target.data[i], source));
            });
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
};

function mergeUpdate(stock, content) {
    let result = [];
    stock.data.forEach((stock, i) => {
        result.push({
            img: content.data[i].img,
            title: content.data[i].title,
            stock: stock.stock
        });
    });
    return result
};

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

app.get('/login', (req,res)=>{
    res.render('login');
})

app.post('/login', (req, res)=>{
    if(req.body.password == KEY){
        const token = jwt.sign({ user: 'owner' }, JWTSECRET, { expiresIn: JWTEXPIRY });
        console.log('CORRECT PASSWORD');
        res.json({ status: 'success', token: token });
    } else {
        console.log('WRONG PASSWORD');
        errMsg = 'WRONG PASSWORD';
        res.json({ status: 'error' });
    }
})

app.get('/home',(req, res)=>{
    res.render('home');
});

app.get('/media',(req, res)=>{
    res.render('media');
});

app.get('/read',(req,res)=>{
    readStock().then(data=>{
        console.log(data.data);
        res.render('read', { data: data.data });
    }).catch(err=>{
        console.log(err);
        errMsg = 'data could not be read.'
        res.render('error');
    })
});

app.get('/update', async (req,res)=>{
    try {
        const flag = await checkAuth(req.query.token);
        if(flag===true){
            console.log('OVER HERE NOW');
            readStock().then(stock=>{
                readContent().then(content=>{
                    const data = mergeUpdate(stock, content);
                    console.log('update page data', data);
                    res.render('update', { data: data });
                }).catch(err=>{
                    throw err;
                })
            }).catch(err=>{
                throw err;
            })
        } else {
            throw Error('Not Authorized');
        }

    } catch(err){
        errMsg = err.message;
        res.render('error');
    }

});
/* * * * * * * */
app.post('/update', (req,res)=>{
    updateStock(req.body).then(()=>{
        console.log('updated');
    }).catch(err=>{
        console.log(err);
        errMsg = 'data could not be read.'
        res.send('error');
    });
    res.send('success');
});

app.get('/merged', (req,res)=>{
    readStock().then(async source=>{
        readContent().then(async target=>{
            const returnedTarget = await merge(target, source);
            console.log('Here.');
            console.log(returnedTarget);
            res.render('merged', {data: returnedTarget});
        }).catch(err=>{
            throw err;
        })

    }).catch(err=>{
        console.log(err);
        errMsg = 'data could not be read.'
        res.send('error');
    });;
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

