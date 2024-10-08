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
  let destinationURL = req.body.url;
  let id = req.body.id;
  let logoUrl = req.body.logoUrl;
  
  console.log("Fetching logo image...");
  let image = await axios.get(logoUrl, { responseType: 'arraybuffer' });
  let logo = Buffer.from(image.data).toString('base64');
  let pathFile = id + '-' + uuid.v1() + '.pdf';

  let img = Buffer.from(logo, 'base64');
  let dimensions = sizeOf(img);
  let width = dimensions.width;
  let height = dimensions.height;

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
        "--disable-gpu"
      ],
      headless: true,
      timeout: 120000, // 2 minutes timeout
    });
    console.log("Browser launched successfully.");
  } catch (err) {
    console.error('Browser launch failed:', err);
    return res.status(500).send('Failed to launch browser.');
  }

  const header = '<table style="padding-left: 30px !important; padding-right: 30px !important; margin: 0; width: 100%;"><tr><td style="font-size: 8px; width: 33%; text-align: center;"><img width="'+width/2+'px" height="'+height/2+'px" src="data:image/png;base64,'+logo+'"></td></tr></table>';
  const footer = '<div style="width: 100%; text-align: center; font-size: 10px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
  const lastPagefooter = '<div style="width: 100%; text-align: center; font-size: 10px;">End of Document</div>';

  try {
    console.log("Opening first page...");
    let page = await browser.newPage();
    await page.goto(destinationURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log("First page opened successfully.");

    console.log("Generating first PDF...");
    await page.pdf({
      path: pathFile,
      displayHeaderFooter: true,
      footerTemplate: footer,
      headerTemplate: header,
      format: 'A4',
      margin: { top: '100px', bottom: '100px' }
    });
    console.log("First PDF generated successfully.");
    await page.close();

    console.log("Opening second page...");
    let page2 = await browser.newPage();
    await page2.goto(destinationURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log("Second page opened successfully.");

    const dataBuffer = fs.readFileSync(pathFile);
    const pdfInfo = await pdfParser(dataBuffer);
    const numPages = pdfInfo.numpages;

    let pdfFile;
    if (numPages === 1) {
      console.log("Generating single-page PDF...");
      pdfFile = await page2.pdf({
        displayHeaderFooter: true,
        footerTemplate: lastPagefooter,
        headerTemplate: header,
        format: 'A4',
        margin: { top: '100px', bottom: '100px' },
        pageRanges: `1`
      });
    } else {
      console.log("Generating multi-page PDF...");
      let firstPart = await page2.pdf({
        displayHeaderFooter: true,
        footerTemplate: footer,
        headerTemplate: header,
        format: 'A4',
        margin: { top: '100px', bottom: '100px' },
        pageRanges: `1-${numPages - 1}`
      });

      let secondPart = await page2.pdf({
        displayHeaderFooter: true,
        footerTemplate: lastPagefooter,
        headerTemplate: header,
        format: 'A4',
        margin: { top: '100px', bottom: '100px' },
        pageRanges: `${numPages}`
      });

      merger.add(firstPart);
      merger.add(secondPart);
      pdfFile = await merger.saveAsBuffer();
    }

    console.log("PDF generation and merging completed successfully.");
    await browser.close();

    fs.unlinkSync(pathFile);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfFile.length,
    });
    res.attachment("invoice.pdf");
    res.send(pdfFile);

  } catch (err) {
    console.error('Failed to generate or merge PDF:', err);
    res.status(500).send('Failed to generate or merge PDF.');
  } finally {
    if (browser) await browser.close();
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
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
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
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
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
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
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
    
  await page.goto(destinationURL, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  });
    
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

app.listen(5000, () => {
    console.log('server started on port 5000');
});