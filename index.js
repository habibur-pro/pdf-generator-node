const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
const hbs = require("handlebars");
const app = express();
const port = 3000;

// Enable CORS and JSON middleware
app.use(cors());
app.use(express.json());

// Route to serve static HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// PDF generator function using Puppeteer and Handlebars
const pdfGenerator = async ({ fileName, data, templatePath }) => {
  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: "new", // Keeps Puppeteer in headless mode
    });
    const page = await browser.newPage();
    const templateHtml = await fs.readFile(templatePath, "utf-8");

    const template = hbs.compile(templateHtml); // Compile Handlebars template with data
    const content = template(data);

    // Set the page content
    await page.setContent(content);
    await page.emulateMediaType("screen");

    // Ensure 'generatedFile' directory exists
    const outputDir = path.join(process.cwd(), "certificates");
    await fs.ensureDir(outputDir); // Create directory if it doesn't exist

    // Generate the file path for the PDF
    const downloadPath = path.join(outputDir, `${fileName}.pdf`);

    // Generate the PDF
    await page.pdf({
      path: downloadPath,
      format: "A4",
      printBackground: true,
      landscape: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();
    return downloadPath;
  } catch (error) {
    console.error("Error generating PDF: ", error);
    throw new Error(error.message || "something went wrong");
  }
};

// Sample data to use for Handlebars template

// Route to generate PDF
app.get("/generate-pdf", async (req, res) => {
  const fileName = `certificket${Date.now()}`;
  try {
    let data = {
      name: "Shakib Al Hasan",
      date: "16.09.2024",
    };
    const templatePath = path.join(__dirname, "public", "index.html"); //
    const filePath = await pdfGenerator({ fileName, data, templatePath });
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error while sending file to the client:", err);
        res.status(500).send("Error sending the file.");
      } else {
        // Delete the file after sending it
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting the file:", unlinkErr);
          } else {
            console.log(`File ${fileName}.pdf deleted successfully.`);
          }
        });
      }
    });
  } catch (error) {
    res.status(500).send("Error generating PDF.");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
