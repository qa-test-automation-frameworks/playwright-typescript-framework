import { expect, test } from '@playwright/test';
import { escapeRegExp } from '../../src/utils/strings';

test('article slugs containing regex operators match only their literal URL', () => {
  const slug = 'article+[draft].(v2)$';
  const pattern = new RegExp(`/article/${escapeRegExp(slug)}$`);
  expect(pattern.test(`http://localhost/article/${slug}`)).toBe(true);
  expect(pattern.test('http://localhost/article/articleeeee-draftX-v2')).toBe(false);
  expect(pattern.test(`http://localhost/article/${slug}/extra`)).toBe(false);
});
