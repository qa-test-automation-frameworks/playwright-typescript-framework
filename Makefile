.PHONY: install test test-api test-e2e test-smoke lint report clean

install:
	npm ci && npx playwright install --with-deps chromium

test:
	npm run test

test-api:
	npm run test:api

test-e2e:
	npm run test:e2e

test-smoke:
	npm run test:smoke

lint:
	npm run lint && npm run format:check && npm run type-check

report:
	npm run allure:generate && npm run allure:open

clean:
	npm run clean
