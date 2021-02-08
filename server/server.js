const puppeteer = require("puppeteer");
const path = require('path');
const fs = require('fs')
const express = require('express');
const app = require('express')();
const http = require('http').createServer(app);
const cors = require('cors');

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cors());

app.get('/', async (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});

app.get('/pdf', async (req, res) => {
    let destinationURL = req.query.url;
    const browser = await puppeteer.launch({
		executablePath: '/usr/bin/chromium-browser'
	});
    const page = await browser.newPage();
    await page.goto(destinationURL, {
      waitUntil: "networkidle2"
    });
    const pdfURL = path.join(__dirname, 'certificate.pdf');
    
    const pdf = await page.pdf({
      path: pdfURL,
      preferCSSPageSize: true,
      pageRanges: '1'
    });
    await browser.close();
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length
    });
    res.sendFile(pdfURL);

    setTimeout(function(){
      fs.unlink(pdfURL, (err) => {
        if (err) {
          console.error(err)
          return
        }
        //file removed
      })
    }, 10000);
});

app.listen(5000, () => {
    console.log('server started on port 5000');
});
