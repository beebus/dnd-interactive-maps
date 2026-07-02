from selenium.webdriver.common.by import By


def test_landing_page_loads(driver, base_url):
    driver.get(base_url)
    assert "D&D" in driver.title or driver.find_elements(By.CSS_SELECTOR, ".landing-page")

    heading = driver.find_element(By.CSS_SELECTOR, ".landing-header h1")
    assert "D&D Interactive Maps" in heading.text


def test_landing_page_lists_map_cards(driver, base_url):
    driver.get(base_url)

    cards = driver.find_elements(By.CSS_SELECTOR, ".map-card")
    assert len(cards) > 0


def test_clicking_map_card_navigates_to_map_page(driver, base_url):
    driver.get(base_url)

    first_card = driver.find_element(By.CSS_SELECTOR, ".map-card")
    first_card.click()

    assert "/maps/" in driver.current_url
    assert driver.find_elements(By.CSS_SELECTOR, "img")
