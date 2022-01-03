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
  console.log('1');
  let destinationURL = req.query.url;
  const browser = await puppeteer.launch({
    // executablePath: '/usr/bin/chromium-browser',
    executablePath: '',
    // headless: true
  });
  console.log('2');
    
  const page = await browser.newPage();
  console.log('3');
    
  await page.goto(destinationURL, {
    waitUntil: "networkidle0"
  });
  console.log('4');

    
  await page.emulateMediaType('screen');
  const pdf = await page.pdf({
    format: 'A4',
    preferCSSPageSize: true,
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
