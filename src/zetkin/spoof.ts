import { zetkinLoginUrl, getZetkinUpgradeUrl, getZetkinInstance, getValidTokens } from './auth';
import puppeteer from 'puppeteer'
import * as url from 'url';
import { wait } from '../utils';
import { Subject } from 'rxjs';

// To work with Heroku (and the Puppeteer Heroku buildpack)
// See https://stackoverflow.com/a/55090914/1053937
const puppeteerConfig: puppeteer.LaunchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
}

const userAgentConfig = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'

const windowConfig = {width:1280,height:1024}

const loginProcess = new Subject()
let isAttemptingLogin = false
export const attemptLogin = async () => {
  console.trace("🔐 Before login", await getValidTokens())
  // Spin up a useragent spoofer
  const browser = await puppeteer.launch(puppeteerConfig)
  const page = await browser.newPage();
  // https://github.com/puppeteer/puppeteer/issues/1766
  await page.setUserAgent(userAgentConfig);
  await page.setViewport(windowConfig);
  // Navigate to the login URL
  await page.goto(await zetkinLoginUrl('/', process.env.ZETKIN_CLIENT_DOMAIN || process.env.ZETKIN_NGROK_DOMAIN));
  // Enter process.env.ZETKIN_ADMIN_USERNAME in the username
  await page.waitForSelector('.LoginForm-emailInput', { timeout: 59000 });
  await page.type('.LoginForm-emailInput', process.env.ZETKIN_ADMIN_USERNAME);
  // Enter process.env.ZETKIN_ADMIN_PASSWORD in the password
  await page.type('.LoginForm-passwordInput', process.env.ZETKIN_ADMIN_PASSWORD);
  // Submit
  await page.click('.LoginForm-submitButton')
  // Get redirected back to ngrok so that the server can request an OAuth2 token via code
  await page.waitForNavigation();
  await browser.close();
  await wait(1000)
  console.log("🔐 After login", await getValidTokens())
}

export const spoofLogin = (fn: () => Promise<void> = attemptLogin) => new Promise(async resolve => {
  console.log("🔐 spoofLogin", { isAttemptingLogin })
  const sub = loginProcess.subscribe(async () => {
    resolve(await getZetkinInstance())
    sub.unsubscribe()
  })

  if (!isAttemptingLogin) {
    try {
      isAttemptingLogin = true
      await fn()
      loginProcess.next(Math.random())
    } catch (e) {
      console.error(e)
    } finally {
      isAttemptingLogin = false
    }
  }
})

const upgradeProcess = new Subject()
let isAttemptingUpgrade = false
export const attemptUpgrade = async () => {
  console.trace("🔐 Attempting upgrade")
  // Spin up a useragent spoofer
  const browser = await puppeteer.launch(puppeteerConfig)
  const page = await browser.newPage();
  // https://github.com/puppeteer/puppeteer/issues/1766
  await page.setUserAgent(userAgentConfig);
  await page.setViewport(windowConfig);
  // Navigate to the login URL
  const upgradeURL = await getZetkinUpgradeUrl(url.format({ hostname: process.env.ZETKIN_CLIENT_DOMAIN || process.env.ZETKIN_NGROK_DOMAIN, pathname: '/' }))
  await page.goto(upgradeURL);
  // Click button
  await page.waitForSelector('.TwoFactorPage-submitButton', { timeout: 59000 });
  await page.click('.TwoFactorPage-submitButton')
  // Wait for redirect
  await page.waitForNavigation();
  page.waitForSelector('.OtpPage-otpInput', { timeout: 59000 });
  // Now input the OTP
  await page.type('.OtpPage-otpInput', process.env.ZETKIN_OTP);
  // Submit
  await page.click('.OtpPage-submitButton')
  // Get redirected back to ngrok
  await page.waitForNavigation();
  await browser.close();
  console.log("🔐 Upgrade succeeded")
}

export const spoofUpgrade = async (fn = attemptUpgrade) => new Promise(async resolve => {
  console.log("🔐 spoofUpgrade", { isAttemptingUpgrade })
  const sub = upgradeProcess.subscribe(async () => {
    resolve(await getZetkinInstance())
    sub.unsubscribe()
  })

  if (!isAttemptingUpgrade) {
    try {
      isAttemptingUpgrade = true
      await fn()
      upgradeProcess.next(Math.random())
    } catch (e) {
      console.error(e)
    } finally {
      isAttemptingUpgrade = false
    }
  }
})

// As a fallback, just reset the login dedupe lock variable every few minutes
setInterval(() => {
  console.log("RESETTING LOGIN LOCKS", { isAttemptingLogin, isAttemptingUpgrade })
  isAttemptingLogin = false
  isAttemptingUpgrade = false
}, 2 * 60 * 1000)