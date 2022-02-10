const puppeteer = require("puppeteer");
const path = require('path');
const express = require('express');
const app = require('express')();
const http = require('http').createServer(app);
const cors = require('cors');
const axios = require('axios').default;
var fs = require('fs');
var uuid = require('uuid');
const pdfParser = require('pdf-parse');
const PDFMerger = require("pdf-merger-js");
const merger = new PDFMerger();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cors());

app.get('/', async (req, res) => {
  console.log('2');
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});

app.get('/pdf', async (req, res) => {
  let destinationURL = req.query.url;

  let name_en = req.query.name_en; 
  let district_en = req.query.district_en;
  let building_no = req.query.building_no;
  let street_name_en = req.query.street_name_en;
  let city_en = req.query.city_en;
  let postal_code = req.query.postal_code;
  let additional_no = req.query.additional_no;
  let country_en = req.query.country_en;
  let name = req.query.name;
  let district = req.query.district;
  let street_name = req.query.street_name;
  let city = req.query.city;
  let country = req.query.country;
  let id = req.query.id;
  let logoUrl = req.query.logoUrl;
  console.log(logoUrl);

  let image = await axios.get(logoUrl, {responseType: 'arraybuffer'});
  let logo = Buffer.from(image.data).toString('base64');
  let pathFile = id+'-'+uuid.v1()+'.pdf';
  
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      // executablePath: '',
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
      headless: true,
      timeout: 6000,
    });
  } catch (err){
    console.log('error');
    console.log(err);
  }
    
  let page;
  try{
    page = await browser.newPage();
  } catch (err){
    console.log('error');
    console.log(err);
  }

  const footer = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: right; width: 100%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
  const lastPagefooter = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: left; width: 45%;"><span style="font-size: 10px;">Authorized Signature:</span></div><div style="text-align: left; width: 35%;"><span style="font-size: 10px;">Recieved by:</span></div><div style="text-align: right; width: 20%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
  const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%"><div style="font-size: 8px; float: left" lang="en"><div style="font-size: 8px; float: left">'+name_en+'</div><br><div style="font-size: 8px; float: left">'+district_en+' - '+building_no+' '+street_name_en+'</div><div style="font-size: 8px; float: left">'+city_en+' '+postal_code+' - '+additional_no+', '+country_en+'</div></div></td><td style="font-size: 8px; width: 33%; text-align: center;"><img width="40px" src="data:image/png;base64, '+logo+'"></td><td style="font-size: 8px; width: 33%"><div lang="ar" style="font-size: 8px; float: right"><div style="font-size: 8px; float: right">'+name+'</div><br><div style="font-size: 8px; float: right">'+district+' - '+building_no+' '+street_name+'</div><br><div style="font-size: 8px; float: right">'+city+' '+postal_code+' - '+additional_no+' '+country+'</div></div></td></tr></table>';
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
  // await page.emulateMediaType('screen');
  await page.pdf({
    path: pathFile,
    displayHeaderFooter: true,
    footerTemplate: footer,
    headerTemplate: header,
    format: 'A4',
    landscape: false,
    margin : {
      top: '180px',
      right: '40px',
      bottom: '60px',
      left: '40px'
    }
  });

  let page2;
  try{
    page2 = await browser.newPage();
  } catch (err){
    console.log('error');
    console.log(err);
  }

  await page2.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });

  const dataBuffer = fs.readFileSync(pathFile);
  const pdfInfo = await pdfParser(dataBuffer);
  const numPages = pdfInfo.numpages;

  let pdfFile;
  if(numPages === 1) 
  {
    pdfFile = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: lastPagefooter,
      headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        top: '180px',
        right: '40px',
        bottom: '60px',
        left: '40px'
      },     
      pageRanges: `${numPages}`,
    });
  }
  else
  {
    let firstPart = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: footer,
      headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        top: '180px',
        right: '40px',
        bottom: '60px',
        left: '40px'
      },     
      pageRanges: `1-${numPages - 1}`,
    });

    let secondPart = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: lastPagefooter,
      headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        top: '180px',
        right: '40px',
        bottom: '60px',
        left: '40px'
      },     
      pageRanges: `${numPages}`,
    });
    merger.add(firstPart);
    merger.add(secondPart);
    
    pdfFile = await merger.saveAsBuffer();
  }
  
  await browser.close();

  fs.unlinkSync(pathFile);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdfFile.length,
  });
  res.attachment("invoice.pdf");
  res.send(pdfFile);
});

// app.get('/pdfNoSignature', async (req, res) => {
//   let destinationURL = req.query.url;
//   let browser;
//   try {
//     browser = await puppeteer.launch({
//       // executablePath: '/usr/bin/chromium-browser',
//       executablePath: '',
//       args: [
//         "--no-sandbox",
//         "--disable-setuid-sandbox",
//         "--disable-dev-shm-usage",
//         "--disable-accelerated-2d-canvas",
//         "--no-first-run",
//         "--no-zygote",
//         "--single-process",
//         "--disable-gpu",
//       ],
//       headless: true,
//       timeout: 6000,
//     });
//   } catch (err){
//     ;
//   }
    
//   let page;
//   try{
//     page = await browser.newPage();
//   } catch (err){
//     ;
//   }
  
//   const footer = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: right; width: 100%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
//   const header = '<table><tr><td style="width: 33%"><div style="float: left" lang="en"><div style="float: left">seller_name_en</div><div style="float: left">seller_district_en - seller_building_no seller_street_name_en</div><div style="float: left">seller_city_en seller_postal_code - seller_additional_no, seller_country_en</div></div></td><td style="width: 33%; text-align: center;"><img src="https://masar.fra1.digitaloceanspaces.com/fatoorah/localhost/1/logos/1642937909161ed3e35a5b38.png" alt="logo"></td><td style="width: 33%"><div lang="ar" style="float: right"><div style="float: right">seller_name</div><br><div style="float: right">seller_district - seller_building_no seller_street_name}</div><div style="float: right">seller_city seller_postal_code - seller_additional_no، seller_country</div></div></td></tr></table>';

//   await page.goto(destinationURL, {
//     waitUntil: ['domcontentloaded', 'networkidle2']
//   });
    
//   await page.emulateMediaType('screen');
//   const pdf = await page.pdf({
//     displayHeaderFooter: true,
//     footerTemplate: footer,
//     headerTemplate: header,
//     format: 'A4',
//     landscape: false,
//     margin : {
//       top: '30px',
//       right: '40px',
//       bottom: '60px',
//       left: '40px'
//     }
//   });

//   await browser.close();

//   res.set({
//     "Content-Type": "application/pdf",
//     "Content-Length": pdf.length,
//   });
//   res.attachment("invoice.pdf");
//   res.send(pdf);
// });

// app.get('/pdf_report', async (req, res) => {
//   let destinationURL_1 = req.query.url;
//   destinationURL_2 = destinationURL_1.split('!').join('=')
//   destinationURL_3 = destinationURL_2.split('^').join('?')
//   destinationURL_4 = destinationURL_3.split('*').join('&')

//   const browser = await puppeteer.launch({
//     executablePath: '/usr/bin/chromium-browser',
//     // executablePath: '',
//     headless: true
//   });
    
//   const page = await browser.newPage();
    
//   await page.goto(destinationURL_4, {
//     waitUntil: "networkidle0"
//   });
    
//   await page.emulateMediaType('screen');
//   const pdf = await page.pdf({
//     format: 'A4',
//     preferCSSPageSize: true,
//   });

//   await browser.close();

//   res.set({
//     "Content-Type": "application/pdf",
//     "Content-Length": pdf.length
//   });
//   res.send(pdf);
// });

app.listen(5000, () => {
    console.log('server started on port 5000');
});
