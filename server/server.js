const puppeteer = require("puppeteer");
const path = require('path');
const express = require('express');
const app = require('express')();
const http = require('http').createServer(app);
const cors = require('cors');

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cors());

app.get('/', async (req, res) => {
  console.log('2');
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});

app.get('/pdf', async (req, res) => {
  let destinationURL = req.query.url;
  const browser = await puppeteer.launch({
    // executablePath: '/usr/bin/chromium-browser',
    executablePath: '',
    // headless: true
  });
    
  const page = await browser.newPage();

  const footer = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: left; width: 45%;"><span style="font-size: 10px;">Authorized Signature:</span></div><div style="text-align: left; width: 35%;"><span style="font-size: 10px;">Recieved by:</span></div><div style="text-align: right; width: 20%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
  await page.emulateMediaType('screen');
  const pdf = await page.pdf({
    displayHeaderFooter: true,
    footerTemplate: footer,
    format: 'A4',
    landscape: false,
    margin : {
      top: '30px',
      right: '40px',
      bottom: '60px',
      left: '40px'
    }
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length,
  });
  res.attachment("invoice.pdf");
  res.send(pdf);
});

app.get('/pdfNoSignature', async (req, res) => {
  let destinationURL = req.query.url;
  const browser = await puppeteer.launch({
    // executablePath: '/usr/bin/chromium-browser',
    executablePath: '',
    // headless: true
  });
    
  const page = await browser.newPage();

  const footer = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: right; width: 100%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
  await page.emulateMediaType('screen');
  const pdf = await page.pdf({
    displayHeaderFooter: true,
    footerTemplate: footer,
    format: 'A4',
    landscape: false,
    margin : {
      top: '30px',
      right: '40px',
      bottom: '60px',
      left: '40px'
    }
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length,
  });
  res.attachment("invoice.pdf");
  res.send(pdf);
});

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
