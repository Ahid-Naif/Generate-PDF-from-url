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
    executablePath: '/usr/bin/chromium-browser',
    // executablePath: '',
    // headless: true
  });
    
  const page = await browser.newPage();

const header = '<div class="header" style="padding: 0 !important; margin: 0; -webkit-print-color-adjust: exact; background-color: red; color: white; width: 100%; text-align: left; font-size: 12px;">header of Juan<br /> Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
const footer = '<div class="footer" style="padding: 0 !important; margin: 0; -webkit-print-color-adjust: exact; background-color: blue; color: white; width: 100%; text-align: right; font-size: 12px;">footer of Juan<br /> Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
  await page.emulateMediaType('screen');
  const pdf = await page.pdf({
    displayHeaderFooter: true,
    footerTemplate: '<h1 style="font-size:12px;">THIS IS A TEST</h1>',
    // footerTemplate: '<div id="footer-template" style="font-size:10px !important; color:#808080; padding-left:10px;">hey</div>',
    format: 'A4',
    // preferCSSPageSize: true,
    printBackground: true,
    headless: false,
    margin : {
      top: '20px',
      right: '20px',
      bottom: '100px',
      left: '20px'
  }
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length
  });
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
