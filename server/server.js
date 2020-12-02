const puppeteer = require("puppeteer");
const path = require('path');
const fs = require('fs')
const express = require('express');
const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/pdf', async (req, res) => {
    let destinationURL = req.query.url;
    const browser = await puppeteer.launch();
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
