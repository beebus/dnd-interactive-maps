import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:3000")


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def driver():
    options = Options()
    if os.environ.get("E2E_HEADLESS", "1") != "0":
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    drv = webdriver.Chrome(options=options)
    drv.implicitly_wait(5)
    yield drv
    drv.quit()
