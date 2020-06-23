import { zetkinLoginUrl, getZetkinUpgradeUrl, getZetkinInstance, getValidTokens } from './auth';
import puppeteer from 'puppeteer'
import * as url from 'url';
import { wait } from '../utils';

// To work with Heroku (and the Puppeteer Heroku buildpack)
// See https://stackoverflow.com/a/55090914/1053937
const puppeteerConfig = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
}

export const spoofLogin = async () => {
  console.trace("Before login", await getValidTokens())
  // Spin up a useragent spoofer
  const browser = await puppeteer.launch(puppeteerConfig);
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
  await wait(1000)
  console.trace("After login", await getValidTokens())
  return getZetkinInstance()
}

export const spoofUpgrade = async () => {
  console.trace("Attempting upgrade")
  // Spin up a useragent spoofer
  const browser = await puppeteer.launch(puppeteerConfig);
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