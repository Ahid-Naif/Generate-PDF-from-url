const puppeteer = require("puppeteer");
const path = require('path');
const express = require('express');
const app = require('express')();
const cors = require('cors');
const axios = require('axios').default;

var fs = require('fs');
var uuid = require('uuid');
const pdfParser = require('pdf-parse');
const PDFMerger = require("pdf-merger-js");
const bodyParser = require("body-parser");
var sizeOf = require('image-size');

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get('/', async (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});

app.post('/pdf', async (req, res) => {
  let {
      url: destinationURL, name_en, district_en, building_no, street_name_en,
      city_en, postal_code, additional_no, country_en, name, district,
      street_name, city, country, id, logoUrl
  } = req.body;

  let image;
  try {
      console.log("Fetching logo image...");
      image = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      console.log("Logo image fetched successfully.");
  } catch (error) {
      console.error("Failed to load logo image:", error);
      return res.status(500).send('Failed to load logo image.');
  }

  let logo = Buffer.from(image.data).toString('base64');
  let pathFile = id + '-' + uuid.v1() + '.pdf';
  let img = Buffer.from(logo, 'base64');
  let { width, height } = sizeOf(img);
  let merger = new PDFMerger();

  let browser;
  try {
      console.log("Launching browser...");
      browser = await puppeteer.launch({
          executablePath: '/usr/bin/chromium-browser',
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
          timeout: 60000,
      });
      console.log("Browser launched successfully.");
  } catch (err) {
      console.error("Failed to launch browser:", err);
      return res.status(500).send('Failed to launch browser.');
  }

  const header = `
      <table style="width: 100%; margin: 0; padding: 30px;">
          <tr>
              <td style="width: 33%; font-size: 8px;">
                  <div lang="en">
                      ${name_en}<br>
                      ${district_en} - ${building_no} ${street_name_en}<br>
                      ${city_en} ${postal_code} - ${additional_no}, ${country_en}
                  </div>
              </td>
              <td style="width: 33%; text-align: center;">
                  <img width="${width / 2}px" height="${height / 2}px" src="data:image/png;base64, ${logo}">
              </td>
              <td style="width: 33%; text-align: right; font-size: 8px;">
                  <div lang="ar">
                      ${name}<br>
                      ${district} - ${building_no} ${street_name}<br>
                      ${city} ${postal_code} - ${additional_no}, ${country}
                  </div>
              </td>
          </tr>
      </table>
  `;
  const footer = `
      <div style="width: 100%; font-size: 8px; display: flex; justify-content: space-between;">
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      </div>
  `;
  const lastPageFooter = `
      <div style="width: 100%; font-size: 8px; display: flex; justify-content: space-between;">
          <div>Authorized Signature:</div>
          <div>Received by:</div>
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      </div>
  `;

  let page, page2;
  try {
      console.log("Opening first page...");
      page = await browser.newPage();
      await page.goto(destinationURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log("First page opened successfully.");
  } catch (error) {
      console.error("Failed to open the first page:", error);
      return res.status(500).send('Failed to navigate to the URL.');
  }

  try {
      console.log("Generating the first PDF...");
      await page.pdf({
          path: pathFile,
          displayHeaderFooter: true,
          headerTemplate: header,
          footerTemplate: footer,
          format: 'A4',
          margin: {
              top: '180px',
              right: '40px',
              bottom: '60px',
              left: '40px'
          }
      });
      console.log("First PDF generated successfully.");
  } catch (error) {
      console.error("Failed to generate the first PDF:", error);
      return res.status(500).send('Failed to generate the first PDF.');
  }

  try {
      console.log("Opening second page...");
      page2 = await browser.newPage();
      await page2.goto(destinationURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log("Second page opened successfully.");

      const dataBuffer = fs.readFileSync(pathFile);
      const pdfInfo = await pdfParser(dataBuffer);
      const numPages = pdfInfo.numpages;

      let pdfFile;
      if (numPages === 1) {
          console.log("Generating single-page PDF...");
          pdfFile = await page2.pdf({
              displayHeaderFooter: true,
              headerTemplate: header,
              footerTemplate: lastPageFooter,
              format: 'A4',
              margin: {
                  top: '180px',
                  right: '40px',
                  bottom: '60px',
                  left: '40px'
              },
              pageRanges: `${numPages}`
          });
          console.log("Single-page PDF generated successfully.");
      } else {
          console.log("Generating multi-page PDF...");
          const firstPart = await page2.pdf({
              displayHeaderFooter: true,
              headerTemplate: header,
              footerTemplate: footer,
              format: 'A4',
              margin: {
                  top: '180px',
                  right: '40px',
                  bottom: '60px',
                  left: '40px'
              },
              pageRanges: `1-${numPages - 1}`
          });

          const secondPart = await page2.pdf({
              displayHeaderFooter: true,
              headerTemplate: header,
              footerTemplate: lastPageFooter,
              format: 'A4',
              margin: {
                  top: '180px',
                  right: '40px',
                  bottom: '60px',
                  left: '40px'
              },
              pageRanges: `${numPages}`
          });

          merger.add(firstPart);
          merger.add(secondPart);
          pdfFile = await merger.saveAsBuffer();
          console.log("Multi-page PDF generated and merged successfully.");
      }

      await browser.close();
      fs.unlinkSync(pathFile);

      res.set({ "Content-Type": "application/pdf", "Content-Length": pdfFile.length });
      res.attachment("invoice.pdf");
      res.send(pdfFile);
      console.log("PDF sent successfully.");

  } catch (error) {
      console.error("Failed to generate or merge PDF:", error);
      await browser.close();
      return res.status(500).send('Failed to generate or merge PDF.');
  }
});

app.post('/pdf/createdBy', async (req, res) => {
  let destinationURL = req.body.url;
  let name_en = req.body.name_en; 
  let district_en = req.body.district_en;
  let building_no = req.body.building_no;
  let street_name_en = req.body.street_name_en;
  let city_en = req.body.city_en;
  let postal_code = req.body.postal_code;
  let additional_no = req.body.additional_no;
  let country_en = req.body.country_en;
  let name = req.body.name;
  let district = req.body.district;
  let street_name = req.body.street_name;
  let city = req.body.city;
  let country = req.body.country;
  let id = req.body.id;
  let logoUrl = req.body.logoUrl;
  let madeBy = req.body.madeBy;
  let pathFile = id+'-'+uuid.v1()+'.pdf';
  
  let image = await axios.get(logoUrl, {responseType: 'arraybuffer'});
  let logo = Buffer.from(image.data).toString('base64');

  let img = Buffer.from(logo, 'base64');
  let dimensions = sizeOf(img);
  let width = dimensions.width;
  let height = dimensions.height;
  
  let merger = new PDFMerger();
  
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
  const lastPagefooter = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: left; width: 45%;"><span style="font-size: 10px;">Made by:'+madeBy+'</span></div><div style="text-align: left; width: 35%;"><span style="font-size: 10px;"></span></div><div style="text-align: right; width: 20%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
  // const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%"><div style="font-size: 8px; float: left" lang="en"><div style="font-size: 8px; float: left">'+name_en+'</div><br><div style="font-size: 8px; float: left">'+district_en+' - '+building_no+' '+street_name_en+'</div><div style="font-size: 8px; float: left">'+city_en+' '+postal_code+' - '+additional_no+', '+country_en+'</div></div></td><td style="font-size: 8px; width: 33%; text-align: center;"><img width="'+width/2+'px" height="'+height/2+'px" src="data:image/png;base64, '+logo+'"></td><td style="font-size: 8px; width: 33%"><div lang="ar" style="font-size: 8px; float: right"><div style="font-size: 8px; float: right">'+name+'</div><br><div style="font-size: 8px; float: right">'+district+' - '+building_no+' '+street_name+'</div><br><div style="font-size: 8px; float: right">'+city+' '+postal_code+' - '+additional_no+' '+country+'</div></div></td></tr></table>';
    
  try {
    await page.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }
    
  // await page.emulateMediaType('screen');
  await page.pdf({
    path: pathFile,
    displayHeaderFooter: true,
    footerTemplate: footer,
    // headerTemplate: header,
    format: 'A4',
    landscape: false,
    margin : {
      // top: '180px',
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

  try {
    await page2.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }

  const dataBuffer = fs.readFileSync(pathFile);
  const pdfInfo = await pdfParser(dataBuffer);
  const numPages = pdfInfo.numpages;

  let pdfFile;
  if(numPages === 1) 
  {
    pdfFile = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: lastPagefooter,
      // headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        // top: '180px',
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
      // headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        // top: '180px',
        right: '40px',
        bottom: '60px',
        left: '40px'
      },     
      pageRanges: `1-${numPages - 1}`,
    });

    let secondPart = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: lastPagefooter,
      // headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        // top: '180px',
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

app.post('/pdfNoSignature', async (req, res) => {
  let destinationURL = req.body.url;
  let name_en = req.body.name_en; 
  let district_en = req.body.district_en;
  let building_no = req.body.building_no;
  let street_name_en = req.body.street_name_en;
  let city_en = req.body.city_en;
  let postal_code = req.body.postal_code;
  let additional_no = req.body.additional_no;
  let country_en = req.body.country_en;
  let name = req.body.name;
  let district = req.body.district;
  let street_name = req.body.street_name;
  let city = req.body.city;
  let country = req.body.country;
  let id = req.body.id;
  let logoUrl = req.body.logoUrl;
  
  let image = await axios.get(logoUrl, {responseType: 'arraybuffer'});
  let logo = Buffer.from(image.data).toString('base64');

  let img = Buffer.from(logo, 'base64');
  let dimensions = sizeOf(img);
  let width = dimensions.width;
  let height = dimensions.height;
  
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
  const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%"><div style="font-size: 8px; float: left" lang="en"><div style="font-size: 8px; float: left">'+name_en+'</div><br><div style="font-size: 8px; float: left">'+district_en+' - '+building_no+' '+street_name_en+'</div><div style="font-size: 8px; float: left">'+city_en+' '+postal_code+' - '+additional_no+', '+country_en+'</div></div></td><td style="font-size: 8px; width: 33%; text-align: center;"><img width="'+width/2+'px" height="'+height/2+'px" src="data:image/png;base64, '+logo+'"></td><td style="font-size: 8px; width: 33%"><div lang="ar" style="font-size: 8px; float: right"><div style="font-size: 8px; float: right">'+name+'</div><br><div style="font-size: 8px; float: right">'+district+' - '+building_no+' '+street_name+'</div><br><div style="font-size: 8px; float: right">'+city+' '+postal_code+' - '+additional_no+' '+country+'</div></div></td></tr></table>';
    
  try {
    await page.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }
    
  // await page.emulateMediaType('screen');
  let pdfFile = await page.pdf({
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

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdfFile.length,
  });
  res.attachment("invoice.pdf");
  res.send(pdfFile);
});

app.post('/pdfNoSignature2', async (req, res) => {
  let destinationURL = req.body.url;
  let name_en = req.body.name_en; 
  let district_en = req.body.district_en;
  let building_no = req.body.building_no;
  let street_name_en = req.body.street_name_en;
  let city_en = req.body.city_en;
  let postal_code = req.body.postal_code;
  let additional_no = req.body.additional_no;
  let country_en = req.body.country_en;
  let name = req.body.name;
  let district = req.body.district;
  let street_name = req.body.street_name;
  let city = req.body.city;
  let country = req.body.country;
  let id = req.body.id;
  let logoUrl = req.body.logoUrl;
  
  let image = await axios.get(logoUrl, {responseType: 'arraybuffer'});
  let logo = Buffer.from(image.data).toString('base64');

  let img = Buffer.from(logo, 'base64');
  let dimensions = sizeOf(img);
  let width = dimensions.width;
  let height = dimensions.height;
  
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
  const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%"><div style="font-size: 8px; float: left" lang="en"><div style="font-size: 8px; float: left">'+name_en+'</div><br><div style="font-size: 8px; float: left">'+district_en+' - '+building_no+' '+street_name_en+'</div><div style="font-size: 8px; float: left">'+city_en+' '+postal_code+' - '+additional_no+', '+country_en+'</div></div></td><td style="font-size: 8px; width: 33%; text-align: center;"><img width="'+width/2+'px" height="'+height/2+'px" src="data:image/png;base64, '+logo+'"></td><td style="font-size: 8px; width: 33%"><div lang="ar" style="font-size: 8px; float: right"><div style="font-size: 8px; float: right">'+name+'</div><br><div style="font-size: 8px; float: right">'+district+' - '+building_no+' '+street_name+'</div><br><div style="font-size: 8px; float: right">'+city+' '+postal_code+' - '+additional_no+' '+country+'</div></div></td></tr></table>';
    
  try {
    await page.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }
    
  // await page.emulateMediaType('screen');
  let pdfFile = await page.pdf({
    displayHeaderFooter: true,
    footerTemplate: footer,
    // headerTemplate: header,
    format: 'A4',
    landscape: false,
    margin : {
      // top: '180px',
      right: '40px',
      bottom: '60px',
      left: '40px'
    }
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdfFile.length,
  });
  res.attachment("invoice.pdf");
  res.send(pdfFile);
});

app.post('/pdf2', async (req, res) => {
  let destinationURL = req.body.url;
  let name_en = req.body.name_en; 
  let district_en = req.body.district_en;
  let building_no = req.body.building_no;
  let street_name_en = req.body.street_name_en;
  let city_en = req.body.city_en;
  let postal_code = req.body.postal_code;
  let additional_no = req.body.additional_no;
  let country_en = req.body.country_en;
  let name = req.body.name;
  let district = req.body.district;
  let street_name = req.body.street_name;
  let city = req.body.city;
  let country = req.body.country;
  let id = req.body.id;
  let logoUrl = req.body.logoUrl;
  
  let image = await axios.get(logoUrl, {responseType: 'arraybuffer'});
  let logo = Buffer.from(image.data).toString('base64');
  let pathFile = id+'-'+uuid.v1()+'.pdf';

  let img = Buffer.from(logo, 'base64');
  let dimensions = sizeOf(img);
  let width = dimensions.width;
  let height = dimensions.height;

  let merger = new PDFMerger();
  
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
  const lastPagefooter = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: left; width: 45%;"><span style="font-size: 10px;">Authorized Signature:</span></div><div style="text-align: left; width: 35%;"><span style="font-size: 10px;">Received by:</span></div><div style="text-align: right; width: 20%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
  const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%"><div style="font-size: 8px; float: left" lang="en"><div style="font-size: 8px; float: left">'+name_en+'</div><br><div style="font-size: 8px; float: left">'+district_en+' - '+building_no+' '+street_name_en+'</div><div style="font-size: 8px; float: left">'+city_en+' '+postal_code+' - '+additional_no+', '+country_en+'</div></div></td><td style="font-size: 8px; width: 33%; text-align: center;"><img width="'+width/2+'px" height="'+height/2+'px" src="data:image/png;base64, '+logo+'"></td><td style="font-size: 8px; width: 33%"><div lang="ar" style="font-size: 8px; float: right"><div style="font-size: 8px; float: right">'+name+'</div><br><div style="font-size: 8px; float: right">'+district+' - '+building_no+' '+street_name+'</div><br><div style="font-size: 8px; float: right">'+city+' '+postal_code+' - '+additional_no+' '+country+'</div></div></td></tr></table>';
    
  try {
    await page.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }
    
  // await page.emulateMediaType('screen');
  await page.pdf({
    path: pathFile,
    displayHeaderFooter: true,
    footerTemplate: footer,
    // headerTemplate: header,
    format: 'A4',
    landscape: false,
    margin : {
      // top: '180px',
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

  try {
    await page2.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }

  const dataBuffer = fs.readFileSync(pathFile);
  const pdfInfo = await pdfParser(dataBuffer);
  const numPages = pdfInfo.numpages;

  let pdfFile;
  if(numPages === 1) 
  {
    pdfFile = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: lastPagefooter,
      // headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        // top: '180px',
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
      // headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        // top: '180px',
        right: '40px',
        bottom: '60px',
        left: '40px'
      },     
      pageRanges: `1-${numPages - 1}`,
    });

    let secondPart = await page2.pdf({
      displayHeaderFooter: true,
      footerTemplate: lastPagefooter,
      // headerTemplate: header,
      format: 'A4',
      landscape: false,
      margin : {
        // top: '180px',
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

app.post('/printPdf', async (req, res) => {
  let destinationURL = req.body.url;
  let name_en = req.body.name_en; 
  let district_en = req.body.district_en;
  let building_no = req.body.building_no;
  let street_name_en = req.body.street_name_en;
  let city_en = req.body.city_en;
  let postal_code = req.body.postal_code;
  let additional_no = req.body.additional_no;
  let country_en = req.body.country_en;
  let name = req.body.name;
  let district = req.body.district;
  let street_name = req.body.street_name;
  let city = req.body.city;
  let country = req.body.country;
  let id = req.body.id;
  let logoUrl = req.body.logoUrl;
  
  let image = await axios.get(logoUrl, {responseType: 'arraybuffer'});
  let logo = Buffer.from(image.data).toString('base64');
  let pathFile = id+'-'+uuid.v1()+'.pdf';

  let img = Buffer.from(logo, 'base64');
  let dimensions = sizeOf(img);
  let width = dimensions.width;
  let height = dimensions.height;

  let merger = new PDFMerger();
  
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
  const lastPagefooter = '<div class="footer" style="padding-left: 10px !important; padding-right: 10px !important; margin: 0; width: 100%; display: flex; flex-wrap: wrap; font-size: 8px;"><div style="text-align: left; width: 45%;"><span style="font-size: 10px;">Authorized Signature:</span></div><div style="text-align: left; width: 35%;"><span style="font-size: 10px;">Received by:</span></div><div style="text-align: right; width: 20%"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div></div>';
  const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%"><div style="font-size: 8px; float: left" lang="en"><div style="font-size: 8px; float: left">'+name_en+'</div><br><div style="font-size: 8px; float: left">'+district_en+' - '+building_no+' '+street_name_en+'</div><div style="font-size: 8px; float: left">'+city_en+' '+postal_code+' - '+additional_no+', '+country_en+'</div></div></td><td style="font-size: 8px; width: 33%; text-align: center;"><img width="'+width/2+'px" height="'+height/2+'px" src="data:image/png;base64, '+logo+'"></td><td style="font-size: 8px; width: 33%"><div lang="ar" style="font-size: 8px; float: right"><div style="font-size: 8px; float: right">'+name+'</div><br><div style="font-size: 8px; float: right">'+district+' - '+building_no+' '+street_name+'</div><br><div style="font-size: 8px; float: right">'+city+' '+postal_code+' - '+additional_no+' '+country+'</div></div></td></tr></table>';
    
  try {
    await page.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }
    
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

  try {
    await page2.goto(destinationURL, {
      waitUntil: ['domcontentloaded'],
      timeout: 60000 // 60 seconds
    });
  } catch (error) {
    console.error('Navigation failed:', error);
  }

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

app.listen(5000, () => {
    console.log('server started on port 5000');
});