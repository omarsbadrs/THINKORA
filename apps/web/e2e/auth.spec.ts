import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test.describe('Login Page', () => {
    test('should render the login page', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('h1')).toContainText('Welcome back');
      await expect(page.locator('text=Thinkora')).toBeVisible();
    });

    test('should display email and password inputs', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('#email');
      const passwordInput = page.locator('#password');

      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should display the Sign In button', async ({ page }) => {
      await page.goto('/login');

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('Sign In');
    });

    test('should show form validation error for empty fields', async ({ page }) => {
      await page.goto('/login');

      await page.locator('button[type="submit"]').click();

      // The error message should appear
      await expect(page.locator('text=Please fill in all fields')).toBeVisible();
    });

    test('should have a link to forgot password', async ({ page }) => {
      await page.goto('/login');

      const forgotLink = page.locator('a[href="/forgot-password"]');
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toContainText('Forgot password');
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login');

      const signupLink = page.locator('a[href="/signup"]');
      await expect(signupLink).toBeVisible();
      await signupLink.click();

      await expect(page).toHaveURL(/\/signup/);
    });

    test('should accept input in email and password fields', async ({ page }) => {
      await page.goto('/login');

      await page.locator('#email').fill('test@example.com');
      await page.locator('#password').fill('password123');

      await expect(page.locator('#email')).toHaveValue('test@example.com');
      await expect(page.locator('#password')).toHaveValue('password123');
    });
  });

  test.describe('Signup Page', () => {
    test('should render the signup page', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.locator('h1')).toContainText('Create your account');
      await expect(page.locator('text=Thinkora')).toBeVisible();
    });

    test('should display all required form fields', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.locator('#name')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#confirmPassword')).toBeVisible();
    });

    test('should display the Create Account button', async ({ page }) => {
      await page.goto('/signup');

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('Create Account');
    });

    test('should show form validation error for empty fields', async ({ page }) => {
      await page.goto('/signup');

      await page.locator('button[type="submit"]').click();

      await expect(page.locator('text=Please fill in all fields')).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      await page.goto('/signup');

      await page.locator('#name').fill('Test User');
      await page.locator('#email').fill('test@example.com');
      await page.locator('#password').fill('short');
      await page.locator('#confirmPassword').fill('short');

      await page.locator('button[type="submit"]').click();

      await expect(page.locator('text=at least 8 characters')).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/signup');

      await page.locator('#name').fill('Test User');
      await page.locator('#email').fill('test@example.com');
      await page.locator('#password').fill('password123');
      await page.locator('#confirmPassword').fill('different456');

      await page.locator('button[type="submit"]').click();

      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/signup');

      const loginLink = page.locator('a[href="/login"]');
      await expect(loginLink).toBeVisible();
      await loginLink.click();

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Navigation between auth pages', () => {
    test('should navigate from login to signup and back', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('Welcome back');

      await page.locator('a[href="/signup"]').click();
      await expect(page).toHaveURL(/\/signup/);
      await expect(page.locator('h1')).toContainText('Create your account');

      await page.locator('a[href="/login"]').click();
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('h1')).toContainText('Welcome back');
    });
  });
});
