const { test, expect } = require("@playwright/test");

// Nicholas Koh Zi Lun, A0272806B
test("full registration and authentication flow", async ({ page }) => {
  const expectToast = async (message) => {
    await expect(page.getByText(message).first()).toBeVisible();
  };

  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user = {
    name: `E2E User ${uniqueId}`,
    email: `e2e.user.${uniqueId}@example.com`,
    password: "Password123!",
    phone: "91234567",
    address: "123 E2E Street",
    dob: "1999-01-01",
    answer: "football",
  };

  await page.goto("/register");

  await page.getByPlaceholder("Enter Your Name").fill(user.name);
  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill(user.password);
  await page.getByPlaceholder("Enter Your Phone").fill(user.phone);
  await page.getByPlaceholder("Enter Your Address").fill(user.address);
  await page.locator("#exampleInputDOB1").fill(user.dob);
  await page.getByPlaceholder("What is Your Favorite sports").fill(user.answer);

  await page.getByRole("button", { name: "REGISTER" }).click();
  await expectToast(/register successfully, please login/i);
  await expect(page).toHaveURL(/\/login$/);

  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill(user.password);

  await page.getByRole("button", { name: "LOGIN" }).click();
  await expectToast(/login successful/i);

  await expect(page).toHaveURL(/\/$/);

  const userDropdownToggle = page
    .locator(".nav-link.dropdown-toggle")
    .filter({ hasText: user.name })
    .first();

  await expect(userDropdownToggle).toBeVisible();

  await userDropdownToggle.click();
  await page.getByRole("link", { name: "Logout" }).click();
  await expectToast(/logout successfully/i);

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();

  const authAfterLogout = await page.evaluate(() =>
    localStorage.getItem("auth"),
  );
  expect(authAfterLogout).toBeNull();

  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill("WrongPassword123!");

  await page.getByRole("button", { name: "LOGIN" }).click();
  await expectToast(/incorrect password/i);
  await expect(page).toHaveURL(/\/login$/);
});
