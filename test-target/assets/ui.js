const api = '/api';
const app = document.querySelector('#app');
const authLinks = document.querySelector('#auth-links');
const state = {
  token: localStorage.getItem('jwtToken'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
};

async function request(path, options = {}) {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(state.token ? { authorization: `Token ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}
function setUser(user) {
  state.user = user;
  state.token = user.token;
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('jwtToken', user.token);
  renderNav();
}
function clearUser() {
  state.user = null;
  state.token = null;
  localStorage.clear();
  renderNav();
}
function renderNav() {
  authLinks.innerHTML = state.user
    ? `<a class="nav-link" href="/editor">New Article</a><a class="nav-link" href="/settings">Settings</a><a class="nav-link" data-testid="profile-link" href="/profile/${state.user.username}">${state.user.username}</a>`
    : `<a class="nav-link" href="/login">Sign in</a><a class="nav-link" href="/register">Sign up</a>`;
}
function errorHtml(error) {
  return `<ul class="error-messages" data-testid="errors"><li data-testid="error-item">${Object.values(
    error.errors || { body: ['Request failed'] },
  )
    .flat()
    .join(' ')}</li></ul>`;
}
function articleCard(article) {
  const favoriteLabel = article.favorited ? 'Unfavorite' : 'Favorite';
  return `<div class="article-preview" data-testid="article-card"><div class="article-meta"><a class="author" data-testid="article-author" href="/profile/${article.author.username}">${article.author.username}</a><button aria-label="${favoriteLabel} ${article.title}" data-action="favorite-article" data-slug="${article.slug}" data-favorited="${article.favorited}">${favoriteLabel} ${article.favoritesCount}</button></div><a href="/article/${article.slug}"><h1 data-testid="article-title">${article.title}</h1></a><p data-testid="article-description">${article.description}</p><time data-testid="article-date" datetime="${article.createdAt}">${new Date(article.createdAt).toLocaleDateString()}</time><div class="tag-list" data-testid="sidebar-tag-list">${article.tagList.map((t) => `<a class="tag-default" data-testid="article-tag" href="/?tag=${t}">${t}</a>`).join('')}</div></div>`;
}
async function home() {
  const tag = new URL(location.href).searchParams.get('tag');
  const endpoint =
    location.pathname === '/feed' ? '/articles/feed' : `/articles${tag ? `?tag=${tag}` : ''}`;
  let data = { articles: [], articlesCount: 0 };
  try {
    data = await request(endpoint);
  } catch {
    data = { articles: [], articlesCount: 0 };
  }
  app.innerHTML = `<div class="banner"><h1>conduit</h1><p>A place to share knowledge.</p></div><div class="feed-toggle"><a class="${location.pathname === '/feed' ? 'active' : ''}" href="/feed">Your Feed</a><a class="${location.pathname !== '/feed' ? 'active' : ''}" href="/">Global Feed</a></div>${data.articles.length ? data.articles.map(articleCard).join('') : '<p>No articles are here</p>'}`;
}
function auth(mode) {
  const signup = mode === 'register';
  app.innerHTML = `<h1>${signup ? 'Sign up' : 'Sign in'}</h1><div id="errors"></div><form>${signup ? '<input placeholder="Username" name="username" />' : ''}<input placeholder="Email" name="email" /><input placeholder="Password" name="password" type="password" /><button type="submit">${signup ? 'Sign up' : 'Sign in'}</button></form>`;
  app.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const body = signup
        ? {
            user: {
              username: form.get('username'),
              email: form.get('email'),
              password: form.get('password'),
            },
          }
        : { user: { email: form.get('email'), password: form.get('password') } };
      setUser(
        (
          await request(signup ? '/users' : '/users/login', {
            method: 'POST',
            body: JSON.stringify(body),
          })
        ).user,
      );
      history.pushState(null, '', '/');
      await home();
    } catch (e) {
      document.querySelector('#errors').innerHTML = errorHtml(e);
    }
  };
}
async function editor(slug) {
  const existing = slug ? (await request(`/articles/${slug}`)).article : null;
  app.innerHTML = `<h1>${slug ? 'Edit Article' : 'New Article'}</h1><div id="errors"></div><form><input placeholder="Article Title" name="title" value="${existing?.title || ''}" /><input placeholder="What's this article about?" name="description" value="${existing?.description || ''}" /><textarea placeholder="Write your article (in markdown)" name="body">${existing?.body || ''}</textarea><input placeholder="Enter tags" name="tags" value="${existing?.tagList?.join(' ') || ''}" /><button type="submit">${slug ? 'Update Article' : 'Publish Article'}</button></form>`;
  app.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const article = {
        title: form.get('title'),
        description: form.get('description'),
        body: form.get('body'),
        tagList: String(form.get('tags') || '')
          .split(/\s*,\s*|\s+/)
          .filter(Boolean),
      };
      const res = await request(slug ? `/articles/${slug}` : '/articles', {
        method: slug ? 'PUT' : 'POST',
        body: JSON.stringify({ article }),
      });
      history.pushState(null, '', `/article/${res.article.slug}`);
      await articlePage(res.article.slug);
    } catch (e) {
      document.querySelector('#errors').innerHTML = errorHtml(e);
    }
  };
}
async function articlePage(slug) {
  const { article } = await request(`/articles/${slug}`);
  const favoriteLabel = article.favorited ? 'Unfavorite' : 'Favorite';
  app.innerHTML = `<div class="banner" data-testid="article-banner"><h1 data-testid="article-title">${article.title}</h1><div class="article-meta" data-testid="article-meta"><a class="author" data-testid="article-author" href="/profile/${article.author.username}">${article.author.username}</a><button id="favorite">${favoriteLabel} ${article.favoritesCount}</button><button id="follow">${article.author.following ? 'Unfollow' : 'Follow'} ${article.author.username}</button><a href="/editor/${slug}">Edit Article</a><button class="btn-outline-danger" id="delete">Delete Article</button></div></div><div class="article-content" data-testid="article-body"><p>${article.body}</p></div><p data-testid="article-description">${article.description}</p><time data-testid="article-date" datetime="${article.createdAt}">${new Date(article.createdAt).toLocaleDateString()}</time><ul class="tag-list" data-testid="sidebar-tag-list">${article.tagList.map((t) => `<li class="tag-default" data-testid="article-tag">${t}</li>`).join('')}</ul><form id="comment-form"><textarea placeholder="Write a comment..."></textarea><button>Post Comment</button></form><div id="comments"></div>`;
  document.querySelector('#favorite').onclick = async () => {
    const method = article.favorited ? 'DELETE' : 'POST';
    await request(`/articles/${slug}/favorite`, { method });
    await articlePage(slug);
  };
  document.querySelector('#follow').onclick = async () => {
    const method = article.author.following ? 'DELETE' : 'POST';
    await request(`/profiles/${article.author.username}/follow`, { method });
    await articlePage(slug);
  };
  document.querySelector('#delete').onclick = async () => {
    await request(`/articles/${slug}`, { method: 'DELETE' });
    history.pushState(null, '', '/');
    await home();
  };
  document.querySelector('#comment-form').onsubmit = async (event) => {
    event.preventDefault();
    const body = event.target.querySelector('textarea').value;
    await request(`/articles/${slug}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment: { body } }),
    });
    await articlePage(slug);
  };
  const comments = await request(`/articles/${slug}/comments`);
  document.querySelector('#comments').innerHTML = comments.comments
    .map(
      (c) =>
        `<div class="card" data-testid="comment-card"><p class="card-text" data-testid="comment-text">${c.body}</p><button>Delete</button></div>`,
    )
    .join('');
}
async function profilePage(username) {
  const { profile } = await request(`/profiles/${username}`);
  const mine = await request(`/articles?author=${username}`);
  app.innerHTML = `<div class="user-info"><h4 data-testid="profile-heading">${profile.username}</h4><p data-testid="profile-bio">${profile.bio || ''}</p><button id="follow-profile">${profile.following ? 'Unfollow' : 'Follow'} ${profile.username}</button></div><a class="active" href="#">My Articles</a><a href="#">Favorited Articles</a>${mine.articles.length ? mine.articles.map(articleCard).join('') : '<p>No articles are here</p>'}`;
  document.querySelector('#follow-profile').onclick = async () => {
    const method = profile.following ? 'DELETE' : 'POST';
    await request(`/profiles/${username}/follow`, { method });
    await profilePage(username);
  };
}
function settings() {
  app.innerHTML = `<h1>Your Settings</h1><div id="errors"></div><form id="settings-form"><input placeholder="URL of profile picture" name="image" /><textarea placeholder="Short bio about you" name="bio"></textarea><input placeholder="Email" name="email" value="${state.user?.email || ''}" /><input placeholder="Username" name="username" value="${state.user?.username || ''}" /><button>Update Settings</button></form><button class="btn-outline-danger" id="logout">Or click here to logout.</button>`;
  document.querySelector('#settings-form').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const { user } = await request('/user', {
        method: 'PUT',
        body: JSON.stringify({
          user: {
            image: form.get('image') || null,
            bio: form.get('bio') || null,
            email: form.get('email'),
            username: form.get('username'),
          },
        }),
      });
      setUser(user);
    } catch (e) {
      document.querySelector('#errors').innerHTML = errorHtml(e);
    }
  };
  document.querySelector('#logout').onclick = () => {
    clearUser();
    history.pushState(null, '', '/');
    home();
  };
}
async function route() {
  renderNav();
  const path = location.pathname;
  if (path === '/login') return auth('login');
  if (path === '/register') return auth('register');
  if (path === '/editor') return editor();
  if (path.startsWith('/editor/')) return editor(path.split('/').pop());
  if (path === '/settings') return settings();
  if (path.startsWith('/article/')) return articlePage(path.split('/').pop());
  if (path.startsWith('/profile/')) return profilePage(path.split('/').pop());
  return home();
}
document.body.addEventListener('click', (event) => {
  const favoriteButton = event.target.closest('[data-action="favorite-article"]');
  if (favoriteButton) {
    event.preventDefault();
    event.stopPropagation();
    const slug = favoriteButton.getAttribute('data-slug');
    const favorited = favoriteButton.getAttribute('data-favorited') === 'true';
    request(`/articles/${slug}/favorite`, { method: favorited ? 'DELETE' : 'POST' }).then(route);
    return;
  }

  const link = event.target.closest('a[href^="/"]');
  if (!link) return;
  event.preventDefault();
  history.pushState(null, '', link.getAttribute('href'));
  route();
});
window.addEventListener('popstate', route);
route();
