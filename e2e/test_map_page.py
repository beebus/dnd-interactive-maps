from selenium.webdriver.common.by import By


def test_unknown_map_slug_shows_not_found(driver, base_url):
    driver.get(f"{base_url}/maps/does-not-exist")

    heading = driver.find_element(By.TAG_NAME, "h2")
    assert "Map not found" in heading.text


def test_not_found_return_button_navigates_home(driver, base_url):
    driver.get(f"{base_url}/maps/does-not-exist")

    driver.find_element(By.TAG_NAME, "button").click()

    assert driver.current_url.rstrip("/") == base_url.rstrip("/")
    assert driver.find_elements(By.CSS_SELECTOR, ".landing-page")
