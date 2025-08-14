require('dotenv').config();
const express = require('express');
const compression = require('compression');
const path = require('path');
const { ocrSpace } = require('ocr-space-api-wrapper');

const app = express();
app.use(compression());
app.use(express.json({ limit: '10mb' })); // For base64 images
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Advanced bill parsing logic
function parseBillText(ocrText) {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items = [];
  const originalLines = [];
  
  // Ignore patterns (case-insensitive)
  const ignorePatterns = /\b(total|sub\s*total|subtotal|grand\s*total|balance|gst|vat|tax|service|delivery|discount|round\s*off|change|cash|card|qr|tip)\b/i;
  
  // Price pattern: detect last numeric token on the line
  const pricePattern = /\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g;
  
  for (const line of lines) {
    originalLines.push(line);
    
    // Skip lines containing ignored terms
    if (ignorePatterns.test(line)) {
      continue;
    }
    
    // Find all price matches
    const priceMatches = Array.from(line.matchAll(pricePattern));
    if (priceMatches.length === 0) continue;
    
    // Get the last price match (most likely the item price)
    const lastPriceMatch = priceMatches[priceMatches.length - 1];
    const priceStr = lastPriceMatch[0].replace(/,/g, ''); // Remove commas
    const price = parseFloat(priceStr);
    
    if (isNaN(price) || price === 0) continue;
    
    // Extract item name (everything before the price)
    const nameEndIndex = lastPriceMatch.index;
    let itemName = line.substring(0, nameEndIndex).trim();
    
    // Clean up the name
    itemName = itemName
      .replace(/\.+$/, '') // Remove trailing dots
      .replace(/-+$/, '') // Remove trailing dashes
      .replace(/\s*x\d+\s*$/, '') // Remove quantity markers like "x2"
      .replace(/\s*@\s*\d+(?:\.\d{2})?\s*$/, '') // Remove "@ 90.00" patterns
      .replace(/\s*\d+\s*@\s*$/, '') // Remove "1 @" patterns
      .replace(/\s*=\s*\d+(?:\.\d{2})?\s*$/, '') // Remove "= 90.00" patterns
      .trim();
    
    // Skip if name becomes empty after cleaning
    if (!itemName) continue;
    
    items.push({
      name: itemName,
      price: price,
      originalLine: line
    });
  }
  
  // Deduplicate near-identical names (case-insensitive)
  const deduplicatedItems = [];
  const nameMap = new Map();
  
  for (const item of items) {
    const normalizedName = item.name.toLowerCase().trim();
    
    if (nameMap.has(normalizedName)) {
      // Update existing item with the last price
      const existingIndex = nameMap.get(normalizedName);
      deduplicatedItems[existingIndex].price = item.price;
      deduplicatedItems[existingIndex].originalLine = item.originalLine;
    } else {
      // Add new item
      nameMap.set(normalizedName, deduplicatedItems.length);
      deduplicatedItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        name: item.name,
        price: item.price
      });
    }
  }
  
  return {
    items: deduplicatedItems,
    originalLines: originalLines,
    totalItems: deduplicatedItems.length
  };
}

// OCR endpoint
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageData } = req.body;
    
    console.log('OCR request received');
    console.log('Image data length:', imageData ? imageData.length : 'undefined');
    console.log('Image data start:', imageData ? imageData.substring(0, 50) : 'undefined');
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Please upload a valid image.' });
    }
    
    // Check image size (base64 encoded size)
    const imageSizeMB = (imageData.length * 3/4) / (1024 * 1024); // Approximate decoded size
    console.log(`Image size: ${imageSizeMB.toFixed(1)}MB`);
    
    if (imageSizeMB > 10) {
      return res.status(413).json({ 
        error: 'Image too large. Please compress or resize your image to under 10MB.',
        details: `Current size: ${imageSizeMB.toFixed(1)}MB`
      });
    }
    
    console.log('Calling OCR.Space API...');
    
    // OCR.Space API call with environment variable and enhanced error handling
    let ocrResult;
    try {
      ocrResult = await ocrSpace(imageData, {
        apiKey: process.env.OCR_SPACE_API_KEY,
        ocrEngine: 2, // Better for structured documents
        isTable: true, // Optimized for receipts/tables
        language: 'eng',
        scale: true, // Auto-scale for better OCR
        detectOrientation: true // Auto-detect text orientation
      });
    } catch (apiError) {
      console.error('OCR.Space API Error:', apiError);
      
      // Handle cases where the API returns HTML instead of JSON
      if (apiError.message && apiError.message.includes('Unexpected token')) {
        return res.status(429).json({ 
          error: 'OCR service temporarily unavailable. Please try again in a moment.',
          details: 'API rate limit or service error'
        });
      }
      
      return res.status(500).json({ 
        error: 'OCR API communication failed', 
        details: apiError.message 
      });
    }
    
    console.log('OCR Result type:', typeof ocrResult);
    console.log('OCR Result keys:', Object.keys(ocrResult || {}));
    
    // Enhanced validation of OCR response
    if (!ocrResult || typeof ocrResult !== 'object') {
      return res.status(500).json({ 
        error: 'Invalid response from OCR service',
        details: 'Received non-JSON response'
      });
    }
    
    if (ocrResult.IsErroredOnProcessing) {
      return res.status(422).json({ 
        error: 'OCR processing error',
        details: ocrResult.ErrorMessage || 'Failed to process image'
      });
    }
    
    if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
      return res.status(422).json({ 
        error: 'No text found in image',
        details: 'Please ensure the image contains clear, readable text'
      });
    }
    
    const extractedText = ocrResult.ParsedResults[0]?.ParsedText || '';
    
    if (!extractedText.trim()) {
      return res.status(422).json({ 
        error: 'No readable text extracted',
        details: 'Please try with a clearer image'
      });
    }
    
    // Parse the bill using advanced logic
    const parsedBill = parseBillText(extractedText);
    
    res.json({
      success: true,
      extractedText: extractedText,
      items: parsedBill.items,
      totalItems: parsedBill.totalItems,
      debug: {
        originalLines: parsedBill.originalLines
      }
    });
    
  } catch (error) {
    console.error('OCR Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return appropriate error based on error type
    if (error.message && error.message.includes('Unexpected token')) {
      return res.status(502).json({ 
        error: 'OCR service returned invalid response. Please try again.',
        details: 'Service communication error'
      });
    }
    
    res.status(500).json({ 
      error: 'OCR processing failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Fallback to index for any SPA-style deep links if needed
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Allow connections from any IP
app.listen(PORT, HOST, () => {
  console.log(`🧾 Rattehin server running on:`);
  console.log(`   • Local:   http://localhost:${PORT}`);
  console.log(`   • Network: http://10.9.22.129:${PORT}`);
  console.log(`\n📱 For mobile testing, use: http://10.9.22.129:${PORT}`);
});
