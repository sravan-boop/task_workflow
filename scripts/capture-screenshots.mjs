import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  email: 'animesh@freedomwithai.com',
  password: 'Asana@1234.',
  loginUrl: 'https://app.asana.com/-/login',
  baseUrl: 'https://app.asana.com',
  viewport: { width: 1920, height: 1080 },
  screenshotDir: path.resolve('docs/screenshots'),
  timing: {
    pageLoad: 6000,
    elementAppear: 8000,
    animationSettle: 2000,
    networkIdle: 3000,
    typing: 80,
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(min = 200, max = 600) {
  return delay(Math.floor(Math.random() * (max - min) + min));
}

async function safeScreenshot(page, folder, name, options = {}) {
  const { fullPage = false, waitForSelector = null, waitTimeout = 10000 } = options;
  const dir = path.join(CONFIG.screenshotDir, folder);
  fs.mkdirSync(dir, { recursive: true });

  try {
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: waitTimeout });
    }
    await delay(CONFIG.timing.animationSettle);
    const filePath = path.join(dir, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage });
    console.log(`  [OK] ${folder}/${name}.png`);
    return true;
  } catch (err) {
    console.error(`  [FAIL] ${folder}/${name}.png - ${err.message}`);
    const errPath = path.join(dir, `${name}-ERROR.png`);
    try {
      await page.screenshot({ path: errPath, fullPage: false });
    } catch (_) {}
    return false;
  }
}

async function clickByText(page, text, tag = '*') {
  try {
    const el = await page.evaluateHandle(
      (t, tg) => {
        const els = [...document.querySelectorAll(tg)];
        return els.find((e) => e.textContent?.trim() === t || e.innerText?.trim() === t);
      },
      text,
      tag
    );
    if (el && el.asElement()) {
      await el.asElement().click();
      await randomDelay();
      return true;
    }
  } catch (_) {}
  return false;
}

async function clickByAriaLabel(page, label) {
  try {
    const selector = `[aria-label="${label}"]`;
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);
    await randomDelay();
    return true;
  } catch (_) {}
  return false;
}

async function clickSidebarItem(page, text) {
  try {
    // Try clicking sidebar links by text content
    const clicked = await page.evaluate((t) => {
      const links = document.querySelectorAll(
        'nav a, [role="navigation"] a, [class*="Sidebar"] a, [class*="sidebar"] a, a[class*="Nav"]'
      );
      for (const link of links) {
        if (link.textContent?.trim().includes(t)) {
          link.click();
          return true;
        }
      }
      // Fallback: any element containing the text in the left 300px
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (
          rect.left < 300 &&
          rect.width < 300 &&
          el.textContent?.trim() === t &&
          el.children.length === 0
        ) {
          el.click();
          return true;
        }
      }
      return false;
    }, text);
    if (clicked) {
      await delay(CONFIG.timing.pageLoad);
      return true;
    }
  } catch (_) {}
  return false;
}

async function waitForPageReady(page) {
  try {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 15000 });
  } catch (_) {}
  await delay(CONFIG.timing.animationSettle);
}

async function dismissModals(page) {
  // Try to close any overlay modals, banners, or "what's new" popups
  const dismissSelectors = [
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    '[aria-label="Close dialog"]',
    '[aria-label="Close this dialog"]',
    'button[aria-label="Got it"]',
    '[class*="CloseButton"]',
    '[class*="DismissButton"]',
    '[data-testid="close-button"]',
  ];

  for (const selector of dismissSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        const isVisible = await el.evaluate((node) => {
          const style = window.getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
        if (isVisible) {
          await el.click();
          await delay(500);
          console.log(`  [DISMISS] Closed modal via ${selector}`);
        }
      }
    } catch (_) {}
  }

  // Also try clicking "Got it", "Skip", "Maybe later", "No thanks" buttons by text
  for (const text of ['Got it', 'Skip', 'Maybe later', 'No thanks', 'Dismiss', 'Not now']) {
    try {
      await clickByText(page, text, 'button');
    } catch (_) {}
  }
}

async function switchProjectView(page, viewName) {
  // Try clicking tab by text within project header tabs
  try {
    const clicked = await page.evaluate((name) => {
      // Look for tab buttons or links with the view name
      const tabs = document.querySelectorAll(
        '[role="tab"], [class*="Tab"], [class*="tab"], [role="tablist"] button, [role="tablist"] a'
      );
      for (const tab of tabs) {
        if (tab.textContent?.trim().toLowerCase().includes(name.toLowerCase())) {
          tab.click();
          return true;
        }
      }
      // Fallback: look for any element with the view name text near top of page
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (
          rect.top < 200 &&
          rect.top > 0 &&
          el.textContent?.trim().toLowerCase() === name.toLowerCase() &&
          el.children.length === 0
        ) {
          el.click();
          return true;
        }
      }
      return false;
    }, viewName);
    if (clicked) {
      await delay(CONFIG.timing.pageLoad);
      await waitForPageReady(page);
      return true;
    }
  } catch (_) {}
  return false;
}

// ============================================================
// LOGIN
// ============================================================

async function login(page) {
  console.log('\n=== STEP 1: LOGIN ===');

  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);
  await safeScreenshot(page, '01-login', '01-login-page');

  // Enter email
  console.log('  Entering email...');
  const emailSelectors = [
    'input[type="email"]',
    'input[name="e"]',
    '#lui_1',
    'input[placeholder*="email"]',
    'input[autocomplete="username"]',
  ];

  let emailInput = null;
  for (const sel of emailSelectors) {
    try {
      emailInput = await page.waitForSelector(sel, { timeout: 3000 });
      if (emailInput) break;
    } catch (_) {}
  }

  if (!emailInput) {
    console.error('  [FATAL] Could not find email input!');
    return false;
  }

  await emailInput.click({ clickCount: 3 });
  await emailInput.type(CONFIG.email, { delay: CONFIG.timing.typing });
  await randomDelay(300, 600);

  // Click Continue button
  console.log('  Clicking Continue...');
  const continueClicked =
    (await clickByText(page, 'Continue', 'div[role="button"]')) ||
    (await clickByText(page, 'Continue', 'button')) ||
    (await page.evaluate(() => {
      const btns = document.querySelectorAll('div[role="button"], button');
      for (const btn of btns) {
        if (btn.textContent?.includes('Continue')) {
          btn.click();
          return true;
        }
      }
      return false;
    }));

  await delay(3000);
  await safeScreenshot(page, '01-login', '02-password-page');

  // Enter password
  console.log('  Entering password...');
  const passSelectors = [
    'input[type="password"]',
    'input[name="p"]',
    'input[autocomplete="current-password"]',
  ];

  let passInput = null;
  for (const sel of passSelectors) {
    try {
      passInput = await page.waitForSelector(sel, { timeout: 5000 });
      if (passInput) break;
    } catch (_) {}
  }

  if (!passInput) {
    // Might be SSO or Google sign-in redirect
    console.log('  No password field found - may be SSO. Waiting for manual login...');
    await page.waitForNavigation({ timeout: 60000 });
  } else {
    await passInput.click({ clickCount: 3 });
    await passInput.type(CONFIG.password, { delay: CONFIG.timing.typing });
    await randomDelay(300, 600);

    // Click Log In
    console.log('  Clicking Log In...');
    (await clickByText(page, 'Log in', 'div[role="button"]')) ||
      (await clickByText(page, 'Log In', 'div[role="button"]')) ||
      (await clickByText(page, 'Log in', 'button')) ||
      (await clickByText(page, 'Log In', 'button')) ||
      (await page.evaluate(() => {
        const btns = document.querySelectorAll('div[role="button"], button, input[type="submit"]');
        for (const btn of btns) {
          if (btn.textContent?.toLowerCase().includes('log in')) {
            btn.click();
            return true;
          }
        }
        return false;
      }));
  }

  // Wait for main app to load
  console.log('  Waiting for Asana to load...');
  try {
    await page.waitForNavigation({ timeout: 30000, waitUntil: 'networkidle2' });
  } catch (_) {}
  await delay(5000);

  // Dismiss any onboarding modals
  await dismissModals(page);
  await delay(2000);
  await dismissModals(page);

  await safeScreenshot(page, '01-login', '03-post-login');
  console.log('  Login complete!');
  return true;
}

// ============================================================
// SCREENSHOT SECTIONS
// ============================================================

async function captureHomeDashboard(page) {
  console.log('\n=== STEP 2: HOME DASHBOARD ===');
  await clickSidebarItem(page, 'Home');
  await waitForPageReady(page);
  await dismissModals(page);
  await safeScreenshot(page, '02-home-dashboard', '01-home-full');
  await safeScreenshot(page, '02-home-dashboard', '02-home-full-page', { fullPage: true });
}

async function captureMyTasks(page) {
  console.log('\n=== STEP 3: MY TASKS ===');
  await clickSidebarItem(page, 'My tasks');
  await waitForPageReady(page);
  await dismissModals(page);

  // List view (usually default)
  await safeScreenshot(page, '03-my-tasks', '01-list-view');

  // Board view
  if (await switchProjectView(page, 'Board')) {
    await safeScreenshot(page, '03-my-tasks', '02-board-view');
  }

  // Calendar view
  if (await switchProjectView(page, 'Calendar')) {
    await safeScreenshot(page, '03-my-tasks', '03-calendar-view');
  }

  // Switch back to list
  await switchProjectView(page, 'List');
}

async function captureInbox(page) {
  console.log('\n=== STEP 4: INBOX ===');
  await clickSidebarItem(page, 'Inbox');
  await waitForPageReady(page);
  await dismissModals(page);
  await safeScreenshot(page, '04-inbox', '01-inbox-full');
  await safeScreenshot(page, '04-inbox', '02-inbox-full-page', { fullPage: true });
}

async function captureProjectViews(page) {
  console.log('\n=== STEP 5: PROJECT VIEWS ===');

  // Try to find and click on the first project
  const projectClicked = await page.evaluate(() => {
    // Look for project links in sidebar
    const sidebarLinks = document.querySelectorAll('a[href*="/0/"]');
    for (const link of sidebarLinks) {
      const rect = link.getBoundingClientRect();
      if (rect.left < 300 && link.textContent?.trim().length > 0) {
        // Skip system links (Home, My Tasks, Inbox, etc.)
        const text = link.textContent.trim().toLowerCase();
        if (
          !['home', 'my tasks', 'inbox', 'reporting', 'portfolios', 'goals'].includes(text)
        ) {
          link.click();
          return link.textContent.trim();
        }
      }
    }
    return null;
  });

  if (!projectClicked) {
    console.log('  No project found in sidebar. Navigating to first available project...');
    // Try navigating directly
    try {
      await page.goto(`${CONFIG.baseUrl}/0/home`, { waitUntil: 'networkidle2', timeout: 15000 });
      await delay(3000);
    } catch (_) {}
  } else {
    console.log(`  Opened project: ${projectClicked}`);
  }

  await waitForPageReady(page);
  await dismissModals(page);

  // List view
  await safeScreenshot(page, '05-project-views', '01-list-view');

  // Board view
  if (await switchProjectView(page, 'Board')) {
    await safeScreenshot(page, '05-project-views', '02-board-view');
  }

  // Timeline view
  if (await switchProjectView(page, 'Timeline')) {
    await safeScreenshot(page, '05-project-views', '03-timeline-view');
  }

  // Calendar view
  if (await switchProjectView(page, 'Calendar')) {
    await safeScreenshot(page, '05-project-views', '04-calendar-view');
  }

  // Overview
  if (await switchProjectView(page, 'Overview')) {
    await safeScreenshot(page, '05-project-views', '05-overview');
  }

  // Files
  if (await switchProjectView(page, 'Files')) {
    await safeScreenshot(page, '05-project-views', '06-files');
  }

  // Messages
  if (await switchProjectView(page, 'Messages')) {
    await safeScreenshot(page, '05-project-views', '07-messages');
  }

  // Dashboard
  if (await switchProjectView(page, 'Dashboard')) {
    await safeScreenshot(page, '05-project-views', '08-dashboard');
  }

  // Switch back to list for task detail capture
  await switchProjectView(page, 'List');
}

async function captureTaskDetail(page) {
  console.log('\n=== STEP 6: TASK DETAIL ===');

  // Click on the first visible task
  const taskClicked = await page.evaluate(() => {
    const taskRows = document.querySelectorAll(
      '[class*="TaskRow"], [class*="task-row"], [class*="SpreadsheetRow"], [role="row"]'
    );
    for (const row of taskRows) {
      const nameEl = row.querySelector(
        '[class*="TaskName"], [class*="task-name"], textarea, [contenteditable]'
      );
      if (nameEl && nameEl.textContent?.trim().length > 0) {
        nameEl.click();
        return nameEl.textContent.trim();
      }
    }
    // Fallback: click any task-like element
    const links = document.querySelectorAll('a[href*="/f/"]');
    if (links.length > 0) {
      links[0].click();
      return links[0].textContent?.trim();
    }
    return null;
  });

  if (taskClicked) {
    console.log(`  Opened task: ${taskClicked}`);
    await delay(3000);
    await waitForPageReady(page);
    await safeScreenshot(page, '06-task-detail', '01-task-detail-pane');
    await safeScreenshot(page, '06-task-detail', '02-task-detail-full', { fullPage: true });

    // Try to scroll down in the detail pane to see comments/activity
    await page.evaluate(() => {
      const pane = document.querySelector(
        '[class*="TaskPane"], [class*="task-pane"], [class*="DetailPane"], [role="main"] > div:last-child'
      );
      if (pane) pane.scrollTop = pane.scrollHeight;
    });
    await delay(1500);
    await safeScreenshot(page, '06-task-detail', '03-task-detail-scrolled');

    // Close the task detail pane
    try {
      await page.keyboard.press('Escape');
      await delay(1000);
    } catch (_) {}
  } else {
    console.log('  No tasks found to open.');
  }
}

async function captureTaskCreation(page) {
  console.log('\n=== STEP 6b: TASK CREATION ===');

  // Try keyboard shortcut for quick add
  try {
    // Tab+Q is Asana's quick add shortcut
    await page.keyboard.down('Tab');
    await page.keyboard.press('KeyQ');
    await page.keyboard.up('Tab');
    await delay(2000);
    await safeScreenshot(page, '14-modals-forms', '01-quick-add-task');

    // Close the modal
    await page.keyboard.press('Escape');
    await delay(1000);
  } catch (_) {
    console.log('  Quick add shortcut did not work, trying + button...');
  }

  // Try clicking the + (create) button
  const createClicked =
    (await clickByAriaLabel(page, 'Create')) ||
    (await clickByAriaLabel(page, 'Quick add')) ||
    (await page.evaluate(() => {
      const btns = document.querySelectorAll('button, div[role="button"]');
      for (const btn of btns) {
        if (btn.textContent?.trim() === '+' || btn.getAttribute('aria-label')?.includes('Create')) {
          btn.click();
          return true;
        }
      }
      return false;
    }));

  if (createClicked) {
    await delay(2000);
    await safeScreenshot(page, '14-modals-forms', '02-create-menu');
    await page.keyboard.press('Escape');
    await delay(1000);
  }
}

async function capturePortfolios(page) {
  console.log('\n=== STEP 7: PORTFOLIOS ===');
  const clicked = await clickSidebarItem(page, 'Portfolios');
  if (!clicked) {
    // Try navigating through the sidebar modes
    await clickSidebarItem(page, 'Reporting');
    await delay(2000);
  }
  await waitForPageReady(page);
  await dismissModals(page);
  await safeScreenshot(page, '07-portfolios', '01-portfolios-page');
  await safeScreenshot(page, '07-portfolios', '02-portfolios-full', { fullPage: true });
}

async function captureGoals(page) {
  console.log('\n=== STEP 8: GOALS ===');
  await clickSidebarItem(page, 'Goals');
  await waitForPageReady(page);
  await dismissModals(page);
  await safeScreenshot(page, '08-goals', '01-goals-page');
  await safeScreenshot(page, '08-goals', '02-goals-full', { fullPage: true });
}

async function captureReporting(page) {
  console.log('\n=== STEP 9: REPORTING ===');
  const clicked = await clickSidebarItem(page, 'Reporting');
  if (!clicked) {
    await clickSidebarItem(page, 'Dashboards');
  }
  await waitForPageReady(page);
  await dismissModals(page);
  await safeScreenshot(page, '09-reporting', '01-reporting-page');
  await safeScreenshot(page, '09-reporting', '02-reporting-full', { fullPage: true });
}

async function captureSearch(page) {
  console.log('\n=== STEP 10: SEARCH ===');

  // Click the search input/icon
  const searchClicked =
    (await clickByAriaLabel(page, 'Search')) ||
    (await page.evaluate(() => {
      const searchEls = document.querySelectorAll(
        'input[placeholder*="Search"], [class*="Search"], [class*="search"]'
      );
      for (const el of searchEls) {
        const rect = el.getBoundingClientRect();
        if (rect.top < 100) {
          el.click();
          return true;
        }
      }
      return false;
    }));

  if (searchClicked) {
    await delay(2000);
    await safeScreenshot(page, '10-search', '01-search-overlay');

    // Type a search query
    try {
      await page.keyboard.type('task', { delay: 100 });
      await delay(3000);
      await safeScreenshot(page, '10-search', '02-search-results');
    } catch (_) {}

    await page.keyboard.press('Escape');
    await delay(1000);
  } else {
    console.log('  Could not find search element');
  }
}

async function captureSettings(page) {
  console.log('\n=== STEP 11: SETTINGS ===');

  // Try clicking the user avatar/profile in the top right
  const profileClicked = await page.evaluate(() => {
    // Look for avatar or profile button in top-right area
    const avatars = document.querySelectorAll(
      'img[class*="Avatar"], [class*="avatar"], [class*="TopbarAvatar"], [class*="ProfilePhoto"]'
    );
    for (const av of avatars) {
      const rect = av.getBoundingClientRect();
      if (rect.right > 1600) {
        av.click();
        return true;
      }
    }
    // Fallback: look for settings gear or profile button
    const btns = document.querySelectorAll('[aria-label*="profile"], [aria-label*="Settings"]');
    for (const btn of btns) {
      btn.click();
      return true;
    }
    return false;
  });

  if (profileClicked) {
    await delay(2000);
    await safeScreenshot(page, '11-settings', '01-profile-menu');
  }

  // Navigate to settings page
  try {
    await page.goto(`${CONFIG.baseUrl}/0/settings`, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await waitForPageReady(page);
    await safeScreenshot(page, '11-settings', '02-settings-page');
    await safeScreenshot(page, '11-settings', '03-settings-full', { fullPage: true });
  } catch (_) {
    console.log('  Could not navigate to settings directly');
  }
}

async function captureAdmin(page) {
  console.log('\n=== STEP 11b: ADMIN CONSOLE ===');
  try {
    await page.goto(`${CONFIG.baseUrl}/admin`, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await waitForPageReady(page);
    await dismissModals(page);
    await safeScreenshot(page, '11-settings', '04-admin-console');
    await safeScreenshot(page, '11-settings', '05-admin-full', { fullPage: true });
  } catch (_) {
    console.log('  Could not access admin console');
  }
}

async function captureTeam(page) {
  console.log('\n=== STEP 12: TEAM ===');

  // Navigate back to main app first
  await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
  await delay(3000);
  await dismissModals(page);

  // Try to find team links in sidebar
  const teamClicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/team/"], a[href*="teams"]');
    for (const link of links) {
      const rect = link.getBoundingClientRect();
      if (rect.left < 300) {
        link.click();
        return link.textContent?.trim();
      }
    }
    return null;
  });

  if (teamClicked) {
    console.log(`  Opened team: ${teamClicked}`);
    await waitForPageReady(page);
    await safeScreenshot(page, '12-team', '01-team-page');
  } else {
    console.log('  No team links found in sidebar');
    // Take a screenshot of sidebar showing team section
    await safeScreenshot(page, '12-team', '01-sidebar-teams');
  }
}

async function captureSidebar(page) {
  console.log('\n=== STEP 13: SIDEBAR ===');

  // Navigate to home first
  await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
  await delay(3000);
  await dismissModals(page);

  // Capture expanded sidebar
  await safeScreenshot(page, '13-sidebar', '01-sidebar-expanded');

  // Try to collapse sidebar
  const collapseClicked =
    (await clickByAriaLabel(page, 'Collapse sidebar')) ||
    (await clickByAriaLabel(page, 'Close sidebar')) ||
    (await page.evaluate(() => {
      const btns = document.querySelectorAll(
        '[class*="CollapseButton"], [class*="collapse"], [aria-label*="collapse"]'
      );
      for (const btn of btns) {
        btn.click();
        return true;
      }
      return false;
    }));

  if (collapseClicked) {
    await delay(1500);
    await safeScreenshot(page, '13-sidebar', '02-sidebar-collapsed');

    // Re-expand
    (await clickByAriaLabel(page, 'Expand sidebar')) ||
      (await clickByAriaLabel(page, 'Open sidebar'));
    await delay(1500);
  }

  // Capture different sidebar modes if available (Work, Plan, Workflow, Company)
  for (const mode of ['Work', 'Plan', 'Workflow', 'Company']) {
    const modeClicked = await page.evaluate((m) => {
      const items = document.querySelectorAll(
        '[class*="SidebarMode"], [class*="sidebar-mode"], [role="tab"]'
      );
      for (const item of items) {
        if (item.textContent?.trim() === m) {
          item.click();
          return true;
        }
      }
      return false;
    }, mode);

    if (modeClicked) {
      await delay(2000);
      await safeScreenshot(page, '13-sidebar', `03-sidebar-mode-${mode.toLowerCase()}`);
    }
  }
}

async function captureAutomation(page) {
  console.log('\n=== STEP 15: AUTOMATION / RULES ===');

  // Navigate back to a project first
  const projectClicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/0/"]');
    for (const link of links) {
      const rect = link.getBoundingClientRect();
      if (rect.left < 300 && link.textContent?.trim().length > 0) {
        const text = link.textContent.trim().toLowerCase();
        if (!['home', 'my tasks', 'inbox', 'reporting', 'portfolios', 'goals'].includes(text)) {
          link.click();
          return true;
        }
      }
    }
    return false;
  });

  if (projectClicked) {
    await waitForPageReady(page);

    // Try to find and click Rules/Customize button
    const rulesClicked =
      (await clickByText(page, 'Rules', 'button')) ||
      (await clickByText(page, 'Customize', 'button')) ||
      (await clickByAriaLabel(page, 'Customize')) ||
      (await page.evaluate(() => {
        const btns = document.querySelectorAll('button, div[role="button"]');
        for (const btn of btns) {
          if (
            btn.textContent?.includes('Customize') ||
            btn.textContent?.includes('Rules') ||
            btn.textContent?.includes('Automate')
          ) {
            btn.click();
            return true;
          }
        }
        return false;
      }));

    if (rulesClicked) {
      await delay(3000);
      await safeScreenshot(page, '15-automation-rules', '01-rules-panel');

      // Try clicking "Add rule"
      const addRuleClicked = await clickByText(page, 'Add rule', 'button');
      if (addRuleClicked) {
        await delay(2000);
        await safeScreenshot(page, '15-automation-rules', '02-rule-builder');
        await page.keyboard.press('Escape');
        await delay(1000);
      }
    }
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('========================================');
  console.log('  ASANA SCREENSHOT CAPTURE');
  console.log('  Starting at:', new Date().toISOString());
  console.log('========================================');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: CONFIG.viewport,
    args: [
      '--start-maximized',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--no-default-browser-check',
    ],
    slowMo: 30,
  });

  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // Remove the webdriver flag
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    // Step 1: Login
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.error('\n[FATAL] Login failed. Exiting.');
      await browser.close();
      return;
    }

    // Step 2-15: Capture all sections
    await captureHomeDashboard(page);
    await captureMyTasks(page);
    await captureInbox(page);
    await captureProjectViews(page);
    await captureTaskDetail(page);
    await captureTaskCreation(page);
    await capturePortfolios(page);
    await captureGoals(page);
    await captureReporting(page);
    await captureSearch(page);
    await captureSettings(page);
    await captureAdmin(page);
    await captureTeam(page);
    await captureSidebar(page);
    await captureAutomation(page);

    console.log('\n========================================');
    console.log('  CAPTURE COMPLETE!');
    console.log('  Finished at:', new Date().toISOString());
    console.log('========================================');

    // Generate a summary of all captured screenshots
    const summary = [];
    const screenshotDirs = fs.readdirSync(CONFIG.screenshotDir);
    for (const dir of screenshotDirs.sort()) {
      const dirPath = path.join(CONFIG.screenshotDir, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.png'));
        summary.push(`${dir}: ${files.length} screenshots`);
        for (const file of files.sort()) {
          summary.push(`  - ${file}`);
        }
      }
    }
    console.log('\n--- SCREENSHOT SUMMARY ---');
    console.log(summary.join('\n'));

    // Save summary to a file
    fs.writeFileSync(
      path.join(CONFIG.screenshotDir, 'SUMMARY.txt'),
      `Screenshot Capture Summary\n` +
        `Generated: ${new Date().toISOString()}\n\n` +
        summary.join('\n')
    );
  } catch (err) {
    console.error('\n[FATAL ERROR]', err.message);
    await safeScreenshot(page, '01-login', 'FATAL-ERROR');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
