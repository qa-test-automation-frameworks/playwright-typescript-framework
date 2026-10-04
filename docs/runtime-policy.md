# Supported runtime and first success

Node24.21.0/npm10.9.4 is the contributor and CI baseline. Stable later Node24
patches/minors satisfy the installation policy but are not automatically verified.
Other Node majors, older patches and other npm versions fail early. Both Node
version files, engines, normal preinstall, CI and the controlled-target container
use this baseline. The browser image stays Playwright1.60.0; setup-node explicitly
selects the framework runtime inside CI containers. Browser/package upgrades are
separate compatibility work.

The [official lifecycle](https://nodejs.org/en/about/previous-releases) lists
Node24 as LTS and Node20 as EOL. Node's bundled npm is not the project pin. Install
Node from `.nvmrc`, then use npm10.9.4 or prefix commands with `npx --yes npm@10.9.4`.
Installation performs native engine checks and the explicit guard. Manual commands
do not all independently enforce this policy; `npm run check:runtime` verifies it.

A no-secret first-success path needs only Git, Node and npm:

```sh
npx --yes npm@10.9.4 ci
npm run test:unit
npm run lint
npm run type-check
```

The unit runner supplies synthetic identity and fake request contexts; no browser,
.env, running application, Docker, provider key or report renderer is required.
First installation downloads dependencies. These checks are not the whole browser
suite. For owned-target API checks use `npm run with:target -- npm run test:api`;
for browser coverage install the matching browser binaries and OS dependencies.
Java21 is separately required for Allure rendering; Docker is separately needed
for optional observability and the Compose target. Avoid adding credentials just
to make the unit path start.

The Compose Node image is pinned by publisher registry digest, then installs the
pinned npm before normal dependency installation. A resolved tag/digest is not
proof of local Docker execution; inspect actual container CI separately. Keep
old measurement/runtime evidence under its original revision.
