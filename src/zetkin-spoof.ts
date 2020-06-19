import { zetkinLoginUrl, zetkinUpgradeToken, getZetkinUpgradeUrl } from './auth';
import puppeteer from 'puppeteer'
import * as url from 'url';

export const spoofLogin = async () => {
  // Spin up a useragent spoofer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Navigate to the login URL
  await page.goto(await zetkinLoginUrl('/', process.env.ZETKIN_NGROK_DOMAIN));
  // Enter process.env.ZETKIN_ADMIN_USERNAME in the username
  await page.waitForSelector('.LoginForm-emailInput');
  await page.type('.LoginForm-emailInput', process.env.ZETKIN_ADMIN_USERNAME);
  // Enter process.env.ZETKIN_ADMIN_PASSWORD in the password
  await page.type('.LoginForm-passwordInput', process.env.ZETKIN_ADMIN_PASSWORD);
  // Submit
  await page.click('.LoginForm-submitButton')
  // Get redirected back to ngrok so that the server can request an OAuth2 token via code
  await page.waitForNavigation();
  await browser.close();
}

export const spoofUpgrade = async () => {
  // Spin up a useragent spoofer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Navigate to the login URL
  const upgradeURL = await getZetkinUpgradeUrl(url.format({ hostname: process.env.ZETKIN_NGROK_DOMAIN, pathname: '/' }))
  await page.goto(upgradeURL);
  // Click button
  await page.waitForSelector('.TwoFactorPage-submitButton');
  await page.click('.TwoFactorPage-submitButton')
  // Wait for redirect
  await page.waitForNavigation();
  page.waitForSelector('.OtpPage-otpInput');
  // Now input the OTP
  await page.type('.OtpPage-otpInput', process.env.ZETKIN_OTP);
  // Submit
  await page.click('.OtpPage-submitButton')
  // Get redirected back to ngrok
  await page.waitForNavigation();
  await browser.close();
}