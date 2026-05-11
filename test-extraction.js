import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testContactExtraction() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Load the test HTML file
  await page.goto(`file://${join(__dirname, 'test-contact-page.html')}`);
  
  // Run the same extraction logic as in extractContacts
  const contacts = await page.evaluate(() => {
    try {
      // Broader selectors for contact-related elements
      const contactSelectors = [
        'footer',
        '[class*="contact"]',
        '[class*="address"]',
        'address',
        'a[href^="mailto:"]',
        'a[href^="tel:"]',
        '[class*="footer"]',
        '[data-contact]',
        '.contact-info',
        '.phone',
        '.email',
        '#contact',
        '.contact-us',
        '[class*="phone"]',
        '[class*="email"]',
        '.social-links a',
        '#footer-contact',
        '.footer a[href*="contact"]',
        'section.contact',
        'div.contact',
        '[class*="hour"]',
        '.hours',
        '.opening-hours',
        '.business-hours',
        '[class*="business"]',
        '[class*="company"]',
        'time'
      ].join(', ');

      const contactElements = document.querySelectorAll(contactSelectors);
      let pageText = document.body ? document.body.textContent || '' : '';
      const mailtoLinks = [];
      const telLinks = [];

      contactElements.forEach(el => {
        if (el.tagName === 'A' && el.href.startsWith('mailto:')) {
          const email = el.href.replace('mailto:', '').trim().toLowerCase();
          if (email && email.includes('@')) mailtoLinks.push(email);
        } else if (el.tagName === 'A' && el.href.startsWith('tel:')) {
          const phone = el.href.replace('tel:', '').trim();
          if (phone && phone.match(/\d/)) telLinks.push(phone);
        } else {
          if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el.textContent) {
            const text = el.textContent.trim();
            if (text) {
              pageText += ' ' + text;
            }
          }
        }
      });

      const emailsFromLinks = [...new Set(mailtoLinks)].filter(email => email.length > 5);
      const phonesFromLinks = [...new Set(telLinks)].filter(phone => phone.match(/\d{7,}/));

      // Regex patterns
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
      const phoneRegex = /(?:(?:\+?(\d{1,3}))?[-.\s(]?(\d{1,4})[)\s-]?(?:[-.\s]?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9}))|ext\.?\s?(\d{1,5}))(?:\s*\*?\s*\d+)?/gi;
      const addressRegex = /\d{1,5}\s+[A-Za-z0-9\s]+(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Pkwy|Parkway)\.?\s*(?:#\d+-?\d*|(?:Apt|Unit|Suite|Ste)\s*#?\d+-?\d*)?\s*,?\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/gi;

      const emailsFromText = [...(pageText.match(emailRegex) || [])].map(e => e.toLowerCase()).filter(email => email.includes('@') && email.length > 5);
      const phonesFromText = [...(pageText.match(phoneRegex) || [])].filter(phone => phone.match(/\d{7,}/) && phone.length < 50);
      let addressesFromText = [...(pageText.match(addressRegex) || [])].filter(addr => addr.length > 10 && addr.match(/\d{5}/));

      // Combine and dedupe
      const allEmails = [...new Set([...emailsFromLinks, ...emailsFromText])];
      const allPhones = [...new Set([...phonesFromLinks, ...phonesFromText])];
      const allAddresses = [...new Set(addressesFromText)].filter(addr => addr.length > 10);

      const emails = allEmails.map(email => ({
        value: email,
        source: emailsFromLinks.includes(email) ? 'mailto-link' : 'text',
        confidence: emailsFromLinks.includes(email) ? 'high' : 'medium'
      }));

      const phones = allPhones.map(phone => ({
        value: phone.replace(/\s+/g, ' ').trim(),
        source: phonesFromLinks.includes(phone) ? 'tel-link' : 'text',
        confidence: phonesFromLinks.includes(phone) ? 'high' : 'medium'
      }));

      const addresses = allAddresses.map(addr => ({
        value: addr.trim(),
        source: 'text',
        confidence: 'medium'
      }));

      return { emails, phones, addresses, pageText: pageText.substring(0, 500) };
    } catch (error) {
      return { error: error.message, emails: [], phones: [], addresses: [] };
    }
  });
  
  console.log('=== CONTACT EXTRACTION TEST RESULTS ===\n');
  console.log('Emails:', JSON.stringify(contacts.emails, null, 2));
  console.log('\nPhones:', JSON.stringify(contacts.phones, null, 2));
  console.log('\nAddresses:', JSON.stringify(contacts.addresses, null, 2));
  console.log('\nPage text sample:', contacts.pageText);
  
  if (contacts.error) {
    console.log('\nERROR:', contacts.error);
  }
  
  // Verify expectations
  console.log('\n=== VERIFICATION ===');
  console.log('✓ Expected email: info@prosperitynorthadvisors.com');
  console.log('  Found:', contacts.emails.find(e => e.value.includes('prosperitynorthadvisors')));
  console.log('\n✓ Expected phone: (480) 730-2430');
  console.log('  Found:', contacts.phones.find(p => p.value.includes('480')));
  console.log('\n✓ Expected address: 428 S Gilbert Rd #111-6, Gilbert, AZ 85296');
  console.log('  Found:', contacts.addresses.find(a => a.value.includes('Gilbert')));
  
  await browser.close();
}

testContactExtraction().catch(console.error);
